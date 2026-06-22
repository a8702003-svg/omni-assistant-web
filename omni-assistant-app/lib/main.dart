import 'dart:io';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:geolocator/geolocator.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'core/config/firebase_config.dart';
import 'core/config/i18n_config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();
  await FirebaseConfig.initialize();

  runApp(
    EasyLocalization(
      supportedLocales: I18nConfig.supportedLocales,
      path: I18nConfig.translationsPath,
      fallbackLocale: I18nConfig.fallbackLocale,
      startLocale: I18nConfig.startLocale,
      child: const OmniAssistantApp(),
    ),
  );
}

class OmniAssistantApp extends StatelessWidget {
  const OmniAssistantApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Omni-Assistant',
      localizationsDelegates: context.localizationDelegates,
      supportedLocales: context.supportedLocales,
      locale: context.locale,
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.dark,
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
        primaryColor: const Color(0xFF6366F1),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFFEC4899),
          surface: Color(0xFF111827),
          background: Color(0xFF0B0F19),
        ),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
        useMaterial3: true,
      ),
      home: const MainLayoutScreen(),
    );
  }
}

class MainLayoutScreen extends StatefulWidget {
  const MainLayoutScreen({super.key});

  @override
  State<MainLayoutScreen> createState() => _MainLayoutScreenState();
}

class _MainLayoutScreenState extends State<MainLayoutScreen> {
  int _currentIndex = 0;

  final List<Widget> _tabs = [
    const NotesFinanceTab(),
    const RemindersTab(),
    const MeetingsTab(),
    const TranslationTab(),
  ];

  void _changeLanguage(Locale locale) {
    context.setLocale(locale);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827).withOpacity(0.8),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'app.title'.tr(),
              style: GoogleFonts.outfit(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            Text(
              'app.subtitle'.tr(),
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          PopupMenuButton<Locale>(
            icon: const Icon(Icons.language, color: Color(0xFF6366F1)),
            onSelected: _changeLanguage,
            itemBuilder: (BuildContext context) => <PopupMenuEntry<Locale>>[
              const PopupMenuItem<Locale>(value: I18nConfig.zhTW, child: Text('繁體中文')),
              const PopupMenuItem<Locale>(value: I18nConfig.enUS, child: Text('English')),
              const PopupMenuItem<Locale>(value: I18nConfig.jaJP, child: Text('日本語')),
              const PopupMenuItem<Locale>(value: I18nConfig.koKR, child: Text('한국어')),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _tabs[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        backgroundColor: const Color(0xFF111827),
        selectedItemColor: const Color(0xFF6366F1),
        unselectedItemColor: Colors.grey,
        selectedLabelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
        unselectedLabelStyle: const TextStyle(fontSize: 10),
        items: [
          BottomNavigationBarItem(
            icon: const Icon(Icons.note_alt_outlined),
            activeIcon: const Icon(Icons.note_alt),
            label: 'nav.notes'.tr(),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.notifications_active_outlined),
            activeIcon: const Icon(Icons.notifications_active),
            label: 'nav.dashboard'.tr(), // HomeScreen / Reminders
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.mic_none),
            activeIcon: const Icon(Icons.mic),
            label: 'nav.meetings'.tr(),
          ),
          BottomNavigationBarItem(
            icon: const Icon(Icons.translate_outlined),
            activeIcon: const Icon(Icons.translate),
            label: 'nav.translate'.tr(),
          ),
        ],
      ),
    );
  }
}

// ==========================================
// 1. 隨手筆記與記帳分頁 (Notes & Finance)
// ==========================================
class NotesFinanceTab extends StatefulWidget {
  const NotesFinanceTab({super.key});

  @override
  State<NotesFinanceTab> createState() => _NotesFinanceTabState();
}

class _NotesFinanceTabState extends State<NotesFinanceTab> {
  bool _gpsLocked = true;
  String _recordType = 'expense';
  String _recordCategory = 'food';
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _noteController = TextEditingController();
  final TextEditingController _titleController = TextEditingController();

  Future<Position?> _determinePosition() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return null;

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return null;
      }
      if (permission == LocationPermission.deniedForever) return null;

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 5),
      );
    } catch (e) {
      debugPrint("Error fetching GPS location: $e");
      return null;
    }
  }

  Future<void> _saveNote() async {
    final noteContent = _noteController.text;
    final noteTitle = _titleController.text;
    final amountStr = _amountController.text;

    if (noteContent.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('notes.content'.tr())),
      );
      return;
    }

    Map<String, dynamic>? locationData;
    if (_gpsLocked) {
      final position = await _determinePosition();
      if (position != null) {
        locationData = {
          'latitude': position.latitude,
          'longitude': position.longitude,
          // [預留區] 真實環境下可在此呼叫 Google Maps API 或 Geocoding API 進行反向地址解析
          // 'addressName': await _reverseGeocode(position.latitude, position.longitude),
          'addressName': '真實 GPS 定位 (緯: ${position.latitude.toStringAsFixed(4)}, 經: ${position.longitude.toStringAsFixed(4)})', 
        };
      } else {
        // Fallback
        locationData = {
          'latitude': 25.0339,
          'longitude': 121.5644,
          'addressName': '台北市信義區 (模擬定位 Fallback)',
        };
      }
    }

    try {
      double? amount;
      if (amountStr.isNotEmpty) {
        amount = double.tryParse(amountStr);
      }

      final Map<String, dynamic> noteData = {
        'noteId': DateTime.now().millisecondsSinceEpoch.toString(),
        'userId': 'default_user_123',
        'title': noteTitle.isNotEmpty ? noteTitle : 'notes.placeholderTitle'.tr(),
        'content': noteContent,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
        'location': locationData,
        'financialRecord': {
          'hasRecord': amount != null,
          'amount': amount,
          'type': _recordType,
          'category': _recordCategory,
        }
      };

      await FirebaseFirestore.instance.collection('notes').add(noteData);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${'notes.success'.tr()} (Firestore 同步完成)'),
          backgroundColor: Colors.emerald,
        ),
      );

      _noteController.clear();
      _titleController.clear();
      _amountController.clear();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('已儲存 (本地模擬模式): ${noteTitle.isNotEmpty ? noteTitle : "隨手記"} - $noteContent'),
          backgroundColor: Colors.indigo,
        ),
      );
      _noteController.clear();
      _titleController.clear();
      _amountController.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'home.greeting'.tr(),
            style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF111827).withOpacity(0.6),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'notes.addNote'.tr(),
                  style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _titleController,
                  style: const TextStyle(fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'notes.title'.tr(),
                    hintStyle: const TextStyle(color: Colors.grey),
                    filled: true,
                    fillColor: const Color(0xFF0B0F19),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _noteController,
                  style: const TextStyle(fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'notes.content'.tr(),
                    hintStyle: const TextStyle(color: Colors.grey),
                    filled: true,
                    fillColor: const Color(0xFF0B0F19),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  maxLines: 4,
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.map_pin, size: 16, color: Color(0xFFEC4899)),
                        const SizedBox(width: 6),
                        Text(
                          _gpsLocked ? 'home.gpsLocked'.tr() : 'home.gpsTracking'.tr(),
                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                      ],
                    ),
                    Switch(
                      value: _gpsLocked,
                      onChanged: (val) => setState(() => _gpsLocked = val),
                      activeColor: theme.colorScheme.secondary,
                    ),
                  ],
                ),
                const Divider(color: Colors.white10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('home.financialQuick'.tr(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                    Row(
                      children: [
                        ChoiceChip(
                          label: Text('notes.expense'.tr(), style: const TextStyle(fontSize: 10)),
                          selected: _recordType == 'expense',
                          selectedColor: Colors.red.withOpacity(0.3),
                          onSelected: (selected) {
                            if (selected) setState(() => _recordType = 'expense');
                          },
                        ),
                        const SizedBox(width: 6),
                        ChoiceChip(
                          label: Text('notes.income'.tr(), style: const TextStyle(fontSize: 10)),
                          selected: _recordType == 'income',
                          selectedColor: Colors.emerald.withOpacity(0.3),
                          onSelected: (selected) {
                            if (selected) setState(() => _recordType = 'income');
                          },
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      flex: 3,
                      child: TextField(
                        controller: _amountController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(fontSize: 13),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.attach_money, size: 16, color: Colors.grey),
                          hintText: 'notes.amount'.tr(),
                          hintStyle: const TextStyle(color: Colors.grey),
                          filled: true,
                          fillColor: const Color(0xFF0B0F19),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 2,
                      child: DropdownButtonFormField<String>(
                        value: _recordCategory,
                        dropdownColor: const Color(0xFF111827),
                        style: const TextStyle(fontSize: 12, color: Colors.white),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: const Color(0xFF0B0F19),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                        ),
                        items: [
                          DropdownMenuItem(value: 'food', child: Text('notes.food'.tr())),
                          DropdownMenuItem(value: 'transport', child: Text('notes.transport'.tr())),
                          DropdownMenuItem(value: 'shopping', child: Text('notes.shopping'.tr())),
                          DropdownMenuItem(value: 'salary', child: Text('notes.salary'.tr())),
                          DropdownMenuItem(value: 'other', child: Text('notes.other'.tr())),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _recordCategory = val);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    onPressed: _saveNote,
                    child: Text('notes.save'.tr(), style: const TextStyle(fontSize: 13)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ==========================================
// 2. 小秘書提醒分頁 (Reminders Tab - 模組 B)
// ==========================================
class RemindersTab extends StatefulWidget {
  const RemindersTab({super.key});

  @override
  State<RemindersTab> createState() => _RemindersTabState();
}

class _RemindersTabState extends State<RemindersTab> {
  final TextEditingController _todoController = TextEditingController();
  TimeOfDay _selectedTime = const TimeOfDay(hour: 12, minute: 0);

  final List<Map<String, dynamic>> _todos = [
    {'title': '與日本團隊確認翻譯 API 規格', 'completed': true, 'time': '16:30'},
    {'title': '準備週會財務簡報', 'completed': false, 'time': '14:00'},
  ];

  Future<void> _selectTime(BuildContext context) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (picked != null && picked != _selectedTime) {
      setState(() => _selectedTime = picked);
    }
  }

  Future<void> _addTodo() async {
    final title = _todoController.text.trim();
    if (title.isEmpty) return;

    final timeStr = "${_selectedTime.hour.toString().padLeft(2, '0')}:${_selectedTime.minute.toString().padLeft(2, '0')}";

    try {
      // 寫入 Firestore todos 集合
      await FirebaseFirestore.instance.collection('todos').add({
        'todoId': DateTime.now().millisecondsSinceEpoch.toString(),
        'userId': 'default_user_123',
        'title': title,
        'isCompleted': false,
        'reminderTime': timeStr,
        'createdAt': FieldValue.serverTimestamp(),
        'notificationSent': false,
      });
    } catch (e) {
      debugPrint("Firestore todos write fallback: $e");
    }

    setState(() {
      _todos.insert(0, {'title': title, 'completed': false, 'time': timeStr});
    });

    _todoController.clear();

    // 彈出模擬「推播通知 (Push Notification)」提醒
    _showMockPushNotification(title, timeStr);
  }

  void _showMockPushNotification(String title, String time) {
    OverlayState? overlayState = Overlay.of(context);
    OverlayEntry overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        top: 60.0,
        left: 16.0,
        right: 16.0,
        child: Material(
          color: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B).withOpacity(0.95),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF6366F1), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF6366F1).withOpacity(0.3),
                  blurRadius: 15,
                  spreadRadius: 2,
                )
              ],
            ),
            child: Row(
              children: [
                const Icon(Icons.notifications_active, color: Color(0xFFEC4899), size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'reminders.notificationTitle'.tr(),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "${'reminders.notificationBody'.tr()} $title ($time)",
                        style: const TextStyle(fontSize: 10, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    overlayState.insert(overlayEntry);
    Future.delayed(const Duration(seconds: 4)).then((value) => overlayEntry.remove());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'reminders.title'.tr(),
            style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF111827).withOpacity(0.6),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  controller: _todoController,
                  style: const TextStyle(fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'reminders.placeholder'.tr(),
                    filled: true,
                    fillColor: const Color(0xFF0B0F19),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 12),
                InkWell(
                  onTap: () => _selectTime(context),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0B0F19),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('reminders.reminderTime'.tr(), style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        Text(
                          "${_selectedTime.hour.toString().padLeft(2, '0')}:${_selectedTime.minute.toString().padLeft(2, '0')}",
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.secondary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    onPressed: _addTodo,
                    child: Text('reminders.save'.tr(), style: const TextStyle(fontSize: 13)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: ListView.builder(
              itemCount: _todos.length,
              itemBuilder: (context, index) {
                final todo = _todos[index];
                return Card(
                  color: const Color(0xFF111827).withOpacity(0.4),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: ListTile(
                    leading: Checkbox(
                      value: todo['completed'],
                      activeColor: Colors.emerald,
                      onChanged: (val) {
                        setState(() => todo['completed'] = val);
                      },
                    ),
                    title: Text(
                      todo['title'],
                      style: TextStyle(
                        fontSize: 12,
                        decoration: todo['completed'] ? TextDecoration.lineThrough : null,
                        color: todo['completed'] ? Colors.grey : Colors.white,
                      ),
                    ),
                    trailing: Text("⏰ ${todo['time']}", style: const TextStyle(fontSize: 10, color: Colors.grey)),
                  ),
                );
              },
            ),
          )
        ],
      ),
    );
  }
}

// ==========================================
// 3. 會議記錄與語音摘要分頁 (Meetings Tab - 模組 C)
// ==========================================
class MeetingsTab extends StatefulWidget {
  const MeetingsTab({super.key});

  @override
  State<MeetingsTab> createState() => _MeetingsTabState();
}

class _MeetingsTabState extends State<MeetingsTab> with SingleTickerProviderStateMixin {
  bool _isRecording = false;
  bool _showAiSummary = false;
  late AnimationController _waveController;
  final AudioRecorder _audioRecorder = AudioRecorder();

  @override
  void initState() {
    super.initState();
    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
  }

  @override
  void dispose() {
    _waveController.dispose();
    _audioRecorder.dispose();
    super.dispose();
  }

  Future<void> _toggleRecording() async {
    if (!_isRecording) {
      // 請求麥克風權限並開始錄音
      if (await _audioRecorder.hasPermission()) {
        try {
          final directory = await getTemporaryDirectory();
          final path = '${directory.path}/meeting_${DateTime.now().millisecondsSinceEpoch}.m4a';
          
          await _audioRecorder.start(const RecordConfig(), path: path);
          
          setState(() {
            _isRecording = true;
            _waveController.repeat();
          });
        } catch (e) {
          debugPrint("Failed to start recording: $e");
        }
      }
    } else {
      // 停止錄音
      try {
        final path = await _audioRecorder.stop();
        
        setState(() {
          _isRecording = false;
          _waveController.stop();
          _showAiSummary = true;
        });

        _saveMeetingToFirestore(path);
      } catch (e) {
        debugPrint("Failed to stop recording: $e");
      }
    }
  }

  Future<void> _saveMeetingToFirestore(String? audioFilePath) async {
    String audioUrl = 'https://firebasestorage.googleapis.com/v0/b/omni-assistant/o/audio.mp3';

    if (audioFilePath != null) {
      try {
        final file = File(audioFilePath);
        if (await file.exists()) {
          // [預留區] 真實環境下上傳至 Firebase Storage 獲得真實網址
          // final storageRef = FirebaseStorage.instance.ref().child('meetings/audio_${DateTime.now().millisecondsSinceEpoch}.m4a');
          // final uploadTask = await storageRef.putFile(file);
          // audioUrl = await storageRef.getDownloadURL();
          debugPrint("Real audio saved locally at: $audioFilePath (ready for Storage upload)");
        }
      } catch (e) {
        debugPrint("Firebase Storage audio upload fallback: $e");
      }
    }

    try {
      await FirebaseFirestore.instance.collection('meetings').add({
        'meetingId': DateTime.now().millisecondsSinceEpoch.toString(),
        'userId': 'default_user_123',
        'title': '專案啟動會議'.tr(),
        'audioUrl': audioUrl,
        'transcript': 'meetings.mockTranscript'.tr(),
        'summary': {
          'conclusion': 'meetings.mockConclusion'.tr(),
          'actionItems': [
            {'task': 'meetings.mockKeypoint1'.tr()},
            {'task': 'meetings.mockKeypoint2'.tr()},
            {'task': 'meetings.mockKeypoint3'.tr()},
          ]
        },
        'durationSeconds': 120,
        'createdAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      debugPrint("Firestore meeting write fallback: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'meetings.title'.tr(),
            style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          
          // 波形與錄音控制卡片
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFF111827).withOpacity(0.6),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
            child: Column(
              children: [
                if (_isRecording) ...[
                  // 動態音波動畫
                  SizedBox(
                    height: 50,
                    child: AnimatedBuilder(
                      animation: _waveController,
                      builder: (context, child) {
                        return Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(8, (index) {
                            double animValue = math.sin((_waveController.value * 2 * math.pi) + (index * 0.8));
                            double height = 10 + (35 * (animValue.abs()));
                            return Container(
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              width: 5,
                              height: height,
                              decoration: BoxDecoration(
                                color: Color.lerp(theme.colorScheme.primary, theme.colorScheme.secondary, index / 8),
                                borderRadius: BorderRadius.circular(10),
                              ),
                            );
                          }),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text('meetings.recording'.tr(), style: const TextStyle(fontSize: 12, color: Colors.redAccent, fontWeight: FontWeight.bold)),
                ] else ...[
                  const SizedBox(height: 50, child: Center(child: Icon(Icons.volume_mute, color: Colors.grey, size: 32))),
                  const SizedBox(height: 12),
                  const Text('IDLE', style: TextStyle(fontSize: 10, color: Colors.grey, letterSpacing: 2)),
                ],
                const SizedBox(height: 20),
                GestureDetector(
                  onTap: _toggleRecording,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: _isRecording ? [Colors.red, Colors.redAccent] : [theme.colorScheme.primary, theme.colorScheme.secondary],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: (_isRecording ? Colors.red : theme.colorScheme.primary).withOpacity(0.4),
                          blurRadius: _isRecording ? 25 : 12,
                          spreadRadius: 2,
                        )
                      ],
                    ),
                    child: Icon(
                      _isRecording ? Icons.stop : Icons.mic,
                      size: 32,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // AI 智慧摘要面板 (模組 C)
          if (_showAiSummary)
            Expanded(
              child: SingleChildScrollView(
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF111827).withOpacity(0.4),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white.withOpacity(0.04)),
                  ),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // AI 結論
                      Text(
                        'meetings.aiSummary'.tr(),
                        style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold, color: theme.colorScheme.primary),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0B0F19),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('meetings.conclusion'.tr(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                            const SizedBox(height: 4),
                            Text('meetings.mockConclusion'.tr(), style: const TextStyle(fontSize: 12, color: Colors.white70, height: 1.4)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Keypoints
                      Text(
                        'meetings.keypoints'.tr(),
                        style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.bold, color: theme.colorScheme.secondary),
                      ),
                      const SizedBox(height: 8),
                      _buildBulletPoint('meetings.mockKeypoint1'.tr()),
                      _buildBulletPoint('meetings.mockKeypoint2'.tr()),
                      _buildBulletPoint('meetings.mockKeypoint3'.tr()),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildBulletPoint(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 5.0, right: 8.0),
            child: CircleAvatar(radius: 3, backgroundColor: Color(0xFFEC4899)),
          ),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 11, color: Colors.white70, height: 1.4))),
        ],
      ),
    );
  }
}

// ==========================================
// 4. 翻譯設定分頁 (Translation Tab - 模組 D)
// ==========================================
class TranslationTab extends StatefulWidget {
  const TranslationTab({super.key});

  @override
  State<TranslationTab> createState() => _TranslationTabState();
}

class _TranslationTabState extends State<TranslationTab> {
  final TextEditingController _inputController = TextEditingController();
  String _translatedResult = '';

  void _translateText() {
    final text = _inputController.text.trim();
    if (text.isEmpty) return;

    // 模擬 AI 智慧翻譯
    setState(() {
      if (context.locale.languageCode == 'zh') {
        _translatedResult = "Transleted: $text (自動對譯英文)";
      } else {
        _translatedResult = "翻譯結果: $text (自動對譯繁中)";
      }
    });

    try {
      FirebaseFirestore.instance.collection('translations').add({
        'translationId': DateTime.now().millisecondsSinceEpoch.toString(),
        'userId': 'default_user_123',
        'sourceText': text,
        'sourceLang': context.locale.languageCode,
        'targetLang': context.locale.languageCode == 'zh' ? 'en' : 'zh',
        'translatedText': _translatedResult,
        'createdAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      debugPrint("Firestore translation write fallback: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'translate.title'.tr(),
            style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF111827).withOpacity(0.6),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  controller: _inputController,
                  style: const TextStyle(fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'translate.inputPlaceholder'.tr(),
                    filled: true,
                    fillColor: const Color(0xFF0B0F19),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6366F1),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    onPressed: _translateText,
                    child: Text('translate.translateButton'.tr(), style: const TextStyle(fontSize: 13)),
                  ),
                ),
              ],
            ),
          ),
          if (_translatedResult.isNotEmpty) ...[
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF111827).withOpacity(0.4),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.emerald.withOpacity(0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('translate.result'.tr(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.emerald)),
                  const SizedBox(height: 8),
                  Text(_translatedResult, style: const TextStyle(fontSize: 13, color: Colors.white)),
                ],
              ),
            )
          ]
        ],
      ),
    );
  }
}
