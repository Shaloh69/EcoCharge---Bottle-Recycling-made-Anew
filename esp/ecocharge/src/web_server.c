#include "web_server.h"
#include "config.h"
#include "relay_control.h"
#include "sensor_monitor.h"
#include "ultrasonic.h"
#include "conveyor_motor.h"
#include "wifi_sta.h"
#include "nvs_config.h"
#include "self_test.h"
#include "esp_log.h"
#include "esp_http_server.h"
#include "esp_wifi.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

// ============================================================================
// EcoCharge Local Admin + Provisioning Web Server
//
//  /              → redirect; provisioning mode → /provision, normal → /test
//  /provision     → WiFi setup form (captive-portal page)
//  /provision/save  POST ssid=&pass=   → save to NVS + reboot
//  /provision/reset POST               → clear NVS + reboot
//  /test          → hardware test page (relays, sensors via SSE, servo)
//  /api/status    GET  → JSON snapshot of all sensors + relay + wifi state
//  /api/sse       GET  → text/event-stream; pushes sensor JSON every 500 ms
//  /api/conveyor/open   POST → servo_open()
//  /api/conveyor/close  POST → servo_close()
//  /api/conveyor/angle  POST angle=X → servo_set_angle(X)
//  /api/relay/on        POST port=X&duration=Y → relay_enable_port()
//  /api/relay/off       POST port=X            → relay_disable_port()
//  /api/relay/all-off   POST → relay_disable_all()
//  /api/wifi/scan GET  → JSON array [{ssid,rssi}]
//  /api/reboot    POST → reboot after 500 ms
// ============================================================================

static httpd_handle_t s_server  = NULL;
static volatile int   s_sse_active = 0; // prevent multiple SSE connections

// ---------------------------------------------------------------------------
// Utility: parse one field out of application/x-www-form-urlencoded body
//   body / body_len  — raw POST body
//   key              — field name (without '=')
//   out / out_len    — output buffer
// Returns number of bytes written, or -1 if key not found.
// ---------------------------------------------------------------------------
static int _form_field(const char *body, int body_len, const char *key,
                        char *out, size_t out_len)
{
    char search[64];
    int klen = snprintf(search, sizeof(search), "%s=", key);

    const char *p = body;
    const char *end = body + body_len;

    while (p < end) {
        if ((end - p) >= klen && strncmp(p, search, klen) == 0) {
            p += klen;
            const char *vend = (const char *)memchr(p, '&', end - p);
            if (!vend) vend = end;
            size_t vlen = (size_t)(vend - p);
            if (vlen >= out_len) vlen = out_len - 1;
            memcpy(out, p, vlen);
            out[vlen] = '\0';
            // Decode '+' → space; minimal %XX decoding for common chars
            char *s = out;
            char *d = out;
            while (*s) {
                if (*s == '+') {
                    *d++ = ' ';
                    s++;
                } else if (*s == '%' && s[1] && s[2]) {
                    char hex[3] = { s[1], s[2], '\0' };
                    *d++ = (char)strtol(hex, NULL, 16);
                    s += 3;
                } else {
                    *d++ = *s++;
                }
            }
            *d = '\0';
            return (int)(d - out);
        }
        // Advance past this field
        const char *amp = (const char *)memchr(p, '&', end - p);
        if (!amp) break;
        p = amp + 1;
    }
    return -1;
}

// ---------------------------------------------------------------------------
// Utility: escape a string for embedding in a JSON value (in-place not safe;
// writes to dst).  Returns bytes written.
// ---------------------------------------------------------------------------
static int _json_str(char *dst, size_t dst_len, const char *src)
{
    int n = 0;
    for (int i = 0; src[i] && n < (int)dst_len - 3; i++) {
        if (src[i] == '"' || src[i] == '\\') dst[n++] = '\\';
        dst[n++] = src[i];
    }
    dst[n] = '\0';
    return n;
}

// ---------------------------------------------------------------------------
// Reusable: build the port-sensor JSON array (used by /api/status and SSE)
// ---------------------------------------------------------------------------
static int _build_sensor_json(char *buf, size_t buf_len)
{
    int n = 0;
    const char *dir_str = conveyor_get_direction() == CONVEYOR_FORWARD ? "forward"
                        : conveyor_get_direction() == CONVEYOR_REVERSE ? "reverse"
                        : "stopped";
    n += snprintf(buf + n, buf_len - n,
                  "{\"wifi_ok\":%s,\"conveyor_running\":%s,\"conveyor_dir\":\"%s\","
                  "\"conveyor_speed\":%d,\"ports\":[",
                  wifi_sta_is_connected()  ? "true" : "false",
                  conveyor_is_running()    ? "true" : "false",
                  dir_str,
                  conveyor_get_speed());

    for (int i = 0; i < NUM_CHARGING_PORTS; i++) {
        port_sensor_data_t d = {0};
        sensor_get_port(i + 1, &d);
        n += snprintf(buf + n, buf_len - n,
                      "%s{\"port\":%d,\"relay_on\":%s,"
                      "\"current\":%.2f,\"voltage\":%.1f,\"overcurrent\":%s}",
                      i ? "," : "",
                      d.port,
                      d.relay_on    ? "true" : "false",
                      d.current_amps,
                      d.voltage_volts,
                      d.overcurrent ? "true" : "false");
    }

    // Ultrasonic sensor data
    ultrasonic_data_t ud = ultrasonic_get();
    bool ent_det  = ud.entrance_cm < ULTRASONIC_ENTRANCE_THRESHOLD_CM;
    bool btop_det = ud.bin_top_cm  < ULTRASONIC_BIN_THRESHOLD_CM;
    bool bbot_det = ud.bin_bot_cm  < ULTRASONIC_BIN_THRESHOLD_CM;
    n += snprintf(buf + n, buf_len - n,
                  "],\"ultrasonic\":{"
                  "\"entrance_cm\":%.1f,\"entrance_det\":%s,"
                  "\"bin_top_cm\":%.1f,\"bin_top_det\":%s,"
                  "\"bin_bot_cm\":%.1f,\"bin_bot_det\":%s}}",
                  ud.entrance_cm, ent_det  ? "true" : "false",
                  ud.bin_top_cm,  btop_det ? "true" : "false",
                  ud.bin_bot_cm,  bbot_det ? "true" : "false");
    return n;
}

// ===========================================================================
// HTML pages (stored in flash as string literals)
// ===========================================================================

// ---------------------------------------------------------------------------
// Provision page — WiFi credentials form
// ---------------------------------------------------------------------------
static const char *s_html_provision =
"<!DOCTYPE html><html><head>"
"<meta charset='UTF-8'>"
"<meta name='viewport' content='width=device-width,initial-scale=1'>"
"<title>EcoCharge Setup</title>"
"<style>"
"*{box-sizing:border-box}"
"body{font-family:sans-serif;background:#0d1117;color:#c9d1d9;margin:0;padding:16px;"
"max-width:480px;margin:0 auto}"
"h1{color:#58a6ff;margin-bottom:2px}"
"p.sub{color:#8b949e;margin-top:0;font-size:13px}"
".card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:20px;margin:14px 0}"
".card h2{color:#58a6ff;font-size:15px;margin:0 0 14px;display:flex;align-items:center;"
"justify-content:space-between}"
"label{display:block;color:#8b949e;font-size:12px;margin-bottom:4px;margin-top:12px}"
"input{width:100%;background:#21262d;border:1px solid #30363d;color:#c9d1d9;"
"border-radius:6px;padding:9px 10px;font-size:14px}"
"button{display:block;width:100%;background:#238636;color:#fff;border:none;"
"border-radius:6px;padding:11px;cursor:pointer;font-size:14px;margin-top:10px;font-weight:600}"
"button.sec{background:#21262d;border:1px solid #30363d;color:#c9d1d9}"
"button:disabled{opacity:.5;cursor:default}"
"#msg{display:none;border-radius:6px;padding:12px;margin-top:12px;text-align:center;font-size:14px}"
"#msg.ok{background:#1e3a1e;color:#3fb950;border:1px solid #3fb950}"
"#msg.err{background:#3d1a00;color:#f0883e;border:1px solid #f0883e}"
"#netlist{margin-top:8px;max-height:220px;overflow-y:auto;border:1px solid #30363d;"
"border-radius:6px;display:none}"
".net-row{display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;"
"border-bottom:1px solid #21262d;transition:background .15s}"
".net-row:last-child{border-bottom:none}"
".net-row:hover{background:#21262d}"
".net-row.selected{background:#1c2d3f;border-left:3px solid #58a6ff}"
".net-ssid{flex:1;font-size:13px;font-weight:600}"
".net-rssi{font-size:11px;color:#8b949e;white-space:nowrap}"
".bars{display:flex;align-items:flex-end;gap:2px;height:14px}"
".bar{width:4px;border-radius:1px;background:#30363d}"
".bar.lit{background:#3fb950}"
"#scan-status{font-size:11px;color:#8b949e;font-weight:400}"
"</style></head><body>"
"<h1>&#x1F50C; EcoCharge Setup</h1>"
"<p class='sub'>Connect to WiFi to begin operation</p>"
"<div class='card'>"
"<h2>WiFi Networks "
"<span id='scan-status'>scanning&#x2026;</span>"
"</h2>"
"<div id='netlist'></div>"
"<label>Network Name (SSID)</label>"
"<input type='text' id='ssid' placeholder='Select above or type manually'>"
"<label>Password</label>"
"<input type='password' id='pass' placeholder='WiFi password'>"
"<button onclick='save()' id='saveBtn'>Save &amp; Connect</button>"
"<button class='sec' onclick='doScan()' id='scanBtn' style='margin-top:8px'>"
"&#128268; Rescan</button>"
"</div>"
"<div id='msg'></div>"
"<div class='card'><p style='color:#8b949e;font-size:12px;margin:0'>"
"Firmware: " FIRMWARE_VERSION " &nbsp;|&nbsp; Backend: " RENDER_BASE_URL
"</p></div>"
"<script>"
/* Signal strength → bar count (0-4) */
"function rssiToBars(r){"
"  if(r>=-55)return 4;"
"  if(r>=-65)return 3;"
"  if(r>=-75)return 2;"
"  if(r>=-85)return 1;"
"  return 0;"
"}"
"function makeBars(r){"
"  var n=rssiToBars(r),h=['14px','10px','7px','4px'],s='';"
"  for(var i=3;i>=0;i--){"
"    s+='<div class=\"bar'+(i<n?' lit':'')+'\" style=\"height:'+h[i]+'\"></div>';"
"  }"
"  return '<div class=\"bars\">'+s+'</div>';"
"}"
"function selectNet(ssid){"
"  document.getElementById('ssid').value=ssid;"
"  document.getElementById('pass').focus();"
"  document.querySelectorAll('.net-row').forEach(function(r){"
"    r.classList.toggle('selected',r.dataset.ssid===ssid);"
"  });"
"}"
"async function doScan(){"
"  var btn=document.getElementById('scanBtn');"
"  var st=document.getElementById('scan-status');"
"  var nl=document.getElementById('netlist');"
"  btn.disabled=true;"
"  st.textContent='scanning\\u2026';"
"  nl.style.display='none';"
"  try{"
"    var r=await fetch('/api/wifi/scan');"
"    var nets=await r.json();"
"    if(nets.length===0){"
"      nl.innerHTML='<div style=\"padding:12px;color:#8b949e;font-size:13px;text-align:center\">"
"No networks found</div>';"
"    }else{"
"      nl.innerHTML=nets.map(function(n){"
"        return'<div class=\"net-row\" data-ssid=\"'+n.ssid+'\" onclick=\"selectNet(\\''+n.ssid.replace(/\\'/g,\"\\\\\\'\")+'\\')\">'"
"              +'<span class=\"net-ssid\">'+n.ssid+'</span>'"
"              +makeBars(n.rssi)"
"              +'<span class=\"net-rssi\">'+n.rssi+' dBm</span>'"
"              +'</div>';"
"      }).join('');"
"    }"
"    nl.style.display='block';"
"    st.textContent='\\u2714 '+nets.length+' found';"
"  }catch(e){"
"    st.textContent='scan failed';"
"  }"
"  btn.disabled=false;"
"}"
"async function save(){"
"  var ssid=document.getElementById('ssid').value.trim();"
"  var pass=document.getElementById('pass').value;"
"  if(!ssid){alert('Please select or enter a network name.');return;}"
"  document.getElementById('saveBtn').disabled=true;"
"  var body='ssid='+encodeURIComponent(ssid)+'&pass='+encodeURIComponent(pass);"
"  try{"
"    var r=await fetch('/provision/save',{method:'POST',"
"      headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body});"
"    var m=document.getElementById('msg');"
"    if(r.ok){"
"      m.className='ok';"
"      m.innerHTML='&#x2705; Saved! Rebooting\\u2026';"
"    }else{"
"      m.className='err';"
"      m.innerHTML='&#x26A0; Save failed ('+r.status+')';"
"      document.getElementById('saveBtn').disabled=false;"
"    }"
"    m.style.display='block';"
"  }catch(e){"
"    alert('Save failed: '+e);"
"    document.getElementById('saveBtn').disabled=false;"
"  }"
"}"
/* Auto-scan on load */
"doScan();"
"</script></body></html>";

// ---------------------------------------------------------------------------
// Hardware test page — manual component test + live sensor readings via SSE
// ---------------------------------------------------------------------------
static const char *s_html_test =
"<!DOCTYPE html><html><head>"
"<meta charset='UTF-8'>"
"<meta name='viewport' content='width=device-width,initial-scale=1'>"
"<title>EcoCharge Hardware Test</title>"
"<style>"
"*{box-sizing:border-box}"
"body{font-family:sans-serif;background:#0d1117;color:#c9d1d9;margin:0;padding:14px;max-width:720px;margin:0 auto}"
"h1{color:#58a6ff;margin-bottom:2px}p.sub{color:#8b949e;margin-top:0;font-size:13px}"
".card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:16px;margin:12px 0}"
".card h2{color:#58a6ff;font-size:15px;margin:0 0 12px;display:flex;align-items:center;gap:8px}"
"table{width:100%;border-collapse:collapse;font-size:13px}"
"td,th{padding:8px 10px;border:1px solid #30363d;text-align:left}"
"th{background:#21262d;color:#8b949e;font-weight:600}"
".on{color:#3fb950;font-weight:600}.off{color:#f85149;font-weight:600}.warn{color:#d29922;font-weight:600}"
".det{display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;"
"letter-spacing:.5px}"
".det-yes{background:#0d3321;color:#3fb950;border:1px solid #3fb950}"
".det-no{background:#21262d;color:#8b949e;border:1px solid #30363d}"
".det-oc{background:#3d1a00;color:#d29922;border:1px solid #d29922}"
".port-card{display:flex;align-items:center;gap:10px;padding:10px;"
"background:#21262d;border:1px solid #30363d;border-radius:8px;margin-bottom:8px;flex-wrap:wrap;"
"transition:border-color .3s}"
".port-label{font-weight:700;min-width:64px;font-size:14px}"
".port-stat{font-size:12px;color:#8b949e;flex:1;min-width:120px}"
".btn-row{display:flex;gap:6px;flex-wrap:wrap}"
"button{background:#238636;color:#fff;border:none;border-radius:6px;"
"padding:7px 13px;cursor:pointer;font-size:12px;font-weight:700;transition:opacity .15s}"
"button:active{opacity:.7}"
"button.off-btn{background:#da3633}"
"button.blue{background:#1f6feb}"
"button.amber{background:#9a6700}"
"button.grey{background:#21262d;border:1px solid #30363d}"
"input[type=range]{width:100%;accent-color:#58a6ff}"
".speed-row{display:flex;align-items:center;gap:12px;margin-top:6px}"
"#spd-label{font-size:18px;font-weight:700;color:#58a6ff;min-width:46px}"
"#sse-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#8b949e;margin-right:4px}"
"#sse-dot.live{background:#3fb950}"
"</style></head><body>"

"<h1>EcoCharge Hardware Test</h1>"
"<p class='sub'><span id='sse-dot'></span><span id='sse-status'>connecting&#x2026;</span>"
" &mdash; data refreshes every 500 ms</p>"

/* ── 1. Voltage & Current Live Readings ─────────────────────────────────── */
"<div class='card'>"
"<h2>&#x26A1; Voltage &amp; Current — Live</h2>"
"<table>"
"<thead><tr><th>Port</th><th>Source</th><th>Voltage</th><th>Current</th><th>Relay</th><th>State</th></tr></thead>"
"<tbody id='stbl'><tr><td colspan='6' style='color:#8b949e;text-align:center'>Waiting&#x2026;</td></tr></tbody>"
"</table>"
"</div>"

/* ── 2. Ultrasonic Sensors ───────────────────────────────────────────────── */
"<div class='card'>"
"<h2>&#x1F50D; Ultrasonic Sensors — Live</h2>"
"<table>"
"<thead><tr><th>Sensor</th><th>Distance</th><th>Threshold</th><th>Status</th></tr></thead>"
"<tbody>"
"<tr>"
"<td><b>Entrance</b></td>"
"<td id='us-ent-cm'>-</td>"
"<td>&lt; 15 cm</td>"
"<td id='us-ent-st'><span class='det det-no'>-</span></td>"
"</tr>"
"<tr>"
"<td><b>Bin Top</b></td>"
"<td id='us-btop-cm'>-</td>"
"<td>&lt; 20 cm</td>"
"<td id='us-btop-st'><span class='det det-no'>-</span></td>"
"</tr>"
"<tr>"
"<td><b>Bin Bottom</b></td>"
"<td id='us-bbot-cm'>-</td>"
"<td>&lt; 20 cm</td>"
"<td id='us-bbot-st'><span class='det det-no'>-</span></td>"
"</tr>"
"</tbody></table>"
"</div>"

/* ── 3. Relay Control ────────────────────────────────────────────────────── */
"<div class='card'>"
"<h2>&#x1F50C; Relay Control</h2>"
"<div id='relay-cards'>"
"<div class='port-card' id='pc1'>"
"<span class='port-label'>Port 1</span>"
"<span class='port-stat' id='ps1'>-</span>"
"<div class='btn-row'>"
"<button onclick='relayOn(1,10)'>ON 10 s</button>"
"<button onclick='relayOn(1,30)'>ON 30 s</button>"
"<button onclick='relayOn(1,600)'>ON 10 m</button>"
"<button class='off-btn' onclick='relayOff(1)'>OFF</button>"
"</div></div>"
"<div class='port-card' id='pc2'>"
"<span class='port-label'>Port 2</span>"
"<span class='port-stat' id='ps2'>-</span>"
"<div class='btn-row'>"
"<button onclick='relayOn(2,10)'>ON 10 s</button>"
"<button onclick='relayOn(2,30)'>ON 30 s</button>"
"<button onclick='relayOn(2,600)'>ON 10 m</button>"
"<button class='off-btn' onclick='relayOff(2)'>OFF</button>"
"</div></div>"
"<div class='port-card' id='pc3'>"
"<span class='port-label'>Port 3</span>"
"<span class='port-stat' id='ps3'>-</span>"
"<div class='btn-row'>"
"<button onclick='relayOn(3,10)'>ON 10 s</button>"
"<button onclick='relayOn(3,30)'>ON 30 s</button>"
"<button onclick='relayOn(3,600)'>ON 10 m</button>"
"<button class='off-btn' onclick='relayOff(3)'>OFF</button>"
"</div></div>"
"<div class='port-card' id='pc4'>"
"<span class='port-label'>Port 4</span>"
"<span class='port-stat' id='ps4'>-</span>"
"<div class='btn-row'>"
"<button onclick='relayOn(4,10)'>ON 10 s</button>"
"<button onclick='relayOn(4,30)'>ON 30 s</button>"
"<button onclick='relayOn(4,600)'>ON 10 m</button>"
"<button class='off-btn' onclick='relayOff(4)'>OFF</button>"
"</div></div>"
"</div>"
"<button class='off-btn' style='width:100%;margin-top:8px' onclick='post(\"/api/relay/all-off\")'>"
"&#9888;&#xFE0F; Emergency OFF — All Ports</button>"
"</div>"

/* ── 4. Conveyor Motor ───────────────────────────────────────────────────── */
"<div class='card'>"
"<h2>&#x2699;&#xFE0F; Conveyor Motor (L298N)</h2>"
"<div style='margin-bottom:12px;font-size:14px'>"
"Direction: <span id='cdir' style='font-weight:700'>-</span>"
"&nbsp;&nbsp;Speed: <span id='cspd'>-</span>%"
"</div>"
"<div class='btn-row' style='margin-bottom:14px'>"
"<button class='blue' onclick='post(\"/api/conveyor/forward\")'>&#9654; Forward</button>"
"<button class='amber' onclick='post(\"/api/conveyor/reverse\")'>&#9664; Reverse</button>"
"<button class='off-btn' onclick='post(\"/api/conveyor/stop\")'>&#9646;&#9646; Stop</button>"
"</div>"
"<label style='color:#8b949e;font-size:12px;display:block;margin-bottom:4px'>Speed (applies to next direction command)</label>"
"<div class='speed-row'>"
"<input type='range' min='0' max='100' value='75' id='spdrng' oninput='setSpeed(this.value)'>"
"<span id='spd-label'>75%</span>"
"</div>"
"</div>"

/* ── 5. WiFi & System ────────────────────────────────────────────────────── */
"<div class='card'>"
"<h2>&#x1F4F6; WiFi &amp; System</h2>"
"<div style='margin-bottom:12px'>Status: <span id='wifi-stat'>-</span></div>"
"<div class='btn-row'>"
"<button class='off-btn' onclick='resetWifi()'>Reset WiFi Credentials</button>"
"<button class='grey' onclick='post(\"/api/reboot\")'>Reboot</button>"
"</div>"
"</div>"

/* ── JavaScript ─────────────────────────────────────────────────────────── */
"<script>"
"var evtSrc=null;"

/* SSE connection */
"function connectSSE(){"
"  evtSrc=new EventSource('/api/sse');"
"  evtSrc.onopen=function(){"
"    document.getElementById('sse-dot').className='live';"
"    document.getElementById('sse-status').textContent='live';"
"  };"
"  evtSrc.onmessage=function(e){"
"    try{updateUI(JSON.parse(e.data));}catch(x){}"
"  };"
"  evtSrc.onerror=function(){"
"    document.getElementById('sse-dot').className='';"
"    document.getElementById('sse-status').textContent='reconnecting\\u2026';"
"    evtSrc.close();"
"    setTimeout(connectSSE,2000);"
"  };"
"}"

/* Main UI updater */
"function updateUI(d){"

/* Voltage / current table */
"  var rows='';"
"  var src=['ADC','Pico','ADC','Pico'];"
"  d.ports.forEach(function(p,i){"
"    var stCls=p.overcurrent?'warn':(p.relay_on?'on':'off');"
"    var stTxt=p.overcurrent?'OVERCURRENT':(p.relay_on?'ACTIVE':'IDLE');"
"    var relayCls=p.relay_on?'on':'off';"
"    rows+='<tr>'"
"         +'<td><b>SW'+(p.port)+'</b></td>'"
"         +'<td style=\\'color:#8b949e\\'>'+(src[i])+'</td>'"
"         +'<td style=\\'font-family:monospace\\'>'+(p.voltage.toFixed(1))+'&nbsp;V</td>'"
"         +'<td style=\\'font-family:monospace\\'>'+(p.current.toFixed(3))+'&nbsp;A</td>'"
"         +'<td class=\\''+relayCls+'\\'>'+(p.relay_on?'ON':'OFF')+'</td>'"
"         +'<td><span class=\\'det '+(p.overcurrent?'det-oc':(p.relay_on?'det-yes':'det-no'))+'\\'>'+(stTxt)+'</span></td>'"
"         +'</tr>';"

/* Update relay card sidebar text */
"    document.getElementById('ps'+(p.port)).textContent="
"      (p.voltage.toFixed(1))+'V  '+(p.current.toFixed(3))+'A';"
"    var pc=document.getElementById('pc'+(p.port));"
"    pc.style.borderColor=p.overcurrent?'#d29922':(p.relay_on?'#3fb950':'#30363d');"
"  });"
"  document.getElementById('stbl').innerHTML=rows;"

/* Conveyor status */
"  var dirHtml=d.conveyor_running"
"    ?(d.conveyor_dir==='forward'"
"      ?'<span class=\\'on\\'>&#9654; FORWARD</span>'"
"      :'<span class=\\'amber\\' style=\\'color:#d29922\\'>&#9664; REVERSE</span>')"
"    :'<span class=\\'off\\'>&#9646;&#9646; STOPPED</span>';"
"  document.getElementById('cdir').innerHTML=dirHtml;"
"  document.getElementById('cspd').textContent=d.conveyor_speed;"
"  document.getElementById('spdrng').value=d.conveyor_speed;"
"  document.getElementById('spd-label').textContent=d.conveyor_speed+'%';"

/* WiFi status */
"  document.getElementById('wifi-stat').innerHTML="
"    d.wifi_ok"
"      ?'<span class=\\'on\\'>Connected</span>'"
"      :'<span class=\\'off\\'>Disconnected</span>';"

/* Ultrasonic sensors */
"  if(d.ultrasonic){"
"    setUS('us-ent-cm','us-ent-st',d.ultrasonic.entrance_cm,d.ultrasonic.entrance_det);"
"    setUS('us-btop-cm','us-btop-st',d.ultrasonic.bin_top_cm,d.ultrasonic.bin_top_det);"
"    setUS('us-bbot-cm','us-bbot-st',d.ultrasonic.bin_bot_cm,d.ultrasonic.bin_bot_det);"
"  }"
"}"

/* Ultrasonic row helper */
"function setUS(cmId,stId,cm,det){"
"  var isMax=(cm>=399.9);"
"  document.getElementById(cmId).textContent=isMax?'> 400 cm (no echo)':(cm.toFixed(1)+' cm');"
"  document.getElementById(stId).innerHTML=det"
"    ?'<span class=\\'det det-yes\\'>DETECTED</span>'"
"    :'<span class=\\'det det-no\\'>CLEAR</span>';"
"}"

/* Relay helpers */
"async function relayOn(p,dur){"
"  await fetch('/api/relay/on',{method:'POST',"
"    headers:{'Content-Type':'application/x-www-form-urlencoded'},"
"    body:'port='+p+'&duration='+dur});"
"}"
"async function relayOff(p){"
"  await fetch('/api/relay/off',{method:'POST',"
"    headers:{'Content-Type':'application/x-www-form-urlencoded'},"
"    body:'port='+p});"
"}"

/* Speed slider */
"async function setSpeed(v){"
"  document.getElementById('spd-label').textContent=v+'%';"
"  await fetch('/api/conveyor/speed',{method:'POST',"
"    headers:{'Content-Type':'application/x-www-form-urlencoded'},"
"    body:'speed='+v});"
"}"

/* Generic POST */
"async function post(url){"
"  await fetch(url,{method:'POST'});"
"}"

/* WiFi reset */
"function resetWifi(){"
"  if(!confirm('Erase saved WiFi credentials and reboot into setup mode?\\n\\nContinue?'))return;"
"  fetch('/provision/reset',{method:'POST'});"
"}"

"connectSSE();"
"</script></body></html>";

// ===========================================================================
// Handlers
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /  — redirect based on WiFi state
// ---------------------------------------------------------------------------
static esp_err_t root_handler(httpd_req_t *req)
{
    // If STA is connected we're in normal mode → test page
    // Otherwise we're in provisioning mode → provision page
    const char *dest = wifi_sta_is_connected() ? "/test" : "/provision";
    httpd_resp_set_status(req, "302 Found");
    httpd_resp_set_hdr(req, "Location", dest);
    httpd_resp_send(req, NULL, 0);
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// GET /provision
// ---------------------------------------------------------------------------
static esp_err_t provision_page_handler(httpd_req_t *req)
{
    httpd_resp_set_type(req, "text/html");
    httpd_resp_send(req, s_html_provision, strlen(s_html_provision));
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// POST /provision/save  — body: ssid=...&pass=...
// ---------------------------------------------------------------------------
static esp_err_t provision_save_handler(httpd_req_t *req)
{
    char body[256] = {0};
    int  body_len  = req->content_len < (int)sizeof(body) - 1
                     ? req->content_len : (int)sizeof(body) - 1;

    if (body_len > 0) {
        httpd_req_recv(req, body, body_len);
    }

    char ssid[64] = {0};
    char pass[64] = {0};
    _form_field(body, body_len, "ssid", ssid, sizeof(ssid));
    _form_field(body, body_len, "pass", pass, sizeof(pass));

    if (ssid[0] == '\0') {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Missing ssid");
        return ESP_FAIL;
    }

    esp_err_t ret = nvs_config_set_wifi(ssid, pass);
    if (ret != ESP_OK) {
        httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "NVS write failed");
        return ESP_FAIL;
    }

    httpd_resp_set_type(req, "application/json");
    httpd_resp_sendstr(req, "{\"ok\":true,\"msg\":\"Rebooting...\"}");

    // Give the HTTP response time to flush before restart
    vTaskDelay(pdMS_TO_TICKS(600));
    esp_restart();
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// POST /provision/reset — clear NVS WiFi creds + reboot
// ---------------------------------------------------------------------------
static esp_err_t provision_reset_handler(httpd_req_t *req)
{
    nvs_config_clear_wifi();
    httpd_resp_set_type(req, "application/json");
    httpd_resp_sendstr(req, "{\"ok\":true,\"msg\":\"WiFi cleared. Rebooting...\"}");
    vTaskDelay(pdMS_TO_TICKS(600));
    esp_restart();
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// GET /test
// ---------------------------------------------------------------------------
static esp_err_t test_page_handler(httpd_req_t *req)
{
    httpd_resp_set_type(req, "text/html");
    httpd_resp_send(req, s_html_test, strlen(s_html_test));
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// GET /api/status  — JSON snapshot
// ---------------------------------------------------------------------------
static esp_err_t status_handler(httpd_req_t *req)
{
    char buf[900];
    int n = _build_sensor_json(buf, sizeof(buf));
    httpd_resp_set_type(req, "application/json");
    httpd_resp_send(req, buf, n);
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// GET /api/sse  — Server-Sent Events; streams sensor JSON every 500 ms
// ---------------------------------------------------------------------------
static esp_err_t sse_handler(httpd_req_t *req)
{
    if (s_sse_active) {
        httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR,
                            "An SSE stream is already active");
        return ESP_FAIL;
    }
    s_sse_active = 1;

    httpd_resp_set_type(req, "text/event-stream");
    httpd_resp_set_hdr(req, "Cache-Control", "no-cache");
    httpd_resp_set_hdr(req, "Connection",    "keep-alive");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

    char buf[900];
    char event[940];

    while (1) {
        int data_len = _build_sensor_json(buf, sizeof(buf));
        int evt_len  = snprintf(event, sizeof(event), "data: %.*s\n\n",
                                data_len, buf);

        esp_err_t ret = httpd_resp_send_chunk(req, event, evt_len);
        if (ret != ESP_OK) break;  // client disconnected

        vTaskDelay(pdMS_TO_TICKS(500));
    }

    httpd_resp_send_chunk(req, NULL, 0); // end chunked transfer
    s_sse_active = 0;
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// POST /api/conveyor/forward
// ---------------------------------------------------------------------------
static esp_err_t conveyor_forward_handler(httpd_req_t *req)
{
    conveyor_forward();
    httpd_resp_set_type(req, "application/json");
    httpd_resp_sendstr(req, "{\"ok\":true,\"action\":\"forward\"}");
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// POST /api/conveyor/reverse
// ---------------------------------------------------------------------------
static esp_err_t conveyor_reverse_handler(httpd_req_t *req)
{
    conveyor_reverse();
    httpd_resp_set_type(req, "application/json");
    httpd_resp_sendstr(req, "{\"ok\":true,\"action\":\"reverse\"}");
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// POST /api/conveyor/stop
// ---------------------------------------------------------------------------
static esp_err_t conveyor_stop_handler(httpd_req_t *req)
{
    conveyor_stop();
    httpd_resp_set_type(req, "application/json");
    httpd_resp_sendstr(req, "{\"ok\":true,\"action\":\"stop\"}");
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// POST /api/conveyor/speed  — body: speed=X  (0–100)
// ---------------------------------------------------------------------------
static esp_err_t conveyor_speed_handler(httpd_req_t *req)
{
    char body[32] = {0};
    int len = req->content_len < (int)sizeof(body) - 1
              ? req->content_len : (int)sizeof(body) - 1;
    if (len > 0) httpd_req_recv(req, body, len);

    char val[8] = {0};
    if (_form_field(body, len, "speed", val, sizeof(val)) < 0) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Missing speed");
        return ESP_FAIL;
    }
    int speed = atoi(val);
    if (speed < 0)   speed = 0;
    if (speed > 100) speed = 100;
    conveyor_set_speed((uint8_t)speed);

    char resp[48];
    snprintf(resp, sizeof(resp), "{\"ok\":true,\"speed\":%d}", speed);
    httpd_resp_set_type(req, "application/json");
    httpd_resp_sendstr(req, resp);
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// POST /api/relay/on  — body: port=X&duration=Y (Y in seconds)
// ---------------------------------------------------------------------------
static esp_err_t relay_on_handler(httpd_req_t *req)
{
    char body[64] = {0};
    int len = req->content_len < (int)sizeof(body) - 1
              ? req->content_len : (int)sizeof(body) - 1;
    if (len > 0) httpd_req_recv(req, body, len);

    char pval[8] = {0}, dval[16] = {0};
    if (_form_field(body, len, "port", pval, sizeof(pval)) < 0) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Missing port");
        return ESP_FAIL;
    }
    int port     = atoi(pval);
    int duration = 10;   // default 10 s
    if (_form_field(body, len, "duration", dval, sizeof(dval)) >= 0) {
        duration = atoi(dval);
    }

    esp_err_t ret = relay_enable_port((uint8_t)port, (uint32_t)duration);
    char resp[64];
    snprintf(resp, sizeof(resp), "{\"ok\":%s,\"port\":%d,\"duration\":%d}",
             ret == ESP_OK ? "true" : "false", port, duration);
    httpd_resp_set_type(req, "application/json");
    httpd_resp_sendstr(req, resp);
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// POST /api/relay/off  — body: port=X
// ---------------------------------------------------------------------------
static esp_err_t relay_off_handler(httpd_req_t *req)
{
    char body[32] = {0};
    int len = req->content_len < (int)sizeof(body) - 1
              ? req->content_len : (int)sizeof(body) - 1;
    if (len > 0) httpd_req_recv(req, body, len);

    char pval[8] = {0};
    if (_form_field(body, len, "port", pval, sizeof(pval)) < 0) {
        httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "Missing port");
        return ESP_FAIL;
    }
    int port = atoi(pval);
    relay_disable_port((uint8_t)port);

    char resp[32];
    snprintf(resp, sizeof(resp), "{\"ok\":true,\"port\":%d}", port);
    httpd_resp_set_type(req, "application/json");
    httpd_resp_sendstr(req, resp);
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// POST /api/relay/all-off
// ---------------------------------------------------------------------------
static esp_err_t relay_all_off_handler(httpd_req_t *req)
{
    relay_disable_all();
    httpd_resp_set_type(req, "application/json");
    httpd_resp_sendstr(req, "{\"ok\":true,\"action\":\"all_ports_off\"}");
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// GET /api/wifi/scan  — returns [{ssid,rssi}] JSON array
// Temporarily switches to APSTA mode to allow scanning from AP mode.
// ---------------------------------------------------------------------------
static esp_err_t wifi_scan_handler(httpd_req_t *req)
{
    // Switch to APSTA to allow scanning while keeping AP alive
    esp_wifi_set_mode(WIFI_MODE_APSTA);

    wifi_scan_config_t scan_cfg = {
        .ssid        = NULL,
        .bssid       = NULL,
        .channel     = 0,
        .show_hidden = false,
        .scan_type   = WIFI_SCAN_TYPE_ACTIVE,
    };
    esp_err_t ret = esp_wifi_scan_start(&scan_cfg, true); // blocking

    char buf[1024];
    int  n = 0;
    n += snprintf(buf + n, sizeof(buf) - n, "[");

    if (ret == ESP_OK) {
        uint16_t         num     = 12;
        wifi_ap_record_t records[12];
        esp_wifi_scan_get_ap_records(&num, records);

        char esc_ssid[66];
        for (uint16_t i = 0; i < num; i++) {
            if (records[i].ssid[0] == '\0') continue; // skip hidden
            _json_str(esc_ssid, sizeof(esc_ssid), (char *)records[i].ssid);
            n += snprintf(buf + n, sizeof(buf) - n,
                          "%s{\"ssid\":\"%s\",\"rssi\":%d}",
                          (i ? "," : ""),
                          esc_ssid, records[i].rssi);
        }
        esp_wifi_scan_stop();
    }

    n += snprintf(buf + n, sizeof(buf) - n, "]");

    // Restore AP-only mode
    esp_wifi_set_mode(WIFI_MODE_AP);

    httpd_resp_set_type(req, "application/json");
    httpd_resp_send(req, buf, n);
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// GET /api/selftest — return last self-test results as JSON
// ---------------------------------------------------------------------------
static esp_err_t selftest_handler(httpd_req_t *req)
{
    char buf[768];
    int  n = self_test_to_json(buf, sizeof(buf));
    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_send(req, buf, n);
    return ESP_OK;
}

// ---------------------------------------------------------------------------
// POST /api/reboot
// ---------------------------------------------------------------------------
static esp_err_t reboot_handler(httpd_req_t *req)
{
    httpd_resp_set_type(req, "application/json");
    httpd_resp_sendstr(req, "{\"ok\":true,\"msg\":\"Rebooting...\"}");
    vTaskDelay(pdMS_TO_TICKS(600));
    esp_restart();
    return ESP_OK;
}

// ===========================================================================
// URI routing table
// ===========================================================================
static const httpd_uri_t s_uris[] = {
    { .uri = "/",                  .method = HTTP_GET,  .handler = root_handler            },
    { .uri = "/provision",         .method = HTTP_GET,  .handler = provision_page_handler  },
    { .uri = "/provision/save",    .method = HTTP_POST, .handler = provision_save_handler  },
    { .uri = "/provision/reset",   .method = HTTP_POST, .handler = provision_reset_handler },
    { .uri = "/test",              .method = HTTP_GET,  .handler = test_page_handler       },
    { .uri = "/api/status",        .method = HTTP_GET,  .handler = status_handler          },
    { .uri = "/api/sse",           .method = HTTP_GET,  .handler = sse_handler             },
    { .uri = "/api/conveyor/forward",.method = HTTP_POST, .handler = conveyor_forward_handler },
    { .uri = "/api/conveyor/reverse",.method = HTTP_POST, .handler = conveyor_reverse_handler},
    { .uri = "/api/conveyor/stop",  .method = HTTP_POST, .handler = conveyor_stop_handler   },
    { .uri = "/api/conveyor/speed", .method = HTTP_POST, .handler = conveyor_speed_handler  },
    { .uri = "/api/relay/on",      .method = HTTP_POST, .handler = relay_on_handler        },
    { .uri = "/api/relay/off",     .method = HTTP_POST, .handler = relay_off_handler       },
    { .uri = "/api/relay/all-off", .method = HTTP_POST, .handler = relay_all_off_handler   },
    { .uri = "/api/wifi/scan",     .method = HTTP_GET,  .handler = wifi_scan_handler       },
    { .uri = "/api/selftest",      .method = HTTP_GET,  .handler = selftest_handler        },
    { .uri = "/api/reboot",        .method = HTTP_POST, .handler = reboot_handler          },
};
#define NUM_URIS  (sizeof(s_uris) / sizeof(s_uris[0]))

// ===========================================================================
// Public API
// ===========================================================================
esp_err_t web_server_start(void)
{
    httpd_config_t cfg      = HTTPD_DEFAULT_CONFIG();
    cfg.server_port         = WEB_SERVER_PORT;
    cfg.max_uri_handlers    = NUM_URIS + 2;
    cfg.stack_size          = 8192;
    cfg.recv_wait_timeout   = 5;
    cfg.send_wait_timeout   = 60;   // SSE needs a long send timeout
    cfg.lru_purge_enable    = true;

    if (httpd_start(&s_server, &cfg) != ESP_OK) {
        ESP_LOGE(LOG_TAG, "Failed to start web server");
        return ESP_FAIL;
    }

    for (int i = 0; i < (int)NUM_URIS; i++) {
        httpd_register_uri_handler(s_server, &s_uris[i]);
    }

    ESP_LOGI(LOG_TAG, "Web server started — http://%s/", AP_IP_ADDR);
    ESP_LOGI(LOG_TAG, "  /provision  WiFi setup page");
    ESP_LOGI(LOG_TAG, "  /test       Hardware test page");
    return ESP_OK;
}

esp_err_t web_server_stop(void)
{
    if (!s_server) return ESP_ERR_INVALID_STATE;
    httpd_stop(s_server);
    s_server    = NULL;
    s_sse_active = 0;
    return ESP_OK;
}

bool web_server_is_running(void)
{
    return s_server != NULL;
}
