import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

// Self-hosted on desktop-gklhcri via a free Cloudflare quick tunnel — rotates
// only if the tunnel process restarts (see esp/ecocharge/include/config.h's
// RENDER_BASE_URL comment for how to find the current URL if it ever does).
const _base = String.fromEnvironment('API_BASE_URL',
    defaultValue: 'https://packages-towns-essex-houses.trycloudflare.com');

class ApiUser {
  final int id;
  final String name;
  final String email;
  final String? phone;
  final String? profilePictureUrl;
  final int creditBalance;
  final bool isAdmin;
  const ApiUser({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.profilePictureUrl,
    required this.creditBalance,
    required this.isAdmin,
  });
  factory ApiUser.fromJson(Map<String, dynamic> j) => ApiUser(
        id: j['id'] as int,
        name: j['name'] as String,
        email: j['email'] as String,
        phone: j['phone'] as String?,
        profilePictureUrl: j['profile_picture_url'] as String?,
        creditBalance: (j['credit_balance'] as num).toInt(),
        isAdmin: j['is_admin'] as bool? ?? false,
      );
  String get balanceLabel => '$creditBalance min';
}

class ApiDeposit {
  final int id;
  final String brand;
  final int volumeMl;
  final String condition;
  final double confidence;
  final int creditsAwarded;
  final String timestamp;
  const ApiDeposit({
    required this.id,
    required this.brand,
    required this.volumeMl,
    required this.condition,
    required this.confidence,
    required this.creditsAwarded,
    required this.timestamp,
  });
  factory ApiDeposit.fromJson(Map<String, dynamic> j) => ApiDeposit(
        id: j['id'] as int,
        brand: j['brand'] as String? ?? 'Unknown',
        volumeMl: (j['volume_ml'] as num?)?.toInt() ?? 0,
        condition: j['condition'] as String? ?? '',
        confidence: (j['confidence'] as num?)?.toDouble() ?? 0.0,
        creditsAwarded: (j['credits_awarded'] as num?)?.toInt() ?? 0,
        timestamp: j['timestamp'] as String? ?? '',
      );
  bool get accepted => creditsAwarded > 0;
  String get creditLabel => accepted ? '+$creditsAwarded min' : 'Rejected';
  String get volumeLabel => volumeMl > 0 ? '${volumeMl}ml' : 'Unknown';
}

class ApiTransaction {
  final int id;
  final String type;
  final int amount;
  final int balanceAfter;
  final String timestamp;
  const ApiTransaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.balanceAfter,
    required this.timestamp,
  });
  factory ApiTransaction.fromJson(Map<String, dynamic> j) => ApiTransaction(
        id: j['id'] as int,
        type: j['type'] as String,
        amount: (j['amount'] as num).toInt(),
        balanceAfter: (j['balance_after'] as num).toInt(),
        timestamp: j['timestamp'] as String? ?? '',
      );
  bool get isEarned => type == 'EARN';
  String get amountLabel => isEarned ? '+$amount min' : '-$amount min';
}

class ApiKiosk {
  final int id;
  final String name;
  final String location;
  final String status;
  final String? lastSeenAt;
  const ApiKiosk({
    required this.id,
    required this.name,
    required this.location,
    required this.status,
    this.lastSeenAt,
  });
  factory ApiKiosk.fromJson(Map<String, dynamic> j) => ApiKiosk(
        id: j['id'] as int,
        name: j['name'] as String,
        location: j['location'] as String,
        status: j['status'] as String,
        lastSeenAt: j['last_seen_at'] as String?,
      );
}

class ApiService {
  /// The API origin this build talks to. Exposed so the launch-time update
  /// gate ([AppVersionService]) can reach `/api/app-config` without
  /// duplicating the `--dart-define=API_BASE_URL` default.
  static String get baseUrl => _base;

  static String? _token;

  static Future<void> _loadToken() async {
    if (_token != null) return;
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('user_token');
  }

  static Future<void> saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user_token', token);
  }

  static Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user_token');
  }

  static Future<bool> hasToken() async {
    await _loadToken();
    return _token != null && _token!.isNotEmpty;
  }

  static Map<String, String> get _headers {
    final h = {'Content-Type': 'application/json'};
    if (_token != null) h['Authorization'] = 'Bearer $_token';
    return h;
  }

  static Future<Map<String, dynamic>> _post(String path, Map body) async {
    await _loadToken();
    final res = await http.post(
      Uri.parse('$_base$path'),
      headers: _headers,
      body: jsonEncode(body),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) {
      throw Exception(data['error'] ?? 'HTTP ${res.statusCode}');
    }
    return data;
  }

  static Future<dynamic> _get(String path) async {
    await _loadToken();
    final res = await http.get(Uri.parse('$_base$path'), headers: _headers);
    if (res.statusCode >= 400) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      throw Exception(data['error'] ?? 'HTTP ${res.statusCode}');
    }
    return jsonDecode(res.body);
  }

  // ── Auth ─────────────────────────────────────────────────────────────────

  static Future<ApiUser> login(String email, String password) async {
    final data = await _post('/api/auth/login', {'email': email, 'password': password});
    await saveToken(data['access_token'] as String);
    return ApiUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  static Future<ApiUser> register(String name, String email, String? phone, String password) async {
    final body = <String, dynamic>{'name': name, 'email': email, 'password': password};
    if (phone != null && phone.isNotEmpty) body['phone'] = phone;
    final data = await _post('/api/auth/register', body);
    await saveToken(data['access_token'] as String);
    return ApiUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  // ── User ─────────────────────────────────────────────────────────────────

  static Future<ApiUser> getMe() async {
    final data = await _get('/api/users/me') as Map<String, dynamic>;
    return ApiUser.fromJson(data);
  }

  static Future<List<ApiDeposit>> getMyDeposits() async {
    final list = await _get('/api/users/me/deposits') as List;
    return list.map((e) => ApiDeposit.fromJson(e as Map<String, dynamic>)).toList();
  }

  static Future<List<ApiTransaction>> getMyTransactions() async {
    final list = await _get('/api/users/me/transactions') as List;
    return list.map((e) => ApiTransaction.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ── Kiosks ────────────────────────────────────────────────────────────────

  static Future<List<ApiKiosk>> getKiosks() async {
    final list = await _get('/api/kiosk/list') as List;
    return list.map((e) => ApiKiosk.fromJson(e as Map<String, dynamic>)).toList();
  }

  // ── QR Link ──────────────────────────────────────────────────────────────

  static Future<Map<String, dynamic>> linkKiosk(String sessionToken, String kioskId) async {
    return await _post('/api/kiosk/qr-link', {
      'session_token': sessionToken,
      'kiosk_id': int.tryParse(kioskId) ?? 1,
    });
  }

  // ── Charging ──────────────────────────────────────────────────────────────

  static Future<void> stopCharging(int sessionId) async {
    await _post('/api/charging/stop/$sessionId', {});
  }

  // ── Avatar ────────────────────────────────────────────────────────────────

  static Future<String> uploadAvatar(File imageFile) async {
    await _loadToken();
    final req = http.MultipartRequest(
      'POST',
      Uri.parse('$_base/api/users/me/avatar'),
    );
    if (_token != null) req.headers['Authorization'] = 'Bearer $_token';
    req.files.add(await http.MultipartFile.fromPath('file', imageFile.path));
    final streamed = await req.send();
    final body = await streamed.stream.bytesToString();
    if (streamed.statusCode >= 400) {
      final data = jsonDecode(body) as Map<String, dynamic>;
      throw Exception(data['error'] ?? 'HTTP ${streamed.statusCode}');
    }
    final data = jsonDecode(body) as Map<String, dynamic>;
    return data['profile_picture_url'] as String;
  }
}
