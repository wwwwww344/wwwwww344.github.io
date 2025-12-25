import React, { useEffect, useState, createContext } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import SpeedTest from './components/SpeedTest';

// 导出历史记录上下文供子组件使用
export const HistoryContext = createContext();

const App = () => {
  const [history, setHistory] = useState([]);

  // 初始化页面标题及读取本地存储的历史记录
  useEffect(() => {
    document.title = 'PipSpeed - 在线源测速工具 By HAISNAP';
    
    try {
      const savedHistory = localStorage.getItem('pip_speed_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);

  // 添加新的测速记录
  const addHistory = (record) => {
    const newRecord = { 
      ...record, 
      id: Date.now(), // 唯一标识
      timestamp: new Date().toISOString() 
    };
    // 保留最近 20 条记录
    const updatedHistory = [newRecord, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('pip_speed_history', JSON.stringify(updatedHistory));
  };

  // 清空历史记录
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('pip_speed_history');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-700 font-sans">
      {/* 应用级动态槽位 - 全局顶部 */}
      <div id="slot-app-global-top" className="empty:hidden"></div>

      <HistoryContext.Provider value={{ history, addHistory, clearHistory }}>
        <HashRouter>
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col justify-center py-12">
            <Routes>
              <Route path="/" element={<SpeedTest />} />
            </Routes>
          </main>
        </HashRouter>
      </HistoryContext.Provider>

      {/* 应用级动态槽位 - 全局底部 */}
      <div id="slot-app-global-bottom" className="empty:hidden"></div>
    </div>
  );
};

export default App;