import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_jailbreak_detection/flutter_jailbreak_detection.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'providers/auth_provider.dart';
import 'providers/gallery_provider.dart';
import 'screens/login_screen.dart';
import 'screens/gallery_screen.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Clear secure storage on first run to prevent decryption errors from Android Auto Backup
  try {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool('first_run') ?? true) {
      const storage = FlutterSecureStorage();
      await storage.deleteAll();
      await prefs.setBool('first_run', false);
      debugPrint("🧹 [STORAGE] First run detected. Cleared secure storage to prevent decryption errors.");
    }
  } catch (e) {
    debugPrint("⚠️ [STORAGE] Failed to check/clear secure storage: $e");
  }

  // 1. Initialize Supabase Client
  try {
    await Supabase.initialize(
      url: 'https://xxfjeysjcrgmukcpkmjk.supabase.co',
      anonKey: 'sb_publishable_RveM2OwDIIMfY7KJfWXHNQ_iCkexI4r',
    );
    debugPrint("✅ [SUPABASE] Client initialized successfully.");
  } catch (e) {
    debugPrint("⚠️ [SUPABASE] Failed to initialize Supabase client: $e");
  }

  // 2. Auto-detect active Backend API URL
  try {
    await ApiService.init();
  } catch (e) {
    debugPrint("⚠️ [API SERVICE] Auto-detection error: $e");
  }



  runApp(const DesignValletApp());
}

class DesignValletApp extends StatelessWidget {
  const DesignValletApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => GalleryProvider()),
      ],
      child: MaterialApp(
        title: 'Handloom Craft',
        debugShowCheckedModeBanner: false,
        theme: _buildThemeData(),
        home: const SecurityCheckGate(),
      ),
    );
  }

  ThemeData _buildThemeData() {
    return ThemeData(
      useMaterial3: true,
      fontFamily: 'Inter',
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF7C3AED),
        brightness: Brightness.dark,
        surface: const Color(0xFF0A0A0F),
        onSurface: Colors.white,
        surfaceContainerHighest: const Color(0xFF14141F),
      ),
      scaffoldBackgroundColor: const Color(0xFF0A0A0F),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF14141F),
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.bold,
          fontFamily: 'Inter',
        ),
        iconTheme: IconThemeData(color: Colors.white),
      ),
    );
  }
}

class SecurityCheckGate extends StatefulWidget {
  const SecurityCheckGate({super.key});

  @override
  State<SecurityCheckGate> createState() => _SecurityCheckGateState();
}

class _SecurityCheckGateState extends State<SecurityCheckGate> {
  bool _isJailbroken = false;
  bool _checkingSecurity = true;

  @override
  void initState() {
    super.initState();
    _performRootChecks();
  }

  Future<void> _performRootChecks() async {
    // Jailbreak check disabled for general device compatibility during testing
    if (mounted) {
      setState(() {
        _checkingSecurity = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_checkingSecurity) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF7C3AED)),
        ),
      );
    }

    if (_isJailbroken) {
      return const RootDetectionScreen();
    }

    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        if (auth.isLoading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator(color: Color(0xFF7C3AED))),
          );
        }
        return auth.isAuthenticated ? const GalleryScreen() : const LoginScreen();
      },
    );
  }
}

class RootDetectionScreen extends StatelessWidget {
  const RootDetectionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.security_outlined, size: 80, color: Colors.redAccent),
            const SizedBox(height: 24),
            const Text(
              "Security Threat Detected",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Text(
              "This device appears to be jailbroken or rooted. Handloom Craft blocks execution on modified OS environments to prevent unauthorized access to original assets.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[400], fontSize: 14, height: 1.5),
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                // In a real app, you might want to exit or re-check.
                // For now, we just allow them to try again.
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const SecurityCheckGate()),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E1E2F),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text("Retry Security Check"),
            ),
          ],
        ),
      ),
    );
  }
}
