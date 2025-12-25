import React, { useState, useMemo } from 'react';
import { FaTrophy, FaCopy, FaCheck, FaRocket, FaTerminal, FaCog, FaServer, FaChartBar, FaInfoCircle, FaDownload } from 'react-icons/fa';

/**
 * 延迟颜色计算辅助函数 - 优化配色方案
 */
const getLatencyColor = (latency) => {
  if (latency < 0) return 'text-slate-400 bg-slate-100'; // 超时
  if (latency < 100) return 'text-emerald-600 bg-emerald-100'; // 极快
  if (latency < 300) return 'text-blue-600 bg-blue-100'; // 快
  if (latency < 600) return 'text-amber-600 bg-amber-100'; // 一般
  return 'text-rose-600 bg-rose-100'; // 慢
};

/**
 * 进度条颜色
 */
const getBarColor = (latency) => {
  if (latency < 0) return 'bg-slate-300';
  if (latency < 100) return 'bg-emerald-500';
  if (latency < 300) return 'bg-blue-500';
  if (latency < 600) return 'bg-amber-500';
  return 'bg-rose-500';
};

/**
 * 延迟进度条宽度计算
 */
const getWidthPercent = (latency, maxLatency) => {
  if (latency < 0) return 0;
  const percentage = (latency / (maxLatency || 1000)) * 100;
  return Math.min(Math.max(percentage, 2), 100);
};

const ResultDisplay = ({ results = [], isTesting = false }) => {
  const [copiedKey, setCopiedKey] = useState(null);

  // 对结果进行排序，过滤无效数据
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      if (a.latency === undefined) return 1;
      if (b.latency === undefined) return -1;
      if (a.latency < 0 && b.latency >= 0) return 1;
      if (b.latency < 0 && a.latency >= 0) return -1;
      return a.latency - b.latency;
    });
  }, [results]);

  const bestSource = sortedResults.find((r) => r.latency >= 0);
  const maxLatency = Math.max(...results.filter(r => r.latency > 0).map((r) => r.latency), 500);

  const handleCopy = async (text, key) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('复制失败', err);
    }
  };

  if (results.length === 0 && !isTesting) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
        <FaServer className="mx-auto text-slate-300 text-5xl mb-4" />
        <h3 className="text-lg font-medium text-slate-500">准备就绪</h3>
        <p className="text-slate-400 text-sm mt-1">点击上方按钮开始测速，模拟 cnpip 自动寻找最快源</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* 动态内容槽位 - 顶部 */}
      <div id="slot-result-top" className="empty:hidden"></div>

      {/* 最优源推荐卡片 */}
      {bestSource && !isTesting && (
        <div className="group relative bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden transform transition-all hover:-translate-y-1 duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl opacity-60 -mr-16 -mt-16 pointer-events-none"></div>
          
          <div className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider mb-3 shadow-md shadow-blue-200">
                  <FaTrophy /> cnpip 推荐最优源
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                  {bestSource.name}
                  <FaCheck className="text-blue-500 text-xl" />
                </h2>
                <p className="text-slate-500 mt-1 flex items-center gap-2 text-sm font-mono bg-slate-50 inline-block px-2 rounded">
                  {bestSource.url}
                </p>
              </div>

              <div className="flex flex-col items-end">
                <div className="flex items-baseline gap-1">
                   <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                     {bestSource.latency}
                   </span>
                   <span className="text-slate-400 font-medium">ms</span>
                </div>
                <span className="text-xs text-emerald-500 font-bold bg-emerald-50 px-2 py-1 rounded-full mt-1">
                  极速响应
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CommandBox
                icon={<FaTerminal />}
                title="临时安装命令"
                desc="本次安装使用该源 (-i)"
                cmd={`pip install <package> -i ${bestSource.url}`}
                cmdKey="temp-cmd"
                copiedKey={copiedKey}
                onCopy={handleCopy}
              />
              <CommandBox
                icon={<FaCog />}
                title="设为默认源"
                desc="全局配置 (pip config set)"
                cmd={`pip config set global.index-url ${bestSource.url}`}
                cmdKey="global-cmd"
                copiedKey={copiedKey}
                onCopy={handleCopy}
              />
            </div>
            
            {/* cnpip 推广彩蛋 */}
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <FaDownload className="text-slate-400" />
                <span>喜欢命令行工具？尝试安装 <strong>cnpip</strong> 自动管理源</span>
              </div>
              <button 
                onClick={() => handleCopy('pip install cnpip', 'cnpip-install')}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition-colors text-slate-600 font-mono"
              >
                $ pip install cnpip
                {copiedKey === 'cnpip-install' ? <FaCheck className="text-green-500" /> : <FaCopy />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详细列表 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <FaChartBar className="text-blue-500" /> 
            {isTesting ? '正在测速...' : '源测速排行 (cnpip list)'}
          </h3>
          <div className="hidden sm:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> &lt;100ms</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> &lt;300ms</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> &lt;600ms</div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {sortedResults.map((item, index) => {
            const isBest = index === 0 && item.latency >= 0 && !isTesting;
            const latencyClass = getLatencyColor(item.latency);
            const barColor = getBarColor(item.latency);
            
            return (
              <div 
                key={item.url} 
                className={`
                  px-6 py-4 transition-all duration-300 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center gap-4 group relative
                  ${isBest ? 'bg-blue-50/30' : ''}
                `}
              >
                {/* 排名与信息 */}
                <div className="flex items-center gap-4 w-full sm:w-2/5 md:w-1/3 min-w-0">
                  <div className={`
                    w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm shrink-0
                    ${isBest ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}
                  `}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold truncate ${isBest ? 'text-blue-700' : 'text-slate-700'}`}>
                        {item.name}
                      </span>
                      {isBest && <FaTrophy className="text-amber-400 text-sm shrink-0" />}
                    </div>
                    <div className="text-xs text-slate-400 truncate font-mono mt-0.5" title={item.url}>
                      {item.url}
                    </div>
                  </div>
                </div>

                {/* 延迟可视化 */}
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${barColor} ${item.latency === undefined ? 'w-0' : ''}`}
                      style={{ width: `${getWidthPercent(item.latency, maxLatency)}%` }}
                    ></div>
                  </div>
                  <div className={`w-20 text-right font-mono font-bold whitespace-nowrap ${latencyClass.split(' ')[0]}`}>
                    {item.latency === undefined ? (
                       <span className="inline-block w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></span>
                    ) : item.latency < 0 ? (
                      <span className="text-xs text-slate-400 font-sans">超时</span>
                    ) : (
                      `${item.latency}ms`
                    )}
                  </div>
                </div>

                {/* 快捷操作 */}
                <div className="sm:w-12 flex justify-end shrink-0">
                   <button
                    onClick={() => handleCopy(item.url, item.url)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-95"
                    title="复制源地址"
                  >
                    {copiedKey === item.url ? <FaCheck size={14} className="text-green-600" /> : <FaCopy size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
          
          {results.length === 0 && isTesting && (
             <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
               <FaRocket className="text-4xl animate-bounce text-blue-200" />
               <span className="animate-pulse">正在初始化测速节点...</span>
             </div>
          )}
        </div>
      </div>
      
      {/* 底部提示 */}
      <div className="flex items-start gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
        <FaInfoCircle className="mt-0.5 shrink-0" />
        <p>如遇 <span className="font-mono bg-blue-100 px-1 rounded">pip install</span> 失败，请尝试复制“临时安装命令”重试。测速结果受当前网络环境影响。</p>
      </div>

      {/* 动态内容槽位 - 底部 */}
      <div id="slot-result-bottom" className="empty:hidden"></div>
    </div>
  );
};

/**
 * 命令显示子组件
 */
const CommandBox = ({ icon, title, desc, cmd, cmdKey, copiedKey, onCopy }) => (
  <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/60 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-200 group">
    <div className="flex justify-between items-start mb-3">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
          {icon}
        </div>
        <div>
          <div className="font-bold text-slate-700 text-sm">{title}</div>
          <div className="text-xs text-slate-400">{desc}</div>
        </div>
      </div>
      <button
        onClick={() => onCopy(cmd, cmdKey)}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
          ${copiedKey === cmdKey 
            ? 'bg-green-100 text-green-700' 
            : 'bg-white text-slate-600 shadow-sm border border-slate-200 hover:text-blue-600 hover:border-blue-300'}
        `}
      >
        {copiedKey === cmdKey ? (
          <><FaCheck /> 已复制</>
        ) : (
          <><FaCopy /> 复制</>
        )}
      </button>
    </div>
    <div className="relative group/cmd">
      <div className="font-mono text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 shadow-inner break-all select-all leading-relaxed">
        {cmd}
      </div>
    </div>
  </div>
);

export default ResultDisplay;