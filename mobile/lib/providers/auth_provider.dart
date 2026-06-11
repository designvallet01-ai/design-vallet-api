import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final _storage = const FlutterSecureStorage();

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _token;
  String? get token => _token;

  Map<String, dynamic>? _user;
  Map<String, dynamic>? get user => _user;

  bool get isAuthenticated => _token != null;

  AuthProvider() {
    _loadSession();
  }

  Future<void> _loadSession() async {
    _token = await _storage.read(key: 'jwt_token');
    final userStr = await _storage.read(key: 'user_profile');
    if (userStr != null) {
      // Decode simulated user data
      // For brevity, store simple json user strings
    }
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    _setLoading(true);
    try {
      final res = await _apiService.post('/auth/login', {
        'email': email,
        'password': password,
      });

      _token = res['token'];
      _user = res['user'];

      await _storage.write(key: 'jwt_token', value: _token);
      notifyListeners();
    } catch (e) {
      rethrow;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> signup(String email, String password, String name, String phone) async {
    _setLoading(true);
    try {
      final res = await _apiService.post('/auth/signup', {
        'email': email,
        'password': password,
        'full_name': name,
        'phone_number': phone,
      });

      _token = res['token'];
      _user = res['user'];

      await _storage.write(key: 'jwt_token', value: _token);
      notifyListeners();
    } catch (e) {
      rethrow;
    } finally {
      _setLoading(false);
    }
  }



  Future<void> logout() async {
    _token = null;
    _user = null;
    await _storage.delete(key: 'jwt_token');
    await _storage.delete(key: 'user_profile');
    notifyListeners();
  }

  void _setLoading(bool val) {
    _isLoading = val;
    notifyListeners();
  }
}
