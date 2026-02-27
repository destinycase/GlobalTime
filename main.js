let isRealtime = true;
let globalTimes = [new Date(), new Date()]; // base + optional extra slot
let slotCount = 1;
let uiScale = 1.0;
const VERSION = "1.5.0";

// --- 타임존 마스터 데이터 ---
const TZ_DATABASE = [
    { zone: "Asia/Seoul", name: "대한민국", city: "서울" },
    { zone: "Asia/Tokyo", name: "일본", city: "도쿄" },
    { zone: "Asia/Shanghai", name: "중국", city: "상하이" },
    { zone: "Asia/Hong_Kong", name: "홍콩", city: "홍콩" },
    { zone: "Asia/Singapore", name: "싱가포르", city: "싱가포르" },
    { zone: "Asia/Taipei", name: "대만", city: "타이베이" },
    { zone: "Asia/Bangkok", name: "태국", city: "방콕" },
    { zone: "Asia/Ho_Chi_Minh", name: "베트남", city: "호치민" },
    { zone: "Asia/Jakarta", name: "인도네시아", city: "자카르타" },
    { zone: "Asia/Dubai", name: "UAE", city: "두바이" },
    { zone: "Asia/Kolkata", name: "인도", city: "뉴델리" },
    { zone: "Europe/London", name: "영국", city: "런던" },
    { zone: "Europe/Paris", name: "프랑스", city: "파리" },
    { zone: "Europe/Berlin", name: "독일", city: "베를린" },
    { zone: "Europe/Moscow", name: "러시아", city: "모스크바" },
    { zone: "Europe/Istanbul", name: "터키", city: "이스탄불" },
    { zone: "America/New_York", name: "미국", city: "뉴욕" },
    { zone: "America/Chicago", name: "미국", city: "시카고" },
    { zone: "America/Los_Angeles", name: "미국", city: "LA" },
    { zone: "America/Mexico_City", name: "멕시코", city: "멕시코시티" },
    { zone: "America/Sao_Paulo", name: "브라질", city: "상파울루" },
    { zone: "Australia/Sydney", name: "호주", city: "시드니" },
    { zone: "Australia/Perth", name: "호주", city: "퍼스" },
    { zone: "Pacific/Auckland", name: "뉴질랜드", city: "오클랜드" }
];

// --- Group Data Structure ---
let groups = [];
let activeGroupId = 0;

document.addEventListener('DOMContentLoaded', () => {
    document.title = `세계 시간 v${VERSION}`;
    const versionBadge = document.getElementById('version-badge');
    if (versionBadge) versionBadge.textContent = `ver ${VERSION}`;
    loadPersistence();
    initUI();
    initDragAndDrop();
    initSearchAndSelect();
    initCalculators();

    setInterval(() => {
        if (isRealtime) {
            const now = new Date();
            globalTimes[0] = now;
            updateClocks();
        }
    }, 1000);

    renderGroups();
    renderList();
    updateClocks();
});

function initUI() {
    // Main Tabs
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchMainTab(btn.dataset.tab));
    });

    // Scale Spinner
    const setScale = (s) => {
        uiScale = Math.min(1.5, Math.max(0.7, s));
        document.documentElement.style.setProperty('--ui-scale', uiScale);
        document.getElementById('scale-val').textContent = `${Math.round(uiScale * 100)}%`;
        localStorage.setItem('GTV_Scale', uiScale);
    };
    document.getElementById('scale-up').onclick = () => setScale(uiScale + 0.1);
    document.getElementById('scale-down').onclick = () => setScale(uiScale - 0.1);
    if (localStorage.getItem('GTV_Scale')) setScale(parseFloat(localStorage.getItem('GTV_Scale')));

    // Extra Time Toggle (fixed mode only)
    const extraTimeToggle = document.getElementById('toggle-extra-time');
    extraTimeToggle.checked = slotCount > 1;
    extraTimeToggle.onchange = (e) => {
        slotCount = e.target.checked ? 2 : 1;
        renderList();
        updateClocks();
        savePersistence();
    };

    // Custom Zone
    document.getElementById('add-custom-btn').onclick = () => {
        const name = document.getElementById('custom-name').value.trim();
        const offH = parseInt(document.getElementById('custom-off-h').value) || 0;
        const offM = parseInt(document.getElementById('custom-off-m').value) || 0;
        if (!name) return alert("이름을 입력하세요.");
        addTimezone({ id: "tz-c-" + Date.now(), name, offH, offM, type: 'custom' });
        document.getElementById('custom-name').value = '';
    };

    document.getElementById('add-group-btn').onclick = () => {
        const name = prompt("새 그룹의 이름을 입력하세요:", "새 그룹");
        if (name) {
            groups.push({ name, zones: [] });
            activeGroupId = groups.length - 1;
            savePersistence();
            renderGroups();
            renderList();
        }
    };

    document.getElementById('copy-all-btn').onclick = copyAllTimezones;
    document.getElementById('toggle-dst').onchange = updateClocks;
}

function switchMainTab(tab) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    const isCalc = tab === 'calc';
    document.getElementById('timezone-section').classList.toggle('active', !isCalc);
    document.getElementById('calc-section').classList.toggle('active', isCalc);
    document.getElementById('group-tabs-container').style.display = isCalc ? 'none' : 'flex';
    document.getElementById('top-control-bar').style.display = isCalc ? 'none' : 'flex';

    isRealtime = (tab === 'live');
    const extraTimeToggle = document.getElementById('toggle-extra-time');
    if (isRealtime) {
        slotCount = 1;
        extraTimeToggle.checked = false;
        extraTimeToggle.disabled = true;
    } else {
        extraTimeToggle.disabled = false;
        slotCount = extraTimeToggle.checked ? 2 : 1;
    }

    document.getElementById('status-text').textContent = isRealtime ? "동기화 중" : "시간 고정 모드";
    renderList();
    updateClocks();
}

// --- Group Management ---
function renderGroups() {
    const container = document.getElementById('group-tabs-container');
    const addBtn = document.getElementById('add-group-btn');
    container.innerHTML = '';

    groups.forEach((group, idx) => {
        const btn = document.createElement('button');
        btn.className = `group-tab ${idx === activeGroupId ? 'active' : ''}`;
        const label = document.createElement('span');
        label.textContent = group.name;
        btn.appendChild(label);
        btn.onclick = () => { activeGroupId = idx; renderGroups(); renderList(); updateClocks(); };
        btn.ondblclick = () => { const n = prompt("이름 수정:", group.name); if (n) { group.name = n; savePersistence(); renderGroups(); } };
        btn.oncontextmenu = (e) => { e.preventDefault(); if (groups.length > 1 && confirm('삭제하시겠습니까?')) { groups.splice(idx, 1); activeGroupId = 0; savePersistence(); renderGroups(); renderList(); } };
        container.appendChild(btn);
    });
    container.appendChild(addBtn);
}

// --- List Rendering (Dynamic Slots) ---
const DAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];

function renderList() {
    // 1. Update Head
    const theadRow = document.querySelector('#table-head tr');
    theadRow.innerHTML = `
        <th style="width: 30px;"></th>
        <th style="width: 180px;">지역 / 국가</th>
        <th style="width: 110px;">UTC Offset</th>
    `;
    for (let i = 0; i < slotCount; i++) {
        theadRow.innerHTML += `<th class="dynamic-col" style="width: 55px;">요일</th><th class="dynamic-col">${i === 0 ? '시간' : '추가 시간'}</th>`;
    }
    theadRow.innerHTML += `<th style="width: 70px;">액션</th><th style="width: 54px;">삭제</th>`;

    // 2. Render Body
    const container = document.getElementById('clocks-container');
    container.innerHTML = '';

    // Render UTC Row
    const utcTr = document.createElement('tr');
    utcTr.className = 'time-row static';
    utcTr.id = 'tz-row-utc';
    let utcInner = `
        <td></td>
        <td><div class="zone-info"><span class="zone-code">[UTC]</span><span class="zone-name">표준시 (기준)</span></div></td>
        <td><span class="offset-text">UTC+0</span></td>
    `;
    for (let i = 0; i < slotCount; i++) {
        utcInner += `
            <td class="dynamic-cell"><span class="day-badge" id="utc-day-${i}">-</span></td>
            <td class="dynamic-cell"><input type="text" class="time-input" id="utc-time-input-${i}" spellcheck="false" data-slot="${i}"></td>
        `;
    }
    utcInner += `<td><button class="sm-btn" onclick="copyRow('utc')">복사</button></td><td><span class="cell-dash">-</span></td>`;
    utcTr.innerHTML = utcInner;
    container.appendChild(utcTr);

    // Attach UTC listeners
    for (let i = 0; i < slotCount; i++) {
        const inp = utcTr.querySelector(`#utc-time-input-${i}`);
        inp.onchange = (e) => handleTimeChange(e.target.value, 'UTC', i);
        inp.onkeydown = (e) => { if (e.key === 'Enter') { handleTimeChange(e.target.value, 'UTC', i); inp.blur(); } };
        if (isRealtime) inp.readOnly = true;
    }

    // Render Dynamic Rows
    const currentZones = groups[activeGroupId].zones;
    currentZones.forEach(tz => {
        const tr = document.createElement('tr');
        tr.className = 'time-row';
        tr.id = `tz-row-${tz.id}`;
        tr.draggable = true;
        let inner = `
            <td class="drag-handle">☰</td>
            <td><div class="zone-info"><span class="zone-code"></span><span class="zone-name">${tz.name}</span></div></td>
            <td><span class="offset-text"></span></td>
        `;
        for (let i = 0; i < slotCount; i++) {
            inner += `
                <td class="dynamic-cell"><span class="day-badge day-slot-${i}"></span></td>
                <td class="dynamic-cell"><input type="text" class="time-input slot-${i}" spellcheck="false" ${isRealtime ? 'readonly' : ''} data-slot="${i}"></td>
            `;
        }
        inner += `
            <td><button class="sm-btn" onclick="copyRow('${tz.id}')">복사</button></td>
            <td><button class="sm-btn danger" onclick="removeTimezone('${tz.id}')">✕</button></td>
        `;
        tr.innerHTML = inner;

        // Slot Input Listeners
        tr.querySelectorAll('.time-input').forEach(inp => {
            inp.onchange = (e) => handleTimeChange(e.target.value, tz.zone || 'CUSTOM', parseInt(inp.dataset.slot));
            inp.onkeydown = (e) => { if (e.key === 'Enter') { handleTimeChange(e.target.value, tz.zone || 'CUSTOM', parseInt(inp.dataset.slot)); inp.blur(); } };
        });

        tr.addEventListener('dragstart', () => tr.classList.add('dragging'));
        tr.addEventListener('dragend', () => { tr.classList.remove('dragging'); saveOrder(); });
        container.appendChild(tr);
    });
    // 즉시 업데이트 트리거 추가
    updateClocks();
}

// --- Exact Abbr Mapping ---
const ZONE_MAP = {
    "Asia/Seoul": "KST", "Asia/Tokyo": "JST", "Asia/Shanghai": "CST", "Europe/Paris": ["CET", "CEST"],
    "Europe/London": ["GMT", "BST"], "Europe/Moscow": "MSK", "America/New_York": ["EST", "EDT"],
    "America/Los_Angeles": ["PST", "PDT"], "UTC": "UTC"
};

function getBetterAbbr(zone, date) {
    if (zone === 'UTC') return 'UTC';
    const mapping = ZONE_MAP[zone];
    if (!mapping) {
        return new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' })
            .formatToParts(date).find(p => p.type === 'timeZoneName')?.value || "";
    }
    if (typeof mapping === 'string') return mapping;
    // For zones with DST (Paris, London, NY etc.)
    const isDST = isTimeZoneInDST(zone, date);
    return isDST ? mapping[1] : mapping[0];
}

function isTimeZoneInDST(zone, date) {
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    const stdOffset = Math.max(getTimezoneOffset(zone, jan), getTimezoneOffset(zone, jul));
    return getTimezoneOffset(zone, date) < stdOffset;
}

function getTimezoneOffset(zone, date) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' }).formatToParts(date);
    const offStr = parts.find(p => p.type === 'timeZoneName')?.value || "GMT+0";
    const m = offStr.match(/[+-](\d{1,2}):?(\d{2})?/);
    if (!m) return 0;
    const sign = offStr.includes('+') ? 1 : -1;
    return sign * (parseInt(m[1]) * 60 + parseInt(m[2] || 0));
}

function pad(v) {
    return String(v).padStart(2, '0');
}

// --- Clock Logic ---
function updateClocks() {
    // Update UTC Row
    updateRow('utc', { zone: 'UTC', name: '표준시' });
    // Update Dynamic Rows
    const currentZones = groups[activeGroupId].zones;
    currentZones.forEach(tz => updateRow(tz.id, tz));
}

function updateRow(id, tz) {
    const row = document.getElementById(`tz-row-${id}`);
    if (!row) return;

    // Offset is same for all slots (current date)
    let offsetStr = "";
    let zoneCodeMain = "";

    if (tz.type === 'custom') {
        zoneCodeMain = "커스텀";
        offsetStr = `UTC${tz.offH >= 0 ? '+' : ''}${tz.offH}${tz.offM ? ':' + pad(tz.offM) : ''}`;
    } else {
        const offF = new Intl.DateTimeFormat('en-US', { timeZone: tz.zone, timeZoneName: 'longOffset' });
        offsetStr = offF.formatToParts(globalTimes[0]).find(p => p.type === 'timeZoneName')?.value.replace('GMT', 'UTC') || 'UTC+0';
        zoneCodeMain = getBetterAbbr(tz.zone, globalTimes[0]);
    }

    const zoneCodeEl = row.querySelector('.zone-code');
    const offsetTextEl = row.querySelector('.offset-text');
    if (zoneCodeEl) zoneCodeEl.textContent = `[${zoneCodeMain}]`;
    if (offsetTextEl) offsetTextEl.textContent = offsetStr;

    // Update each slot
    for (let i = 0; i < slotCount; i++) {
        let t;
        if (tz.type === 'custom') {
            t = new Date(globalTimes[i].getTime() + (tz.offH * 3600000) + (tz.offM * 60000));
        } else {
            const f = new Intl.DateTimeFormat('en-US', {
                timeZone: tz.zone, year: 'numeric', month: 'numeric', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric', weekday: 'short', hour12: false
            });
            const parts = f.formatToParts(globalTimes[i]);
            const get = t => parts.find(p => p.type === t)?.value || '';
            const h = parseInt(get('hour'));
            t = {
                str: `${get('year')}-${pad(get('month'))}-${pad(get('day'))} ${pad(h === 24 ? 0 : h)}:${pad(get('minute'))}:${pad(get('second'))}`,
                dow: { "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6 }[get('weekday')]
            };
        }

        const input = row.querySelector(`.slot-${i}`) || row.querySelector(`#utc-time-input-${i}`);
        const dayBadge = row.querySelector(`.day-slot-${i}`) || row.querySelector(`#utc-day-${i}`);

        if (tz.type === 'custom') {
            const curT = t;
            const timeStr = `${curT.getUTCFullYear()}-${pad(curT.getUTCMonth() + 1)}-${pad(curT.getUTCDate())} ${pad(curT.getUTCHours())}:${pad(curT.getUTCMinutes())}:${pad(curT.getUTCSeconds())}`;
            if (input && document.activeElement !== input) input.value = timeStr;
            const dIdx = curT.getUTCDay();
            if (dayBadge) {
                dayBadge.textContent = DAYS_KR[dIdx];
                dayBadge.className = 'day-badge ' + (dIdx === 0 ? 'day-sun' : (dIdx === 6 ? 'day-sat' : ''));
            }
        } else {
            if (input && document.activeElement !== input) input.value = t.str;
            if (dayBadge) {
                dayBadge.textContent = DAYS_KR[t.dow];
                dayBadge.className = 'day-badge ' + (t.dow === 0 ? 'day-sun' : (t.dow === 6 ? 'day-sat' : ''));
            }
        }
    }
}

function handleTimeChange(val, timezone, slotIdx) {
    if (isRealtime) return;
    const match = val.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return;
    const [_, Y, M, D, H, min, S] = match.map(Number);
    const tempUTC = new Date(Date.UTC(Y, M - 1, D, H, min, S));
    if (isNaN(tempUTC.getTime())) return;

    if (timezone === 'UTC') {
        globalTimes[slotIdx] = tempUTC;
    } else {
        const offMs = getTimezoneOffset(timezone, tempUTC) * 60000;
        globalTimes[slotIdx] = new Date(tempUTC.getTime() - offMs);
    }
    updateClocks();
}

// --- Utils ---
function initSearchAndSelect() {
    const input = document.getElementById('tz-search-input');
    const results = document.getElementById('search-results');
    const quickSelect = document.getElementById('tz-quick-select');
    const fullList = document.getElementById('full-tz-list');
    const overlay = document.getElementById('full-tz-overlay');

    const buildItem = (entry, hideOverlay = false) => {
        const item = document.createElement('div');
        item.className = 'tz-item';
        item.textContent = `${entry.name} - ${entry.city}`;
        item.onclick = () => {
            addFromSearch(entry.zone, `${entry.name} - ${entry.city}`);
            if (hideOverlay) overlay.style.display = 'none';
        };
        return item;
    };

    TZ_DATABASE.forEach(t => { const o = document.createElement('option'); o.value = t.zone; o.textContent = `${t.name} - ${t.city}`; quickSelect.appendChild(o); });
    quickSelect.onchange = (e) => { const d = TZ_DATABASE.find(t => t.zone === e.target.value); if (d) addTimezone({ id: "tz-" + Date.now(), zone: d.zone, name: `${d.name} - ${d.city}`, type: 'standard' }); quickSelect.value = ""; };

    input.oninput = () => {
        const v = input.value.trim().toLowerCase();
        if (!v) { results.style.display = 'none'; return; }
        const matched = TZ_DATABASE.filter(t => t.name.toLowerCase().includes(v) || t.city.toLowerCase().includes(v));
        results.innerHTML = '';
        matched.forEach(t => results.appendChild(buildItem(t)));
        results.style.display = matched.length ? 'block' : 'none';
    };

    document.getElementById('show-all-tz').onclick = () => {
        fullList.innerHTML = '';
        TZ_DATABASE.forEach(t => fullList.appendChild(buildItem(t, true)));
        overlay.style.display = 'flex';
    };
    document.getElementById('close-overlay').onclick = () => overlay.style.display = 'none';
}

function addFromSearch(zone, label) { addTimezone({ id: "tz-" + Date.now(), zone, name: label, type: 'standard' }); document.getElementById('tz-search-input').value = ''; document.getElementById('search-results').style.display = 'none'; }
function addTimezone(tz) { groups[activeGroupId].zones.push(tz); savePersistence(); renderList(); updateClocks(); }
function removeTimezone(id) { groups[activeGroupId].zones = groups[activeGroupId].zones.filter(z => z.id !== id); savePersistence(); renderList(); updateClocks(); }
function initDragAndDrop() {
    const c = document.getElementById('clocks-container');
    c.ondragover = e => { e.preventDefault(); const a = getAfter(c, e.clientY); const d = document.querySelector('.dragging'); if (d) c.insertBefore(d, a); };
}
function getAfter(c, y) { const drs = [...c.querySelectorAll('.time-row:not(.dragging):not(.static)')]; return drs.reduce((clo, ch) => { const b = ch.getBoundingClientRect(); const o = y - b.top - b.height / 2; if (o < 0 && o > clo.off) return { off: o, el: ch }; return clo; }, { off: Number.NEGATIVE_INFINITY }).el; }
function saveOrder() { const ids = [...document.querySelectorAll('.time-row:not(.static)')].map(r => r.id.replace('tz-row-', '')); groups[activeGroupId].zones.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); savePersistence(); }

function toCompactDateTime(iso) {
    const m = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2}:\d{2})$/);
    if (!m) return (iso || '').trim();
    return `${m[1]}${m[2]}${m[3]} ${m[4]}`;
}

function getRowCopyText(row) {
    const zoneCode = (row.querySelector('.zone-code')?.textContent || '[UTC]').trim();
    const times = [...row.querySelectorAll('.time-input')].map(i => toCompactDateTime(i.value)).filter(Boolean);
    if (!times.length) return `${zoneCode}`;
    return `${zoneCode} ${times.join(' - ')}`;
}

async function writeClipboardWithNotice(text) {
    try {
        await navigator.clipboard.writeText(text);
        alert("복사 완료");
    } catch {
        alert("복사 실패: 브라우저 권한 또는 보안 컨텍스트(HTTPS)를 확인하세요.");
    }
}

async function copyRow(id) {
    const row = document.getElementById(`tz-row-${id}`);
    if (!row) return;
    await writeClipboardWithNotice(getRowCopyText(row));
}

async function copyAllTimezones() {
    const lines = [...document.querySelectorAll('.time-row')].map(getRowCopyText);
    await writeClipboardWithNotice(lines.join('\n'));
}

async function copyText(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = (el.textContent || '').trim();
    if (!text) return;
    await writeClipboardWithNotice(text);
}
function initCalculators() {
    const pS = document.getElementById('period-start'); const pE = document.getElementById('period-end');
    const oS = document.getElementById('offset-start'); const oV = document.getElementById('off-val'); const oU = document.getElementById('off-unit');
    const offMinus = document.getElementById('off-minus'); const offPlus = document.getElementById('off-plus');
    pS.valueAsDate = pE.valueAsDate = oS.valueAsDate = new Date();
    const c = () => {
        if (pS.valueAsDate && pE.valueAsDate) document.getElementById('period-res').textContent = Math.round((pE.valueAsDate - pS.valueAsDate) / 86400000) + " 일";
        if (oS.valueAsDate) { const r = new Date(oS.valueAsDate); const v = parseInt(oV.value) || 0; if (oU.value === 'day') r.setDate(r.getDate() + v); if (oU.value === 'week') r.setDate(r.getDate() + v * 7); if (oU.value === 'month') r.setMonth(r.getMonth() + v); document.getElementById('offset-res').textContent = r.toISOString().split('T')[0]; }
    };
    offMinus.onclick = () => { oV.value = (parseInt(oV.value) || 0) - 1; c(); };
    offPlus.onclick = () => { oV.value = (parseInt(oV.value) || 0) + 1; c(); };
    [pS, pE, oS, oV, oU].forEach(el => el.onchange = c); c();
}

function savePersistence() { localStorage.setItem('GTV_v150_Data', JSON.stringify({ groups, activeGroupId, slotCount })); }
function loadPersistence() {
    const saved = localStorage.getItem('GTV_v150_Data') || localStorage.getItem('GTV_v140_Data');
    const fallback = [{ name: "기본 그룹", zones: [{ id: 'seoul', name: '대한민국 - 서울', zone: 'Asia/Seoul', type: 'standard' }] }];
    if (!saved) {
        groups = fallback;
        return;
    }

    try {
        const data = JSON.parse(saved);
        groups = Array.isArray(data.groups) && data.groups.length ? data.groups : fallback;
        activeGroupId = Number.isInteger(data.activeGroupId) ? Math.min(Math.max(data.activeGroupId, 0), groups.length - 1) : 0;
        slotCount = Math.min(2, Math.max(1, data.slotCount || 1));
    } catch {
        groups = fallback;
        activeGroupId = 0;
        slotCount = 1;
        localStorage.removeItem('GTV_v150_Data');
    }
}
