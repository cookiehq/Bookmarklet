javascript: (async () => {
    try {

        // ===== 本地存储 key =====
        var key = 'kq_auto_full';

        // 从 localStorage 读取状态（如果没有就用空对象）
        var state = JSON.parse(localStorage.getItem(key) || '{}');

        // 从剪贴板读取数据（之前复制的 JSON）
        var data = JSON.parse(await navigator.clipboard.readText() || '[]');

        // 有问题的打卡数据
        var errorsData = [];

        // ===== 上班时间：向上取整（00/15/30/45）=====
        upTime = csvTime => { let [h, m] = csvTime.split(':').map(Number); m = Math.ceil(m / 15) * 15; if (m == 60) h++, m = 0; return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) }

        // ===== 下班时间：向下取整（45/30/15/00）=====
        downTime = csvTime => { let [h, m] = csvTime.split(':').map(Number); m = Math.floor(m / 15) * 15; return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) }

        // ===== 初始化（只在第一次执行时触发）=====
        if (!state.days) {

            // 提取“日期（天）”
            // 假设格式：2026-04-01 → 取 "01" → 转成 1 → 再转字符串 "1"
            let days = data.map(r =>
                String(parseInt(r[0].split('-')[2], 10))
            );

            // 初始化状态
            state = {
                days,  // 所有要处理的日期
                i: 0    // 当前处理到第几个
            };

            // 存入 localStorage（持久化）
            localStorage.setItem(key, JSON.stringify(state));

            console.log('初始化完成');
        }


        // 重新读取（确保最新）
        state = JSON.parse(localStorage.getItem(key) || '{}');

        // 重新当前url
        const current = location.href;

        reload();

        function reload() {

            //创建一个 <iframe> 
            let myIframe = document.createElement('iframe');
            myIframe.style.display = 'none';
            myIframe.src = current;

            //把 iframe 加到页面里（body 最后）
            document.body.appendChild(myIframe);

            myIframe.onload = () => {
                try {

                    // iframe 内的 window
                    let win = myIframe.contentWindow;

                    // 当前 iframe 的 URL
                    let url = win.location.href;
                    let isEdit = url.includes('_kinmuinput');
                    let isList = !isEdit;

                    // ===== 结束条件 =====
                    if (state.i >= (state.days || []).length) {

                        if (errorsData.length === 0) {
                            alert('考勤记入完成！');
                        } else {
                            alert('考勤记入完成！' + '\n' + '以下日期请亲自确认！' + '\n' + errorsData.join('\n'));
                        }

                        // 清理状态
                        localStorage.removeItem(key);

                        return;
                    }

                    // ===== 列表页逻辑 =====
                    if (isList) {

                        // 当前要处理的“天”
                        let day = state.days[state.i];

                        // 找到对应日期的编辑链接
                        let link = win.document.querySelector(`a[href*="DataEdit('${day}')"]`);
                        console.log('列表页 -> link', link);

                        // 点击进入编辑页
                        if (link) link.click();
                    }

                    // 检测 URL 是否进入编辑页
                    if (isEdit) {

                        console.log('已进入编辑页！');

                        // 索引 +1（提前加，避免中途刷新丢进度）
                        state.i++;
                        localStorage.setItem(key, JSON.stringify(state));

                        // ===== 1. 判断是否填写过 =====
                        let oldStart = win.document.querySelector('#db_SYUKKIN_JIKOKU1')?.value;
                        let oldEnd = win.document.querySelector('#db_TAISYUTU_JIKOKU1')?.value;
                        // 跳过该日期
                        if (oldStart || oldEnd) {

                            console.log('该日期考勤已提交！');
                            win.CancelBack();
                            return;
                        }

                        // ===== 2. 获取页面日期 =====
                        var txtDate = [...win.document.querySelectorAll('table.BaseDesign td')].find(td => /年.*月/.test(td.innerText))?.innerText.trim() || '';
                        console.log(txtDate + '：开始填写考勤！');

                        // ===== 3. 解析日期 =====
                        var day = txtDate.match(/\d+/g).join('-');

                        // ===== 4. 匹配数据 =====
                        var rowDate = data.find(x => x[0] === day);
                        if (!rowDate) return alert('没有找到: ' + day + '打卡记录！');
                        if (!rowDate[1] || !rowDate[2]) {
                            console.log(txtDate + '：打卡时间不正常！');
                            errorsData.push(txtDate);
                        }

                        // ===== 5. 时间处理 =====
                        start = upTime(rowDate[1]), end = downTime(rowDate[2]), cBox = rowDate[3];

                        // ===== 6. 填写表单 =====
                        [['#db_SYUKKIN_JIKOKU1', start], ['#db_TAISYUTU_JIKOKU1', end], ['#db_RESTSTR_JIKOKU1', '12:00'], ['#db_RESTEND_JIKOKU1', '13:00']].forEach(([s, v]) => { let e = win.document.querySelector(s); e && (e.value = v, e.dispatchEvent(new Event('input', { bubbles: 1 })), e.dispatchEvent(new Event('change', { bubbles: 1 }))) });

                        // ===== 7. checkbox 处理 =====
                        if (cBox === '〇') {
                            let el = win.document.querySelector('#initial_key_extejiyu11');
                            el && !el.checked && el.click();
                        }

                        // ===== 8. 填写作业时间 =====
                        (() => {
                            let r = win.document.querySelector('input[type=radio]:checked')?.closest('tr');
                            if (!r) return;

                            let e = r.querySelectorAll('td')[1]?.querySelectorAll('input')[1];
                            let w = r.querySelector('#db_WORK_TIME');

                            e && (e.value = 'E818CE6-110', e.dispatchEvent(new Event('change', { bubbles: true })));

                            setTimeout(() => {
                                let v = win.document.querySelector('#disp_sou_roudou')?.innerText.trim();
                                w && (w.value = v, w.dispatchEvent(new Event('change', { bubbles: true })), w.blur());
                            }, 300);
                        })();

                        var winConfirm = win.confirm;
                        var topConfirm = top.confirm;

                        // 多层覆盖
                        win.confirm = top.confirm = () => true;
                        if (win.frames) {
                            for (let i = 0; i < win.frames.length; i++) {
                                try { win.frames[i].confirm = () => true } catch (e) { }
                            }
                        }

                        // 执行
                        setTimeout(() => {

                            // 调用系统函数
                            win.AsyncAutoCalc(true);

                        }, 500);

                        // 延迟恢复（防止异步调用）
                        setTimeout(() => {
                            win.confirm = winConfirm;
                            top.confirm = topConfirm;

                        }, 1500);
                    }
                } catch (e) {
                    console.log("加载失败！", e);
                } finally {
                    setTimeout(() => myIframe.remove(), 5 * 60 * 1000);
                }
            };
        }
    } catch (e) {
        alert('err:' + e);
    }
})();