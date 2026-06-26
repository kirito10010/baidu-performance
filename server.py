#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
绩效数据接收服务器
运行方式: python server.py
监听地址: 172.16.0.168:8080
数据保存在脚本所在目录的 performance_data 文件夹中
"""

import http.server
import socketserver
import json
import os
import sys
from datetime import datetime

HOST = '172.16.0.168'
PORT = 8080

SCRIPT_DIR = os.path.dirname(os.path.abspath(sys.argv[0]))
DATA_DIR = os.path.join(SCRIPT_DIR, 'performance_data')

class PerformanceHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] {format % args}")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            data = json.loads(post_data)

            name = data.get('name', '未知用户')
            today = datetime.now().strftime('%Y-%m-%d')
            filename = f"{name}{today}.txt"

            os.makedirs(DATA_DIR, exist_ok=True)
            filepath = os.path.join(DATA_DIR, filename)

            content = f"========================================\n"
            content += f"绩效报告\n"
            content += f"========================================\n"
            content += f"生成时间: {datetime.now().strftime('%Y/%m/%d %H:%M:%S')}\n"
            content += f"========================================\n\n"

            content += f"【个人信息】\n"
            content += f"姓名: {data.get('name', '未知')}\n"
            content += f"工号: {data.get('worker_id', '未知')}\n"
            content += f"身份证号: {data.get('id_card', '未知')}\n"
            content += f"手机号: {data.get('mobile', '未知')}\n"
            content += f"邮箱: {data.get('email', '未知')}\n"
            content += f"百度HI: {data.get('baidu_hi', '未知')}\n"
            content += f"性别: {data.get('sex_text', '未知')}\n\n"

            content += f"【工作信息】\n"
            content += f"公司: {data.get('company_text', '未知')}\n"
            content += f"项目: {data.get('project_text', '未知')}\n"
            content += f"站点: {data.get('site_text', '未知')}\n"
            content += f"工作类型: {data.get('work_type_text', '未知')}\n"
            content += f"雇佣类型: {data.get('employment_type_text', '未知')}\n"
            content += f"是否驻场: {data.get('on_site_text', '未知')}\n"
            content += f"在职状态: {data.get('status_text', '未知')}\n"
            content += f"入职时间: {data.get('onboard_time', '未知')}\n"
            content += f"离职时间: {data.get('resign_time', '无')}\n\n"

            content += f"【考勤设置】\n"
            content += f"签到类型: {data.get('sign_types_text', '未知')}\n\n"

            content += f"【本月绩效】\n"
            content += f"统计范围: {data.get('month_date_range', '无数据')}\n"
            content += f"绩效分数: {data.get('month_performance', '0.000')}\n\n"

            content += f"【上月绩效】\n"
            content += f"统计范围: {data.get('last_month_date_range', '无数据')}\n"
            content += f"绩效分数: {data.get('last_month_performance', '0.000')}\n\n"

            content += f"【数据时间】\n"
            content += f"上报时间: {data.get('upload_time', datetime.now().strftime('%Y/%m/%d %H:%M:%S'))}\n"
            content += f"客户端IP: {self.client_address[0]}\n\n"

            content += f"========================================"

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)

            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'code': 0, 'msg': '数据接收成功'}).encode('utf-8'))

            print(f"✓ 数据已保存: {filepath}")

        except Exception as e:
            print(f"✗ 处理请求失败: {str(e)}")
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'code': -1, 'msg': str(e)}).encode('utf-8'))

if __name__ == '__main__':
    print(f"========================================")
    print(f"绩效数据收集服务已启动")
    print(f"========================================")
    print(f"本机地址: http://{HOST}:{PORT}")
    print(f"数据目录: {os.path.abspath(DATA_DIR)}")
    print(f"========================================")
    print(f"局域网内其他设备可通过以下地址访问:")
    print(f"http://{HOST}:{PORT}")
    print(f"========================================")
    print(f"按 Ctrl+C 停止服务\n")

    with socketserver.TCPServer((HOST, PORT), PerformanceHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n⏹ 服务器已停止")
            httpd.server_close()