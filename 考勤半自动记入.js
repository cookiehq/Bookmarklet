javascript: (async () => {
  try {

    // ===== 上班时间：向上取整（00/15/30/45）=====
    upTime = csvTime => { let [h, m] = csvTime.split(':').map(Number); m = Math.ceil(m / 15) * 15; if (m == 60) h++, m = 0; return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) }

    // ===== 下班时间：向下取整（45/30/15/00）=====
    downTime = csvTime => { let [h, m] = csvTime.split(':').map(Number); m = Math.floor(m / 15) * 15; return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2) }

    // ===== 1. 读取剪贴板 =====
    var data = JSON.parse(await navigator.clipboard.readText() || '[]');

    // ===== 2. 获取页面日期 =====
    var txtDate = [...document.querySelectorAll('table.BaseDesign td')].find(td => /年.*月/.test(td.innerText))?.innerText.trim() || '';

    // ===== 3. 解析日期 =====
    var day = txtDate.match(/\d+/g).join('-');

    // ===== 4. 匹配数据 =====
    var rowDate = data.find(x => x[0] === day);
    if (!rowDate) return alert('没有找到: ' + day + '打卡记录！');

    // ===== 5. 时间处理 =====
    start = upTime(rowDate[1]), end = downTime(rowDate[2]), cBox = rowDate[3];

    // ===== 6. 填写表单 =====
    [['#db_SYUKKIN_JIKOKU1', start], ['#db_TAISYUTU_JIKOKU1', end], ['#db_RESTSTR_JIKOKU1', '12:00'], ['#db_RESTEND_JIKOKU1', '13:00']].forEach(([s, v]) => { let e = document.querySelector(s); e && (e.value = v, e.dispatchEvent(new Event('input', { bubbles: 1 })), e.dispatchEvent(new Event('change', { bubbles: 1 }))) });

    // ===== 7. checkbox 处理 =====
    if (cBox === '〇') {
      let el = document.querySelector('#initial_key_extejiyu11');
      el && !el.checked && el.click();
    }

    // ===== 8. 填写作业时间 =====
    (() => {
      let r = document.querySelector('input[type=radio]:checked')?.closest('tr');
      if (!r) return;

      let e = r.querySelectorAll('td')[1]?.querySelectorAll('input')[1];
      let w = r.querySelector('#db_WORK_TIME');

      e && (e.value = 'E818CE6-110', e.dispatchEvent(new Event('change', { bubbles: true })));

      setTimeout(() => {
        let v = document.querySelector('#disp_sou_roudou')?.innerText.trim();
        w && (w.value = v, w.dispatchEvent(new Event('change', { bubbles: true })), w.blur());
      }, 1500);
    })();

    // ===== 9. 检查空数据 =====
    if (!rowDate[1]) return alert(day + ': 上班时间为空！');
    if (!rowDate[2]) return alert(day + ': 下班时间为空！');

    // ===== 10. 登录处理 =====
    var wc = window.confirm;

    // 多层覆盖
    window.confirm = top.confirm = () => true;
    if (window.frames) {
      for (let i = 0; i < frames.length; i++) {
        try { frames[i].confirm = () => true } catch (e) { }
      }
    }

    // 执行登录
    setTimeout(() => {
      AsyncAutoCalc(true);
    }, 500);

    // 延迟恢复（防止异步调用）
    setTimeout(() => {
      window.confirm = top.confirm = wc;
    }, 1500);

  } catch (e) {
    alert('err: ' + e.message);
  }
})();