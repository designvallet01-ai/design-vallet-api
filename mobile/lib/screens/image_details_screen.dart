import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher_string.dart';
import '../providers/gallery_provider.dart';
import '../services/download_service.dart';

class ImageDetailsScreen extends StatefulWidget {
  final Map<String, dynamic> imageDetails;
  const ImageDetailsScreen({super.key, required this.imageDetails});

  @override
  State<ImageDetailsScreen> createState() => _ImageDetailsScreenState();
}

class _ImageDetailsScreenState extends State<ImageDetailsScreen> {
  final _couponController = TextEditingController();
  final DownloadService _downloadService = DownloadService();
  
  bool _isProcessing = false;

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  void _showStatus(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(color: Colors.white)),
        backgroundColor: isError ? Colors.redAccent : Colors.teal,
      ),
    );
  }

  // --- UPI Payment Actions ---
  Future<void> _startPurchaseFlow() async {
    setState(() => _isProcessing = true);
    final gallery = Provider.of<GalleryProvider>(context, listen: false);

    try {
      // 1. Contact Backend to create payment Order
      final orderData = await gallery.initiateOrder(
        widget.imageDetails['id'],
        couponCode: _couponController.text.trim(),
      );

      final String orderId = orderData['order_id'];
      final num amount = orderData['amount'];
      final String upiId = orderData['upi_id'] ?? '9052572363@ybl';
      final String upiUrl = orderData['upi_url'] ?? '';

      // 2. Open Direct UPI Checkout Sheet
      if (mounted) {
        _showUpiPaymentSheet(context, orderId, amount.toDouble(), upiId, upiUrl);
      }
    } catch (e) {
      _showStatus("Checkout Initiation Failed: ${e.toString().replaceAll("Exception: ", "")}", isError: true);
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  void _showUpiPaymentSheet(BuildContext context, String orderId, double amount, String upiId, String upiUrl) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF14141F),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        final utrController = TextEditingController();
        bool isSubmitting = false;

        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Direct UPI Payment",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.grey),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const Divider(color: Colors.grey, thickness: 0.2),
                    const SizedBox(height: 15),

                    // Order Info
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A0A0F),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text("Amount to Pay", style: TextStyle(color: Colors.grey)),
                              Text(
                                "₹${amount.toStringAsFixed(2)}",
                                style: const TextStyle(
                                  color: Color(0xFF06B6D4),
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text("Order Reference", style: TextStyle(color: Colors.grey)),
                              Text(
                                orderId,
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'monospace'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Scan QR Code
                    Center(
                      child: Column(
                        children: [
                          const Text(
                            "Scan to Pay using GPay / PhonePe / Paytm",
                            style: TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Image.network(
                              'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${Uri.encodeComponent(upiUrl)}',
                              width: 180,
                              height: 180,
                              errorBuilder: (context, error, stackTrace) {
                                return const SizedBox(
                                  width: 180,
                                  height: 180,
                                  child: Center(
                                    child: Icon(Icons.qr_code, size: 80, color: Colors.black54),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // UPI ID display & copy button
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A0A0F),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              "UPI ID: $upiId",
                              style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy, color: Color(0xFF06B6D4), size: 20),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: upiId));
                              _showStatus("UPI ID copied to clipboard!");
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 15),

                    // Pay via App Button
                    ElevatedButton.icon(
                      onPressed: () async {
                        try {
                          final launched = await launchUrlString(
                            upiUrl,
                            mode: LaunchMode.externalApplication,
                          );
                          if (!launched) {
                            _showStatus("Failed to launch UPI application automatically. Please scan the QR code.", isError: true);
                          }
                        } catch (e) {
                          _showStatus("Could not launch UPI application. Try scanning the QR code.", isError: true);
                        }
                      },
                      icon: const Icon(Icons.open_in_new, color: Colors.white),
                      label: const Text(
                        "Pay via UPI Apps (GPay, PhonePe...)",
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF7C3AED),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: 25),

                    // UTR Text Entry
                    const Text(
                      "After payment, paste your 12-digit UTR/Reference ID:",
                      style: TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: utrController,
                      keyboardType: TextInputType.number,
                      maxLength: 12,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: "Enter 12-Digit Transaction Reference ID",
                        hintStyle: TextStyle(color: Colors.grey[600], fontSize: 13),
                        filled: true,
                        fillColor: const Color(0xFF0A0A0F),
                        counterText: "",
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Color(0xFF1E1E2F)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 15),

                    // Submit Verification button
                    ElevatedButton(
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              final utr = utrController.text.trim();
                              if (utr.length != 12 || !RegExp(r'^\d+$').hasMatch(utr)) {
                                _showStatus("Please enter a valid 12-digit numeric UPI UTR code.", isError: true);
                                return;
                              }

                              setSheetState(() => isSubmitting = true);
                              final gallery = Provider.of<GalleryProvider>(context, listen: false);

                              try {
                                await gallery.verifyUpiPayment(orderId: orderId, upiUtr: utr);
                                Navigator.pop(context); // Close bottom sheet
                                _showStatus("UPI Payment Reference Submitted successfully!");
                                // Trigger automatic download
                                await _triggerImageDownload();
                              } catch (e) {
                                _showStatus("Payment Verification Failed: ${e.toString().replaceAll("Exception: ", "")}", isError: true);
                              } finally {
                                setSheetState(() => isSubmitting = false);
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: isSubmitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text(
                              "Submit UTR Reference",
                              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15),
                            ),
                    ),
                    const SizedBox(height: 15),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  // --- Downloader Trigger ---
  Future<void> _triggerImageDownload() async {
    try {
      _showStatus("Downloading high-resolution original image file...");
      final path = await _downloadService.downloadOriginalImage(
        widget.imageDetails['id'],
        widget.imageDetails['title'],
      );
      _showStatus("Download successful! Saved to $path");
      await _downloadService.openFile(path);
    } catch (e) {
      _showStatus(e.toString().replaceAll("Exception: ", ""), isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final gallery = Provider.of<GalleryProvider>(context);
    final isBought = gallery.isPurchased(widget.imageDetails['id']);
    
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      appBar: AppBar(
        title: Text(widget.imageDetails['title'] ?? 'Image Details'),
        backgroundColor: const Color(0xFF14141F),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Preview Watermark image
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1.2,
                  child: Image.network(
                    widget.imageDetails['preview_url'] ?? '',
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        color: const Color(0xFF1E1E2F),
                        child: const Icon(Icons.image_not_supported, size: 50, color: Colors.grey),
                      );
                    },
                  ),
                ),
                // Overlay Watermark labels
                Positioned.fill(
                  child: Align(
                    alignment: Alignment.center,
                    child: RotationTransition(
                      turns: const AlwaysStoppedAnimation(-30 / 360),
                      child: Text(
                        "DESIGN VALLET\nPREVIEW ONLY",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 28,
                          color: Colors.white.withOpacity(0.15),
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2.0,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),

            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Chip(
                        label: Text(
                          widget.imageDetails['category']?.toUpperCase() ?? 'CREATIVE',
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                        backgroundColor: const Color(0xFF7C3AED),
                      ),
                      Text(
                        "₹${widget.imageDetails['price']}",
                        style: const TextStyle(
                          color: Color(0xFF06B6D4),
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 15),
                  Text(
                    widget.imageDetails['title'] ?? 'Visual Piece',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.imageDetails['description'] ?? 'No description specified for this image.',
                    style: TextStyle(color: Colors.grey[400], fontSize: 14, height: 1.4),
                  ),
                  const SizedBox(height: 25),

                  if (!isBought) ...[
                    // Coupon Code field
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _couponController,
                            style: const TextStyle(color: Colors.white, fontSize: 13),
                            decoration: InputDecoration(
                              hintText: "Apply Discount Coupon (e.g. SAVE10)",
                              hintStyle: TextStyle(color: Colors.grey[600], fontSize: 13),
                              filled: true,
                              fillColor: const Color(0xFF14141F),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                                borderSide: const BorderSide(color: Color(0xFF1E1E2F)),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Action CTAs
                  if (isBought) ...[
                    ElevatedButton.icon(
                      onPressed: _isProcessing ? null : _triggerImageDownload,
                      icon: const Icon(Icons.download, color: Colors.white),
                      label: const Text(
                        "Download Original High-Res",
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        minimumSize: const Size.fromHeight(50),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ] else ...[
                    ElevatedButton.icon(
                      onPressed: _isProcessing ? null : _startPurchaseFlow,
                      icon: const Icon(Icons.shopping_cart, color: Colors.white),
                      label: Text(
                        _isProcessing ? "Connecting to Payments..." : "Buy Now (INR ₹${widget.imageDetails['price']})",
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF7C3AED),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        minimumSize: const Size.fromHeight(50),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),

                  ],
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
