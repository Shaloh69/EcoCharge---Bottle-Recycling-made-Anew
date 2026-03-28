import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_app/theme/app_theme.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int _page = 0;
  final _controller = PageController();

  final _slides = [
    {'title': 'What is EcoCharge?', 'desc': 'EcoCharge is a smart kiosk that lets you recycle plastic bottles in exchange for device charging time.', 'emoji': '🌿'},
    {'title': 'How it works', 'desc': 'Insert your plastic bottle into the kiosk. Our AI detects and validates it. You earn charging credits instantly!', 'emoji': '♻️'},
    {'title': 'Why recycle?', 'desc': 'Every bottle you recycle helps the environment and earns you free charging time at campus kiosks.', 'emoji': '⚡'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.primaryGreen,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView.builder(
                controller: _controller,
                onPageChanged: (i) => setState(() => _page = i),
                itemCount: _slides.length,
                itemBuilder: (_, i) => Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_slides[i]['emoji']!, style: const TextStyle(fontSize: 80)),
                      const SizedBox(height: 32),
                      Text(_slides[i]['title']!, style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      Text(_slides[i]['desc']!, style: TextStyle(color: Colors.white.withAlpha(178), fontSize: 16), textAlign: TextAlign.center),
                    ],
                  ),
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_slides.length, (i) => Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: _page == i ? 20 : 8, height: 8,
                decoration: BoxDecoration(
                  color: _page == i ? Colors.white : Colors.white38,
                  borderRadius: BorderRadius.circular(4),
                ),
              )),
            ),
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(children: [
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => _page < _slides.length - 1 ? _controller.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut) : context.go('/login'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppTheme.primaryGreen),
                    child: Text(_page < _slides.length - 1 ? 'Next' : 'Get Started'),
                  ),
                ),
                const SizedBox(height: 8),
                TextButton(onPressed: () => context.go('/login'), child: const Text('Skip', style: TextStyle(color: Colors.white70))),
              ]),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
