import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { FaPlay, FaSync, FaMapMarkerAlt, FaHistory, FaEdit, FaCheck, FaTimes, FaGlobeAsia, FaExclamationTriangle } from 'react-icons/fa';
import ResultDisplay from './ResultDisplay';
import { HistoryContext } from '../App';

const PRESET_REGIONS = [
  '中国北京 (CN-BJ)', '中国上海 (CN-SH)', '中国广州 (CN-GZ)', '中国深圳 (CN-SZ)',
  '中国香港 (HK)', '中国台湾 (TW)', '美国 (US)', '日本 (JP)', '新加坡 (SG)', '欧洲 (EU)', '全球 (Global)',
];

const SpeedTest = () => {
  const { addHistory, history } = useContext(HistoryContext);
  const [results, setResults] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [region, setRegion] = useState('定位中...');
  const [autoDetectedRegion, setAutoDetectedRegion] = useState('');
  const [progress, setProgress] = useState(0);
  const [isEditingRegion, setIsEditingRegion] = useState(false);
  const [tempRegion, setTempRegion] = useState('');
  const [error, setError] = useState(null);
  const regionInputRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    fetch('https://ipapi.co/json/', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('API limit');
        return res.json();
      })
      .then((data) => {
        const detected = `${data.city || '未知城市'}, ${data.country_name || 'CN'}`;
        setRegion(detected);
        setAutoDetectedRegion(detected);
      })
      .catch(() => {
        const fallback = '本地网络环境';
        setRegion(fallback);
        setAutoDetectedRegion(fallback);
      })
      .finally(() => clearTimeout(timeout));

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (isEditingRegion && regionInputRef.current) {
      setTempRegion(region);
      regionInputRef.current.focus();
    }
  }, [isEditingRegion, region]);

  const handleSaveRegion = () => {
    if (tempRegion.trim()) {
      setRegion(tempRegion.trim());
    }
    setIsEditingRegion(false);
  };

  const runSpeedTest = useCallback(async () => {
    if (isTesting) return;
    setIsTesting(true);
    setResults([]);
    setProgress(0);
    setError(null);

    try {
      const response = await fetch('/api/speed-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ region })
      });

      if (!response.ok) {
        throw new Error(`后端服务异常: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '测速失败');
      }

      const sortedResults = data.sources.sort((a, b) => {
        if (a.latency === undefined && b.latency === undefined) return 0;
        if (a.latency === undefined) return 1;
        if (b.latency === undefined) return -1;
        if (a.latency === -1 && b.latency === -1) return 0;
        if (a.latency === -1) return 1;
        if (b.latency === -1) return -1;
        return a.latency - b.latency;
      });

      setResults(sortedResults);
      setProgress(100);

      if (data.fastest) {
        addHistory({
          region,
          bestSource: data.fastest,
          timestamp: data.timestamp || new Date().toISOString()
        });
      }

    } catch (err) {
      console.error('测速失败:', err);
      setError(err.message || '测速服务异常，请检查后端服务是否正常运行');
      setResults([]);
    } finally {
      setIsTesting(false);
    }
  }, [isTesting, region, addHistory]);

  useEffect(() => {
    runSpeedTest();
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 font-sans text-slate-600">
      <div id="slot-speedtest-header" className="empty:hidden mb-6"></div>

      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6 animate-fade-in-down">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <FaGlobeAsia className="text-xl" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
              Pip 源<span className="text-blue-600">极速测速</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 text-sm md:text-base h-8">
            <FaMapMarkerAlt className="text-blue-400" />
            <span className="text-slate-500">当前网络节点：</span>

            {isEditingRegion ? (
              <div className="flex items-center gap-1 animate-fade-in">
                <select
                  ref={regionInputRef}
                  value={tempRegion}
                  onChange={(e) => setTempRegion(e.target.value)}
                  className="px-2 py-1 border border-blue-300 rounded text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm w-56 cursor-pointer shadow-sm"
                >
                  {autoDetectedRegion && (
                    <option value={autoDetectedRegion}>📍 自动: {autoDetectedRegion}</option>
                  )}
                  <option disabled>──────────</option>
                  {PRESET_REGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button onClick={handleSaveRegion} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" title="确定"><FaCheck /></button>
                <button onClick={() => setIsEditingRegion(false)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="取消"><FaTimes /></button>
              </div>
            ) : (
              <div className="group flex items-center gap-2 cursor-pointer" onClick={() => setIsEditingRegion(true)} title="点击切换地区">
                <span className="font-semibold text-slate-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 group-hover:bg-blue-100 group-hover:border-blue-200 transition-all">
                  {region}
                </span>
                <FaEdit className="text-slate-300 group-hover:text-blue-400 text-xs transition-colors" />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={runSpeedTest}
          disabled={isTesting}
          className={`
            group relative overflow-hidden rounded-xl px-8 py-3 font-bold text-white shadow-lg transition-all 
            ${isTesting ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0'}
          `}
        >
          <span className="relative z-10 flex items-center gap-2">
            {isTesting ? (
              <><FaSync className="animate-spin" /> cnpip 测速中 {Math.round(progress)}%</>
            ) : (
              <><FaPlay className="group-hover:ml-1 transition-all" /> 开始 cnpip 测速</>
            )}
          </span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 animate-fade-in">
          <FaExclamationTriangle className="text-xl mt-0.5 shrink-0" />
          <div>
            <div className="font-bold mb-1">测速失败</div>
            <div className="text-sm">{error}</div>
            <div className="text-xs mt-2 text-red-600">请确保后端服务已启动并运行在正确的端口</div>
          </div>
        </div>
      )}

      <div className={`h-1.5 w-full bg-slate-100 rounded-full mb-8 overflow-hidden transition-opacity duration-500 ${isTesting ? 'opacity-100' : 'opacity-0'}`}>
        <div 
          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <ResultDisplay results={results} isTesting={isTesting} />

      {history.length > 0 && (
        <div className="mt-12 pt-8 border-t border-slate-200 animate-fade-in">
          <div className="flex items-center gap-2 mb-4 text-slate-700">
            <FaHistory className="text-blue-500" />
            <h3 className="font-bold text-lg">最近测速记录</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.slice(0, 3).map((record) => (
              <div key={record.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-xs text-slate-400">{new Date(record.timestamp).toLocaleString()}</div>
                  <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded truncate max-w-[120px]" title={record.region}>{record.region}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-slate-700 truncate">{record.bestSource?.name}</div>
                  <div className="flex-1 h-px bg-slate-100"></div>
                  <div className="text-sm font-bold text-emerald-500">{record.bestSource?.latency}ms</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div id="slot-speedtest-footer" className="empty:hidden mt-8"></div>
    </div>
  );
};

export default SpeedTest;