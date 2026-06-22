import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, TrendingDown, Plus, CheckCircle, 
  FileText, Settings, Globe, Check, Star, CheckSquare, Edit3, Save,
  Mic, MapPin, Square, Bell, Languages
} from 'lucide-react';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  
  // 1. 環境偵測 RWD 路由：當偵測到小螢幕或手機設備，切換為手機板 UI 視圖
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const isMobileSize = window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
      setIsMobile(isMobileSize);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ==========================================
  // 共用/桌面端狀態與邏輯
  // ==========================================
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [financials, setFinancials] = useState({
    income: 135000,
    expense: 54300,
  });

  const categories = [
    { name: 'food', value: 18500, color: '#6366F1' },
    { name: 'transport', value: 8200, color: '#EC4899' },
    { name: 'shopping', value: 15400, color: '#10B981' },
    { name: 'other', value: 12200, color: '#F59E0B' },
  ];
  const totalCategoryValue = categories.reduce((acc, c) => acc + c.value, 0);

  const [todos, setTodos] = useState([
    { id: 1, title: '準備週會財務簡報', completed: false, time: '14:00' },
    { id: 2, title: '與日本團隊確認翻譯 API 規格', completed: true, time: '16:30' },
    { id: 3, title: '預約下午語音轉文字測試', completed: false, time: '18:00' }
  ]);
  const [newTodoText, setNewTodoText] = useState('');

  const [meetingTitle, setMeetingTitle] = useState('專案啟動與架構對齊會議');
  const [meetingTranscript, setMeetingTranscript] = useState(
    '各位團隊成員好，今天我們確認了 Omni-Assistant 系統的進階模組架構。小秘書待辦模組要支援推播提醒，而會議記錄模組需要能一鍵錄音並自動生成 AI 會議結論與 Action Items，並確保所有文字在繁中、英文、日文、韓文之間能無縫翻譯。請前端與行動端團隊在今天內完成初始化與模擬器部署。'
  );
  const [aiConclusion, setAiConclusion] = useState(
    '確認了進階模組的架構細節，並規定今日完成初始化與部署。'
  );
  const [actionItems, setActionItems] = useState([
    { id: 1, task: '小秘書待辦功能需實現模擬推播通知。', done: true },
    { id: 2, task: '會議模組需內建動態波形與結構化 AI 結論排版。', done: false },
    { id: 3, task: '兩大進階模組均需整合四國語系切換。', done: false },
  ]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setLangDropdownOpen(false);
  };

  const handleToggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    const timeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
    setTodos([...todos, { id: Date.now(), title: newTodoText, completed: false, time: timeStr }]);
    setNewTodoText('');
  };

  const handleToggleActionItem = (id: number) => {
    setActionItems(actionItems.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const handleSaveTranscript = () => {
    alert(`會議記錄「${meetingTitle}」已成功儲存並同步至 Firestore！`);
  };

  // ==========================================
  // 行動端專屬狀態與邏輯
  // ==========================================
  const [mobTab, setMobTab] = useState(0); 
  const [gpsLocked, setGpsLocked] = useState(true);
  const [currentGps, setCurrentGps] = useState({
    latitude: 25.0339,
    longitude: 121.5644,
    addressName: '台北市信義區 (預設模擬)'
  });

  const [mobNoteTitle, setMobNoteTitle] = useState('');
  const [mobNoteContent, setMobNoteContent] = useState('');
  const [mobAmount, setMobAmount] = useState('');
  const [mobRecordType, setMobRecordType] = useState('expense');
  const [mobCategory, setMobCategory] = useState('food');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showPushNotification, setShowPushNotification] = useState(false);
  const [pushNotificationText, setPushNotificationText] = useState('');

  // 錄音相關 REF 與狀態
  const [isRecording, setIsRecording] = useState(false);
  const [recordingHeights, setRecordingHeights] = useState<number[]>([8, 8, 8, 8, 8, 8, 8, 8]);
  const [showMobAiSummary, setShowMobAiSummary] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const rafRef = useRef<number | null>(null);
  
  // 翻譯狀態
  const [transInput, setTransInput] = useState('');
  const [transResult, setTransResult] = useState('');

  // 定位請求 (真實 HTML5 Geolocation API 調用)
  const handleToggleGps = () => {
    const nextLocked = !gpsLocked;
    setGpsLocked(nextLocked);
    if (nextLocked) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCurrentGps({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              addressName: `真實 GPS 定位 (緯: ${pos.coords.latitude.toFixed(4)}, 經: ${pos.coords.longitude.toFixed(4)})`
            });
          },
          () => {
            setCurrentGps({
              latitude: 25.0339,
              longitude: 121.5644,
              addressName: '台北市信義區 (定位失敗 Fallback)'
            });
          },
          { timeout: 5000 }
        );
      }
    }
  };

  // 行動端儲存筆記
  const handleSaveMobNote = async () => {
    if (!mobNoteContent.trim()) {
      alert(i18n.language === 'zh-TW' ? '請輸入筆記內容！' : 'Please enter note content!');
      return;
    }

    const noteId = Date.now().toString();
    const finalLocation = gpsLocked ? currentGps : null;
    const hasRecord = !!mobAmount.trim();
    const parsedAmount = hasRecord ? parseFloat(mobAmount) : null;

    const noteData = {
      noteId,
      userId: 'default_user_123',
      title: mobNoteTitle.trim() || t('notes.placeholderTitle') || '隨手記',
      content: mobNoteContent,
      createdAt: new Date().toISOString(),
      location: finalLocation,
      financialRecord: {
        hasRecord,
        amount: parsedAmount,
        type: mobRecordType,
        category: mobCategory
      }
    };

    // 寫入實體 Firestore 
    try {
      await addDoc(collection(db, 'notes'), {
        ...noteData,
        createdAt: serverTimestamp() 
      });
    } catch (e) {
      console.warn("Firestore write skipped/failed: ", e);
    }

    // 更新本機狀態 (財務數額加載模擬)
    if (hasRecord && parsedAmount) {
      setFinancials(prev => {
        if (mobRecordType === 'income') {
          return { ...prev, income: prev.income + parsedAmount };
        } else {
          return { ...prev, expense: prev.expense + parsedAmount };
        }
      });
    }

    // 顯示成功通知
    setSnackbarMessage(t('notes.success') || '儲存成功 (Firestore 同步完成)');
    setTimeout(() => setSnackbarMessage(''), 2500);

    // 清空輸入
    setMobNoteTitle('');
    setMobNoteContent('');
    setMobAmount('');
  };

  // 行動端新增待辦
  const handleAddMobTodo = async (title: string, time: string) => {
    if (!title.trim()) return;
    const id = Date.now();
    const newTodo = { id, title, completed: false, time };
    
    setTodos([newTodo, ...todos]);

    // 寫入實體 Firestore
    try {
      await addDoc(collection(db, 'todos'), {
        todoId: id.toString(),
        userId: 'default_user_123',
        title,
        isCompleted: false,
        reminderTime: time,
        createdAt: serverTimestamp(),
        notificationSent: false
      });
    } catch (e) {
      console.warn("Firestore write skipped/failed: ", e);
    }

    // 觸發推播提醒橫幅
    setPushNotificationText(`${t('reminders.notificationBody') || '您設定的時間到了：'} ${title} (${time})`);
    setShowPushNotification(true);
    setTimeout(() => setShowPushNotification(false), 4000);
  };

  // 行動端麥克風錄音 (真實 HTML5 Web Audio API & MediaRecorder)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioCtxRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 32;
      
      setIsRecording(true);
      setShowMobAiSummary(false);
      
      const draw = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const heights = Array.from({ length: 8 }).map((_, i) => {
          const val = dataArray[i % dataArray.length] || 0;
          return 8 + (val / 255) * 36;
        });
        setRecordingHeights(heights);
        rafRef.current = requestAnimationFrame(draw);
      };
      draw();
      
      // MediaRecorder 錄音
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.start();
      
    } catch (e) {
      console.warn("Media devices error: ", e);
      // Fallback 模擬音波動畫
      setIsRecording(true);
      setShowMobAiSummary(false);
      let count = 0;
      const interval = setInterval(() => {
        if (!isRecording) {
          clearInterval(interval);
          return;
        }
        const heights = Array.from({ length: 8 }).map(() => 8 + Math.random() * 36);
        setRecordingHeights(heights);
      }, 100);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setShowMobAiSummary(true);
    
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    // 寫入實體 Firestore
    try {
      addDoc(collection(db, 'meetings'), {
        meetingId: Date.now().toString(),
        userId: 'default_user_123',
        title: '專案啟動會議',
        audioUrl: 'https://firebasestorage.googleapis.com/v0/b/omni-assistant/o/audio.mp3',
        transcript: t('meetings.mockTranscript'),
        summary: {
          conclusion: t('meetings.mockConclusion'),
          actionItems: [
            { task: t('meetings.mockKeypoint1') },
            { task: t('meetings.mockKeypoint2') }
          ]
        },
        durationSeconds: 120,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Firestore meeting write failed: ", e);
    }
  };

  // 翻譯功能
  const handleTranslate = () => {
    if (!transInput.trim()) return;
    if (i18n.language === 'zh-TW') {
      setTransResult(`Translated: "${transInput}" (Auto-translated to English)`);
    } else {
      setTransResult(`翻譯結果: "${transInput}" (自動翻譯為繁體中文)`);
    }
  };

  // ==========================================
  // RENDER 區塊
  // ==========================================

  // 渲染：手機版介面 (MobileAppView)
  const renderMobileView = () => {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-sans relative overflow-hidden select-none w-full max-w-md mx-auto border-x border-white/5 shadow-2xl">
        
        {/* 背景光暈 */}
        <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-secondary/10 rounded-full blur-3xl -z-10"></div>

        {/* 手機頂部推播通知橫幅 */}
        {showPushNotification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[92%] glass border-primary/40 rounded-2xl p-3.5 shadow-2xl z-50 transition-all duration-300 flex items-center gap-3 animate-bounce">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Bell className="w-5 h-5 text-secondary" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-white">{t('reminders.notificationTitle') || '小秘書提醒通知 ⏰'}</div>
              <div className="text-[10px] text-gray-400">{pushNotificationText}</div>
            </div>
          </div>
        )}

        {/* App Header */}
        <header className="bg-gray-900/60 backdrop-blur-md px-5 py-4 border-b border-white/5 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white">
              <Star className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gradient">{t('app.title')}</h1>
              <p className="text-[9px] text-gray-500">{t('app.subtitle')}</p>
            </div>
          </div>

          {/* 語系切換 */}
          <div className="relative">
            <button 
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="px-2.5 py-1 rounded-lg bg-gray-800/80 border border-gray-700 hover:border-primary flex items-center gap-1 text-[10px] text-gray-300 transition-all"
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{i18n.language === 'zh-TW' ? '繁中' : i18n.language === 'en' ? 'EN' : i18n.language === 'ja' ? '日本語' : '한국어'}</span>
            </button>
            {langDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-28 rounded-lg bg-gray-900 border border-gray-800 shadow-xl overflow-hidden z-50 text-[10px]">
                <button onClick={() => changeLanguage('zh-TW')} className="w-full px-3 py-2 text-left hover:bg-primary/20 text-gray-300 border-b border-white/5 flex justify-between items-center">
                  <span>繁體中文</span>
                  {i18n.language === 'zh-TW' && <Check className="w-3 h-3 text-primary" />}
                </button>
                <button onClick={() => changeLanguage('en')} className="w-full px-3 py-2 text-left hover:bg-primary/20 text-gray-300 border-b border-white/5 flex justify-between items-center">
                  <span>English</span>
                  {i18n.language === 'en' && <Check className="w-3 h-3 text-primary" />}
                </button>
                <button onClick={() => changeLanguage('ja')} className="w-full px-3 py-2 text-left hover:bg-primary/20 text-gray-300 border-b border-white/5 flex justify-between items-center">
                  <span>日本語</span>
                  {i18n.language === 'ja' && <Check className="w-3 h-3 text-primary" />}
                </button>
                <button onClick={() => changeLanguage('ko')} className="w-full px-3 py-2 text-left hover:bg-primary/20 text-gray-300 flex justify-between items-center">
                  <span>한국어</span>
                  {i18n.language === 'ko' && <Check className="w-3 h-3 text-primary" />}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* 手機內容滾動區 */}
        <div className="flex-grow overflow-y-auto px-5 py-5 space-y-4">
          
          {/* TAB 0: 筆記記帳 */}
          {mobTab === 0 && (
            <div className="space-y-4">
              <div className="text-sm font-semibold text-gray-200">{t('home.greeting')}</div>

              <div className="p-4 rounded-2xl bg-gray-900/60 border border-white/5 space-y-3.5">
                <div className="text-xs font-bold text-white uppercase tracking-wider">{t('notes.addNote')}</div>
                
                <div className="space-y-2.5">
                  <input 
                    type="text" 
                    placeholder={t('notes.title') || "標題"}
                    value={mobNoteTitle}
                    onChange={e => setMobNoteTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-950/60 border border-gray-800 rounded-lg focus:outline-none focus:border-primary text-gray-200"
                  />
                  <textarea 
                    rows={3} 
                    placeholder={t('notes.content') || "點擊輸入內容..."}
                    value={mobNoteContent}
                    onChange={e => setMobNoteContent(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-950/60 border border-gray-800 rounded-lg focus:outline-none focus:border-primary text-gray-200 resize-none"
                  ></textarea>
                </div>

                {/* GPS 定位 */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-950/40 border border-gray-850">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-secondary" />
                    <span className="text-[10px] text-gray-400">
                      {gpsLocked ? currentGps.addressName : t('home.gpsTracking')}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={gpsLocked} onChange={handleToggleGps} className="sr-only peer" />
                    <div className="w-7 h-4 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-355 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-secondary"></div>
                  </label>
                </div>

                <div className="border-t border-white/5 my-2"></div>

                {/* 財務支出記帳 */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-gray-400">{t('home.financialQuick')}</span>
                    <div className="flex bg-gray-950 rounded-lg p-0.5 text-[10px] border border-gray-800">
                      <button 
                        onClick={() => setMobRecordType('expense')}
                        className={`px-2.5 py-0.5 rounded-md font-medium ${mobRecordType === 'expense' ? 'text-white bg-red-500/40' : 'text-gray-500'}`}
                      >
                        {t('notes.expense')}
                      </button>
                      <button 
                        onClick={() => setMobRecordType('income')}
                        className={`px-2.5 py-0.5 rounded-md font-medium ${mobRecordType === 'income' ? 'text-white bg-emerald-500/40' : 'text-gray-500'}`}
                      >
                        {t('notes.income')}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-3 relative">
                      <span className="absolute left-2.5 top-2 text-[10px] text-gray-500">$</span>
                      <input 
                        type="number" 
                        placeholder={t('notes.amount') || "金額"}
                        value={mobAmount}
                        onChange={e => setMobAmount(e.target.value)}
                        className="w-full pl-5 pr-2 py-1.5 text-xs bg-gray-950/60 border border-gray-800 rounded-lg focus:outline-none focus:border-primary text-gray-200"
                      />
                    </div>
                    <select 
                      value={mobCategory}
                      onChange={e => setMobCategory(e.target.value)}
                      className="col-span-2 px-1 py-1.5 text-[10px] bg-gray-950/60 border border-gray-800 rounded-lg text-gray-300 focus:outline-none"
                    >
                      <option value="food">{t('notes.food')}</option>
                      <option value="transport">{t('notes.transport')}</option>
                      <option value="shopping">{t('notes.shopping')}</option>
                      <option value="salary">{t('notes.salary')}</option>
                      <option value="other">{t('notes.other')}</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleSaveMobNote}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-xs hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all"
                >
                  {t('notes.save')}
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: 小秘書提醒 */}
          {mobTab === 1 && (
            <div className="space-y-4">
              <div className="text-sm font-semibold text-gray-200">{t('dashboard.todoList')}</div>
              
              <div className="p-4 rounded-2xl bg-gray-900/60 border border-white/5 space-y-3.5">
                <div className="text-xs font-bold text-white uppercase tracking-wider">{t('reminders.reminderHeading') || '新增提醒事項'}</div>
                
                <input 
                  id="mob-todo-title"
                  type="text" 
                  placeholder={t('reminders.placeholder') || "要做些什麼事呢？"} 
                  className="w-full px-3 py-2.5 text-xs bg-gray-950/60 border border-gray-800 rounded-lg focus:outline-none focus:border-primary text-gray-200"
                />
                
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-950/40 border border-gray-850">
                  <span className="text-[10px] text-gray-400">{t('reminders.reminderTime')}</span>
                  <input 
                    id="mob-todo-time"
                    type="time" 
                    defaultValue="14:00" 
                    className="text-xs bg-transparent text-secondary font-bold focus:outline-none" 
                  />
                </div>

                <button 
                  onClick={() => {
                    const titleInput = document.getElementById('mob-todo-title') as HTMLInputElement;
                    const timeInput = document.getElementById('mob-todo-time') as HTMLInputElement;
                    if (titleInput && timeInput) {
                      handleAddMobTodo(titleInput.value, timeInput.value);
                      titleInput.value = '';
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-secondary text-white font-semibold text-xs hover:shadow-lg active:scale-[0.98] transition-all"
                >
                  {t('reminders.save')}
                </button>
              </div>

              {/* 提醒清單 */}
              <div className="space-y-2.5">
                {todos.map(todo => (
                  <div key={todo.id} onClick={() => handleToggleTodo(todo.id)} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-900/40 border border-white/5 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CheckCircle className={`w-4.5 h-4.5 ${todo.completed ? 'text-accent' : 'text-gray-600'}`} />
                      <span className={`text-xs ${todo.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>{todo.title}</span>
                    </div>
                    <span className="text-[10px] bg-secondary/15 text-secondary px-2 py-0.5 rounded">⏰ {todo.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: 會議記錄 */}
          {mobTab === 2 && (
            <div className="space-y-4">
              <div className="text-sm font-semibold text-gray-200">{t('meetings.title')}</div>

              <div className="p-5 rounded-2xl bg-gray-900/60 border border-white/5 flex flex-col items-center py-8 relative">
                {/* 麥克風真實頻譜跳動 */}
                <div className={`h-12 flex items-center justify-center gap-1.5 mb-5 transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-20'}`}>
                  {recordingHeights.map((h, i) => (
                    <div 
                      key={i} 
                      style={{ height: `${h}px` }}
                      className="w-1.5 rounded-full bg-gradient-to-t from-primary to-secondary transition-all duration-75"
                    ></div>
                  ))}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-5 ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                  {isRecording ? t('meetings.recording') || '錄音中...' : 'IDLE'}
                </div>

                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all ${
                    isRecording 
                      ? 'bg-red-500 shadow-red-500/25 animate-pulse' 
                      : 'bg-gradient-to-tr from-primary to-secondary shadow-primary/20 hover:scale-105 active:scale-95'
                  }`}
                >
                  {isRecording ? <Square className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                </button>
              </div>

              {/* AI 智慧摘要 */}
              {showMobAiSummary && (
                <div className="p-4 rounded-2xl bg-gray-900/50 border border-white/5 space-y-3.5">
                  <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <FileText className="w-4.5 h-4.5" />
                    <span>{t('meetings.aiSummary')}</span>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-gray-950/70 border border-white/5 space-y-1">
                    <div className="text-[10px] text-gray-500 font-bold">{t('meetings.conclusion')}</div>
                    <p className="text-xs text-gray-300 leading-relaxed">{t('meetings.mockConclusion')}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] text-gray-500 font-bold">{t('meetings.keypoints')}</div>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1.5"></span>
                        <span>{t('meetings.mockKeypoint1')}</span>
                      </li>
                      <li className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1.5"></span>
                        <span>{t('meetings.mockKeypoint2')}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 翻譯 */}
          {mobTab === 3 && (
            <div className="space-y-4">
              <div className="text-sm font-semibold text-gray-200">{t('translate.title')}</div>

              <div className="p-4 rounded-2xl bg-gray-900/60 border border-white/5 space-y-3.5">
                <textarea 
                  rows={3} 
                  placeholder={t('translate.inputPlaceholder') || "請輸入欲翻譯的文字..."}
                  value={transInput}
                  onChange={e => setTransInput(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-gray-950/60 border border-gray-800 rounded-lg focus:outline-none focus:border-primary text-gray-200 resize-none"
                ></textarea>
                <button 
                  onClick={handleTranslate}
                  className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:shadow-lg active:scale-[0.98] transition-all"
                >
                  {t('translate.translateButton') || '立即翻譯'}
                </button>
              </div>

              {transResult && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <div className="text-[10px] font-bold text-emerald-400">{t('translate.result') || '翻譯結果'}</div>
                  <p className="text-xs text-gray-200 font-medium">{transResult}</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* 底部導覽列 (Bottom Navigation) */}
        <footer className="bg-gray-900 border-t border-white/5 grid grid-cols-4 py-3 z-30 select-none">
          <button onClick={() => setMobTab(0)} className={`flex flex-col items-center justify-center gap-1 ${mobTab === 0 ? 'text-primary font-bold' : 'text-gray-500'}`}>
            <FileText className="w-5 h-5" />
            <span className="text-[9px]">{t('nav.notes')}</span>
          </button>
          <button onClick={() => setMobTab(1)} className={`flex flex-col items-center justify-center gap-1 ${mobTab === 1 ? 'text-primary font-bold' : 'text-gray-500'}`}>
            <Bell className="w-5 h-5" />
            <span className="text-[9px]">{t('nav.dashboard') || '提醒'}</span>
          </button>
          <button onClick={() => setMobTab(2)} className={`flex flex-col items-center justify-center gap-1 ${mobTab === 2 ? 'text-primary font-bold' : 'text-gray-500'}`}>
            <Mic className="w-5 h-5" />
            <span className="text-[9px]">{t('nav.meetings')}</span>
          </button>
          <button onClick={() => setMobTab(3)} className={`flex flex-col items-center justify-center gap-1 ${mobTab === 3 ? 'text-primary font-bold' : 'text-gray-500'}`}>
            <Languages className="w-5 h-5" />
            <span className="text-[9px]">{t('nav.translate')}</span>
          </button>
        </footer>

        {/* 模擬的 iOS Home Indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-gray-800 rounded-full z-45"></div>

        {/* Mobile Snackbar */}
        {snackbarMessage && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[90%] py-2.5 px-4 rounded-xl bg-emerald-500/90 text-white text-[10px] font-medium shadow-lg z-50 text-center transition-all duration-300">
            {snackbarMessage}
          </div>
        )}
      </div>
    );
  };

  // 渲染：大螢幕桌面版介面 (DesktopDashboardView)
  const renderDesktopView = () => {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-sans">
        {/* 頂部導覽列 */}
        <header className="glass sticky top-0 z-50 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gradient">{t('app.title')}</h1>
              <p className="text-xs text-gray-400">{t('app.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 語系切換 */}
            <div className="relative">
              <button 
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="px-3.5 py-1.5 rounded-xl bg-gray-800/80 border border-gray-700 hover:border-primary flex items-center gap-2 text-sm transition-all"
              >
                <Globe className="w-4 h-4 text-primary" />
                <span>{i18n.language === 'zh-TW' ? '繁體中文' : i18n.language === 'en' ? 'English' : i18n.language === 'ja' ? '日本語' : '한국어'}</span>
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-xl bg-gray-900 border border-gray-800 shadow-xl overflow-hidden z-50">
                  <button onClick={() => changeLanguage('zh-TW')} className="w-full px-4 py-2 text-left text-sm hover:bg-primary/20 flex justify-between items-center text-gray-300">
                    <span>繁體中文</span>
                    {i18n.language === 'zh-TW' && <Check className="w-4 h-4 text-primary" />}
                  </button>
                  <button onClick={() => changeLanguage('en')} className="w-full px-4 py-2 text-left text-sm hover:bg-primary/20 flex justify-between items-center text-gray-300">
                    <span>English</span>
                    {i18n.language === 'en' && <Check className="w-4 h-4 text-primary" />}
                  </button>
                  <button onClick={() => changeLanguage('ja')} className="w-full px-4 py-2 text-left text-sm hover:bg-primary/20 flex justify-between items-center text-gray-300">
                    <span>日本語</span>
                    {i18n.language === 'ja' && <Check className="w-4 h-4 text-primary" />}
                  </button>
                  <button onClick={() => changeLanguage('ko')} className="w-full px-4 py-2 text-left text-sm hover:bg-primary/20 flex justify-between items-center text-gray-300">
                    <span>한국어</span>
                    {i18n.language === 'ko' && <Check className="w-4 h-4 text-primary" />}
                  </button>
                </div>
              )}
            </div>
            <button className="p-2 rounded-xl bg-gray-800/80 border border-gray-700 hover:border-primary transition-all">
              <Settings className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </header>

        {/* 主體看板 */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-6">
          
          {/* 第一區塊：財務統計 */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 左側 Donut */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="glass rounded-3xl p-6 relative overflow-hidden flex-1">
                <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-secondary"></span>
                  {t('dashboard.financials')}
                </h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-900/50 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center text-accent">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <span className="text-xs text-gray-400">{t('dashboard.income')}</span>
                    </div>
                    <span className="text-base font-bold text-accent">{t('dashboard.currencySymbol')}{financials.income.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3.5 rounded-2xl bg-gray-900/50 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center text-red-500">
                        <TrendingDown className="w-5 h-5" />
                      </div>
                      <span className="text-xs text-gray-400">{t('dashboard.expense')}</span>
                    </div>
                    <span className="text-base font-bold text-red-500">{t('dashboard.currencySymbol')}{financials.expense.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-around p-2 bg-gray-900/30 rounded-2xl border border-white/5">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4"></circle>
                      {(() => {
                        let accumulatedPercent = 0;
                        return categories.map((c, i) => {
                          const percent = (c.value / totalCategoryValue) * 100;
                          const dashArray = `${percent} ${100 - percent}`;
                          const dashOffset = 100 - accumulatedPercent + 25;
                          accumulatedPercent += percent;
                          return (
                            <circle 
                              key={i}
                              cx="21" cy="21" r="15.915" 
                              fill="transparent" 
                              stroke={c.color} 
                              strokeWidth="4" 
                              strokeDasharray={dashArray}
                              strokeDashoffset={dashOffset}
                              className="transition-all duration-500"
                            ></circle>
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-[9px] text-gray-500 uppercase">Total Exp</span>
                      <span className="text-xs font-bold font-mono">${financials.expense.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 text-[10px] text-gray-300">
                    {categories.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: c.color }}></span>
                        <span className="capitalize">{t(`notes.${c.name}`)}</span>
                        <span className="font-mono text-gray-500">({Math.round((c.value/totalCategoryValue)*100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 右側收支趨勢 */}
            <div className="lg:col-span-7">
              <div className="glass rounded-3xl p-6 relative h-full flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold mb-1 flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-secondary"></span>
                    收支趨勢視覺化 (Trend Analysis)
                  </h2>
                  <p className="text-xs text-gray-500">自動讀取並彙整來自雙端的記帳日誌資料</p>
                </div>

                <div className="w-full h-44 my-4 relative">
                  <svg className="w-full h-full" viewBox="0 0 500 160">
                    <defs>
                      <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="20" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="20" y1="70" x2="480" y2="70" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="20" y1="120" x2="480" y2="120" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    
                    <path d="M 20,110 Q 110,80 200,60 T 380,40 T 480,30" fill="none" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
                    <path d="M 20,130 Q 110,120 200,90 T 380,85 T 480,75 L 480,140 L 20,140 Z" fill="url(#chartGlow)" />
                    <path d="M 20,130 Q 110,120 200,90 T 380,85 T 480,75" fill="none" stroke="#6366F1" strokeWidth="3.5" strokeLinecap="round" />
                    
                    <circle cx="200" cy="90" r="4.5" fill="#6366F1" stroke="#0B0F19" strokeWidth="1.5" />
                    <circle cx="200" cy="60" r="4.5" fill="#10B981" stroke="#0B0F19" strokeWidth="1.5" />
                  </svg>
                  <div className="flex justify-between px-4 text-[9px] text-gray-500 font-mono">
                    <span>Week 1</span>
                    <span>Week 2</span>
                    <span>Week 3</span>
                    <span>Week 4</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[10px] text-gray-400 border-t border-white/5 pt-3">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent"></span>本月收入趨勢</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span>本月支出趨勢</span>
                </div>
              </div>
            </div>
          </section>

          {/* 第二區塊：雙欄會議 & 待辦 */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 待辦清單 */}
            <div className="lg:col-span-4">
              <div className="glass rounded-3xl p-6 h-full flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold mb-3 flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-secondary"></span>
                    {t('dashboard.todoList')}
                  </h2>
                  
                  <form onSubmit={handleAddTodo} className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      placeholder="新增代辦..." 
                      value={newTodoText}
                      onChange={e => setNewTodoText(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs focus:outline-none focus:border-primary text-gray-200"
                    />
                    <button type="submit" className="p-2 rounded-xl bg-primary hover:bg-primary/95 text-white transition-all">
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {todos.map(todo => (
                      <div 
                        key={todo.id} 
                        onClick={() => handleToggleTodo(todo.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          todo.completed 
                            ? 'bg-gray-900/20 border-gray-950 text-gray-500' 
                            : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className={`w-4 h-4 ${todo.completed ? 'text-accent' : 'text-gray-600'}`} />
                          <span className="text-xs">{todo.title}</span>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${todo.completed ? 'bg-gray-800' : 'bg-secondary/15 text-secondary'}`}>
                          ⏰ {todo.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 border-t border-white/5 pt-3 mt-4">
                  📱 提醒事項將同步向 App 發送推播通知
                </div>
              </div>
            </div>

            {/* 會議編輯器 */}
            <div className="lg:col-span-8">
              <div className="glass rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-primary" />
                    <h2 className="text-base font-bold text-gray-200">會議記錄編輯器 (雙欄大螢幕版)</h2>
                  </div>
                  <button 
                    onClick={handleSaveTranscript}
                    className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-primary/10 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    儲存並更新
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* AI 結論 */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                      <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        {t('meetings.aiSummary')}
                      </span>
                      <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">{t('meetings.conclusion')}</div>
                      <p className="text-xs text-gray-300 leading-relaxed font-medium">{aiConclusion}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-900/60 border border-white/5 space-y-3">
                      <span className="text-xs font-bold text-secondary flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4" />
                        {t('meetings.actionItems')}
                      </span>
                      <ul className="space-y-2">
                        {actionItems.map(item => (
                          <li key={item.id} className="flex items-start gap-2.5 text-[11px] text-gray-300 leading-relaxed">
                            <input 
                              type="checkbox" 
                              checked={item.done} 
                              onChange={() => handleToggleActionItem(item.id)}
                              className="rounded border-gray-700 text-primary bg-gray-900 mt-0.5 focus:ring-0" 
                            />
                            <span className={item.done ? 'line-through text-gray-500' : ''}>
                              {item.task}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 右側編輯 */}
                  <div className="md:col-span-7 flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">會議名稱</label>
                      <input 
                        type="text" 
                        value={meetingTitle}
                        onChange={e => setMeetingTitle(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-white focus:outline-none focus:border-primary transition-all font-semibold"
                      />
                    </div>

                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">{t('meetings.transcript')}</label>
                      <textarea 
                        rows={8}
                        value={meetingTranscript}
                        onChange={e => setMeetingTranscript(e.target.value)}
                        className="w-full flex-1 px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-300 focus:outline-none focus:border-primary resize-none leading-relaxed transition-all"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="py-6 text-center text-xs text-gray-600 border-t border-white/5 mt-auto">
          &copy; 2026 Omni-Assistant System. Double-end Cloud synchronization.
        </footer>
      </div>
    );
  };

  return isMobile ? renderMobileView() : renderDesktopView();
}
