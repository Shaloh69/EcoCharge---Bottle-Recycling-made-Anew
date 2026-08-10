# EcoCharge — Mobile App

The companion mobile app: account registration/login, QR-linking to a kiosk session, credit balance and transaction/deposit history, and viewing/stopping an active charging session.

## Stack

Flutter (Dart SDK ^3.9). Talks to the real API (`ApiService`, base URL via `--dart-define=API_BASE_URL`, currently defaulting to the Render-hosted API — see `analyzation.md` §13 and §15, this changes once the self-hosting migration lands). Auth token persisted with `shared_preferences`.

## Real screens, not a default scaffold

Splash/onboarding → login/register → home (balance, recent activity, kiosk list) → scan kiosk QR (`mobile_scanner`, calls `POST /api/kiosk/qr-link`) → credit balance + transactions, deposit history, charging (view/stop active session), profile (avatar upload, logout).

## Running

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=<your API server URL>
```

## Design status

Functional, not yet visually rebuilt. The target design ("Clean Energy Reward" — eco-green primary, volt-amber accent for charging/energy surfaces, `skeletonizer`/Lottie/Rive/`flutter_animate` animation stack) is specified in `../../docs/planning/02-design-mandate.md` §5 — read that before touching any UI here, not this file. None of the animation-stack dependencies are in `pubspec.yaml` yet — confirmed absent as of 2026-08-10, this is genuinely unstarted work, not partially done.
