import 'package:flutter/material.dart';

class I18nConfig {
  // 翻譯 JSON 檔案的存放資料夾
  static const String translationsPath = 'assets/translations';
  
  // 支援的語系定義
  static const Locale zhTW = Locale('zh', 'TW');
  static const Locale enUS = Locale('en', 'US');
  static const Locale jaJP = Locale('ja', 'JP');
  static const Locale koKR = Locale('ko', 'KR');

  static const List<Locale> supportedLocales = [
    zhTW,
    enUS,
    jaJP,
    koKR,
  ];

  static const Locale startLocale = zhTW;
  static const Locale fallbackLocale = zhTW;
}
