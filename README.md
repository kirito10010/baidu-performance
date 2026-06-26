# 百度绩效计算插件

篡改猴插件，自动计算并显示本月和上月绩效。

## 功能

- 自动获取个人信息、绩效数据、签到数据、结算数据
- 计算本月和上月绩效
- 浮窗显示绩效结果，可拖动
- 支持发送数据到局域网服务器
- 自动检测更新

## 绩效计算公式

对于每个绩效记录：
- 如果 `eff === "0"`：`durations / 8`
- 如果 `eff !== "0"`：`times / eff`

最终绩效 = 所有记录计算值总和 - supplier_standard_perf_day - supplier_standard_perf_over_day + 签到修正值

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器插件
2. 点击 [lijin-baidu-performance.user.js](https://github.com/kirito10010/baidu-performance/raw/main/lijin-baidu-performance.user.js) 安装

## 本地服务器

双击 `启动服务器.vbs` 后台启动服务器，监听 `172.16.0.168:8080`。

数据保存在 `performance_data/` 目录。

## 更新日志

### v1.3.3
- 测试版本更新提示功能

### v1.3.2
- 每次访问都检测版本更新

### v1.3.1
- 浮窗显示改为保留3位小数

### v1.3
- 添加自动更新检测功能
- 文件名改为 lijin-baidu-performance.user.js

### v1.2
- 修改绩效计算公式：eff=0时 durations/8，eff≠0时 times/eff
- 显示保留5位小数

### v1.1
- 添加上月绩效显示
- 添加统计日期范围显示

### v1.0
- 初始版本
- 本月绩效计算
- 浮窗显示
- 局域网数据发送
