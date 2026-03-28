import 'package:flutter/material.dart';
import 'package:flutter_app/theme/app_theme.dart';

enum MascotMood { idle, happy, scanning, sad, alert }

class EcoMascot extends StatelessWidget {
  final MascotMood mood;
  final double size;
  const EcoMascot({super.key, this.mood = MascotMood.idle, this.size = 100});

  @override
  Widget build(BuildContext context) {
    final (color, emoji) = switch (mood) {
      MascotMood.happy => (const Color(0xFF388E3C), '🎉'),
      MascotMood.scanning => (const Color(0xFF00695C), '🔍'),
      MascotMood.sad => (const Color(0xFF5D4037), '😔'),
      MascotMood.alert => (const Color(0xFFE65100), '⚠️'),
      MascotMood.idle => (AppTheme.midGreen, '🌿'),
    };
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size, height: size,
          decoration: BoxDecoration(
            color: color, shape: BoxShape.circle,
            border: Border.all(color: Colors.white.withAlpha(76), width: 4),
            boxShadow: [BoxShadow(color: Colors.black.withAlpha(51), blurRadius: 16, offset: const Offset(0, 4))],
          ),
          child: Center(child: Text(emoji, style: TextStyle(fontSize: size * 0.4))),
        ),
        const SizedBox(height: 8),
        Container(width: size * 0.6, height: 8, decoration: BoxDecoration(color: Colors.black.withAlpha(38), borderRadius: BorderRadius.circular(4))),
      ],
    );
  }
}
