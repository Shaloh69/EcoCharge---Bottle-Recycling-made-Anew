# EcoCharge Motor Control System

ESP32-based motor driver control system for the EcoCharge bottle recycling kiosk. This firmware provides precise motor control with safety features, designed for controlling conveyor belts or gate mechanisms.

## Overview

The EcoCharge Motor Control System is part of a larger AI-powered bottle recycling kiosk project. This ESP32 firmware controls a 12V DC motor through an L298N H-bridge driver, enabling:

- **Forward and backward** motor control
- **Variable speed** control (0-100%)
- **Serial command interface** for easy testing and debugging
- **Safety timeout** protection (30-second maximum runtime)
- **Status LED** feedback
- **Professional ESP-IDF** architecture (not Arduino)

## Features

✅ **MCPWM-based PWM generation** - Hardware PWM for precise motor control
✅ **L298N motor driver support** - Industry-standard H-bridge interface
✅ **Serial command interface** - Single-character commands for easy control
✅ **Safety monitoring** - Automatic timeout and emergency stop
✅ **Real-time status** - Query motor state, speed, and runtime
✅ **FreeRTOS tasks** - Concurrent safety monitoring and command processing
✅ **Modular architecture** - Easy to extend with WiFi/HTTP API later

## Hardware Requirements

### Components

| Component | Specification | Quantity | Purpose |
|-----------|---------------|----------|---------|
| ESP32 DevKit v1 | ESP32-WROOM-32 | 1 | Main controller |
| L298N Module | Dual H-Bridge | 1 | Motor driver |
| DC Motor | 5V, 1-2A | 1 | Actuation mechanism |
| Power Supply | 5-6V 2A | 1 | Motor power |
| USB Cable | Micro-USB | 1 | ESP32 programming & power |
| Jumper Wires | Dupont M-M | ~6 | Connections |

### Pin Connections

```
ESP32 GPIO 25  →  L298N IN1   (Direction - Forward)
ESP32 GPIO 26  →  L298N IN2   (Direction - Backward)
ESP32 GPIO 27  →  L298N ENA   (Speed - PWM)
ESP32 GND      →  L298N GND   (Common ground - CRITICAL!)

L298N OUT1     →  Motor (+)
L298N OUT2     →  Motor (-)

5V Supply (+)  →  L298N +12V (terminal accepts 5-35V)
5V Supply (-)  →  L298N GND
```

**⚠️ IMPORTANT**: ESP32 and L298N must share a **common ground** connection, otherwise the motor will not respond to commands.

For detailed wiring instructions with diagrams, see **[WIRING.md](WIRING.md)**.

## Software Setup

### Prerequisites

- [PlatformIO](https://platformio.org/) (CLI or VSCode extension)
- USB drivers for ESP32 (CH340/CP2102)
- Serial terminal (PlatformIO monitor, minicom, or PuTTY)

### Installation Steps

1. **Clone or navigate to the project**:
   ```bash
   cd c:/Projects/Thesis/2026/EcoCharge/esp/motor
   ```

2. **Build the firmware**:
   ```bash
   pio run
   ```

3. **Connect ESP32 via USB** and upload:
   ```bash
   pio run --target upload
   ```

4. **Open serial monitor**:
   ```bash
   pio device monitor
   ```

5. **Verify startup**:
   ```
   ========================================
     EcoCharge Motor Control System
     ESP32 + L298N Motor Driver
   ========================================

   Motor Control System Ready!
   Type 'H' for help, '?' for status

   >
   ```

## Usage Guide

### Method 1: WiFi Web Interface (Recommended)

The easiest way to control the motor is through the web interface on your phone or tablet!

**Step 1: Connect to WiFi**
1. Upload firmware to ESP32
2. ESP32 creates a WiFi hotspot automatically
3. On your phone, go to WiFi settings
4. Connect to: **EcoCharge-Motor**
5. Password: **motor123**

**Step 2: Open Web Interface**
1. Open any web browser on your phone
2. Go to: **http://192.168.4.1**
3. You'll see a beautiful control interface!

**Web Interface Features:**
- 🎮 **Direction Control**: Forward, Backward, Stop buttons
- ⏱️ **Timed Operations**: Run motor for 3s, 5s, or 10s automatically
- 🎚️ **Speed Control**: Slider to adjust speed (20-100%)
- 📊 **Real-time Status**: Live display of motor state and runtime
- 📱 **Mobile-Optimized**: Works perfectly on phones and tablets

**Timed Operation Examples:**
- Press "FWD 3s" - Motor runs forward for exactly 3 seconds, then stops
- Press "BWD 5s" - Motor runs backward for 5 seconds, then stops
- Press "FWD 10s" - Motor runs forward for 10 seconds, then stops

### Method 2: Serial Commands

The system accepts single-character commands via serial terminal (115200 baud):

| Command | Action | Description |
|---------|--------|-------------|
| `F` or `f` | **Forward** | Move motor forward at current speed |
| `B` or `b` | **Backward** | Move motor backward at current speed |
| `S` or `s` | **Stop** | Stop motor immediately |
| `0-9` | **Set Speed** | Set speed (0=stop, 5=50%, 9=90%) |
| `+` | **Increase** | Increase speed by 10% |
| `-` | **Decrease** | Decrease speed by 10% |
| `?` | **Status** | Print current motor status |
| `H` or `h` | **Help** | Print command help |

### Example Usage

```
> 5              # Set speed to 50%
Speed set to: 50%

> F              # Start moving forward
Motor: FORWARD at 50%

> 7              # Increase speed to 70% while running
Speed set to: 70%

> +              # Increase to 80%
Speed increased to: 80%

> S              # Stop motor
Motor: STOPPED

> 9              # Set speed to 90%
Speed set to: 90%

> B              # Run backward at 90%
Motor: BACKWARD at 90%

> ?              # Check status
--- Motor Status ---
State:    BACKWARD
Speed:    90%
Runtime:  2345 ms
Running:  YES
Timeout:  NO
--------------------
```

### Safety Features

**Automatic Timeout (30 seconds)**:
- Motor automatically stops after 30 seconds of continuous operation
- LED blinks slowly to indicate timeout
- Press `S` to reset and allow new commands

**Status LED Indicators**:
- **OFF**: Motor stopped
- **SOLID ON**: Motor running
- **FAST BLINK**: System initializing
- **SLOW BLINK**: Timeout/error occurred

**Emergency Stop**:
- Triggered automatically on timeout
- Can be triggered manually via serial (`S` command)
- Requires reset before motor can run again

## Architecture

### Software Components

```
┌─────────────────────────────────────────┐
│         app_main() - Main Loop          │
│  ┌───────────────────────────────────┐  │
│  │   Serial Command Processing       │  │
│  │   - UART read                     │  │
│  │   - Command parsing               │  │
│  │   - Motor API calls               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│      Motor Control API (motor_control.c)│
│  ┌───────────────────────────────────┐  │
│  │ motor_forward()                   │  │
│  │ motor_backward()                  │  │
│  │ motor_stop()                      │  │
│  │ motor_set_speed()                 │  │
│  │ motor_get_status()                │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│        Hardware Layer (ESP-IDF)         │
│  ┌─────────────┐     ┌──────────────┐   │
│  │   MCPWM     │     │    GPIO      │   │
│  │   (PWM on   │     │  (Direction  │   │
│  │   GPIO 27)  │     │   GPIO 25/26)│   │
│  └─────────────┘     └──────────────┘   │
└─────────────────────────────────────────┘
              │
              ↓
        L298N Motor Driver
              │
              ↓
          12V DC Motor
```

### FreeRTOS Tasks

| Task | Priority | Function |
|------|----------|----------|
| **Main Loop** | Normal | Command processing |
| **Safety Monitor** | High (5) | Timeout checking, LED control |

## API Reference

### Motor Control Functions

#### `motor_init()`
Initialize motor control system. Must be called before other functions.

**Returns**: `ESP_OK` on success

---

#### `motor_forward(uint8_t speed)`
Move motor forward at specified speed.

**Parameters**:
- `speed`: Speed percentage (0-100)

**Returns**: `ESP_OK` on success, `ESP_ERR_INVALID_ARG` if speed > 100

**Note**: Speeds below 20% may not overcome static friction.

---

#### `motor_backward(uint8_t speed)`
Move motor backward at specified speed.

**Parameters**:
- `speed`: Speed percentage (0-100)

**Returns**: `ESP_OK` on success, `ESP_ERR_INVALID_ARG` if speed > 100

---

#### `motor_stop()`
Stop motor immediately and reset timeout.

**Returns**: `ESP_OK` on success

---

#### `motor_set_speed(uint8_t speed)`
Change motor speed while running or set speed for next movement.

**Parameters**:
- `speed`: New speed percentage (0-100)

**Returns**: `ESP_OK` on success

---

#### `motor_get_status(motor_status_t *status)`
Get current motor status.

**Parameters**:
- `status`: Pointer to status structure

**Returns**: `ESP_OK` on success

**Status Structure**:
```c
typedef struct {
    motor_state_t state;        // MOTOR_STOPPED, MOTOR_FORWARD, MOTOR_BACKWARD
    uint8_t speed;              // Current speed (0-100%)
    uint32_t runtime_ms;        // Runtime since start (milliseconds)
    bool timeout_occurred;      // True if timeout occurred
    bool is_running;            // True if motor is running
} motor_status_t;
```

## Configuration

### Modifying Pin Assignments

Edit [include/config.h](include/config.h):

```c
#define MOTOR_PIN_IN1        25    // Change to your pin
#define MOTOR_PIN_IN2        26
#define MOTOR_PIN_ENA        27
#define STATUS_LED_PIN        2
```

### Adjusting Safety Parameters

```c
#define MOTOR_TIMEOUT_MS     30000  // Timeout in milliseconds
#define MOTOR_MIN_DUTY       20     // Minimum speed to overcome friction
#define MOTOR_PWM_FREQ_HZ    1000   // PWM frequency (500-5000 Hz)
```

### Serial Communication

```c
#define UART_BAUD_RATE       115200  // Serial baud rate
```

## Troubleshooting

### Motor Doesn't Run

**Problem**: Motor doesn't respond to commands
**Solutions**:
1. Check common ground connection between ESP32 and L298N
2. Verify all wiring matches [WIRING.md](WIRING.md)
3. Test with higher speed (50%+) - low speeds may not start motor
4. Check L298N LED indicators (should light when commands sent)
5. Measure GPIO outputs with multimeter (~3.3V when HIGH)

### Motor Runs Backward When Commanded Forward

**Problem**: Motor direction is reversed
**Solution**: Swap OUT1 and OUT2 connections on L298N

### ESP32 Resets When Motor Starts

**Problem**: ESP32 reboots when motor runs
**Solutions**:
1. Use separate power supply for ESP32 (USB) and motor (5V)
2. Ensure common ground connection
3. Add 100µF capacitor across motor terminals (reduces electrical noise)
4. Check power supply can provide sufficient current (2A recommended)

### Motor Runs Weak or Slow

**Problem**: Motor lacks power even at high speed settings
**Cause**: L298N has ~2V voltage drop, so 5V input only gives ~3V to motor
**Solutions**:
1. Use 6V power supply instead of 5V (motor will get ~4V)
2. Run at higher speeds (80-100%)
3. For better efficiency, consider upgrading to TB6612FNG driver (0.5V drop)
4. Alternatively, use L293D (smaller drop than L298N)

### Motor Timeout Triggers Immediately

**Problem**: Motor stops after 30 seconds
**Solution**: This is normal safety behavior. Press `S` to reset, then issue new command. To change timeout, edit `MOTOR_TIMEOUT_MS` in [config.h](include/config.h).

### Serial Monitor Shows Gibberish

**Problem**: Unreadable serial output
**Solutions**:
1. Set baud rate to 115200
2. Press ESP32 reset button after opening monitor
3. Check USB cable and drivers

### Build Errors

**Problem**: Compilation fails
**Solutions**:
1. Clean build: `pio run --target clean`
2. Update PlatformIO: `pio upgrade`
3. Check ESP-IDF framework is installed
4. Verify `platformio.ini` is correct

## Web API Reference

The web server provides REST API endpoints for programmatic control:

### GET /api/motor/status
Get current motor status.

**Response:**
```json
{
  "state": 0,           // 0=STOPPED, 1=FORWARD, 2=BACKWARD
  "speed": 50,          // Current speed (0-100%)
  "runtime_ms": 1234,   // Runtime in milliseconds
  "is_running": false,  // true if motor is running
  "timeout": false      // true if timeout occurred
}
```

### POST /api/motor/forward
Move motor forward.

**Request:**
```json
{
  "speed": 75,          // Speed (20-100%)
  "duration": 5000      // Optional: Duration in ms (for timed operation)
}
```

### POST /api/motor/backward
Move motor backward.

**Request:**
```json
{
  "speed": 75,
  "duration": 3000      // Optional: Duration in ms
}
```

### POST /api/motor/stop
Stop motor immediately.

### POST /api/motor/speed
Set motor speed.

**Request:**
```json
{
  "speed": 80           // New speed (20-100%)
}
```

## Future Enhancements

### Additional Features (Optional)
- Current sensing (overcurrent protection)
- Limit switches (position feedback)
- Encoder support (precise positioning)
- Multi-motor control
- MQTT protocol
- OTA firmware updates

See the main plan document for detailed implementation roadmap.

## Development

### Project Structure

```
esp/motor/
├── src/
│   ├── main.c                 # Main application + serial commands
│   └── motor_control.c        # Motor driver implementation
├── include/
│   ├── config.h              # Configuration constants
│   └── motor_control.h       # Motor API declarations
├── README.md                 # This file
├── WIRING.md                 # Wiring guide
├── platformio.ini            # PlatformIO configuration
└── sdkconfig.esp32dev        # ESP-IDF configuration
```

### Building from Source

```bash
# Build
pio run

# Upload
pio run --target upload

# Monitor
pio device monitor

# Clean
pio run --target clean

# All-in-one
pio run --target upload && pio device monitor
```

### Debugging

Enable debug logging by setting in [config.h](include/config.h):

```c
#define DEBUG_ENABLE         1
```

View logs in serial monitor:
```
I (324) MOTOR: Initializing motor control system...
I (330) MOTOR: Configuring MCPWM for GPIO 27
I (335) MOTOR: Motor control initialized successfully
```

## Contributing

This project is part of a thesis. For questions or issues:
- Check [WIRING.md](WIRING.md) for hardware help
- Review troubleshooting section above
- Check ESP-IDF documentation for framework questions

## License

Part of the EcoCharge thesis project (2026).

## Acknowledgments

- **ESP-IDF Framework**: Espressif Systems
- **PlatformIO**: Professional embedded development platform
- **L298N Motor Driver**: STMicroelectronics

---

## Quick Start Checklist

### Hardware Setup
- [ ] Hardware assembled per [WIRING.md](WIRING.md)
- [ ] Common ground connected between ESP32 and L298N
- [ ] 5-6V power supply connected to L298N
- [ ] Motor connected to OUT1 and OUT2

### Software Setup
- [ ] PlatformIO installed
- [ ] Firmware built successfully (`pio run`)
- [ ] Firmware uploaded to ESP32 (`pio run --target upload`)
- [ ] Serial monitor shows "Motor Control System Ready!"

### WiFi Web Interface Test
- [ ] Connect phone to WiFi "EcoCharge-Motor" (password: motor123)
- [ ] Open browser to http://192.168.4.1
- [ ] Web interface loads and displays motor status
- [ ] Test "FWD 3s" button (motor runs forward for 3 seconds)
- [ ] Test "Stop" button (motor stops immediately)
- [ ] Test speed slider and "Set Speed" button

### Serial Interface Test (Optional)
- [ ] Tested with `H` command (help)
- [ ] Tested with `5` then `F` (50% forward)
- [ ] Tested with `S` (stop)

**If all checks pass, your motor control system is working!** 🎉

You can now control your motor from your phone! 📱

For advanced integration with the EcoCharge kiosk system, see the main project documentation.
