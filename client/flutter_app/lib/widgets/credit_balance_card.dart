import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_app/theme/app_theme.dart';

/// Home's hero number, per docs/planning/02-design-mandate.md SS5: "Credit
/// balance is the hero number on Home — mono-tabular numerals, animated
/// count-up on change, green when it increases." Was a plain static Text
/// widget until 2026-08-11 (the animation-stack deps were installed but
/// never actually wired into any screen) - this is the real wiring.
class CreditBalanceCard extends StatefulWidget {
  final int? creditBalance;
  const CreditBalanceCard({super.key, required this.creditBalance});

  @override
  State<CreditBalanceCard> createState() => _CreditBalanceCardState();
}

class _CreditBalanceCardState extends State<CreditBalanceCard> {
  int _displayed = 0;
  bool _flashUp = false;

  @override
  void didUpdateWidget(CreditBalanceCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    final next = widget.creditBalance ?? _displayed;
    if (next > _displayed) {
      setState(() => _flashUp = true);
      Future.delayed(const Duration(milliseconds: 900), () {
        if (mounted) setState(() => _flashUp = false);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final target = widget.creditBalance ?? 0;
    final loaded = widget.creditBalance != null;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTheme.primaryGreen, AppTheme.midGreen],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryGreen.withAlpha(_flashUp ? 140 : 76),
            blurRadius: _flashUp ? 28 : 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Current Credit Balance',
              style: TextStyle(color: Colors.white70, fontSize: 14)),
          const SizedBox(height: 8),
          loaded
              ? TweenAnimationBuilder<double>(
                  tween: Tween(begin: _displayed.toDouble(), end: target.toDouble()),
                  duration: const Duration(milliseconds: 650),
                  curve: Curves.easeOutCubic,
                  onEnd: () => _displayed = target,
                  builder: (context, value, _) {
                    return Text(
                      '${value.round()} min',
                      style: AppTheme.monoStyle(
                        context,
                        fontSize: 36,
                        fontWeight: FontWeight.w700,
                        color: _flashUp ? AppTheme.lightGreen : Colors.white,
                      ),
                    );
                  },
                )
              : Text('— min', style: AppTheme.monoStyle(context, fontSize: 36, color: Colors.white70)),
          const SizedBox(height: 4),
          const Text('Available charging time',
              style: TextStyle(color: Colors.white60, fontSize: 12)),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.08, end: 0, duration: 400.ms, curve: Curves.easeOutCubic);
  }
}
