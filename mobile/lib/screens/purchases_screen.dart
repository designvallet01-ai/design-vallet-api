import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/gallery_provider.dart';
import '../services/download_service.dart';

class PurchasesScreen extends StatefulWidget {
  const PurchasesScreen({super.key});

  @override
  State<PurchasesScreen> createState() => _PurchasesScreenState();
}

class _PurchasesScreenState extends State<PurchasesScreen> {
  final DownloadService _downloadService = DownloadService();
  bool _isDownloading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<GalleryProvider>(context, listen: false).fetchPurchases();
    });
  }

  void _showStatus(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? Colors.redAccent : Colors.teal,
      ),
    );
  }

  Future<void> _handleDownload(int id, String title) async {
    setState(() => _isDownloading = true);
    try {
      _showStatus("Extracting secure download link...");
      final path = await _downloadService.downloadOriginalImage(id, title);
      _showStatus("Saved locally: $path");
      await _downloadService.openFile(path);
    } catch (e) {
      _showStatus(e.toString().replaceAll("Exception: ", ""), isError: true);
    } finally {
      setState(() => _isDownloading = false);
    }
  }

  Future<void> _handleInvoiceDownload(int orderId) async {
    setState(() => _isDownloading = true);
    try {
      _showStatus("Generating PDF receipt invoice...");
      final path = await _downloadService.downloadOrderInvoice(orderId);
      _showStatus("Invoice downloaded successfully.");
      await _downloadService.openFile(path);
    } catch (e) {
      _showStatus(e.toString().replaceAll("Exception: ", ""), isError: true);
    } finally {
      setState(() => _isDownloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final gallery = Provider.of<GalleryProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      appBar: AppBar(
        title: const Text("My Purchases", style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF14141F),
      ),
      body: gallery.loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF7C3AED)))
          : gallery.myPurchases.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.shopping_bag_outlined, size: 60, color: Colors.grey),
                      const SizedBox(height: 12),
                      Text("No items purchased yet.", style: TextStyle(color: Colors.grey[400], fontSize: 16)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: gallery.myPurchases.length,
                  itemBuilder: (context, index) {
                    final item = gallery.myPurchases[index];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 15),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF14141F),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF1E1E2F)),
                      ),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              item['preview_url'] ?? '',
                              width: 70,
                              height: 70,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(
                                width: 70,
                                height: 70,
                                color: const Color(0xFF1E1E2F),
                                child: const Icon(Icons.broken_image, color: Colors.grey),
                              ),
                            ),
                          ),
                          const SizedBox(width: 15),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item['title'] ?? 'Visual Piece',
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  "Paid: ₹${item['price']}",
                                  style: const TextStyle(color: Color(0xFF06B6D4), fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    ElevatedButton.icon(
                                      onPressed: _isDownloading ? null : () => _handleDownload(item['id'], item['title']),
                                      icon: const Icon(Icons.download, size: 12, color: Colors.white),
                                      label: const Text("File", style: TextStyle(fontSize: 11, color: Colors.white)),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.teal,
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                        minimumSize: Size.zero,
                                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    OutlinedButton.icon(
                                      onPressed: _isDownloading ? null : () => _handleInvoiceDownload(item['order_id']),
                                      icon: const Icon(Icons.receipt_long, size: 12, color: Colors.white70),
                                      label: const Text("Invoice", style: TextStyle(fontSize: 11, color: Colors.white70)),
                                      style: OutlinedButton.styleFrom(
                                        side: const BorderSide(color: Color(0xFF1E1E2F)),
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                        minimumSize: Size.zero,
                                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
