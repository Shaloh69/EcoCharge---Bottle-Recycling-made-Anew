import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_app/theme/app_theme.dart';
import 'package:flutter_app/screens/splash_screen.dart';
import 'package:flutter_app/screens/onboarding_screen.dart';
import 'package:flutter_app/screens/auth/login_screen.dart';
import 'package:flutter_app/screens/auth/register_screen.dart';
import 'package:flutter_app/screens/auth/scan_kiosk_screen.dart';
import 'package:flutter_app/screens/home/home_screen.dart';
import 'package:flutter_app/screens/history/deposit_history_screen.dart';
import 'package:flutter_app/screens/credits/credit_balance_screen.dart';
import 'package:flutter_app/screens/kiosks/kiosk_list_screen.dart';
import 'package:flutter_app/screens/profile/profile_screen.dart';
import 'package:flutter_app/screens/charging/charging_screen.dart';

void main() => runApp(const EcoChargeApp());

final _router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
    GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
    GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
    GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
    GoRoute(path: '/scan', builder: (_, __) => const ScanKioskScreen()),
    GoRoute(
      path: '/charging',
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>? ?? {};
        return ChargingScreen(
          sessionId: extra['sessionId'] as int? ?? 0,
          durationSeconds: extra['durationSeconds'] as int? ?? 600,
          portNumber: extra['portNumber'] as int? ?? 1,
        );
      },
    ),
    ShellRoute(
      builder: (context, state, child) => MainShell(child: child),
      routes: [
        GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
        GoRoute(path: '/history', builder: (_, __) => const DepositHistoryScreen()),
        GoRoute(path: '/credits', builder: (_, __) => const CreditBalanceScreen()),
        GoRoute(path: '/kiosks', builder: (_, __) => const KioskListScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      ],
    ),
  ],
);

class EcoChargeApp extends StatelessWidget {
  const EcoChargeApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp.router(
    title: 'EcoCharge',
    theme: AppTheme.theme,
    routerConfig: _router,
    debugShowCheckedModeBanner: false,
  );
}

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  int _getIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/home')) return 0;
    if (location.startsWith('/history')) return 1;
    if (location.startsWith('/credits')) return 2;
    if (location.startsWith('/kiosks')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _getIndex(context),
        onTap: (i) {
          final routes = ['/home', '/history', '/credits', '/kiosks', '/profile'];
          context.go(routes[i]);
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.history_outlined), activeIcon: Icon(Icons.history), label: 'History'),
          BottomNavigationBarItem(icon: Icon(Icons.credit_card_outlined), activeIcon: Icon(Icons.credit_card), label: 'Credits'),
          BottomNavigationBarItem(icon: Icon(Icons.location_on_outlined), activeIcon: Icon(Icons.location_on), label: 'Kiosks'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outlined), activeIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
