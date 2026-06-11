import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/api_service.dart';

class GalleryProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  GalleryProvider() {
    subscribeToCatalogChanges();
    subscribeToOrderChanges();
  }

  void subscribeToCatalogChanges() {
    try {
      Supabase.instance.client
          .channel('public:images')
          .onPostgresChanges(
              event: PostgresChangeEvent.all,
              schema: 'public',
              table: 'images',
              callback: (payload) {
                print('[REALTIME] Mobile catalog image change detected: ${payload.toString()}');
                fetchCatalog();
              })
          .subscribe();
    } catch (e) {
      print('⚠️ Realtime subscription setup failed: $e');
    }
  }

  void subscribeToOrderChanges() {
    try {
      Supabase.instance.client
          .channel('public:orders')
          .onPostgresChanges(
              event: PostgresChangeEvent.all,
              schema: 'public',
              table: 'orders',
              callback: (payload) {
                print('[REALTIME] Mobile order change detected: ${payload.toString()}');
                fetchPurchases();
              })
          .subscribe();
    } catch (e) {
      print('⚠️ Realtime orders subscription setup failed: $e');
    }
  }

  List<dynamic> _images = [];
  List<dynamic> get images => _images;

  List<dynamic> _myPurchases = [];
  List<dynamic> get myPurchases => _myPurchases;

  bool _loading = false;
  bool get loading => _loading;

  String _selectedCategory = '';
  String get selectedCategory => _selectedCategory;

  String _searchQuery = '';
  String get searchQuery => _searchQuery;

  void selectCategory(String cat) {
    _selectedCategory = cat;
    fetchCatalog();
  }

  void setSearchQuery(String q) {
    _searchQuery = q;
    fetchCatalog();
  }

  Future<void> fetchCatalog() async {
    _loading = true;
    notifyListeners();

    try {
      String path = '/images?';
      if (_selectedCategory.isNotEmpty) {
        path += 'category=$_selectedCategory&';
      }
      if (_searchQuery.isNotEmpty) {
        path += 'search=${Uri.encodeComponent(_searchQuery)}&';
      }

      final res = await _apiService.get(path);
      _images = res;
    } catch (e) {
      print('Fetch catalog error: $e');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> fetchPurchases() async {
    _loading = true;
    notifyListeners();

    try {
      final res = await _apiService.get('/orders/my-purchases');
      _myPurchases = res;
    } catch (e) {
      print('Fetch purchases error: $e');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  // Check if specific image is purchased
  bool isPurchased(int imageId) {
    return _myPurchases.any((item) => item['id'] == imageId);
  }

  // Create payment order ID via Razorpay backend router
  Future<Map<String, dynamic>> initiateOrder(int imageId, {String? couponCode}) async {
    try {
      final res = await _apiService.post('/payments/order', {
        'image_id': imageId,
        if (couponCode != null && couponCode.isNotEmpty) 'coupon_code': couponCode
      });
      return res;
    } catch (e) {
      rethrow;
    }
  }

  // Confirm Razorpay status signature
  Future<void> verifyPayment({
    required String orderId,
    required String paymentId,
    required String signature,
  }) async {
    try {
      await _apiService.post('/payments/verify', {
        'razorpay_order_id': orderId,
        'razorpay_payment_id': paymentId,
        'razorpay_signature': signature,
      });
      // Refresh user downloads catalog permissions
      await fetchPurchases();
    } catch (e) {
      rethrow;
    }
  }

  // Confirm direct UPI payment with UTR reference
  Future<void> verifyUpiPayment({
    required String orderId,
    required String upiUtr,
  }) async {
    try {
      await _apiService.post('/payments/verify-upi', {
        'order_id': orderId,
        'upi_utr': upiUtr,
      });
      // Refresh user downloads catalog permissions
      await fetchPurchases();
    } catch (e) {
      rethrow;
    }
  }
}
