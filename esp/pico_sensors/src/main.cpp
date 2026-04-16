// EcoCharge — Pico Sensor Reader
//
// Reads 3 analog sensors for SW2 and SW4 charging ports,
// sends raw 12-bit ADC values to ESP32 over UART0 every 500 ms.
//
// ADC Pin Mapping:
//   GP26 (A0) — SW2 voltage sensor
//   GP27 (A1) — SW2 current sensor
//   GP28 (A2) — SW4 voltage sensor
//   GP29      — NOT a physical header pin on standard Pico — not used
//
// SW4 current is now read directly by ESP32 on GPIO12 (ADC2_CH5).
//
// UART Wiring (UART0):
//   GP0 (TX) → ESP32 GPIO17 (RX)
//   GP1 (RX) ← ESP32 GPIO4  (TX)  [unused on Pico side]
//   GND      → ESP32 GND          [MUST be shared]
//
// Output format (one line every 500 ms):
//   "SW2V,SW2I,SW4V\n"
//   e.g. "1234,2048,3100\n"
//   Values are raw 12-bit ADC integers (0–4095).
//   ESP32 applies the sensor conversion formulas.

#include <Arduino.h>

#define PIN_SW2_V   A0   // GP26
#define PIN_SW2_I   A1   // GP27
#define PIN_SW4_V   A2   // GP28

#define SAMPLE_MS   500

void setup()
{
    // Serial  = USB (debug)
    // Serial1 = UART0 GP0/GP1 → ESP32
    Serial.begin(115200);
    Serial1.begin(115200);
    analogReadResolution(12);   // 12-bit: 0–4095
    Serial.println("EcoCharge Pico sensor bridge started (SW2V, SW2I, SW4V)");
}

void loop()
{
    int sw2v = analogRead(PIN_SW2_V);
    int sw2i = analogRead(PIN_SW2_I);
    int sw4v = analogRead(PIN_SW4_V);

    // Send 3 values to ESP32
    Serial1.printf("%d,%d,%d\n", sw2v, sw2i, sw4v);

    // Mirror to USB serial for debugging
    Serial.printf("SW2V=%-4d SW2I=%-4d SW4V=%-4d\n", sw2v, sw2i, sw4v);

    delay(SAMPLE_MS);
}
