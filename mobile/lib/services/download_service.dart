import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_service.dart';

class DownloadService {
  final ApiService _apiService = ApiService();

  /// Requests download token link, pulls file bytes, saves to disk and triggers direct viewing
  Future<String> downloadOriginalImage(int imageId, String fileTitle) async {
    try {
      // 1. Fetch expiring secure download URL from Backend
      // This will return 403 if image is not purchased, preventing original access
      final res = await _apiService.get('/orders/download/$imageId');
      final String secureUrl = res['download_url'];

      // 2. Stream target image payload bytes from secure signed URL
      final response = await http.get(Uri.parse(secureUrl));
      if (response.statusCode != 200) {
        throw Exception("Direct download stream rejected by storage service: ${response.statusCode}");
      }

      // 3. Save file into application-private storage space
      final Directory? appDir = await _getDownloadDirectory();
      if (appDir == null) throw Exception("Failed to resolve storage directories.");

      final cleanTitle = fileTitle.replaceAll(RegExp(r'[^\w\s\-]'), '').replaceAll(' ', '_');
      final String targetPath = "${appDir.path}/$cleanTitle.jpg";

      final File file = File(targetPath);
      await file.writeAsBytes(response.bodyBytes);

      print("💾 Successfully saved image to local disk path: $targetPath");
      return targetPath;
    } catch (e) {
      print("❌ Secure download blocked or failed: $e");
      throw Exception("Download Blocked: User has not purchased this item or signature verification has failed.");
    }
  }

  /// Downloads PDF Receipt Invoice for a specific transaction order
  Future<String> downloadOrderInvoice(int orderId) async {
    try {
      final token = await const FlutterSecureStorage().read(key: 'jwt_token');
      final invoiceUrl = "${ApiService.baseUrl}/orders/invoice/$orderId";

      final response = await http.get(
        Uri.parse(invoiceUrl),
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode != 200) {
        throw Exception("Failed to fetch order invoice from backend server.");
      }

      final Directory? appDir = await _getDownloadDirectory();
      if (appDir == null) throw Exception("Storage path resolved empty.");

      final String targetPath = "${appDir.path}/Invoice_ORD_$orderId.pdf";
      final File file = File(targetPath);
      await file.writeAsBytes(response.bodyBytes);

      return targetPath;
    } catch (e) {
      throw Exception("Invoice extract failed: $e");
    }
  }

  /// Open downloaded file using native operating system helpers
  Future<void> openFile(String path) async {
    final result = await OpenFile.open(path);
    if (result.type != ResultType.done) {
      throw Exception("Could not find dynamic viewers to open file type: ${result.message}");
    }
  }

  Future<Directory?> _getDownloadDirectory() async {
    if (Platform.isAndroid) {
      // Returns /storage/emulated/0/Android/data/com.example.design_vallet/files
      return await getExternalStorageDirectory();
    } else {
      // iOS / Documents folder
      return await getApplicationDocumentsDirectory();
    }
  }
}
