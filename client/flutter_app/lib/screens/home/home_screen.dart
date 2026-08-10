import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:skeletonizer/skeletonizer.dart';
import 'package:flutter_app/theme/app_theme.dart';
import 'package:flutter_app/services/api_service.dart';
import 'package:flutter_app/widgets/credit_balance_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  ApiUser? _user;
  List<ApiDeposit> _deposits = [];
  List<ApiKiosk> _kiosks = [];
  bool _loading = true;
  Timer? _refreshTimer;

  // Skeleton placeholders — same shape as real data so Skeletonizer's bones
  // match the loaded layout exactly (no layout jump), per the design
  // mandate's loading rule.
  static const _placeholderKiosks = [
    ApiKiosk(id: -1, name: 'Kiosk Name', location: 'Location', status: 'online'),
    ApiKiosk(id: -2, name: 'Kiosk Name', location: 'Location', status: 'online'),
  ];
  static const _placeholderDeposits = [
    ApiDeposit(id: -1, brand: 'Brand', volumeMl: 500, condition: 'perfect', confidence: 1, creditsAwarded: 2, timestamp: '2026-01-01'),
    ApiDeposit(id: -2, brand: 'Brand', volumeMl: 500, condition: 'perfect', confidence: 1, creditsAwarded: 2, timestamp: '2026-01-01'),
  ];

  @override
  void initState() {
    super.initState();
    _load();
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) => _refreshBalance());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _refreshBalance() async {
    try {
      final user = await ApiService.getMe();
      if (mounted) setState(() => _user = user);
    } catch (_) {}
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiService.getMe(),
        ApiService.getMyDeposits(),
        ApiService.getKiosks(),
      ]);
      if (mounted) {
        setState(() {
          _user = results[0] as ApiUser;
          _deposits = results[1] as List<ApiDeposit>;
          _kiosks = results[2] as List<ApiKiosk>;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final firstName = _user?.name.split(' ').first ?? 'there';
    final initial = firstName.isNotEmpty ? firstName[0].toUpperCase() : '?';

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Hello, $firstName! 👋', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const Text('Welcome to EcoCharge', style: TextStyle(fontSize: 12, color: Colors.white70)),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () {}),
          GestureDetector(
            onTap: () => context.go('/profile'),
            child: Container(margin: const EdgeInsets.only(right: 16), width: 36, height: 36, decoration: const BoxDecoration(color: Colors.white24, shape: BoxShape.circle), child: Center(child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)))),
          ),
        ],
      ),
      body: Skeletonizer(
        enabled: _loading,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CreditBalanceCard(creditBalance: _loading ? null : _user?.creditBalance),
              const SizedBox(height: 16),
              Row(children: [
                _StatChip(icon: '🍶', label: 'Bottles', value: _loading ? '00' : '${_deposits.length}'),
                const SizedBox(width: 12),
                _StatChip(icon: '⚡', label: 'Balance', value: _loading ? '— min' : (_user?.balanceLabel ?? '—')),
              ]),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => context.go('/scan'),
                  icon: const Icon(Icons.qr_code_scanner),
                  label: const Text('Scan Kiosk'),
                  style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                ),
              ),
              const SizedBox(height: 24),
              const Text('Nearby Kiosks', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
              const SizedBox(height: 12),
              ...(_loading ? _placeholderKiosks : _kiosks.take(2).toList())
                  .asMap()
                  .entries
                  .map((e) => _KioskTile(kiosk: e.value)
                      .animate(delay: (e.key * 60).ms)
                      .fadeIn(duration: 280.ms)
                      .slideX(begin: 0.04, end: 0, duration: 280.ms)),
              const SizedBox(height: 16),
              Row(children: [
                const Text('Recent Deposits', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
                const Spacer(),
                TextButton(onPressed: () => context.go('/history'), child: const Text('See all')),
              ]),
              ...(_loading ? _placeholderDeposits : _deposits.take(2).toList())
                  .asMap()
                  .entries
                  .map((e) => _DepositTile(deposit: e.value)
                      .animate(delay: (e.key * 60).ms)
                      .fadeIn(duration: 280.ms)
                      .slideX(begin: 0.04, end: 0, duration: 280.ms)),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String icon, label, value;
  const _StatChip({required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Expanded(child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 8)]),
      child: Row(children: [
        Text(icon, style: const TextStyle(fontSize: 28)),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryGreen)),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ]),
      ]),
    ));
  }
}

class _KioskTile extends StatelessWidget {
  final ApiKiosk kiosk;
  const _KioskTile({required this.kiosk});
  Color get _statusColor => kiosk.status == 'online' ? AppTheme.lightGreen : kiosk.status == 'error' ? AppTheme.danger : Colors.grey;
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 8)]),
      child: Row(children: [
        Container(width: 42, height: 42, decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(12)), child: const Center(child: Text('🏧', style: TextStyle(fontSize: 22)))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(kiosk.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          Text(kiosk.location, style: const TextStyle(color: Colors.grey, fontSize: 12)),
        ])),
        Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: _statusColor.withAlpha(26), borderRadius: BorderRadius.circular(8)), child: Text(kiosk.status, style: TextStyle(color: _statusColor, fontSize: 11, fontWeight: FontWeight.bold))),
      ]),
    );
  }
}

class _DepositTile extends StatelessWidget {
  final ApiDeposit deposit;
  const _DepositTile({required this.deposit});
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 8)]),
      child: Row(children: [
        Container(width: 42, height: 42, decoration: BoxDecoration(color: deposit.accepted ? const Color(0xFFE8F5E9) : const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12)), child: Center(child: Text(deposit.accepted ? '🍶' : '❌', style: const TextStyle(fontSize: 22)))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(deposit.brand, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          Text('${deposit.volumeLabel} · ${deposit.condition}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(deposit.creditLabel, style: TextStyle(color: deposit.accepted ? AppTheme.primaryGreen : AppTheme.danger, fontWeight: FontWeight.bold, fontSize: 14)),
          Text(deposit.timestamp.length > 10 ? deposit.timestamp.substring(0, 10) : deposit.timestamp, style: const TextStyle(color: Colors.grey, fontSize: 11)),
        ]),
      ]),
    );
  }
}
