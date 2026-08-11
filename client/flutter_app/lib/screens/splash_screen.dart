import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_app/theme/app_theme.dart';
import 'package:flutter_app/widgets/eco_mascot.dart';
import 'package:flutter_app/services/api_service.dart';
import 'package:flutter_app/services/app_version_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _boot();
  }

  /// Launch sequence: run the update gate and the splash dwell concurrently, so
  /// the version check costs nothing in the common case where it passes.
  ///
  /// The gate fails open by construction (see [AppVersionService]) — a backend
  /// outage must not stop the app from starting. That is not a hypothetical
  /// here: the API was genuinely unreachable for hours on 2026-08-12.
  Future<void> _boot() async {
    final gate = AppVersionService(baseUrl: ApiService.baseUrl).check();
    final dwell = Future<void>.delayed(const Duration(seconds: 2));

    final result = await gate;
    await dwell;

    if (!mounted) return;

    if (result.status == UpdateGateStatus.blocked) {
      context.go('/update-required', extra: result);
      return;
    }

    // UpdateGateStatus.optional is deliberately not handled here — a
    // dismissible nudge belongs on Home, where it can be shown without
    // interrupting launch. Tracked in docs/planning/08-master-checklist.md.
    context.go('/onboarding');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.primaryGreen,
      body: SafeArea(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Spacer(),
            const EcoMascot(mood: MascotMood.idle, size: 140),
            const SizedBox(height: 24),
            const Text('EcoCharge', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Recycle bottles. Earn charging credits.', style: TextStyle(color: Colors.white.withAlpha(178), fontSize: 16)),
            const Spacer(),
            const CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
