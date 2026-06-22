import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, TrendingDown, Plus, CheckCircle, 
  FileText, Settings, Globe, Check, Star, CheckSquare, Edit3, Save
} from 'lucide-react';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  
  // 語言切換選單狀態
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // 財務記帳資料模擬（對應 Firestore 數據庫）
  const [financials, setFinancials] = useState({
    income: 135000,
    expense: 54300,
  });

  // 財務支出分類佔比（Donut 圖繪製依據）
  const categories = [
    { name: 'food', value: 18500, color: '#6366F1' },      // Indigo
    { name: 'transport', value: 8200, color: '#EC4899' }, // Pink
    { name: 'shopping', value: 15400, color: '#10B981' },  // Emerald
    { name: 'other', value: 12200, color: '#F59E0B' },     // Amber
  ];

  const totalCategoryValue = categories.reduce((acc, c) => acc + c.value, 0);

  // 待辦小秘書狀態
  const [todos, setTodos] = useState([
    { id: 1, title: '準備週會財務簡報', completed: false, time: '14:00' },
    { id: 2, title: '與日本團隊確認翻譯 API 規格', completed: true, time: '16:30' },
    { id: 3, title: '預約下午語音轉文字測試', completed: false, time: '18:00' }
  ]);

  const [newTodoText, setNewTodoText] = useState('');

  // 會議記錄大螢幕雙欄編輯器狀態 (模組 C)
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
    setTodos([...todos, { id: Date.now(), title: newTodoText, completed: false, time: '10:00' }]);
    setNewTodoText('');
  };

  const handleToggleActionItem = (id: number) => {
    setActionItems(actionItems.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  // 模擬儲存修改後的長篇逐字稿到 Firestore
  const handleSaveTranscript = () => {
    alert(`會議記錄「${meetingTitle}」已成功儲存並同步至 Firestore！`);
  };

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
        
        {/* 第一區塊：財務視覺化看板 (Stat Cards + Trend Chart) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 左側：三大統計卡片 & Donut 圓餅圖 (5格) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="glass rounded-3xl p-6 relative overflow-hidden flex-1">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-secondary"></span>
                {t('dashboard.financials')}
              </h2>
              
              {/* 金額統計 */}
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

              {/* SVG 支出分類佔比環形圖 (Donut Chart) */}
              <div className="flex items-center justify-around p-2 bg-gray-900/30 rounded-2xl border border-white/5">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4"></circle>
                    {/* 動態計算 Donut 佔比條 */}
                    {(() => {
                      let accumulatedPercent = 0;
                      return categories.map((c, i) => {
                        const percent = (c.value / totalCategoryValue) * 100;
                        const dashArray = `${percent} ${100 - percent}`;
                        const dashOffset = 100 - accumulatedPercent + 25; // 25 to offset starting top
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
                
                {/* 圖例說明 */}
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
          
          {/* 右側：收支趨勢折線圖 Trend Line Chart (7格) */}
          <div className="lg:col-span-7">
            <div className="glass rounded-3xl p-6 relative h-full flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold mb-1 flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-secondary"></span>
                  收支趨勢視覺化 (Trend Analysis)
                </h2>
                <p className="text-xs text-gray-500">自動讀取並彙整來自雙端的記帳日誌資料</p>
              </div>

              {/* SVG 趨勢折線圖 */}
              <div className="w-full h-44 my-4 relative">
                <svg className="w-full h-full" viewBox="0 0 500 160">
                  <defs>
                    <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* 背景網格線 */}
                  <line x1="20" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  <line x1="20" y1="70" x2="480" y2="70" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  <line x1="20" y1="120" x2="480" y2="120" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  
                  {/* 趨勢折線 (Income Trend - Green) */}
                  <path 
                    d="M 20,110 Q 110,80 200,60 T 380,40 T 480,30" 
                    fill="none" 
                    stroke="#10B981" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                  />
                  {/* 趨勢折線 (Expense Trend - Purple with Area Fill) */}
                  <path 
                    d="M 20,130 Q 110,120 200,90 T 380,85 T 480,75 L 480,140 L 20,140 Z" 
                    fill="url(#chartGlow)" 
                  />
                  <path 
                    d="M 20,130 Q 110,120 200,90 T 380,85 T 480,75" 
                    fill="none" 
                    stroke="#6366F1" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                  />
                  
                  {/* 數據小節點 */}
                  <circle cx="200" cy="90" r="4.5" fill="#6366F1" stroke="#0B0F19" strokeWidth="1.5" />
                  <circle cx="200" cy="60" r="4.5" fill="#10B981" stroke="#0B0F19" strokeWidth="1.5" />
                </svg>
                {/* 橫軸標記 */}
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

        {/* 第二區塊：雙欄會議記錄編輯器 (模組 C) & 小秘書待辦 */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 左側五格：小秘書今日待辦提醒 */}
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

          {/* 右側八格：雙欄會議編輯器 */}
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
                
                {/* 雙欄左側：AI 結論摘要與重點 (5格) */}
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

                {/* 雙欄右側：打字與排版編輯器 (7格) */}
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
}
