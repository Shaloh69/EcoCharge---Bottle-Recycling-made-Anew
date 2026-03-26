// EcoCharge — Pico Sensor Reader
//
// Reads 4 analog sensors for SW2 and SW4 charging ports,
// sends raw 12-bit ADC values to ESP32 over UART0 every 500 ms.
//
// ADC Pin Mapping:
//   GP26 (A0) — SW2 voltage sensor output
//   GP27 (A1) — SW2 current sensor output
//   GP28 (A2) — SW4 voltage sensor output
//   GP29 (A3) — SW4 current sensor output
//
// UART Wiring (UART0):
//   GP0 (TX) → ESP32 GPIO17 (RX)
//   GP1 (RX) ← ESP32 GPIO4  (TX)
//   GND      → ESP32 GND   (MUST be shared)
//
// Output format (one line every 500 ms):
//   "SW2V,SW2I,SW4V,SW4I\n"
//   e.g. "1234,2048,3100,1900\n"
//   Values are raw 12-bit ADC integers (0–4095).
//   ESP32 applies the sensor conversion formulas.

#include <Arduino.h>

#define PIN_SW2_V   A0   // GP26
#define PIN_SW2_I   A1   // GP27
#define PIN_SW4_V   A2   // GP28
#define PIN_SW4_I   A3   // GP29

#define SAMPLE_MS   500

void setup()
{
    // Serial  = USB (debug, optional)
    // Serial1 = UART0 GP0/GP1 → ESP32
    Serial.begin(115200);
    Serial1.begin(115200);
    analogReadResolution(12);   // 12-bit ADC: 0–4095
}

void loop()
{
    int sw2v = analogRead(PIN_SW2_V);
    int sw2i = analogRead(PIN_SW2_I);
    int sw4v = analogRead(PIN_SW4_V);
    int sw4i = analogRead(PIN_SW4_I);

    // Send to ESP32
    Serial1.printf("%d,%d,%d,%d\n", sw2v, sw2i, sw4v, sw4i);

    // Mirror to USB serial for debugging
    Serial.printf("SW2V=%d SW2I=%d SW4V=%d SW4I=%d\n", sw2v, sw2i, sw4v, sw4i);

    delay(SAMPLE_MS);
}
