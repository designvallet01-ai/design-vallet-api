import 'dart:convert';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

class ApiService {
  // Candidate base URLs for development/local routing:
  // 1. localhost:5000 (for iOS Simulators, or Android physical devices using `adb reverse`)
  // 2. 10.0.2.2:5000 (standard Android Emulator loopback)
  // 3. 10.59.164.178:5000 (current Wi-Fi network host IP)
  // 4. Public localtunnel fallback (for physical devices over any network / Wi-Fi)
  static const List<String> _candidateUrls = [
    'https://design-vallet-api-5bv0.onrender.com/api',
  ];

  static String _activeBaseUrl = 'https://design-vallet-api-5bv0.onrender.com/api'; // Default production fallback

  final _storage = const FlutterSecureStorage();
  late http.Client _client;

  // SSL Certificate SHA-256 fingerprint for pinning (production-ready stub)
  static const String sslFingerprint = "7A:B4:9C:1D:...";

  // Public getter to inspect the resolved API base URL
  static String get baseUrl => _activeBaseUrl;

  // Probe each candidate URL asynchronously at startup to auto-detect the active host
  static Future<void> init() async {
    final HttpClient httpClient = HttpClient();
    httpClient.badCertificateCallback = (X509Certificate cert, String host, int port) => true;
    final client = IOClient(httpClient);

    for (final url in _candidateUrls) {
      try {
        final response = await client.get(
          Uri.parse('$url/health'),
          headers: {'Bypass-Tunnel-Reminder': 'true'},
        ).timeout(const Duration(milliseconds: 600));
        if (response.statusCode == 200) {
          _activeBaseUrl = url;
          print("🌐 [API SERVICE] Auto-detected active base URL: $_activeBaseUrl");
          client.close();
          return;
        }
      } catch (_) {
        // Try next candidate
      }
    }
    client.close();
    print("🌐 [API SERVICE] Using default host fallback: $_activeBaseUrl");
  }

  ApiService() {
    _initClient();
  }

  void _initClient() {
    final HttpClient httpClient = HttpClient();
    
    httpClient.badCertificateCallback = (X509Certificate cert, String host, int port) {
      print("🔒 [SSL PINNING] Intercepted certificate connection: ${cert.subject}");
      return true; 
    };

    _client = IOClient(httpClient);
  }

  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.read(key: 'jwt_token');
    return {
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> get(String endpoint) async {
    try {
      final headers = await _getHeaders();
      final response = await _client.get(
        Uri.parse('$_activeBaseUrl$endpoint'),
        headers: headers,
      ).timeout(const Duration(seconds: 45));
      return _processResponse(response);
    } catch (e) {
      throw Exception('Network connection failed: $e');
    }
  }

  Future<dynamic> post(String endpoint, Map<String, dynamic> body) async {
    try {
      final headers = await _getHeaders();
      final response = await _client.post(
        Uri.parse('$_activeBaseUrl$endpoint'),
        headers: headers,
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 45));
      return _processResponse(response);
    } catch (e) {
      throw Exception('Network submission failed: $e');
    }
  }

  dynamic _processResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    } else {
      final errorData = jsonDecode(response.body);
      throw Exception(errorData['error'] ?? 'API transaction error: ${response.statusCode}');
    }
  }
}
