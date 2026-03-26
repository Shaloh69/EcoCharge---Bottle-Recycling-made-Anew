# EcoCharge Project Plan

## Purpose

This plan turns the thesis scope and the current repository state into one implementation roadmap for the full EcoCharge system.

It is designed to help the project move from partial prototypes to a complete, demonstrable, thesis-aligned product.

## Planning Principles

1. Build toward one system, not separate experiments.
2. Align the repository with the paper or explicitly update the paper to match the real implementation.
3. Finish the critical path first:
   - backend
   - kiosk workflow
   - charging control
   - ML integration
4. Keep every feature traceable to a thesis objective.
5. Favor a smaller finished product over a larger fragmented one.

## Primary End State

EcoCharge should reach a point where a user can:

1. Authenticate or start a kiosk session
2. Insert a plastic bottle
3. Have the bottle detected and classified
4. Receive credits or charging access
5. Select a charging port
6. Charge safely for the correct amount of time
7. See transaction feedback and remaining balance
8. Allow admins to monitor usage, credits, and kiosk health

## Project Tracks

The work should be managed across these tracks:

- Product and thesis alignment
- Architecture and repository cleanup
- Machine learning
- Firmware and hardware
- Local kiosk orchestration
- Backend and database
- Kiosk and dashboard UI
- Mobile app
- Testing and deployment

## Phase 0: Alignment And Scope Freeze

### Goal

Decide what the final EcoCharge system actually is and make the thesis and repository describe the same thing.

### Tasks

- Freeze the official target architecture
- Decide whether the final detector is described as YOLOv8 or YOLO26
- Decide whether Flutter is required for the final submission or optional
- Define the roles of:
  - `client/kiosk_web`
  - `client/web_console`
  - `client/flutter_app`
  - `server/server_main`
  - `server/server_AI`
- Define the hardware bill of materials actually being used in the final prototype
- Decide whether charging is credit-based, bottle-trigger-based, or both

### Deliverables

- final architecture diagram
- subsystem ownership list
- thesis-to-repo mapping sheet
- finalized feature scope

### Exit Criteria

- no major ambiguity about system boundaries
- one approved tech stack
- one approved hardware stack

## Phase 1: Repository Cleanup And Structural Setup

### Goal

Make the repository match the product structure before adding more features.

### Tasks

- Keep `client/kiosk_web` as the kiosk UI
- Repurpose `client/web_console` as the admin dashboard
- Keep `client/flutter_app` only if mobile is part of the final scope
- Implement real projects in:
  - `server/server_main`
  - `server/server_AI`
- Fix lint configuration in the Next apps
- Remove or reorganize placeholder/template content
- Decide which large artifacts stay in Git and which move to external storage
- Clean `.gitignore` so it matches actual repo policy
- Add a root architecture README

### Deliverables

- clarified folder roles
- working frontend tooling
- working backend project skeletons
- cleaned repo policy for datasets and model artifacts

### Exit Criteria

- no empty core application folders
- no duplicate template web apps pretending to be separate products
- lint/build steps are deterministic

## Phase 2: Backend And Data Foundation

### Goal

Create the missing system of record for users, credits, transactions, devices, and telemetry.

### Recommended Scope

Implement `server/server_main` first as the core backend.

### Required Capabilities

- user accounts
- login and registration
- transaction history
- charging credit balance
- kiosk session records
- bottle deposit records
- charging session records
- device/kiosk health status
- admin reporting

### Core Entities

- `users`
- `kiosks`
- `sessions`
- `bottle_deposits`
- `classification_results`
- `credit_transactions`
- `charging_sessions`
- `device_telemetry`
- `bin_status_events`

### API Groups

- auth
- users
- kiosk sessions
- deposits
- credits
- charging
- telemetry
- admin dashboard

### Deliverables

- backend service
- database schema
- auth flow
- API documentation
- migration scripts

### Exit Criteria

- kiosk UI can read and write real data
- credits and sessions are persisted
- admin dashboard can query real records

## Phase 3: Machine Learning Productization

### Goal

Move the ML work from training scripts into a reliable inference service usable by the kiosk.

### Tasks

- Freeze the official production model versions
- Document training datasets and label policy
- Export the detection and classification pipeline behind a stable interface
- Define inference inputs and outputs
- Add confidence thresholds and rejection rules
- Add a fallback policy for uncertain detections
- Log inference results for admin review
- Measure latency on target hardware

### Recommended Outputs

- one inference wrapper service or module
- standard result schema:
  - bottle detected or rejected
  - confidence
  - size band
  - brand
  - volume
  - condition
  - image/frame ID

### Deliverables

- production inference module
- evaluation report
- model version registry
- inference logging

### Exit Criteria

- kiosk workflow can call ML inference reliably
- decisions are reproducible and logged
- performance is acceptable on target hardware

## Phase 4: Firmware And Hardware Integration

### Goal

Transform the current motor-control firmware into an EcoCharge device controller.

### Required Hardware Responsibilities

- relay control for charging ports
- current sensing for charging verification and safety
- ultrasonic or equivalent bin fullness sensing
- servo or trapdoor actuation if part of the final design
- ESP32-to-host communication
- fail-safe shutdown behavior

### Tasks

- define GPIO map for final kiosk hardware
- add charging-port relay control
- add charging session start/stop commands
- add current sensor sampling and threshold alerts
- add bin fullness sensing
- add actuator logic if bottle gate/trapdoor is retained
- define a simple host-device protocol
- return structured telemetry to the host computer
- add watchdogs and fault states

### Deliverables

- final firmware modules
- host-device command protocol
- hardware validation checklist
- safety rules and error codes

### Exit Criteria

- backend or kiosk app can command the ESP32
- ports can be enabled or disabled safely
- telemetry is available in real time

## Phase 5: Local Kiosk Orchestrator

### Goal

Add the missing layer that coordinates camera inference, device control, user flow, and backend communication.

### Why This Matters

The thesis system is not just firmware plus web pages. It needs a local controller that can:

- talk to camera and models
- talk to ESP32
- decide on bottle acceptance
- credit the user
- activate charging
- recover from errors

### Tasks

- create a local kiosk control service
- connect to the inference module
- connect to the ESP32 protocol
- connect to the backend APIs
- manage the active kiosk session lifecycle
- manage retry and recovery behavior
- log all bottle and charging events

### Session Flow

1. User logs in or starts session
2. Bottle is presented
3. Camera frame captured
4. Model inference runs
5. Result accepted or rejected
6. Credit or charging eligibility updated
7. User selects charging port
8. ESP32 activates port
9. Current draw monitored
10. Session ends and receipt is recorded

### Deliverables

- kiosk orchestrator service
- event and error logging
- session state machine

### Exit Criteria

- one machine can run the full kiosk flow locally
- orchestration survives normal device and network failures

## Phase 6: Kiosk UI And Admin Dashboard

### Goal

Replace placeholder UIs with the actual EcoCharge product flows described in the paper.

### Kiosk UI Scope

Implement in `client/kiosk_web`:

- welcome screen
- login screen
- registration screen
- session home screen
- bottle deposit screen
- charging credit screen
- charging-port selection screen
- receipt screen
- trash-bin status screen if user-facing
- accepted/rejected bottle feedback

### Admin Dashboard Scope

Implement in `client/web_console`:

- kiosk status view
- active charging sessions
- bottle deposit history
- credit transaction history
- trash-bin fullness alerts
- device health and fault states
- model-confidence or rejection review

### Tasks

- create real information architecture
- replace HeroUI template content
- wire pages to backend APIs
- add kiosk-safe interaction patterns
- implement role separation between kiosk users and admins

### Deliverables

- functional kiosk web app
- functional admin dashboard
- design system aligned with EcoCharge branding

### Exit Criteria

- users can complete the thesis workflow via the UI
- admins can monitor system behavior in real time

## Phase 7: Mobile App Decision And Delivery

### Goal

Either finish the Flutter app or formally reduce its scope.

### Option A: Keep Flutter In Final Scope

Implement:

- login and registration
- credit balance
- transaction history
- kiosk QR or account lookup support
- notifications or alerts

### Option B: Reduce Scope

If the thesis does not strictly require mobile, document that:

- kiosk web is the primary user interface
- admin dashboard handles monitoring
- Flutter is future work

### Deliverables

- finished Flutter MVP or
- documented scope reduction decision

### Exit Criteria

- no ambiguous "half-included" mobile layer

## Phase 8: Testing, Validation, And Thesis Evidence

### Goal

Produce the evidence needed for both technical confidence and thesis defense.

### Test Layers

- ML model evaluation
- firmware unit and hardware validation
- backend API tests
- frontend component and flow tests
- end-to-end kiosk flow tests
- fault recovery tests
- safety tests for charging behavior

### Required Validation Scenarios

- accepted bottle flow
- rejected bottle flow
- low-confidence detection flow
- insufficient credit flow
- charging start and timeout flow
- current sensor abnormality flow
- full bin flow
- ESP32 disconnect flow
- backend unavailable flow

### Thesis Evidence Pack

- architecture diagrams
- hardware diagrams
- screenshots of final UI
- model evaluation tables
- user testing summary
- pilot deployment findings
- limitations and future work

### Exit Criteria

- system is demo-ready
- results are reproducible
- evidence exists for every thesis objective

## Workstream Backlog By Area

### Machine Learning

- document dataset provenance
- normalize labels consistently
- benchmark on target hardware
- package inference into one callable interface
- define rejection policy

### Firmware

- add relay control
- add sensor modules
- add structured serial or HTTP protocol
- implement real timed charging logic
- replace hardcoded lab settings where possible

### Backend

- create service
- create schema
- implement auth
- implement credits ledger
- implement charging session logs
- implement admin APIs

### Kiosk UI

- replace template content
- connect login/register screens
- implement real kiosk session flow
- display bottle acceptance and credits

### Admin Dashboard

- live kiosk status
- sensor readings
- deposit volume
- charging history
- alerts and fault tracking

### Mobile

- keep or cut explicitly
- do not leave as silent scaffold

### DevOps And Quality

- standardize build commands
- add test scripts
- add environment examples
- separate source from large generated artifacts

## Recommended Milestone Order

1. Scope freeze and architecture agreement
2. Backend skeleton plus schema
3. Kiosk orchestrator design
4. Firmware extension for charging hardware
5. ML inference integration
6. Kiosk UI implementation
7. Admin dashboard implementation
8. End-to-end integration test
9. Pilot validation
10. Final thesis evidence packaging

## Immediate Next 10 Actions

1. Decide the final official architecture and tech stack.
2. Assign each existing app folder a real product role.
3. Create `server/server_main` with auth, users, credits, and sessions.
4. Define the local host-to-ESP32 protocol.
5. Convert the ML scripts into a reusable inference module.
6. Replace `client/kiosk_web` template pages with the actual kiosk flow.
7. Replace `client/web_console` template pages with admin monitoring pages.
8. Decide whether the Flutter app is in-scope or future work.
9. Extend firmware from motor demo to charging/sensor control.
10. Create an end-to-end demo path for one complete bottle-to-charge session.

## Definition Of Done

EcoCharge should be considered complete only when all of these are true:

- the thesis architecture and the repository architecture match
- the kiosk accepts or rejects bottles through real ML inference
- credits or charging access are recorded in a real backend
- charging hardware is controlled safely through the ESP32
- kiosk UI is fully implemented
- admin monitoring is fully implemented
- mobile scope is either delivered or formally removed
- end-to-end tests exist
- pilot evidence exists
- the system can be demonstrated as one integrated product

## Final Planning Note

The project does not need more isolated prototypes right now.

It needs integration, scope discipline, and a finished core workflow.

If the team executes this plan in order, EcoCharge can move from a promising thesis concept with partial components into a defensible, working smart kiosk system.
