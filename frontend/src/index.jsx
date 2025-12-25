import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 动态注入 Tailwind CSS 配置与资源
const injectStyles = () => {
  // 配置 Tailwind 样式防冲突与扩展
  const configScript = document.createElement('script');
  configScript.innerHTML = `
    tailwind.config = {
      important: true,
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
          animation: {
            'fade-in': 'fadeIn 0.6s ease-out',
            'fade-in-down': 'fadeInDown 0.6s ease-out'
          },
          keyframes: {
            fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
            fadeInDown: { from: { opacity: 0, transform: 'translateY(-20px)' }, to: { opacity: 1, transform: 'translateY(0)' } }
          }
        }
      }
    }
  `;
  document.head.appendChild(configScript);

  // 加载 Tailwind CSS CDN
  const tailwindScript = document.createElement('script');
  tailwindScript.src = "https://cdn.tailwindcss.com";
  document.head.appendChild(tailwindScript);
};

injectStyles();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);