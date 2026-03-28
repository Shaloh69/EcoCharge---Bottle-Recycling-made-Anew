import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:flutter_app/services/api_service.dart';
import 'package:flutter_app/theme/app_theme.dart';

class ScanKioskScreen extends StatefulWidget {
  const ScanKioskScreen({super.key});
  @override
  State<ScanKioskScreen> createState() => _ScanKioskScreenState();
}

class _ScanKioskScreenState extends State<ScanKioskScreen> {
  bool _scanned = false;
  String? _error;
  final MobileScannerController _controller = MobileScannerController();

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_scanned) return;
    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw == null) return;

    setState(() => _scanned = true);
    _controller.stop();

    try {
      final data = jsonDecode(raw) as Map<String, dynamic>;
      final kioskId = data['kioskId']?.toString() ?? '1';
      final sessionToken = data['sessionToken']?.toString() ?? '';

      final hasToken = await ApiService.hasToken();
      if (hasToken) {
        await ApiService.linkKiosk(sessionToken, kioskId);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✓ Linked to kiosk!'), backgroundColor: AppTheme.primaryGreen),
        );
        Future.delayed(const Duration(seconds: 1), () { if (mounted) context.go('/home'); });
      }
    } catch (e) {
      setState(() { _scanned = false; _error = 'Failed to link: ${e.toString().replaceFirst("Exception: ", "")}'; });
      _controller.start();
    }
  }

  @override
  void dispose() { _controller.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan Kiosk'), backgroundColor: AppTheme.primaryGreen, foregroundColor: Colors.white),
      body: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                MobileScanner(controller: _controller, onDetect: _onDetect),
                Center(
                  child: Container(
                    width: 240, height: 240,
                    decoration: BoxDecoration(border: Border.all(color: _scanned ? Colors.green : Colors.white, width: 3), borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ],
            ),
          ),
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(24),
            child: Column(children: [
              if (_error != null)
                Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13), textAlign: TextAlign.center)),
              Text(_scanned ? '✓ Linking to kiosk...' : 'Point your camera at the QR code on the kiosk', textAlign: TextAlign.center, style: TextStyle(color: _scanned ? AppTheme.primaryGreen : Colors.grey.shade700, fontSize: 16)),
              if (!_scanned) ...[const SizedBox(height: 16), OutlinedButton(onPressed: () => context.pop(), child: const Text('Cancel'))],
            ]),
          ),
        ],
      ),
    );
  }
}
