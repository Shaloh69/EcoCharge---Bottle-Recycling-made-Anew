# EcoCharge Motor Control - Wiring Guide

Complete wiring instructions for connecting the ESP32 to the L298N motor driver and 12V DC motor.

## ⚠️ Important: 5V Motor Considerations

**L298N Voltage Drop Issue**:
The L298N has approximately **2V voltage drop** across its H-bridge transistors. This is critical for 5V motors:

- **5V supply** → L298N drops 2V → Motor receives only **~3V** (60% power)
- **6V supply** → L298N drops 2V → Motor receives **~4V** (80% power) ✅ **Recommended**

**Recommendations for Best Performance**:
1. ✅ **Use 6V power supply** instead of 5V (motor will be much stronger)
2. ✅ **Run at higher speeds** (80-90%) to compensate for voltage loss
3. ⚠️ **Consider TB6612FNG** driver for future - only 0.5V drop (much better for 5V motors)

**Why L298N still works**: While not ideal, L298N can drive 5V motors if you:
- Use 6V power supply (safe for 5V motors, gives better torque)
- Accept reduced performance compared to direct 5V
- Run at higher PWM duty cycles

## ⚠️ Safety First

**BEFORE YOU BEGIN**:
- [ ] Disconnect all power sources
- [ ] Verify voltage ratings (ESP32: 3.3V logic, Motor: 5V, Power supply: 5-6V)
- [ ] Check for short circuits with multimeter
- [ ] Never connect/disconnect wiring while powered
- [ ] Use appropriate wire gauge for motor current (18-22 AWG recommended)

## Component Overview

### ESP32 DevKit v1
- **Operating Voltage**: 3.3V logic, 5V USB power
- **GPIO Output**: 3.3V (sufficient to drive L298N inputs)
- **Pins Used**: GPIO 25, 26, 27, GND, VIN (optional)

### L298N Motor Driver Module
- **Input Voltage**: 5-35V (12V for this project)
- **Output Current**: 2A per channel (4A peak)
- **Logic Voltage**: 5V (can be powered by onboard regulator)
- **Logic Input**: Compatible with 3.3V ESP32 outputs
- **Pins Used**: IN1, IN2, ENA, GND, +12V, OUT1, OUT2

### 5V DC Motor
- **Voltage**: 5V nominal
- **Current**: 1-2A typical
- **Type**: Brushed DC motor

### Power Supply
- **Voltage**: 5-6V DC (6V recommended for better performance)
- **Current**: 2A minimum (to handle motor startup current)
- **Connector**: Barrel jack or screw terminals
- **Note**: L298N has ~2V voltage drop, so 5V input → ~3V to motor, 6V input → ~4V to motor

## Wiring Diagram

```
                          5-6V Power Supply
                               |
                               |
                          +----+----+
                          |         |
                         [+]       [-]
                          |         |
                          |         |
      ┌───────────────────┴─────────┴──────────────┐
      │                                             │
      │            L298N Motor Driver               │
      │   ┌─────────────────────────────────┐      │
      │   │  [+12V] [GND] [5V]              │      │
      │   │  (5-6V)                         │      │
      │   │    ↑     ↑     ↑                │      │
      │   │    │     │     └─ (optional)    │      │
      │   │    │     │                      │      │
      │   │  ┌─┴─────┴─────────────────┐   │      │
      │   │  │  IN1  IN2  ENA          │   │      │
      │   │  │   ↑    ↑    ↑           │   │      │
      │   │  └───┼────┼────┼───────────┘   │      │
      │   │      │    │    │                │      │
      │   │  ┌───┴────┴────┴───────────┐   │      │
      │   │  │ OUT1            OUT2    │   │      │
      │   │  │   ↓               ↓     │   │      │
      │   │  └───┼───────────────┼─────┘   │      │
      │   └──────┼───────────────┼─────────┘      │
      └──────────┼───────────────┼────────────────┘
                 │               │
                 └───┐       ┐───┘
                     │       │
                 ┌───┴───────┴────┐
                 │   DC Motor     │
                 │  [+]     [-]   │
                 └────────────────┘

      ┌────────────────────────────────────┐
      │       ESP32 DevKit v1              │
      │                                    │
      │  [VIN] [GND] [GPIO27] [26] [25]   │
      │    ↑     ↑      ↑      ↑    ↑     │
      │    │     │      │      │    │     │
      │    │     └──────┼──────┼────┘     │
      │    │            │      │          │
      │    │       (To L298N ENA, IN2, IN1)
      │    │                              │
      │  [USB] ← Power & Programming      │
      └────────────────────────────────────┘
```

## Connection Tables

### Table 1: ESP32 to L298N Signal Connections

| ESP32 Pin | Wire Color (Suggested) | L298N Pin | Function |
|-----------|------------------------|-----------|----------|
| GPIO 25 | Orange | IN1 | Direction control (Forward) |
| GPIO 26 | Yellow | IN2 | Direction control (Backward) |
| GPIO 27 | Green | ENA | Speed control (PWM) |
| GND | Black | GND | Common ground ⚠️ **CRITICAL** |

### Table 2: Power Connections

| Source | Wire | Destination | Notes |
|--------|------|-------------|-------|
| 5-6V Supply (+) | Red | L298N +12V | Motor power (terminal accepts 5-35V) |
| 5-6V Supply (-) | Black | L298N GND | Ground |
| L298N GND | Black | ESP32 GND | **Common ground required** |
| USB Cable | - | ESP32 USB | ESP32 power during development |

### Table 3: L298N to Motor Connections

| L298N Pin | Wire | Motor Terminal | Notes |
|-----------|------|----------------|-------|
| OUT1 | Red | Motor (+) | Polarity can be swapped if needed |
| OUT2 | Black | Motor (-) | Polarity can be swapped if needed |

## Step-by-Step Assembly

### Step 1: Prepare Components

1. **Gather all components** and place on a non-conductive surface
2. **Test power supply** with multimeter (should read 12V ±0.5V)
3. **Check L298N jumpers**:
   - ENA jumper: **REMOVE** (we'll control with PWM from ESP32)
   - ENB jumper: Can stay (not used)
   - 5V regulator jumper: **KEEP** if using L298N to power ESP32

### Step 2: ESP32 to L298N Signal Wiring

**Connect in this order**:

1. **GPIO 25 → IN1** (Orange wire)
   - ESP32 GPIO 25 pin
   - L298N IN1 terminal

2. **GPIO 26 → IN2** (Yellow wire)
   - ESP32 GPIO 26 pin
   - L298N IN2 terminal

3. **GPIO 27 → ENA** (Green wire)
   - ESP32 GPIO 27 pin
   - L298N ENA terminal
   - ⚠️ Ensure ENA jumper is **REMOVED**

4. **GND → GND** (Black wire) **CRITICAL**
   - ESP32 GND pin
   - L298N GND terminal
   - ⚠️ This is the most important connection!

### Step 3: Power Supply to L298N

**⚠️ ENSURE ALL POWER IS OFF**

1. **5-6V+ → L298N +12V** (Red wire, thick gauge)
   - 5-6V power supply positive terminal
   - L298N +12V screw terminal (accepts 5-35V despite the label)
   - **Recommendation**: Use 6V for better motor performance due to L298N 2V drop

2. **5-6V- → L298N GND** (Black wire, thick gauge)
   - 5-6V power supply negative terminal
   - L298N GND screw terminal

3. **Verify connections** with multimeter in continuity mode

### Step 4: Motor to L298N

1. **Motor Wire 1 → OUT1** (Red wire)
   - Motor positive terminal
   - L298N OUT1 terminal

2. **Motor Wire 2 → OUT2** (Black wire)
   - Motor negative terminal
   - L298N OUT2 terminal

**Note**: Motor polarity can be swapped later if direction is reversed.

### Step 5: ESP32 Power

**Option A: USB Power (Recommended for Testing)**
- Connect ESP32 to computer via USB cable
- Provides 5V power and serial communication
- Safest for development

**Option B: L298N 5V Regulator (Optional)**
- Connect L298N 5V output to ESP32 VIN
- Only if 5V regulator jumper is installed
- ⚠️ May not provide enough current for WiFi (future feature)

**Option C: Separate 5V Supply (Production)**
- Use dedicated 5V regulator for ESP32
- Connect to ESP32 VIN and GND

## Wiring Validation Checklist

**Before applying power, verify**:

### Signal Connections
- [ ] GPIO 25 connected to IN1
- [ ] GPIO 26 connected to IN2
- [ ] GPIO 27 connected to ENA
- [ ] ESP32 GND connected to L298N GND ⚠️

### Power Connections
- [ ] 5-6V+ connected to L298N +12V terminal
- [ ] 5-6V- connected to L298N GND
- [ ] No short circuit between power terminals (use multimeter)
- [ ] Power supply voltage verified (5-6V DC)

### L298N Configuration
- [ ] ENA jumper **REMOVED**
- [ ] No loose wires or exposed conductors
- [ ] Screw terminals tight

### Motor Connections
- [ ] Motor connected to OUT1 and OUT2
- [ ] Motor wires secure

### Safety
- [ ] All connections double-checked
- [ ] No short circuits (multimeter check)
- [ ] Work area clear of metal objects
- [ ] Fire extinguisher nearby (for high-current testing)

## Testing Procedure

### Test 1: Power-On Test (No Motor Movement)

1. **Connect ESP32 to USB only** (no 12V yet)
2. **Open serial monitor** (115200 baud)
3. **Verify startup message**:
   ```
   EcoCharge Motor Control System
   Motor Control System Ready!
   ```
4. **Check GPIO outputs** with multimeter:
   - All GPIO pins should read ~0V (LOW)
   - Press `F` command, GPIO 25 should go to 3.3V
   - Press `S` command, GPIO 25 should return to 0V

### Test 2: L298N LED Test

1. **Disconnect USB**
2. **Connect 5-6V power supply** to L298N
3. **Reconnect ESP32 USB**
4. **Issue commands**:
   - `5` (set 50% speed)
   - `F` (forward)
   - **L298N LEDs** should light up
   - `S` (stop)
   - **LEDs** should turn off

### Test 3: Motor Movement Test

1. **Ensure motor is secure** (won't move objects)
2. **Issue command**: `5` then `F`
3. **Motor should spin** smoothly
4. **Test directions**:
   - `S` (stop)
   - `B` (backward)
   - Motor should reverse direction
5. **Test speed control**:
   - `3` (30% - slow)
   - `7` (70% - faster)
   - `9` (90% - fast)

### Test 4: Safety Timeout

1. **Start motor**: `5` then `F`
2. **Wait 30 seconds**
3. **Motor should auto-stop**
4. **LED should blink slowly**
5. **Reset**: Press `S`
6. **Verify motor works again**: `F`

## Troubleshooting

### Problem: Motor Doesn't Spin

**Check**:
1. Common ground between ESP32 and L298N (use multimeter continuity test)
2. ENA jumper removed on L298N
3. 12V power supply connected and ON
4. L298N LEDs light when commands issued
5. Motor connections secure
6. Try higher speed (50%+): `5` then `F`

**Debug Steps**:
```
> 5          # Set speed
> F          # Forward command
```
- If GPIO 25 = 3.3V and GPIO 27 = PWM but motor doesn't spin:
  - Check L298N LEDs (should be ON)
  - Measure voltage at OUT1/OUT2 (should be ~3-4V with 5-6V input)
  - Test motor with direct 5V (bypass L298N) to verify motor works
  - If motor is weak, increase supply voltage to 6V or use higher speed setting (80-90%)

### Problem: Motor Spins Wrong Direction

**Solution**: Swap OUT1 and OUT2 connections at L298N or motor terminals.

### Problem: ESP32 Resets When Motor Starts

**Causes**:
1. Missing common ground
2. Power supply insufficient current
3. Electrical noise from motor

**Solutions**:
1. Verify GND connection between ESP32 and L298N
2. Use 3A+ power supply
3. Add 100µF capacitor across motor terminals
4. Keep motor/L298N wires away from ESP32 signal wires

### Problem: L298N Gets Very Hot

**Causes**:
- Normal operation (L298N has ~2V voltage drop = wasted heat)
- Excessive current draw

**Solutions**:
- Ensure L298N has heatsink installed
- Verify motor current < 2A
- Add cooling fan for continuous operation
- **Recommended upgrade**: Use TB6612FNG driver for better efficiency with 5V motors (only 0.5V drop instead of 2V)

### Problem: Weak Motor Performance (5V Motor)

**Causes**:
1. Speed set too low
2. **L298N voltage drop (~2V)** - This is the main issue with 5V motors!
3. Insufficient power supply voltage

**Solutions**:
1. Increase speed: `8` or `9` (80-90%)
2. **Use 6V power supply instead of 5V** (motor gets ~4V instead of ~3V)
3. Run motor at higher duty cycles
4. **Best solution**: Upgrade to TB6612FNG driver (only 0.5V drop, much more efficient for 5V motors)

**Voltage Breakdown**:
- 5V supply → L298N drops 2V → Motor gets 3V (60% of rated voltage)
- 6V supply → L298N drops 2V → Motor gets 4V (80% of rated voltage)
- TB6612FNG with 5V → drops 0.5V → Motor gets 4.5V (90% of rated voltage)

## Wire Gauge Recommendations

| Connection Type | Wire Gauge | Notes |
|----------------|------------|-------|
| ESP32 signals (GPIO) | 22-26 AWG | Low current, thin wires OK |
| Motor power (L298N to motor) | 18-20 AWG | High current, thick wires |
| 12V power supply | 18-20 AWG | High current, thick wires |
| Ground connections | 18-22 AWG | Important for reliability |

## Advanced: Optional Components

### Current Sensing (Future Enhancement)

**ACS712 5A Current Sensor**:
- VCC → ESP32 3.3V
- GND → ESP32 GND
- OUT → ESP32 GPIO 35 (ADC)
- Motor power through sensor IN/OUT terminals

### Limit Switches (Position Feedback)

**Microswitch**:
- COM → ESP32 GPIO 32
- NO → ESP32 3.3V (or use internal pull-up)
- Triggers when conveyor reaches end position

### External Status LEDs

**LED + 220Ω Resistor**:
- Anode (+) → ESP32 GPIO 4
- Cathode (-) → 220Ω resistor → GND

## Mechanical Installation

### Motor Mounting
1. Secure motor to frame with bolts
2. Ensure shaft alignment with load
3. Use flexible coupling if needed
4. Allow ventilation for motor cooling

### Wire Management
1. Use cable ties to bundle wires
2. Separate power wires from signal wires
3. Strain relief at all connectors
4. Label wires for future maintenance

### Enclosure
1. Mount ESP32 and L298N in non-conductive enclosure
2. Provide ventilation holes (L298N gets hot)
3. Access to USB port for programming
4. Emergency stop button on exterior (future)

## Maintenance

### Regular Checks
- [ ] Inspect wire connections (monthly)
- [ ] Check for overheating (after extended use)
- [ ] Verify motor shaft bearings (listen for noise)
- [ ] Clean dust from electronics (quarterly)
- [ ] Test emergency stop function

### Replacement Parts
Keep spares on hand:
- Jumper wires
- L298N module (if damaged by overcurrent)
- DC motor (brushes wear over time)
- Power supply fuse

## Pin Reference Chart

**ESP32 DevKit v1 Pinout** (relevant pins):

```
                    USB
                     ||
         ┌───────────────────────┐
         │                       │
    3V3  │●                     ●│ GND
    EN   │●                     ●│ GPIO 23
GPIO 36  │●                     ●│ GPIO 22
GPIO 39  │●                     ●│ GPIO 1 (TX)
GPIO 34  │●                     ●│ GPIO 3 (RX)
GPIO 35  │●                     ●│ GPIO 21
GPIO 32  │●                     ●│ GPIO 19
GPIO 33  │●                     ●│ GPIO 18
GPIO 25  │●← IN1                ●│ GPIO 5
GPIO 26  │●← IN2                ●│ GPIO 17
GPIO 27  │●← ENA                ●│ GPIO 16
GPIO 14  │●                     ●│ GPIO 4
GPIO 12  │●                     ●│ GPIO 2 (LED)
    GND  │●← GND                ●│ GPIO 15
GPIO 13  │●                     ●│ GND
    VIN  │●                     ●│ 3V3
         │                       │
         └───────────────────────┘
```

**L298N Module Layout**:

```
        ┌─────────────────────────┐
        │                         │
        │  [12V] [GND] [5V]       │
        │   ●     ●     ●         │
        │                         │
        │  [IN1] [IN2] [ENA]      │
        │   ●     ●     ●         │
        │   ↑     ↑     ↑         │
        │  (25)  (26)  (27)       │
        │                         │
        │  ┌─────────────┐        │
        │  │             │        │
        │  │   L298N IC  │        │
        │  │             │        │
        │  └─────────────┘        │
        │                         │
        │  [OUT1]      [OUT2]     │
        │   ●            ●        │
        │   └────Motor────┘       │
        │                         │
        │  [ENB] [IN4] [IN3]      │
        │  (not used)             │
        └─────────────────────────┘
```

## Summary

✅ **Critical Connections**:
1. GPIO 25, 26, 27 to IN1, IN2, ENA
2. **Common ground** (ESP32 GND to L298N GND)
3. 12V power to L298N
4. Motor to OUT1/OUT2

✅ **Safety**:
1. Remove ENA jumper
2. Check for short circuits
3. Use proper wire gauge
4. Secure all connections

✅ **Testing**:
1. USB power first (software check)
2. Add 12V power (LED test)
3. Test motor movement
4. Verify all commands work

**If you follow this guide, your motor control system should work reliably!**

For software setup and usage, see [README.md](README.md).
