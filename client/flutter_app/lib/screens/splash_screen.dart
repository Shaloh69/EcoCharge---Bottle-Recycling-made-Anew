import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_app/theme/app_theme.dart';
import 'package:flutter_app/widgets/eco_mascot.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) context.go('/onboarding');
    });
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
