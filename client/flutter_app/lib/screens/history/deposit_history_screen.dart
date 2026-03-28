import 'package:flutter/material.dart';
import 'package:flutter_app/services/api_service.dart';
import 'package:flutter_app/theme/app_theme.dart';

class DepositHistoryScreen extends StatefulWidget {
  const DepositHistoryScreen({super.key});
  @override
  State<DepositHistoryScreen> createState() => _DepositHistoryScreenState();
}

class _DepositHistoryScreenState extends State<DepositHistoryScreen> {
  List<ApiDeposit> _deposits = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    ApiService.getMyDeposits().then((d) {
      if (mounted) setState(() { _deposits = d; _loading = false; });
    }).catchError((_) {
      if (mounted) setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(title: const Text('Deposit History'), backgroundColor: AppTheme.primaryGreen, foregroundColor: Colors.white),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _deposits.isEmpty
              ? const Center(child: Text('No deposits yet', style: TextStyle(color: Colors.grey)))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _deposits.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final d = _deposits[i];
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 8)]),
                      child: Row(children: [
                        Container(width: 48, height: 48, decoration: BoxDecoration(color: d.accepted ? const Color(0xFFE8F5E9) : const Color(0xFFFEF2F2), shape: BoxShape.circle), child: Center(child: Text(d.accepted ? '🍶' : '❌', style: const TextStyle(fontSize: 24)))),
                        const SizedBox(width: 14),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(d.brand, style: const TextStyle(fontWeight: FontWeight.bold)),
                          Text('${d.volumeLabel} · ${d.condition}', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                        ])),
                        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                          Text(d.creditLabel, style: TextStyle(color: d.accepted ? AppTheme.primaryGreen : AppTheme.danger, fontWeight: FontWeight.bold)),
                          Text('${(d.confidence * 100).toInt()}% conf.', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                          Text(d.timestamp.length > 10 ? d.timestamp.substring(0, 10) : d.timestamp, style: const TextStyle(color: Colors.grey, fontSize: 11)),
                        ]),
                      ]),
                    );
                  },
                ),
    );
  }
}
