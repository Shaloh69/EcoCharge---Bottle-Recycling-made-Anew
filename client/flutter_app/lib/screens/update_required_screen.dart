import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_app/theme/app_theme.dart';
import 'package:flutter_app/widgets/eco_mascot.dart';

/// Hard-block "Update Required" screen.
///
/// This is a genuine block, not a dismissible dialog: [PopScope] with
/// `canPop: false` means the system back button and the predictive-back gesture
/// cannot leave it, and there is no route off this screen. It is only ever
/// shown when the installed version is below the server's `min_version`.
///
/// Why a hard block rather than a nudge for that tier — the reasoning, so a
/// future reader doesn't have to guess (also recorded in memory.md, 2026-08-12):
/// this app reads and spends a real credit balance against a live API. A client
/// running against an API contract it no longer understands doesn't fail
/// visibly; it silently shows the wrong balance, or spends against the wrong
/// endpoint. That is the narrow case where refusing to run beats degrading
/// gracefully. Everything short of that is [UpdateGateStatus.optional] and is
/// dismissible, so `min_version` should be raised only for genuinely breaking
/// changes.
///
/// The app is sideloaded (direct APK, no Play Store), so the update path is the
/// public website's /download page, not a store deep link.
class UpdateRequiredScreen extends StatelessWidget {
  final String installedVersion;
  final String? latestVersion;
  final String? downloadUrl;

  const UpdateRequiredScreen({
    super.key,
    required this.installedVersion,
    this.latestVersion,
    this.downloadUrl,
  });

  Future<void> _openDownload(BuildContext context) async {
    final url = downloadUrl;
    if (url == null || url.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'No download link is configured. Ask an EcoCharge admin for the latest APK.',
            ),
            duration: Duration(seconds: 10),
          ),
        );
      }
      return;
    }
    final uri = Uri.parse(url);
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not open $url'),
          duration: const Duration(seconds: 10),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.forest950 : AppColors.green50;
    final titleColor = isDark ? Colors.white : AppColors.green900;
    final bodyColor = isDark ? Colors.white70 : AppColors.green800;

    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: bg,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Center(
                    child: EcoMascot(mood: MascotMood.sad, size: 120),
                  ),
                  const SizedBox(height: 32),
                  Text(
                    'Time to update',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.bold,
                      color: titleColor,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'This version of EcoCharge is too old to talk to the server safely. '
                    'Rather than risk showing you the wrong credit balance, it stops here.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 16,
                      height: 1.5,
                      color: bodyColor,
                    ),
                  ),
                  const SizedBox(height: 28),
                  _VersionRow(
                    label: 'Installed',
                    value: installedVersion,
                    isDark: isDark,
                    highlight: true,
                  ),
                  if (latestVersion != null) ...[
                    const SizedBox(height: 8),
                    _VersionRow(
                      label: 'Required',
                      value: latestVersion!,
                      isDark: isDark,
                    ),
                  ],
                  const SizedBox(height: 32),
                  FilledButton(
                    onPressed: () => _openDownload(context),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppTheme.primaryGreen,
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(56),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Text(
                      'Download the latest version',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Your credits are safe — they live on your account, not on this device.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      color: bodyColor.withValues(alpha: 0.75),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Version numbers wear the mono family — they are data, per the design mandate.
class _VersionRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isDark;
  final bool highlight;

  const _VersionRow({
    required this.label,
    required this.value,
    required this.isDark,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    final labelColor = isDark ? Colors.white60 : AppColors.green800;
    final valueColor = highlight
        ? AppTheme.danger
        : (isDark ? Colors.white : AppColors.green900);

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          '$label  ',
          style: TextStyle(fontSize: 14, color: labelColor),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            fontFeatures: const [FontFeature.tabularFigures()],
            fontFamily: 'monospace',
            color: valueColor,
          ),
        ),
      ],
    );
  }
}
