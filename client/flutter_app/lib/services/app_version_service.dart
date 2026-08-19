import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';

/// Launch-time app-version gate.
///
/// Mirrors the `MIN_APP_VERSION` / `LATEST_APP_VERSION` two-tier shape served by
/// the API's `GET /api/app-config`:
///
///   * installed < min     -> [UpdateGateStatus.blocked]  (hard block, no dismiss)
///   * min <= installed < latest -> [UpdateGateStatus.optional] (dismissible nudge)
///   * otherwise           -> [UpdateGateStatus.ok]
///
/// **This gate fails open, deliberately.** If the API is unreachable, times out,
/// or returns something unparseable, the result is [UpdateGateStatus.ok] and the
/// app proceeds normally. A version check exists to stop a *known-incompatible*
/// client, not to make the app unusable whenever the backend has a bad day —
/// and this project has already had a real multi-hour backend outage (2026-08-12,
/// see memory.md) during which a fail-closed gate would have bricked every
/// installed copy of the app for reasons that had nothing to do with the app.
enum UpdateGateStatus { ok, optional, blocked }

class UpdateGateResult {
  final UpdateGateStatus status;
  final String installedVersion;
  final String? latestVersion;
  final String? downloadUrl;

  const UpdateGateResult({
    required this.status,
    required this.installedVersion,
    this.latestVersion,
    this.downloadUrl,
  });
}

class AppVersionService {
  final String baseUrl;
  final http.Client _client;

  AppVersionService({required this.baseUrl, http.Client? client})
      : _client = client ?? http.Client();

  /// Compares two dotted numeric versions ("1.2.10" vs "1.3.0").
  ///
  /// Returns <0 if [a] is older than [b], 0 if equal, >0 if newer. Missing
  /// components count as 0, so "1.2" == "1.2.0". Any non-numeric component
  /// (a pre-release suffix like "1.2.0-beta") is treated as 0 for that slot
  /// rather than throwing — the gate must never crash the launch path.
  static int compareVersions(String a, String b) {
    final pa = a.trim().split('.');
    final pb = b.trim().split('.');
    final len = pa.length > pb.length ? pa.length : pb.length;
    for (var i = 0; i < len; i++) {
      final na = i < pa.length ? int.tryParse(pa[i].split('-').first) ?? 0 : 0;
      final nb = i < pb.length ? int.tryParse(pb[i].split('-').first) ?? 0 : 0;
      if (na != nb) return na < nb ? -1 : 1;
    }
    return 0;
  }

  Future<UpdateGateResult> check() async {
    // Compile-time fallback for when the platform plugin is unavailable.
    // This failure mode is real, not theoretical: the 2026-08-20 verification
    // found a stale web plugin registrant had silently dropped
    // package_info_plus, which made PackageInfo.fromPlatform() throw and the
    // old code fail open — the gate was silently disabled on that platform.
    // Keep this in sync with pubspec.yaml's version when bumping releases.
    const fallbackVersion = '1.0.0';
    String installed;
    try {
      installed = (await PackageInfo.fromPlatform()).version;
    } catch (_) {
      installed = fallbackVersion;
    }

    try {
      final res = await _client
          .get(Uri.parse('$baseUrl/api/app-config'))
          .timeout(const Duration(seconds: 6));

      if (res.statusCode != 200) {
        return UpdateGateResult(
          status: UpdateGateStatus.ok,
          installedVersion: installed,
        );
      }

      final body = jsonDecode(res.body) as Map<String, dynamic>;
      final minV = body['min_version'] as String?;
      final latestV = body['latest_version'] as String?;
      final url = body['download_url'] as String?;

      if (minV != null && compareVersions(installed, minV) < 0) {
        return UpdateGateResult(
          status: UpdateGateStatus.blocked,
          installedVersion: installed,
          latestVersion: latestV ?? minV,
          downloadUrl: url,
        );
      }

      if (latestV != null && compareVersions(installed, latestV) < 0) {
        return UpdateGateResult(
          status: UpdateGateStatus.optional,
          installedVersion: installed,
          latestVersion: latestV,
          downloadUrl: url,
        );
      }

      return UpdateGateResult(
        status: UpdateGateStatus.ok,
        installedVersion: installed,
        latestVersion: latestV,
      );
    } catch (_) {
      // Unreachable API, timeout, malformed JSON — fail open. See class doc.
      return UpdateGateResult(
        status: UpdateGateStatus.ok,
        installedVersion: installed,
      );
    }
  }
}
