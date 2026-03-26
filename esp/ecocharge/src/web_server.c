#include "web_server.h"
#include "config.h"
#include "relay_control.h"
#include "sensor_monitor.h"
#include "conveyor_motor.h"
#include "wifi_sta.h"
#include "nvs_config.h"
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
    n += snprintf(buf + n, buf_len - n, "]}");
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
"body{font-family:sans-serif;background:#0d1117;color:#c9d1d9;margin:0;padding:16px;max-width:480px;margin:0 auto}"
"h1{color:#58a6ff;margin-bottom:2px}p.sub{color:#8b949e;margin-top:0;font-size:13px}"
".card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:20px;margin:14px 0}"
".card h2{color:#58a6ff;font-size:15px;margin:0 0 14px}"
"label{display:block;color:#8b949e;font-size:12px;margin-bottom:4px;margin-top:10px}"
"input,select{width:100%;background:#21262d;border:1px solid #30363d;color:#c9d1d9;"
"border-radius:6px;padding:9px 10px;font-size:14px}"
"button{display:block;width:100%;background:#238636;color:#fff;border:none;"
"border-radius:6px;padding:11px;cursor:pointer;font-size:14px;margin-top:10px;font-weight:600}"
"button.sec{background:#21262d;border:1px solid #30363d}"
"#msg{display:none;background:#1e3a1e;color:#3fb950;border:1px solid #3fb950;"
"border-radius:6px;padding:12px;margin-top:12px;text-align:center;font-size:14px}"
"#scanlist{margin-top:6px}"
"</style></head><body>"
"<h1>&#x1F50C; EcoCharge Setup</h1>"
"<p class='sub'>Connect to WiFi to begin operation</p>"
"<div class='card'>"
"<h2>WiFi Configuration</h2>"
"<label>Network Name (SSID)</label>"
"<input type='text' id='ssid' list='nets' placeholder='Type or select your WiFi network'>"
"<datalist id='nets'></datalist>"
"<label>Password</label>"
"<input type='password' id='pass' placeholder='WiFi password'>"
"<button onclick='save()'>Save &amp; Connect</button>"
"<button class='sec' onclick='doScan()' id='scanBtn'>&#128268; Scan for Networks</button>"
"</div>"
"<div id='msg'></div>"
"<div class='card'><p style='color:#8b949e;font-size:12px;margin:0'>"
"Firmware: " FIRMWARE_VERSION " &nbsp;|&nbsp; Backend: " RENDER_BASE_URL
"</p></div>"
"<script>"
"async function doScan(){"
"  var b=document.getElementById('scanBtn');"
"  b.textContent='Scanning\\u2026';b.disabled=true;"
"  try{"
"    var r=await fetch('/api/wifi/scan');"
"    var d=await r.json();"
"    var dl=document.getElementById('nets');"
"    dl.innerHTML=d.map(function(s){return'<option value=\"'+s.ssid+'\">';}).join('');"
"    b.textContent='\\u2714 Found '+d.length+' networks';"
"  }catch(e){b.textContent='Scan failed';}"
"  b.disabled=false;"
"}"
"async function save(){"
"  var ssid=document.getElementById('ssid').value.trim();"
"  var pass=document.getElementById('pass').value;"
"  if(!ssid){alert('Please enter a network name.');return;}"
"  var body='ssid='+encodeURIComponent(ssid)+'&pass='+encodeURIComponent(pass);"
"  try{"
"    var r=await fetch('/provision/save',{method:'POST',"
"      headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body});"
"    if(r.ok){"
"      var m=document.getElementById('msg');"
"      m.innerHTML='&#x2705; Saved! Rebooting in 3 seconds\\u2026';"
"      m.style.display='block';"
"    }"
"  }catch(e){alert('Save failed: '+e);}"
"}"
"</script></body></html>";

// ---------------------------------------------------------------------------
// Hardware test page — relays, live sensor readings via SSE, servo control
// ---------------------------------------------------------------------------
static const char *s_html_test =
"<!DOCTYPE html><html><head>"
"<meta charset='UTF-8'>"
"<meta name='viewport' content='width=device-width,initial-scale=1'>"
"<title>EcoCharge Hardware Test</title>"
"<style>"
"*{box-sizing:border-box}"
"body{font-family:sans-serif;background:#0d1117;color:#c9d1d9;margin:0;padding:14px;max-width:700px;margin:0 auto}"
"h1{color:#58a6ff;margin-bottom:2px}p.sub{color:#8b949e;margin-top:0;font-size:13px}"
".card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:16px;margin:12px 0}"
".card h2{color:#58a6ff;font-size:15px;margin:0 0 12px}"
"table{width:100%;border-collapse:collapse;font-size:13px}"
"td,th{padding:7px 10px;border:1px solid #30363d;text-align:left}"
"th{background:#21262d;color:#8b949e;font-weight:600}"
".on{color:#3fb950;font-weight:600}.off{color:#f85149;font-weight:600}"
".warn{color:#d29922;font-weight:600}"
".port-card{display:flex;align-items:center;gap:10px;padding:10px;"
"background:#21262d;border:1px solid #30363d;border-radius:8px;margin-bottom:8px;flex-wrap:wrap}"
".port-label{font-weight:600;min-width:60px}"
".port-stat{font-size:12px;color:#8b949e;flex:1}"
".btn-row{display:flex;gap:6px}"
"button{background:#238636;color:#fff;border:none;border-radius:6px;"
"padding:7px 12px;cursor:pointer;font-size:12px;font-weight:600}"
"button.off-btn{background:#da3633}"
"button.blue{background:#1f6feb}"
"button.grey{background:#21262d;border:1px solid #30363d}"
"input[type=range]{width:100%;accent-color:#58a6ff}"
"#servo-angle-label{font-size:18px;font-weight:600;color:#58a6ff;display:inline-block;min-width:50px}"
".wifi-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}"
"#sse-status{font-size:12px;color:#8b949e}"
"</style></head><body>"
"<h1>EcoCharge Hardware Test</h1>"
"<p class='sub'>Live sensor data &mdash; <span id='sse-status'>connecting&#x2026;</span></p>"

"<div class='card'>"
"<h2>Sensor Readings</h2>"
"<table><thead><tr><th>Port</th><th>Relay</th><th>Current</th><th>Voltage</th><th>State</th></tr></thead>"
"<tbody id='stbl'>"
"<tr><td colspan='5' style='color:#8b949e'>Waiting for data&#x2026;</td></tr>"
"</tbody></table>"
"</div>"

"<div class='card'>"
"<h2>Relay Control</h2>"
"<div id='relay-cards'>"
"<div class='port-card' id='pc1'><span class='port-label'>Port 1</span>"
"<span class='port-stat' id='ps1'>-</span>"
"<div class='btn-row'>"
"<button onclick='relayOn(1,10)'>ON 10s</button>"
"<button onclick='relayOn(1,30)'>ON 30s</button>"
"<button onclick='relayOn(1,600)'>ON 10m</button>"
"<button class='off-btn' onclick='relayOff(1)'>OFF</button>"
"</div></div>"
"<div class='port-card' id='pc2'><span class='port-label'>Port 2</span>"
"<span class='port-stat' id='ps2'>-</span>"
"<div class='btn-row'>"
"<button onclick='relayOn(2,10)'>ON 10s</button>"
"<button onclick='relayOn(2,30)'>ON 30s</button>"
"<button onclick='relayOn(2,600)'>ON 10m</button>"
"<button class='off-btn' onclick='relayOff(2)'>OFF</button>"
"</div></div>"
"<div class='port-card' id='pc3'><span class='port-label'>Port 3</span>"
"<span class='port-stat' id='ps3'>-</span>"
"<div class='btn-row'>"
"<button onclick='relayOn(3,10)'>ON 10s</button>"
"<button onclick='relayOn(3,30)'>ON 30s</button>"
"<button onclick='relayOn(3,600)'>ON 10m</button>"
"<button class='off-btn' onclick='relayOff(3)'>OFF</button>"
"</div></div>"
"<div class='port-card' id='pc4'><span class='port-label'>Port 4</span>"
"<span class='port-stat' id='ps4'>-</span>"
"<div class='btn-row'>"
"<button onclick='relayOn(4,10)'>ON 10s</button>"
"<button onclick='relayOn(4,30)'>ON 30s</button>"
"<button onclick='relayOn(4,600)'>ON 10m</button>"
"<button class='off-btn' onclick='relayOff(4)'>OFF</button>"
"</div></div>"
"<button class='off-btn' style='width:100%;margin-top:8px' onclick='post(\"/api/relay/all-off\")'>"
"&#9888; Emergency OFF (all ports)</button>"
"</div></div>"

"<div class='card'>"
"<h2>Conveyor Belt (L298N)</h2>"
"<div id='conv-stat' style='margin-bottom:12px;font-size:14px'>Status: <span id='cdir'>-</span> &nbsp; Speed: <span id='cspd'>-</span>%</div>"
"<div class='btn-row' style='margin-bottom:12px'>"
"<button class='blue' onclick='post(\"/api/conveyor/forward\")'>&#9654; Forward</button>"
"<button class='grey' onclick='post(\"/api/conveyor/reverse\")'>&#9664; Reverse</button>"
"<button class='off-btn' onclick='post(\"/api/conveyor/stop\")'>&#9646;&#9646; Stop</button>"
"</div>"
"<label style='color:#8b949e;font-size:12px'>Speed</label>"
"<div style='display:flex;align-items:center;gap:12px'>"
"<input type='range' min='0' max='100' value='75' id='spdrng' oninput='setSpeed(this.value)'>"
"<span id='spd-label'>75%</span>"
"</div></div>"

"<div class='card'>"
"<h2>WiFi &amp; System</h2>"
"<div class='wifi-row'>"
"<span>Status: <span id='wifi-stat'>-</span></span>"
"</div>"
"<div class='btn-row' style='margin-top:12px'>"
"<button class='off-btn' onclick='resetWifi()'>Reset WiFi (reboot to setup)</button>"
"<button class='grey' onclick='post(\"/api/reboot\")'>Reboot</button>"
"</div></div>"

"<script>"
// SSE connection for live sensor data
"var evtSrc=null;"
"function connectSSE(){"
"  evtSrc=new EventSource('/api/sse');"
"  evtSrc.onopen=function(){"
"    document.getElementById('sse-status').textContent='live';"
"  };"
"  evtSrc.onmessage=function(e){"
"    var d=JSON.parse(e.data);"
"    updateSensors(d);"
"  };"
"  evtSrc.onerror=function(){"
"    document.getElementById('sse-status').textContent='reconnecting\\u2026';"
"    evtSrc.close();"
"    setTimeout(connectSSE,2000);"
"  };"
"}"
"function updateSensors(d){"
"  var rows='';"
"  d.ports.forEach(function(p){"
"    var st=p.overcurrent?'<span class=\\'warn\\'>OVERCURRENT</span>'"
"           :(p.relay_on?'<span class=\\'on\\'>ACTIVE</span>':'<span class=\\'off\\'>IDLE</span>');"
"    rows+='<tr><td>'+p.port+'</td>'"
"         +'<td class=\\''+(p.relay_on?'on':'off')+'\\''+'>'+(p.relay_on?'ON':'OFF')+'</td>'"
"         +'<td class=\\''+(p.overcurrent?'warn':'')+'\\''+'>'+(p.current.toFixed(2))+'A</td>'"
"         +'<td>'+(p.voltage.toFixed(0))+'V</td>'"
"         +'<td>'+st+'</td></tr>';"
"    document.getElementById('ps'+(p.port)).textContent="
"      (p.current.toFixed(2))+'A / '+(p.voltage.toFixed(0))+'V';"
"    var pc=document.getElementById('pc'+(p.port));"
"    pc.style.borderColor=p.overcurrent?'#d29922':(p.relay_on?'#3fb950':'#30363d');"
"  });"
"  document.getElementById('stbl').innerHTML=rows;"
"  document.getElementById('wifi-stat').innerHTML="
"    d.wifi_ok?'<span class=\\'on\\'>Connected</span>':'<span class=\\'off\\'>Disconnected</span>';"
"  var dirLabel=d.conveyor_running"
"    ?(d.conveyor_dir==='forward'?'<span class=\\'on\\'>FORWARD</span>':'<span class=\\'on\\'>REVERSE</span>')"
"    :'<span class=\\'off\\'>STOPPED</span>';"
"  document.getElementById('cdir').innerHTML=dirLabel;"
"  document.getElementById('cspd').textContent=d.conveyor_speed;"
"  document.getElementById('spdrng').value=d.conveyor_speed;"
"  document.getElementById('spd-label').textContent=d.conveyor_speed+'%';"
"}"
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
"async function setSpeed(v){"
"  document.getElementById('spd-label').textContent=v+'%';"
"  await fetch('/api/conveyor/speed',{method:'POST',"
"    headers:{'Content-Type':'application/x-www-form-urlencoded'},"
"    body:'speed='+v});"
"}"
"async function post(url){"
"  await fetch(url,{method:'POST'});"
"}"
"function resetWifi(){"
"  if(!confirm('This will erase saved WiFi credentials and reboot.\\n\\nContinue?'))return;"
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
    char buf[640];
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

    char buf[700];
    char event[730];

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
