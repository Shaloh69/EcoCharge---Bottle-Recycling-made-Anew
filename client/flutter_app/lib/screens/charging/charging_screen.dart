import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_app/services/api_service.dart';
import 'package:flutter_app/theme/app_theme.dart';

class ChargingScreen extends StatefulWidget {
  final int sessionId;
  final int durationSeconds;
  final int portNumber;

  const ChargingScreen({
    super.key,
    required this.sessionId,
    required this.durationSeconds,
    required this.portNumber,
  });

  @override
  State<ChargingScreen> createState() => _ChargingScreenState();
}

class _ChargingScreenState extends State<ChargingScreen> {
  late int _remaining;
  Timer? _timer;
  bool _stopping = false;

  @override
  void initState() {
    super.initState();
    _remaining = widget.durationSeconds;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_remaining <= 0) {
        _timer?.cancel();
        _onFinished();
        return;
      }
      if (mounted) setState(() => _remaining--);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _onFinished() {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Charging session complete!'), backgroundColor: Colors.green),
    );
    context.go('/home');
  }

  Future<void> _stop() async {
    setState(() => _stopping = true);
    try {
      await ApiService.stopCharging(widget.sessionId);
    } catch (_) {}
    _timer?.cancel();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Charging stopped'), backgroundColor: Colors.orange),
      );
      context.go('/home');
    }
  }

  String get _timeLabel {
    final m = _remaining ~/ 60;
    final s = _remaining % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final progress = widget.durationSeconds > 0
        ? _remaining / widget.durationSeconds
        : 0.0;

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('Charging'),
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Port ${widget.portNumber}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
              const SizedBox(height: 8),
              const Text('Charging in progress...', style: TextStyle(color: Colors.grey, fontSize: 14)),
              const SizedBox(height: 48),
              SizedBox(
                width: 200,
                height: 200,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox.expand(
                      child: CircularProgressIndicator(
                        value: progress,
                        strokeWidth: 12,
                        backgroundColor: Colors.grey.shade200,
                        valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryGreen),
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_timeLabel, style: const TextStyle(fontSize: 42, fontWeight: FontWeight.bold, color: Color(0xFF1B5E20))),
                        const Text('remaining', style: TextStyle(color: Colors.grey, fontSize: 12)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: _stopping ? null : _stop,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.red),
                    foregroundColor: Colors.red,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(_stopping ? 'Stopping...' : 'Stop Charging'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
