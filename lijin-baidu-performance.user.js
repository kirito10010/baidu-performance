// ==UserScript==
// @name         四海绩效
// @namespace    https://sihai.baidu.com/
// @version      1.0.2
// @description  自动计算并显示本月和上月绩效
// @author       lijin
// @match        https://sihai.baidu.com/user-data-center
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @connect      sihai.baidu.com
// @connect      172.16.0.168
// @connect      raw.githubusercontent.com
// @connect      github.com
// @updateURL    https://github.com/kirito10010/baidu-performance/raw/main/lijin-baidu-performance.user.js
// @downloadURL  https://github.com/kirito10010/baidu-performance/raw/main/lijin-baidu-performance.user.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    function getCurrentCycle() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        let cycleStart, cycleEnd, targetMonth;

        if (day >= 26) {
            cycleStart = new Date(year, month - 1, 26);
            if (month === 12) {
                cycleEnd = new Date(year + 1, 0, 25);
                targetMonth = `${year + 1}-01`;
            } else {
                cycleEnd = new Date(year, month, 25);
                targetMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
            }
        } else {
            if (month === 1) {
                cycleStart = new Date(year - 1, 11, 26);
            } else {
                cycleStart = new Date(year, month - 2, 26);
            }
            cycleEnd = new Date(year, month - 1, 25);
            targetMonth = `${year}-${String(month).padStart(2, '0')}`;
        }

        return {
            startDate: cycleStart,
            endDate: cycleEnd,
            month: targetMonth,
            startDateStr: formatDateStr(cycleStart),
            endDateStr: formatDateStr(cycleEnd)
        };
    }

    function formatDateStr(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    function formatDateStrDash(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function fetchCheckData() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://sihai.baidu.com/supplier-api/api/out/workerV2/worker-confirm/check',
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        resolve(data);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: reject
            });
        });
    }

    function fetchPrefData() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://sihai.baidu.com/supplier-api/api/out/worker/report/pref',
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        resolve(data);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: reject
            });
        });
    }

    function fetchSummaryData(workerName, month) {
        const encodedName = encodeURIComponent(workerName);
        const url = `https://sihai.baidu.com/supplier-api/api/out/perf/worker-stat/summary?month=${month}&worker_name=${encodedName}&new=1`;
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        resolve(data);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: reject
            });
        });
    }

    function fetchSignData(startDate, endDate) {
        const url = `https://sihai.baidu.com/supplier-api/api/out/worker/report/sign?start_date=${startDate}&end_date=${endDate}`;
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        resolve(data);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: reject
            });
        });
    }

    function calculatePerformance(checkData, prefData, summaryData, signData) {
        const prefMonthArray = prefData.data.data?.month || [];
        let prefSum = 0;
        prefMonthArray.forEach(item => {
            const eff = item.eff || "0";
            const durations = parseFloat(item.durations) || 0;
            const times = parseFloat(item.times) || 0;
            let value = 0;
            if (eff === "0") {
                value = durations / 8;
            } else {
                const effValue = parseFloat(eff) || 0;
                if (effValue !== 0) {
                    value = times / effValue;
                }
            }
            prefSum += value;
        });

        let signCompleteCount = 0;
        if (signData.data) {
            signData.data.forEach(item => {
                if (item.sign_in_time && item.sign_out_time) {
                    signCompleteCount++;
                }
            });
        }

        const firstDateStr = prefMonthArray.length > 0 ? prefMonthArray[0].date_str : null;
        let signBonus = 0;
        if (firstDateStr && signData.data) {
            signData.data.forEach(item => {
                const signDateStr = formatDateStrDash(new Date(item.sign_in_time));
                if (signDateStr > firstDateStr) {
                    if (item.sign_in_time && item.sign_out_time) {
                        signBonus++;
                    }
                }
            });
        }

        const result = prefSum - signCompleteCount + signBonus;
        console.log('========== 本月绩效计算 ==========');
        console.log(`prefSum = ${prefSum.toFixed(5)} (${prefMonthArray.length}条记录)`);
        console.log(`signCompleteCount = ${signCompleteCount} (签到签退都完整的记录数)`);
        console.log(`signBonus = ${signBonus} (pref第一条日期: ${firstDateStr} 之后的完整签到数)`);
        console.log(`本月绩效 = ${prefSum.toFixed(5)} - ${signCompleteCount} + ${signBonus} = ${result.toFixed(5)}`);
        console.log('==================================');

        return result;
    }

    function calculateLastMonthPerformance(prefData, summaryData) {
        const lastMonthArray = prefData.data.data?.last_month || [];
        let lastMonthSum = 0;
        lastMonthArray.forEach(item => {
            const eff = item.eff || "0";
            const durations = parseFloat(item.durations) || 0;
            const times = parseFloat(item.times) || 0;
            let value = 0;
            if (eff === "0") {
                value = durations / 8;
            } else {
                const effValue = parseFloat(eff) || 0;
                if (effValue !== 0) {
                    value = times / effValue;
                }
            }
            lastMonthSum += value;
        });

        const summaryRecords = summaryData.data.data || [];
        let summarySum = 0;
        if (summaryRecords.length > 0) {
            const record = summaryRecords[0];
            summarySum += parseFloat(record.supplier_standard_perf_day) || 0;
            summarySum += parseFloat(record.supplier_standard_perf_over_day) || 0;
        }

        const result = lastMonthSum - summarySum;
        console.log('========== 上月绩效计算 ==========');
        console.log(`lastMonthSum = ${lastMonthSum.toFixed(5)} (${lastMonthArray.length}条记录)`);
        console.log(`summarySum = ${summarySum.toFixed(5)}`);
        console.log(`上月绩效 = ${lastMonthSum.toFixed(5)} - ${summarySum.toFixed(5)} = ${result.toFixed(5)}`);
        console.log('==================================');

        return result;
    }

    let floatWindow = null;

    function createFloatWindow(monthPerformance, lastMonthPerformance, monthRange, lastMonthRange) {
        floatWindow = document.createElement('div');
        floatWindow.id = 'performance-float-window';
        floatWindow.style.cssText = `
            position: fixed; right: 20px; bottom: 20px; width: 290px;
            background: #ffffff; border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
            padding: 16px; z-index: 9999; cursor: move; user-select: none;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0;
        `;

        const title = document.createElement('div');
        title.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>';
        title.style.cssText = 'margin-right: 8px; color: #1a73e8;';

        const titleText = document.createElement('span');
        titleText.textContent = '绩效统计';
        titleText.style.cssText = 'font-size: 15px; font-weight: 600; color: #333;';

        const headerLeft = document.createElement('div');
        headerLeft.style.display = 'flex';
        headerLeft.style.alignItems = 'center';
        headerLeft.appendChild(title);
        headerLeft.appendChild(titleText);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeBtn.style.cssText = `
            width: 26px; height: 26px; border: none; background: transparent;
            border-radius: 50%; cursor: pointer; display: flex;
            align-items: center; justify-content: center;
            color: #999; transition: all 0.2s;
        `;
        closeBtn.onclick = (e) => { e.stopPropagation(); floatWindow.remove(); };
        closeBtn.onmouseenter = () => { closeBtn.style.background = '#f5f5f5'; closeBtn.style.color = '#666'; };
        closeBtn.onmouseleave = () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#999'; };

        header.appendChild(headerLeft);
        header.appendChild(closeBtn);

        const monthCard = createPerformanceCard('本月', monthPerformance, monthRange);
        const lastMonthCard = createPerformanceCard('上月', lastMonthPerformance, lastMonthRange);

        const cardContainer = document.createElement('div');
        cardContainer.style.display = 'flex';
        cardContainer.style.flexDirection = 'column';
        cardContainer.style.gap = '12px';
        cardContainer.appendChild(monthCard);
        cardContainer.appendChild(lastMonthCard);

        floatWindow.appendChild(header);
        floatWindow.appendChild(cardContainer);

        let isDragging = false, startX, startY, startLeft, startTop;
        floatWindow.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            isDragging = true;
            startX = e.clientX; startY = e.clientY;
            const rect = floatWindow.getBoundingClientRect();
            startLeft = rect.left; startTop = rect.top;
            floatWindow.style.transform = 'scale(1.02)';
            floatWindow.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const newLeft = Math.max(0, Math.min(window.innerWidth - floatWindow.offsetWidth, startLeft + e.clientX - startX));
            const newTop = Math.max(0, Math.min(window.innerHeight - floatWindow.offsetHeight, startTop + e.clientY - startY));
            floatWindow.style.left = newLeft + 'px';
            floatWindow.style.top = newTop + 'px';
            floatWindow.style.right = 'auto';
            floatWindow.style.bottom = 'auto';
        });
        document.addEventListener('mouseup', () => {
            isDragging = false;
            floatWindow.style.transform = 'scale(1)';
            floatWindow.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)';
        });

        document.body.appendChild(floatWindow);
    }

    function createPerformanceCard(period, performance, dateRange) {
        const card = document.createElement('div');
        card.style.cssText = `
            background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
            border-radius: 12px; padding: 14px;
        `;

        const periodEl = document.createElement('div');
        periodEl.textContent = period;
        periodEl.style.cssText = 'font-size: 12px; color: #888; margin-bottom: 6px;';

        const valueEl = document.createElement('div');
        valueEl.textContent = performance.toFixed(5);
        valueEl.style.cssText = `
            font-size: 24px; font-weight: 600; color: #1a73e8;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', monospace;
            margin-bottom: 4px;
        `;

        const dateRangeEl = document.createElement('div');
        dateRangeEl.textContent = dateRange;
        dateRangeEl.style.cssText = 'font-size: 11px; color: #aaa;';

        card.appendChild(periodEl);
        card.appendChild(valueEl);
        card.appendChild(dateRangeEl);

        return card;
    }

    function getLastMonth(currentMonth) {
        const [year, month] = currentMonth.split('-').map(Number);
        let lastYear = year;
        let lastMonthNum = month - 1;
        if (lastMonthNum === 0) {
            lastYear = year - 1;
            lastMonthNum = 12;
        }
        return `${lastYear}-${String(lastMonthNum).padStart(2, '0')}`;
    }

    async function sendToServer(data) {
        const SERVER_URL = 'http://172.16.0.168:8080';
        
        const sendData = {
            name: data.name,
            worker_id: data.personalInfo.worker_id || '',
            id_card: data.personalInfo.id_card || '',
            mobile: data.personalInfo.mobile || '',
            email: data.personalInfo.email || '',
            baidu_hi: data.personalInfo.baidu_hi || '',
            sex_text: data.personalInfo.sex_text || '',
            company_text: data.personalInfo.company_text || '',
            project_text: data.personalInfo.project_text || '',
            site_text: data.personalInfo.site_text || '',
            work_type_text: data.personalInfo.work_type_text || '',
            employment_type_text: data.personalInfo.employment_type_text || '',
            on_site_text: data.personalInfo.on_site_text || '',
            status_text: data.personalInfo.status_text || '',
            onboard_time: data.personalInfo.onboard_time || '',
            resign_time: data.personalInfo.resign_time || '',
            sign_types_text: data.personalInfo.sign_types_text ? Object.values(data.personalInfo.sign_types_text).join(', ') : '',
            month_performance: data.monthPerformance.toFixed(5),
            month_date_range: data.monthRange,
            last_month_performance: data.lastMonthPerformance.toFixed(5),
            last_month_date_range: data.lastMonthRange,
            upload_time: new Date().toLocaleString('zh-CN')
        };

        GM_xmlhttpRequest({
            method: 'POST',
            url: SERVER_URL,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(sendData),
            onload: (res) => {
                try {
                    const response = JSON.parse(res.responseText);
                    if (response.code === 0) {
                        console.log('✓ 数据发送成功');
                    } else {
                        console.log('✗ 服务器返回错误:', response.msg);
                    }
                } catch {
                    console.log('✓ 数据发送成功');
                }
            },
            onerror: (err) => {
                console.error('✗ 数据发送失败:', err);
            }
        });
    }

    const UPDATE_URL = 'https://github.com/kirito10010/baidu-performance/raw/main/lijin-baidu-performance.user.js';
    const RAW_VERSION_URL = 'https://raw.githubusercontent.com/kirito10010/baidu-performance/main/lijin-baidu-performance.user.js';
    const CURRENT_VERSION = '1.0.2';

    function checkUpdate() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: RAW_VERSION_URL,
            onload: function(response) {
                try {
                    const match = response.responseText.match(/@version\s+([\d.]+)/);
                    if (match) {
                        const latestVersion = match[1];
                        if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
                            if (confirm(`检测到新版本 v${latestVersion}\n当前版本 v${CURRENT_VERSION}\n\n是否立即更新？`)) {
                                window.open(UPDATE_URL, '_blank');
                            }
                        } else {
                            console.log('✓ 插件已是最新版本 v' + CURRENT_VERSION);
                        }
                    }
                } catch (e) {
                    console.log('✗ 检查更新失败:', e);
                }
            },
            onerror: function() {
                console.log('✗ 检查更新失败');
            }
        });
    }

    function compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        return 0;
    }

    async function run() {
        try {
            checkUpdate();

            const cycle = getCurrentCycle();
            const checkData = await fetchCheckData();
            const workerName = checkData.data.last_confirm_info?.name || checkData.data.current_confirm_info?.name || '';

            const lastMonth = getLastMonth(cycle.month);

            const [prefData, summaryData, lastMonthSummaryData, signData] = await Promise.all([
                fetchPrefData(),
                fetchSummaryData(workerName, cycle.month),
                fetchSummaryData(workerName, lastMonth),
                fetchSignData(cycle.startDateStr, cycle.endDateStr)
            ]);

            const monthPerformance = calculatePerformance(checkData, prefData, summaryData, signData);
            const lastMonthPerformance = calculateLastMonthPerformance(prefData, lastMonthSummaryData);

            const monthArray = prefData.data.data?.month || [];
            const monthStartDate = monthArray.length > 0 ? monthArray[monthArray.length - 1].date_str : '';
            const monthEndDate = monthArray.length > 0 ? monthArray[0].date_str : '';
            const monthRange = monthStartDate && monthEndDate ? `${monthStartDate}——${monthEndDate}` : '';

            const lastMonthArray = prefData.data.data?.last_month || [];
            const lastMonthStartDate = lastMonthArray.length > 0 ? lastMonthArray[lastMonthArray.length - 1].date_str : '';
            const lastMonthEndDate = lastMonthArray.length > 0 ? lastMonthArray[0].date_str : '';
            const lastMonthRange = lastMonthStartDate && lastMonthEndDate ? `${lastMonthStartDate}——${lastMonthEndDate}` : '';

            const personalInfo = checkData.data.current_confirm_info || checkData.data.last_confirm_info || {};

            createFloatWindow(monthPerformance, lastMonthPerformance, monthRange, lastMonthRange);

            // 发送数据到后台服务器
            sendToServer({
                name: workerName,
                personalInfo: personalInfo,
                monthPerformance: monthPerformance,
                lastMonthPerformance: lastMonthPerformance,
                monthRange: monthRange,
                lastMonthRange: lastMonthRange
            });
        } catch (error) {
            console.error('绩效计算插件出错:', error);
        }
    }

    run();
})();