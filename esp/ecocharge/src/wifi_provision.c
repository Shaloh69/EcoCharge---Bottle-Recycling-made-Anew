#include "wifi_provision.h"
#include "config.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "lwip/sockets.h"
#include <string.h>

// ============================================================================
// EcoCharge Captive Portal — DNS server
//
// Responds to every DNS A-record query with 192.168.4.1 so that phones
// auto-detect a captive portal and open the browser.
//
// Implementation: plain UDP socket on port 53.  We copy the incoming query,
// flip the QR bit in the header flags, set ANCOUNT=1, and append a single
// A-record answer pointing to AP_IP_ADDR.
// ============================================================================

#define DNS_PORT        53
#define DNS_BUF_SIZE    512

// Packed IP bytes for 192.168.4.1
#define AP_IP_B0   192
#define AP_IP_B1   168
#define AP_IP_B2     4
#define AP_IP_B3     1

static volatile bool     s_running         = false;
static TaskHandle_t      s_dns_task_handle = NULL;

// ---------------------------------------------------------------------------
// DNS server task
// ---------------------------------------------------------------------------
static void dns_task(void *arg)
{
    struct sockaddr_in srv = {
        .sin_family      = AF_INET,
        .sin_addr.s_addr = htonl(INADDR_ANY),
        .sin_port        = htons(DNS_PORT),
    };

    int sock = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (sock < 0) {
        ESP_LOGE(LOG_TAG, "DNS: socket() failed");
        vTaskDelete(NULL);
        return;
    }

    // Allow 1-second receive timeout so we can check s_running periodically
    struct timeval tv = { .tv_sec = 1, .tv_usec = 0 };
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

    if (bind(sock, (struct sockaddr *)&srv, sizeof(srv)) < 0) {
        ESP_LOGE(LOG_TAG, "DNS: bind() failed");
        close(sock);
        vTaskDelete(NULL);
        return;
    }

    ESP_LOGI(LOG_TAG, "Captive portal DNS server running on port %d", DNS_PORT);

    uint8_t buf[DNS_BUF_SIZE];
    struct sockaddr_in cli;
    socklen_t cli_len = sizeof(cli);

    while (s_running) {
        int len = recvfrom(sock, buf, sizeof(buf) - 16, 0,
                           (struct sockaddr *)&cli, &cli_len);
        if (len < 12) continue;   // timeout or malformed — keep looping

        // ----------------------------------------------------------------
        // Build DNS response:
        //   1. Copy the entire query packet (header + question section)
        //   2. Overwrite flags: QR=1 (response), AA=1, RD=1, RA=1
        //   3. Set ANCOUNT = 1
        //   4. Append a single A-record answer RR
        // ----------------------------------------------------------------
        uint8_t resp[DNS_BUF_SIZE];
        memcpy(resp, buf, len);

        // Flags (bytes 2-3): 0x8180 = QR=1, AA=1, RD=1, RA=1, RCODE=0
        resp[2] = 0x81;
        resp[3] = 0x80;
        // ANCOUNT = 1 (bytes 6-7)
        resp[6] = 0x00;
        resp[7] = 0x01;

        // Append answer RR at offset `len`
        int off = len;
        resp[off++] = 0xC0;   // pointer marker
        resp[off++] = 0x0C;   // pointer to offset 12 (start of question name)
        resp[off++] = 0x00; resp[off++] = 0x01;   // TYPE  = A
        resp[off++] = 0x00; resp[off++] = 0x01;   // CLASS = IN
        resp[off++] = 0x00; resp[off++] = 0x00;   // TTL (high)
        resp[off++] = 0x00; resp[off++] = 0x3C;   // TTL (low) — 60 s
        resp[off++] = 0x00; resp[off++] = 0x04;   // RDLENGTH = 4
        resp[off++] = AP_IP_B0;
        resp[off++] = AP_IP_B1;
        resp[off++] = AP_IP_B2;
        resp[off++] = AP_IP_B3;

        sendto(sock, resp, off, 0, (struct sockaddr *)&cli, cli_len);
    }

    close(sock);
    ESP_LOGI(LOG_TAG, "DNS server stopped");
    vTaskDelete(NULL);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
esp_err_t wifi_provision_start(void)
{
    if (s_running) return ESP_ERR_INVALID_STATE;
    s_running = true;
    BaseType_t ok = xTaskCreate(dns_task, "dns_prov", 4096, NULL, 3,
                                &s_dns_task_handle);
    if (ok != pdPASS) {
        s_running = false;
        return ESP_FAIL;
    }
    return ESP_OK;
}

esp_err_t wifi_provision_stop(void)
{
    s_running = false;
    s_dns_task_handle = NULL;
    return ESP_OK;
}

bool wifi_provision_is_active(void)
{
    return s_running;
}
