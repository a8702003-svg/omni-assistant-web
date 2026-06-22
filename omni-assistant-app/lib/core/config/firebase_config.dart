import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

class FirebaseConfig {
  static Future<void> initialize() async {
    try {
      if (kIsWeb) {
        await Firebase.initializeApp(
          options: const FirebaseOptions(
            apiKey: "AIzaSyFakeApiKeyForInitializationOnly",
            appId: "1:1234567890:web:abcdef",
            messagingSenderId: "1234567890",
            projectId: "omni-assistant",
            authDomain: "omni-assistant.firebaseapp.com",
            storageBucket: "omni-assistant.appspot.com",
          ),
        );
      } else {
        // 在行動端（Android/iOS）將讀取 google-services.json / GoogleService-Info.plist。
        // 為避免初始化失敗（若無對應金鑰檔），此處以 try-catch 保護。
        await Firebase.initializeApp();
      }
    } catch (e) {
      debugPrint("Firebase 初始化提示：尚未配置實體平台設定檔，將以模擬資料運行本地 UI。詳情: $e");
    }
  }
}
