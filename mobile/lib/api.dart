import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

/// Override at build time: flutter run --dart-define=API_URL=https://your-api/api
/// 10.0.2.2 reaches the host machine from the Android emulator.
const baseUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:5000/api');

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class Api {
  static const _s = FlutterSecureStorage();
  static String? token;
  static final ValueNotifier<Map<String, dynamic>?> userN = ValueNotifier(null);
  static Map<String, dynamic> get user => userN.value!;
  static String get role => user['role'];

  static Future<void> load() async {
    token = await _s.read(key: 'token');
    final u = await _s.read(key: 'user');
    if (token != null && u != null) userN.value = jsonDecode(u);
  }

  static Future<void> login(String email, String password) async =>
      _saveSession(await post('/auth/login', {'email': email, 'password': password}));

  static Future<void> register(Map<String, dynamic> body) async =>
      _saveSession(await post('/auth/register', body));

  static Future<void> _saveSession(dynamic d) async {
    token = d['token'];
    await _s.write(key: 'token', value: token);
    await _s.write(key: 'user', value: jsonEncode(d['user']));
    userN.value = Map<String, dynamic>.from(d['user']);
  }

  static Future<void> logout() async {
    token = null;
    await _s.deleteAll();
    userN.value = null;
  }

  static Map<String, String> get _h => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  static dynamic _parse(http.Response r) {
    final b = r.body.isEmpty ? null : jsonDecode(r.body);
    if (r.statusCode == 401 && token != null) logout();
    if (r.statusCode >= 400) throw ApiException(b is Map ? (b['message'] ?? 'Error ${r.statusCode}') : 'Error ${r.statusCode}');
    return b;
  }

  static Future<dynamic> get(String p) async => _parse(await http.get(Uri.parse('$baseUrl$p'), headers: _h));
  static Future<dynamic> post(String p, Map body) async =>
      _parse(await http.post(Uri.parse('$baseUrl$p'), headers: _h, body: jsonEncode(body)));
  static Future<dynamic> put(String p, Map body) async =>
      _parse(await http.put(Uri.parse('$baseUrl$p'), headers: _h, body: jsonEncode(body)));

  static Future<dynamic> upload(String p, String field, String path, {Map<String, String>? fields}) async {
    final req = http.MultipartRequest('POST', Uri.parse('$baseUrl$p'))
      ..headers['Authorization'] = 'Bearer $token'
      ..files.add(await http.MultipartFile.fromPath(field, path));
    if (fields != null) req.fields.addAll(fields);
    return _parse(await http.Response.fromStream(await req.send()));
  }
}
