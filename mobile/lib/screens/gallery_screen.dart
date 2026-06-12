import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/gallery_provider.dart';
import 'image_details_screen.dart';
import 'purchases_screen.dart';
import 'login_screen.dart';

class GalleryScreen extends StatefulWidget {
  const GalleryScreen({super.key});

  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<GalleryProvider>(context, listen: false).fetchCatalog();
      Provider.of<GalleryProvider>(context, listen: false).fetchPurchases();
    });
  }

  final List<String> _categories = ["All", "Border", "Pallu", "Butta", "Broket"];

  @override
  Widget build(BuildContext context) {
    final gallery = Provider.of<GalleryProvider>(context);
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0F),
      appBar: AppBar(
        title: const Text("Handloom Craft", style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF14141F),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.bookmark_outline, color: Color(0xFF06B6D4)),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const PurchasesScreen()),
              );
            },
          ),
        ],
      ),
      drawer: Drawer(
        backgroundColor: const Color(0xFF14141F),
        child: Column(
          children: [
            UserAccountsDrawerHeader(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF7C3AED), Color(0xFF06B6D4)],
                ),
              ),
              currentAccountPicture: CircleAvatar(
                backgroundColor: Colors.white,
                child: Text(
                  auth.user?['full_name']?.substring(0, 1).toUpperCase() ?? "U",
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED)),
                ),
              ),
              accountName: Text(auth.user?['full_name'] ?? 'Guest User', style: const TextStyle(fontWeight: FontWeight.bold)),
              accountEmail: Text(auth.user?['email'] ?? 'guest@designvallet.com'),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: Colors.white70),
              title: const Text("Browse Catalog", style: TextStyle(color: Colors.white70)),
              onTap: () => Navigator.of(context).pop(),
            ),
            ListTile(
              leading: const Icon(Icons.shopping_bag, color: Colors.white70),
              title: const Text("My Purchases", style: TextStyle(color: Colors.white70)),
              onTap: () {
                Navigator.of(context).pop();
                Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PurchasesScreen()));
              },
            ),
            ListTile(
              leading: const Icon(Icons.info_outline, color: Color(0xFF06B6D4)),
              title: const Text("Developer Details", style: TextStyle(color: Colors.white70)),
              onTap: () {
                Navigator.of(context).pop();
                showDialog(
                  context: context,
                  builder: (context) => AlertDialog(
                    backgroundColor: const Color(0xFF14141F),
                    title: const Text("Developer Profile", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    content: const Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Name: GUDURU PAVAN", style: TextStyle(color: Colors.white70)),
                        SizedBox(height: 5),
                        Text("Agency: Handloom Craft", style: TextStyle(color: Colors.white70)),
                        SizedBox(height: 5),
                        Text("Email: designvallet01@gmail.com", style: TextStyle(color: Colors.white70)),
                        SizedBox(height: 5),
                        Text("UPI ID: 9052572363@ybl", style: TextStyle(color: Colors.white70)),
                      ],
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text("Close", style: TextStyle(color: Color(0xFF06B6D4))),
                      ),
                    ],
                  ),
                );
              },
            ),
            const Spacer(),
            const Divider(color: Colors.grey, thickness: 0.2),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.redAccent),
              title: const Text("Sign Out", style: TextStyle(color: Colors.redAccent)),
              onTap: () async {
                await auth.logout();
                if (context.mounted) {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                  );
                }
              },
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search & Filter Section
          Container(
            padding: const EdgeInsets.all(16.0),
            color: const Color(0xFF14141F),
            child: Column(
              children: [
                // Search Bar input
                TextField(
                  controller: _searchController,
                  style: const TextStyle(color: Colors.white),
                  onChanged: (val) => gallery.setSearchQuery(val.trim()),
                  decoration: InputDecoration(
                    hintText: "Search border, pallu, butta, broket designs...",
                    hintStyle: TextStyle(color: Colors.grey[600]),
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: Colors.grey),
                            onPressed: () {
                              _searchController.clear();
                              gallery.setSearchQuery('');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: const Color(0xFF0A0A0F),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(30),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 15),

                // Categories Row scroll view
                SizedBox(
                  height: 38,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _categories.length,
                    itemBuilder: (context, index) {
                      final cat = _categories[index];
                      final isSelected = (cat == "All" && gallery.selectedCategory.isEmpty) ||
                          (gallery.selectedCategory == cat);

                      return GestureDetector(
                        onTap: () {
                          gallery.selectCategory(cat == "All" ? "" : cat);
                        },
                        child: Container(
                          margin: const EdgeInsets.only(right: 10),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            gradient: isSelected
                                ? const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF6366F1)])
                                : null,
                            color: isSelected ? null : const Color(0xFF0A0A0F),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSelected ? Colors.transparent : const Color(0xFF1E1E2F),
                            ),
                          ),
                          child: Text(
                            cat,
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.grey[400],
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),

          // Catalog Grid
          Expanded(
            child: gallery.loading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF7C3AED)))
                : gallery.images.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.photo_album_outlined, size: 60, color: Colors.grey),
                            const SizedBox(height: 12),
                            Text("No designs found", style: TextStyle(color: Colors.grey[400], fontSize: 16)),
                          ],
                        ),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 14,
                          mainAxisSpacing: 14,
                          childAspectRatio: 0.75,
                        ),
                        itemCount: gallery.images.length,
                        itemBuilder: (context, index) {
                          final img = gallery.images[index];
                          final isBought = gallery.isPurchased(img['id']);

                          return GestureDetector(
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => ImageDetailsScreen(imageDetails: img),
                                ),
                              );
                            },
                            child: Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFF14141F),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFF1E1E2F)),
                              ),
                              clipBehavior: Clip.antiAlias,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  // Preview Watermark image
                                  Expanded(
                                    child: Stack(
                                      fit: StackFit.expand,
                                      children: [
                                        Image.network(
                                          img['preview_url'] ?? '',
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) {
                                            return Container(
                                              color: const Color(0xFF1E1E2F),
                                              child: const Icon(Icons.image_not_supported, color: Colors.grey),
                                            );
                                          },
                                        ),
                                        // Watermarked banner overlay on gallery cards
                                        Positioned(
                                          top: 8,
                                          left: 8,
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: Colors.black54,
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: const Text(
                                              "WATERMARKED PREVIEW",
                                              style: TextStyle(color: Colors.white60, fontSize: 8, fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                        ),
                                        // Is Purchased indicator badge
                                        if (isBought)
                                          Positioned(
                                            top: 8,
                                            right: 8,
                                            child: Container(
                                              padding: const EdgeInsets.all(4),
                                              decoration: const BoxDecoration(
                                                color: Colors.teal,
                                                shape: BoxShape.circle,
                                              ),
                                              child: const Icon(Icons.check, size: 12, color: Colors.white),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  // Description Section
                                  Padding(
                                    padding: const EdgeInsets.all(12.0),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          img['title'] ?? 'Title',
                                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              img['category'] ?? 'General',
                                              style: const TextStyle(color: Colors.grey, fontSize: 11),
                                            ),
                                            Text(
                                              "₹${img['price']}",
                                              style: const TextStyle(
                                                color: Color(0xFF06B6D4),
                                                fontWeight: FontWeight.bold,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
