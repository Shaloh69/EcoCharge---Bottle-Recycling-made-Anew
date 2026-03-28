import 'package:flutter/material.dart';
import 'package:flutter_app/services/api_service.dart';
import 'package:flutter_app/theme/app_theme.dart';

class KioskListScreen extends StatefulWidget {
  const KioskListScreen({super.key});
  @override
  State<KioskListScreen> createState() => _KioskListScreenState();
}

class _KioskListScreenState extends State<KioskListScreen> {
  List<ApiKiosk> _kiosks = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    ApiService.getKiosks().then((k) {
      if (mounted) setState(() { _kiosks = k; _loading = false; });
    }).catchError((_) {
      if (mounted) setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(title: const Text('Nearby Kiosks'), backgroundColor: AppTheme.primaryGreen, foregroundColor: Colors.white),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Container(
                  color: AppTheme.primaryGreen,
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                    child: const Row(children: [
                      Icon(Icons.search, color: Colors.grey),
                      SizedBox(width: 8),
                      Text('Search kiosks...', style: TextStyle(color: Colors.grey)),
                    ]),
                  ),
                ),
                Expanded(child: _kiosks.isEmpty
                    ? const Center(child: Text('No kiosks found', style: TextStyle(color: Colors.grey)))
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _kiosks.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) {
                          final k = _kiosks[i];
                          final statusColor = k.status == 'online' ? AppTheme.lightGreen : k.status == 'error' ? AppTheme.danger : Colors.grey;
                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withAlpha(13), blurRadius: 8)]),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Row(children: [
                                Text(k.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                const Spacer(),
                                Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: statusColor.withAlpha(26), borderRadius: BorderRadius.circular(20)), child: Row(mainAxisSize: MainAxisSize.min, children: [
                                  Container(width: 8, height: 8, decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle)),
                                  const SizedBox(width: 6),
                                  Text(k.status, style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold)),
                                ])),
                              ]),
                              const SizedBox(height: 4),
                              Row(children: [const Icon(Icons.location_on_outlined, size: 14, color: Colors.grey), const SizedBox(width: 4), Text(k.location, style: const TextStyle(color: Colors.grey, fontSize: 13))]),
                              if (k.status != 'offline') ...[
                                const SizedBox(height: 12),
                                SizedBox(width: double.infinity, child: ElevatedButton(onPressed: () {}, style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 10)), child: const Text('Navigate'))),
                              ],
                            ]),
                          );
                        },
                      )),
              ],
            ),
    );
  }
}
