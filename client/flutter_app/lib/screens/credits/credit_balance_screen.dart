import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_app/services/api_service.dart';
import 'package:flutter_app/theme/app_theme.dart';
import 'package:flutter_app/widgets/credit_balance_card.dart';

class CreditBalanceScreen extends StatefulWidget {
  const CreditBalanceScreen({super.key});
  @override
  State<CreditBalanceScreen> createState() => _CreditBalanceScreenState();
}

class _CreditBalanceScreenState extends State<CreditBalanceScreen> {
  ApiUser? _user;
  List<ApiTransaction> _transactions = [];
  bool _loading = true;
  Timer? _refreshTimer;
  DateTime? _lastUpdated;

  @override
  void initState() {
    super.initState();
    Future.wait([ApiService.getMe(), ApiService.getMyTransactions()]).then((results) {
      if (mounted) {
        setState(() {
          _user = results[0] as ApiUser;
          _transactions = results[1] as List<ApiTransaction>;
          _loading = false;
          _lastUpdated = DateTime.now();
        });
      }
    }).catchError((_) {
      if (mounted) setState(() => _loading = false);
    });
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) => _refreshTransactions());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _refreshTransactions() async {
    try {
      final transactions = await ApiService.getMyTransactions();
      if (mounted) {
        setState(() {
          _transactions = transactions;
          _lastUpdated = DateTime.now();
        });
      }
    } catch (_) {}
  }

  String get _lastUpdatedLabel {
    if (_lastUpdated == null) return '';
    final h = _lastUpdated!.hour.toString().padLeft(2, '0');
    final m = _lastUpdated!.minute.toString().padLeft(2, '0');
    final s = _lastUpdated!.second.toString().padLeft(2, '0');
    return 'Last updated $h:$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final earned = _transactions.where((t) => t.isEarned).fold(0, (s, t) => s + t.amount);
    final spent = _transactions.where((t) => !t.isEarned).fold(0, (s, t) => s + t.amount);

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(title: const Text('My Credits'), backgroundColor: AppTheme.primaryGreen, foregroundColor: Colors.white),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: CreditBalanceCard(creditBalance: _user?.creditBalance),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(children: [
                    _InfoChip(label: 'Total Earned', value: '$earned min', icon: '⬆️'),
                    const SizedBox(width: 12),
                    _InfoChip(label: 'Total Used', value: '$spent min', icon: '⬇️'),
                  ]),
                ),
                const SizedBox(height: 16),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Transaction History', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      if (_lastUpdated != null)
                        Text(_lastUpdatedLabel, style: const TextStyle(color: Colors.grey, fontSize: 11)),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(child: _transactions.isEmpty
                    ? const Center(child: Text('No transactions yet', style: TextStyle(color: Colors.grey)))
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _transactions.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final t = _transactions[i];
                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 8)]),
                            child: Row(children: [
                              Container(width: 40, height: 40, decoration: BoxDecoration(color: t.isEarned ? const Color(0xFFE8F5E9) : const Color(0xFFFEF2F2), shape: BoxShape.circle), child: Center(child: Text(t.isEarned ? '⬆️' : '⬇️'))),
                              const SizedBox(width: 12),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(t.type, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                Text(t.timestamp.length > 10 ? t.timestamp.substring(0, 10) : t.timestamp, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                              ])),
                              Text(t.amountLabel, style: TextStyle(color: t.isEarned ? AppTheme.primaryGreen : AppTheme.danger, fontWeight: FontWeight.bold, fontSize: 15)),
                            ]),
                          );
                        },
                      )),
              ],
            ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final String label, value, icon;
  const _InfoChip({required this.label, required this.value, required this.icon});
  @override
  Widget build(BuildContext context) {
    return Expanded(child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), boxShadow: [BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 8)]),
      child: Row(children: [
        Text(icon),
        const SizedBox(width: 8),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 11)),
        ]),
      ]),
    ));
  }
}
