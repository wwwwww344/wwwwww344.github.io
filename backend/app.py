from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys
import logging
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 设置全局异常捕获
def global_exception_handler(exctype, value, traceback):
    logging.critical("未捕获的全局异常", exc_info=(exctype, value, traceback))
sys.excepthook = global_exception_handler

# 严格按照如下方式配置静态资源
static_folder = '../frontend/public' if os.path.exists('../frontend/public') else '../frontend/dist'
app = Flask(__name__, static_folder=static_folder, static_url_path='/')
CORS(app)

# Pip 源列表配置
PIP_SOURCES = [
    {"name": "阿里云 (Aliyun)", "url": "https://mirrors.aliyun.com/pypi/simple"},
    {"name": "清华大学 (Tuna)", "url": "https://pypi.tuna.tsinghua.edu.cn/simple"},
    {"name": "腾讯云 (Tencent)", "url": "https://mirrors.cloud.tencent.com/pypi/simple"},
    {"name": "华为云 (Huawei)", "url": "https://repo.huaweicloud.com/repository/pypi/simple"},
    {"name": "中科大 (USTC)", "url": "https://pypi.mirrors.ustc.edu.cn/simple"},
    {"name": "BH6BHG的无线电源", "url": "https://bc9ce2eff4cc.ngrok-free.app/simple"},
    {"name": "豆瓣 (Douban)", "url": "https://pypi.doubanio.com/simple"},
    {"name": "网易 (163)", "url": "https://mirrors.163.com/pypi/simple"},
    {"name": "百度云 (Baidu)", "url": "https://mirror.baidu.com/pypi/simple"},
    {"name": "官方源 (PyPI)", "url": "https://pypi.org/simple"},
    {"name": "上海交大 (SJTU)", "url": "https://mirror.sjtu.edu.cn/pypi/simple"},
    {"name": "华中科大 (HUST)", "url": "https://pypi.hust.edu.cn/simple"},
    {"name": "北京理工 (BIT)", "url": "https://pypi.bit.edu.cn/simple"},
    {"name": "大连理工 (DUT)", "url": "https://pypi.dut.edu.cn/simple"},
    {"name": "东软信息学院 (Neusoft)", "url": "https://mirrors.neusoft.edu.cn/pypi/simple"},
    {"name": "兰州大学 (LZU)", "url": "https://pypi.lzu.edu.cn/simple"},
    {"name": "西安电子科大 (Xidian)", "url": "https://pypi.xidian.edu.cn/simple"},
    {"name": "南京大学 (NJU)", "url": "https://pypi.nju.edu.cn/simple"},
    {"name": "中国科学院 (CAS)", "url": "https://pypi.mirrors.casct.com/simple"},
    {"name": "浙江大学 (ZJU)", "url": "https://pypi.zju.edu.cn/simple"},
    {"name": "PyPI 德国 (TU Dresden)", "url": "https://pypi.tu-dresden.de/simple"},
]

# 内存存储测速历史
speed_test_cache = {}

def test_pip_source_speed(source, retry_count=3, timeout=3):
    """
    真实测速单个 pip 源
    通过 HTTP HEAD/GET 请求测量响应时间
    """
    try:
        url = source["url"]
        total_latency = 0
        success_count = 0
        
        # 预热请求
        try:
            requests.head(url, timeout=timeout, allow_redirects=True)
        except Exception:
            pass
        
        # 正式测速
        for _ in range(retry_count):
            try:
                start_time = time.time()
                response = requests.head(
                    url, 
                    timeout=timeout,
                    allow_redirects=True,
                    headers={'User-Agent': 'pip/23.0'}
                )
                elapsed = (time.time() - start_time) * 1000
                
                if response.status_code < 400:
                    total_latency += elapsed
                    success_count += 1
                    
            except requests.Timeout:
                logger.warning(f"源 {source['name']} 超时")
            except Exception as e:
                logger.warning(f"源 {source['name']} 测速失败: {str(e)}")
                
        if success_count > 0:
            avg_latency = round(total_latency / success_count)
            return {
                "name": source["name"],
                "url": source["url"],
                "latency": avg_latency,
                "status": "success"
            }
        else:
            return {
                "name": source["name"],
                "url": source["url"],
                "latency": -1,
                "status": "timeout"
            }
            
    except Exception as e:
        logger.error(f"测速异常 {source['name']}: {str(e)}")
        return {
            "name": source["name"],
            "url": source["url"],
            "latency": -1,
            "status": "error"
        }

@app.route('/api/speed-test', methods=['POST'])
def speed_test():
    """
    执行 pip 源测速接口
    模拟 cnpip list 功能
    """
    try:
        logger.info("开始执行测速任务")
        
        results = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_source = {
                executor.submit(test_pip_source_speed, source): source 
                for source in PIP_SOURCES
            }
            
            for future in as_completed(future_to_source):
                try:
                    result = future.result()
                    results.append(result)
                    logger.info(f"完成测速: {result['name']} - {result['latency']}ms")
                except Exception as e:
                    source = future_to_source[future]
                    logger.error(f"测速失败 {source['name']}: {str(e)}")
                    results.append({
                        "name": source["name"],
                        "url": source["url"],
                        "latency": -1,
                        "status": "error"
                    })
        
        # 按延迟排序
        valid_results = [r for r in results if r["latency"] > 0]
        invalid_results = [r for r in results if r["latency"] <= 0]
        sorted_results = sorted(valid_results, key=lambda x: x["latency"]) + invalid_results
        
        # 找出最快源
        fastest = sorted_results[0] if len(sorted_results) > 0 and sorted_results[0]["latency"] > 0 else None
        
        # 缓存结果
        cache_key = datetime.now().strftime("%Y%m%d%H")
        speed_test_cache[cache_key] = {
            "timestamp": datetime.now().isoformat(),
            "results": sorted_results,
            "fastest": fastest
        }
        
        logger.info(f"测速完成，最快源: {fastest['name'] if fastest else 'None'}")
        
        return jsonify({
            "success": True,
            "sources": sorted_results,
            "fastest": fastest,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"测速接口异常: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "测速失败，请稍后重试"
        }), 500

@app.route('/api/set-source', methods=['POST'])
def set_source():
    """
    生成指定源的安装命令
    模拟 cnpip set 功能
    """
    try:
        data = request.get_json() or {}
        source_name = data.get('source', '')
        
        if not source_name:
            return jsonify({
                "success": False,
                "error": "缺少 source 参数"
            }), 400
        
        # 查找对应源
        target_source = None
        for source in PIP_SOURCES:
            if source["name"] == source_name or source["url"] == source_name:
                target_source = source
                break
        
        if not target_source:
            return jsonify({
                "success": False,
                "error": f"未找到源: {source_name}"
            }), 404
        
        # 生成命令
        temp_install_cmd = f"pip install <package> -i {target_source['url']}"
        global_config_cmd = f"pip config set global.index-url {target_source['url']}"
        
        logger.info(f"生成命令: {target_source['name']}")
        
        return jsonify({
            "success": True,
            "source": target_source,
            "commands": {
                "temp": temp_install_cmd,
                "global": global_config_cmd
            }
        })
        
    except Exception as e:
        logger.error(f"设置源接口异常: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "命令生成失败"
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        "status": "ok",
        "service": "pip-speed-tester",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/')
@app.route('/<path:path>')
def serve_static(path="index.html"):
    """提供静态文件服务"""
    try:
        if os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return app.send_static_file('index.html')
    except Exception as e:
        logger.error(f"静态文件服务异常: {str(e)}")
        return jsonify({"error": "File not found"}), 404

if __name__ == '__main__':
    try:
        port = int(os.environ.get('PORT', 3000))
        logger.info(f"启动 Flask 服务于端口 {port}")
        app.run(host='0.0.0.0', port=port, debug=False)
    except Exception as e:
        logger.critical(f"服务启动失败: {str(e)}")