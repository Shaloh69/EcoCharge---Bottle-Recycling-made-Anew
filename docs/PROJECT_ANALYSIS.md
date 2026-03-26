# EcoCharge Project Analysis

## Purpose

This document analyzes the EcoCharge project using two sources:

1. The thesis paper `d:\Projects-Shem\Thesis\EcoCharge-Final-2.0.pdf`
2. The current repository state in `d:\Projects-Shem\Thesis\2026\EcoCharge`

The goal is to show:

- What the paper says EcoCharge should be
- What is actually implemented in the repository
- Where the project is strong
- Where the project is incomplete or inconsistent
- What must be aligned before the system can become a complete thesis-grade product

## Executive Summary

EcoCharge is described in the paper as a machine-learning-based bottle detection and smart charging kiosk for circular economy adoption at the University of Cebu Lapu-Lapu and Mandaue. The paper presents a full end-to-end system with bottle detection, account flows, credit allocation, charging-port control, trash-bin monitoring, IoT communication, and dashboard interfaces.

The repository only partially matches that vision.

The strongest parts of the repository today are:

- The machine-learning work in `scripts/`
- The ESP32 firmware work in `esp/motor/`
- The presence of a real dataset and trained model outputs in `scripts/dataset/` and `runs/`

The weakest or most incomplete parts are:

- The backend, which is effectively missing
- The Flutter app, which is still the default scaffold
- The web apps, which are still duplicated template projects
- The gap between the paper's kiosk workflow and the actual hardware control code

In plain terms: the paper describes a full smart kiosk platform, but the repository currently contains a strong ML prototype, a separate motor-control firmware prototype, and placeholder client applications that have not yet been integrated into one complete EcoCharge system.

## What The Thesis Defines

### Project Intent

The paper frames EcoCharge as a sustainability system that encourages bottle recycling by converting plastic bottle deposits into charging rewards. It is rooted in:

- Circular Economy Theory
- Behavioural Incentive Theory
- Technology Acceptance Model

These are used to justify the product as both an environmental intervention and a user-adoption problem, not just a technical build.

### Core Objectives From The Paper

The paper states that the study aims to:

1. Determine the required hardware, software, IoT platform, protocol, and dashboard
2. Design the bottle detection and IoT-based visualization system
3. Evaluate detection accuracy, charging reliability and safety, and dashboard usability
4. Deploy and assess the system in a real environment with emphasis on ease of use and usefulness

### Functional System Described In The Paper

From the thesis text and chapter structure, the intended system includes:

- Bottle detection and validation
- Size-based bottle classification
- Account registration and login
- Charging credits or charging access
- User-facing kiosk interface
- Web or app-based monitoring
- Trash-bin level monitoring
- IoT-connected hardware and dashboard
- Multiple charging ports
- Real-world deployment and usability evaluation

### Hardware Described In The Paper

The paper names or implies these hardware elements:

- Computer
- Camera bottle detector
- Touchscreen monitor
- ESP32
- Servo motor
- Current sensor
- Relay
- Breaker
- Exhaust fan
- Outlet sockets
- Power supply
- Ultrasonic sensor

### Software Stack Described In The Paper

The thesis lists these software elements:

- Python Flask
- OpenCV
- NumPy
- MySQL
- Flutter + Dart
- Next.js
- Tailwind CSS v4
- YOLO Ultralytics
- Google Colab

### User Need Validation From The Paper

The survey results in the paper support the product concept:

- 78.8% supported a reward-based recycling system
- 84.8% were interested in a bottle-for-charging kiosk
- 66.7% were highly willing to support implementation
- 57.6% were unaware of existing recycling programs
- More accessible recycling points were likely to increase recycling participation

This is important because the thesis does not just justify the system technically. It also claims there is user demand and campus relevance.

## What The Repository Actually Contains

### Repository Overview

Top-level repository areas:

- `client/`
- `esp/`
- `server/`
- `scripts/`
- `runs/`

### `scripts/`

This is the most complete and most valuable part of the repository.

Implemented:

- `scripts/train_yolo.py`
- `scripts/train_bottle_classifier.py`
- `scripts/predict.py`
- `scripts/gui_detect.py`

This area includes:

- A bottle-detection training pipeline
- A multi-head attribute classifier for brand, volume, and condition
- A local GUI for inspection and testing
- Existing training outputs under `runs/`
- A dataset under `scripts/dataset/Eco-Charge.v1`

Observed state:

- Dataset size is 148 labeled images total
- Split is 103 train, 30 valid, 15 test
- Trained classifier metadata shows:
  - backbone: `efficientnet_b0`
  - 10 brand classes
  - 11 volume classes
  - 2 condition classes
- YOLO results show a completed 100-epoch run with strong reported metrics

Important note:

The paper mentions YOLOv8, but the codebase uses YOLO26 naming and workflows. This is a thesis-to-code divergence that should be resolved in documentation and final system decisions.

### `esp/motor/`

This is the second most complete subsystem.

Implemented:

- ESP-IDF / PlatformIO project
- Motor forward, backward, stop, speed control
- Safety timeout
- Wi-Fi access point
- Embedded HTTP server
- Simple motor control web UI

Strengths:

- Clear modular C code
- Good local documentation
- Config-driven pin assignments
- Safety monitoring task

But this subsystem is not yet the same thing as the thesis kiosk controller.

Current firmware is focused on:

- Motor movement
- AP mode networking
- Simple web control for movement

It is not yet implementing the thesis hardware flow for:

- Charging-port relay control
- Current sensing and charging-session monitoring
- Trash-bin fullness monitoring
- Bottle-credit logic
- User accounts or session tracking

### `client/kiosk_web/`

This project builds, but it is still a starter app.

Observed state:

- HeroUI template content remains
- Branding still says `Next.js + HeroUI`
- Home page is template copy
- Nav/config still reference placeholder routes and external HeroUI links

### `client/web_console/`

This project is functionally identical to `client/kiosk_web/`.

The two projects currently duplicate each other instead of representing separate products such as:

- user kiosk UI
- admin dashboard

That duplication adds maintenance cost without yet adding product value.

### `client/flutter_app/`

This is still the default scaffold.

Observed state:

- `Hello World` app
- No EcoCharge logic
- No authentication
- No API integration
- No charging-credit or bin-status functionality

### `server/server_main/` and `server/server_AI/`

These folders are empty.

This is one of the biggest project gaps because the paper expects:

- backend processing
- database storage
- user management
- monitoring data flow
- dashboard integration

None of that exists in the repository as an implemented backend service.

### `client/kiosk_electron/`

This folder exists in structure only and is also empty.

## Validation Results From The Current Repo

Checks performed during analysis:

- Python compile check passed for `scripts/`
- `client/kiosk_web` production build completed
- `client/web_console` production build completed
- `npm run lint` fails in the Next apps because `@eslint/compat` is imported but not installed
- `flutter analyze` could not be run because Flutter is not installed in this environment
- ESP32 firmware build did not finish within the available timeout window, so firmware build health is not fully confirmed

## Paper-To-Repository Gap Analysis

| Area | Thesis Expectation | Current Repository | Status |
| --- | --- | --- | --- |
| ML bottle detection | YOLO-based bottle detection integrated into kiosk | Real ML training and inference pipeline exists | Strong |
| Bottle attribute logic | Bottle validation and classification | Brand/volume/condition classifier exists | Strong |
| Full kiosk workflow | Bottle -> credit -> user session -> charging | Not implemented end to end | Major gap |
| Backend | Flask, storage, dashboard, system data flow | No implemented backend service | Missing |
| Database | MySQL and account/transaction storage | No DB layer in repo | Missing |
| User accounts | Register/login/account balance/OTP | No real auth or account logic | Missing |
| Charging control | Four charging ports, relay/current monitoring | No charging control subsystem in code | Missing |
| Sensor integration | Ultrasonic, current sensor, relay, servo | Not implemented in current firmware | Missing |
| Trash-bin monitoring | Bin status visible in interface | Not implemented end to end | Missing |
| Kiosk UI | Dedicated kiosk application | Still template web app | Placeholder |
| Admin web/dashboard | Monitoring console | Duplicate template app | Placeholder |
| Mobile app | Flutter-based user app | Default Flutter starter | Placeholder |
| Hardware control | IoT kiosk controller | Motor-control prototype only | Partial |
| Real deployment evidence | Trial deployment and evaluation loop | Some prototype work, but no full product integration | Partial |

## Subsystem Analysis

### 1. Machine Learning

#### Current Strengths

- Real dataset exists
- Training scripts are usable
- Inference pipeline is already assembled
- GUI tool is useful for manual validation
- Classifier structure is sensible for multi-attribute prediction

#### Current Weaknesses

- Small dataset by production standards
- Training outputs are committed into the working tree, which complicates repo hygiene
- No formal evaluation document ties model performance to thesis acceptance criteria
- No deployment wrapper exists for serving the model to kiosk/backend apps

#### Thesis Alignment

This is the subsystem that most clearly supports the thesis. It already demonstrates real progress toward the machine-learning core of EcoCharge.

### 2. Firmware And Embedded Control

#### Current Strengths

- Structured ESP-IDF project
- Clear separation of modules
- Safety timeout is implemented
- Access-point plus embedded HTTP control exists
- Good project-level firmware documentation

#### Current Weaknesses

- Firmware scope is centered on motor movement, not the full EcoCharge kiosk
- Timed movement is advertised in the web UI but not actually implemented
- Hardcoded Wi-Fi credentials are present
- No charging-port power logic
- No current monitoring logic
- No bin sensor integration
- No account or point-authorization integration

#### Thesis Alignment

This is a good prototype foundation, but it is not yet the firmware the thesis describes.

### 3. Frontend And User Experience

#### Current Strengths

- Next.js projects are present and build
- Tooling base is modern
- Flutter project scaffold exists

#### Current Weaknesses

- Kiosk web and console web apps are still template copies
- No real EcoCharge pages, flows, or data integration
- Flutter app is still default scaffold
- Broken lint configuration
- No consistent design system tied to thesis UI screens

#### Thesis Alignment

The paper includes login, register, home, bottle, credit, receipt, and trash-bin-monitor pages. The repository does not currently implement those flows.

### 4. Backend And Data Layer

#### Current Strengths

- Intended architecture is described in the thesis
- Folder placeholders exist

#### Current Weaknesses

- No backend code
- No API surface
- No schema
- No authentication
- No session or transaction model
- No telemetry or monitoring storage

#### Thesis Alignment

This is the biggest implementation gap in the whole repository.

### 5. Hardware-System Integration

#### Current Strengths

- The paper clearly describes a multi-component kiosk
- The repo already contains embedded work and ML work that could be combined

#### Current Weaknesses

- There is no integrated kiosk controller application
- No evidence of computer-to-ESP32 protocol design in code
- No charging relay orchestration
- No sensor-to-dashboard data pipeline
- No credit-to-hardware actuation flow

#### Thesis Alignment

The full EcoCharge product depends on integration. That integration is currently the missing middle layer.

### 6. Testing, Quality, And Operations

#### Current Strengths

- Some manual validation artifacts exist through training outputs and firmware docs

#### Current Weaknesses

- No meaningful automated tests
- No integration tests
- No API contract tests
- No hardware-in-the-loop validation scripts
- No deployment scripts
- Inconsistent artifact hygiene

## Key Inconsistencies And Risks

### 1. Thesis Scope vs Code Scope

The paper presents a complete EcoCharge kiosk product. The repo is still split into disconnected prototypes.

### 2. Architecture Mismatch

The thesis stack mentions Flask, MySQL, Next.js, Flutter, IoT, and hardware integration. The repo currently has ML scripts, starter frontends, empty servers, and motor firmware. The architectural story is not yet consistent.

### 3. YOLO Version

The paper originally named YOLOv8. The codebase uses YOLO26.

**Decision (2026-03-15): YOLO26 is the official model for EcoCharge.** The thesis narrative should be updated to reflect YOLO26 as the actual implementation. No code changes needed — the existing training scripts and trained weights are correct.

### 4. Hardware Mismatch

The paper describes relays, charging ports, current sensors, ultrasonic bin sensing, and a servo trapdoor. The firmware in the repo does not yet cover that set of hardware responsibilities.

### 5. Product Duplication

There are two web apps with identical starter content. This creates confusion over product boundaries:

- kiosk app
- admin dashboard
- marketing or public app

These roles need to be assigned clearly.

### 6. Missing System Of Record

Without a backend and database, the system cannot genuinely support:

- accounts
- credits
- history
- receipts
- admin monitoring
- deployment audit trails

### 7. Repo Hygiene

Generated artifacts and large ML outputs are present in normal repo flow. This will make collaboration and reproducibility harder over time.

## Recommended Target Architecture

The project should converge toward five connected layers:

1. Detection Layer
   - camera input
   - bottle detection model
   - bottle attribute classification
2. Device Control Layer
   - ESP32 for relay/sensor/actuator control
   - charging enable/disable
   - current sensor reading
   - bin fullness monitoring
   - servo or gate control
3. Local Orchestrator Layer
   - kiosk-side service running on the computer
   - model inference
   - user session handling
   - communication with ESP32
   - transaction logging
4. Backend Layer
   - accounts
   - credits
   - transactions
   - admin APIs
   - device telemetry
5. Client Layer
   - kiosk UI
   - admin dashboard
   - optional mobile app

## Overall Maturity Assessment

### Strong

- Research framing
- ML experimentation
- Dataset ownership
- Early embedded work

### Medium

- Hardware documentation
- local prototyping direction

### Weak

- integrated architecture
- backend implementation
- product UX implementation
- testing and deployment
- paper-to-code consistency

## Final Assessment

EcoCharge is a promising project with real technical foundations, but it is not yet a finished platform. Right now, it is best understood as:

- a solid thesis concept
- a credible ML prototype
- a separate embedded control prototype
- an unfinished application platform

The project is most likely to succeed if the next stage focuses on integration and scope discipline, not on adding more disconnected prototype pieces.

The most important shift is this:

EcoCharge should now move from "research idea plus component experiments" to "one defined system with one architecture, one source of truth, and one deployable workflow."
