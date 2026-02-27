let isRealtime = true;
let globalTimes = [new Date(), new Date()];
let slotCount = 1;
let uiScale = 1.0;
const VERSION = "2.0.0";
const STORAGE_KEY = "GTV_v200_Data";

// --- 타임존 마стер 데이터 (Extensive Mapping for Abbr) ---
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

document.addEventListener("DOMContentLoaded", () => {
    document.title = `세계 시간 v${VERSION}`;
    const versionBadge = document.getElementById("version-badge");
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
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", () => switchMainTab(btn.dataset.tab));
    });

    // Scale Spinner - Disabled in v1.7.3

    // Populate Custom Offset Hour Select
    const hSel = document.getElementById("custom-off-h");
    if (hSel) {
        for (let i = 14; i >= -12; i--) {
            const o = document.createElement("option");
            o.value = i;
            o.textContent = (i >= 0 ? "+" : "") + String(Math.abs(i)).padStart(2, "0");
            if (i === 0) o.selected = true;
            hSel.appendChild(o);
        }
    }

    // Extra Time Toggle
    const extraTimeToggle = document.getElementById("toggle-extra-time");
    if (extraTimeToggle) {
        extraTimeToggle.checked = slotCount > 1;
        extraTimeToggle.onchange = (e) => {
            slotCount = e.target.checked ? 2 : 1;
            renderList();
            updateClocks();
            savePersistence();
        };
    }

    // Custom Zone
    document.getElementById("add-custom-btn").onclick = () => {
        const name = document.getElementById("custom-name").value.trim();
        const offH = parseInt(document.getElementById("custom-off-h").value) || 0;
        const offM = parseInt(document.getElementById("custom-off-m").value) || 0;
        if (!name) return alert("이름을 입력하세요.");
        addTimezone({ id: "tz-c-" + Date.now(), name, offH, offM, type: "custom" });
        document.getElementById("custom-name").value = "";
    };

    document.getElementById("add-group-btn").onclick = () => {
        const name = prompt("새 그룹의 이름을 입력하세요:", "새 그룹");
        if (name) {
            groups.push({ name, zones: [] });
            activeGroupId = groups.length - 1;
            savePersistence();
            renderGroups();
            renderList();
        }
    };

    document.getElementById("copy-all-btn").onclick = copyAllTimezones;
}

function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add("out");
        setTimeout(() => toast.remove(), 500);
    }, 2000);
}

function switchMainTab(tab) {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    const isCalc = tab === "calc";
    document.getElementById("timezone-section").classList.toggle("active", !isCalc);
    document.getElementById("calc-section").classList.toggle("active", isCalc);
    document.getElementById("group-tabs-container").style.display = isCalc ? "none" : "flex";
    document.getElementById("top-control-bar").style.display = isCalc ? "none" : "flex";

    isRealtime = (tab === "live");
    const extraTimeToggle = document.getElementById("toggle-extra-time");

    document.getElementById("status-text").textContent = isRealtime ? "동기화 중" : "시간 고정 모드";

    // UI Refinement: Logically disable extra time toggle in Real-time mode
    if (extraTimeToggle) {
        extraTimeToggle.disabled = isRealtime;
        if (isRealtime) extraTimeToggle.checked = false;
        else extraTimeToggle.checked = (slotCount > 1);
    }

    renderList();
    updateClocks();
}

// --- Group Management ---
function renderGroups() {
    const container = document.getElementById("group-tabs-container");
    const addBtn = document.getElementById("add-group-btn");
    container.innerHTML = "";

    groups.forEach((group, idx) => {
        const btn = document.createElement("div");
        btn.className = `group-tab ${idx === activeGroupId ? "active" : ""}`;

        const label = document.createElement("span");
        label.className = "group-name-label";
        label.textContent = group.name;
        label.onclick = () => { activeGroupId = idx; renderGroups(); renderList(); updateClocks(); };

        const editBtn = document.createElement("button");
        editBtn.className = "group-edit-btn";
        editBtn.innerHTML = "✎"; // Pencil or Edit icon
        editBtn.title = "그룹 이름 변경";
        editBtn.onclick = (e) => {
            e.stopPropagation();
            renameGroup(idx);
        };

        const delBtn = document.createElement("button");
        delBtn.className = "group-del-btn";
        delBtn.innerHTML = "✕";
        delBtn.title = "그룹 삭제";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (groups.length > 1 && confirm("정말로 이 그룹을 삭제하시겠습니까?")) {
                groups.splice(idx, 1);
                activeGroupId = Math.max(0, activeGroupId - 1);
                savePersistence();
                renderGroups();
                renderList();
                showToast("그룹이 삭제되었습니다.");
            } else if (groups.length <= 1) {
                showToast("최소 하나 이상의 그룹이 필요합니다.");
            }
        };

        btn.appendChild(label);
        btn.appendChild(editBtn);
        btn.appendChild(delBtn);
        container.appendChild(btn);
    });
    container.appendChild(addBtn);
}

function renameGroup(idx) {
    const group = groups[idx];
    const newName = prompt("그룹 이름 수정:", group.name);
    if (newName && newName.trim()) {
        group.name = newName.trim();
        savePersistence();
        renderGroups();
        showToast("그룹 이름이 변경되었습니다.");
    }
}

// --- List Rendering (Dynamic Slots) ---
const DAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];

function renderList() {
    // Mode Isolation: Realtime mode is always 1 slot
    const effectiveSlotCount = isRealtime ? 1 : slotCount;
    const theadRow = document.querySelector("#table-head tr");
    if (theadRow) {
        theadRow.innerHTML = `
            <th style="width: 30px;"></th>
            <th style="width: 180px;">지역 / 국가</th>
            <th style="width: 140px;">UTC Offset</th>
        `;
        // Column Reorder: Time then Day (Grouped visually) - Left Aligned
        for (let i = 0; i < effectiveSlotCount; i++) {
            theadRow.innerHTML += `<th class="dynamic-col">${i === 0 ? "시간 / 요일" : "추가 시간 / 요일"}</th>`;
        }
        theadRow.innerHTML += "<th style=\"width: 100px;\">액션</th>";
    }

    const container = document.getElementById("clocks-container");
    container.innerHTML = "";

    // Render UTC Row
    const utcTr = document.createElement("tr");
    utcTr.className = "time-row static";
    utcTr.id = "tz-row-utc";
    let utcInner = `
        <td></td>
        <td><div class="zone-info"><span class="zone-code">[UTC]</span><span class="zone-name">표준시 (기준)</span></div></td>
        <td><span class="offset-text">UTC+00:00</span></td>
    `;
    for (let i = 0; i < effectiveSlotCount; i++) {
        utcInner += `
            <td class="dynamic-cell">
                <div class="time-day-group">
                    <span class="dn-icon" id="utc-dn-${i}"></span>
                    <input type="text" class="time-input" id="utc-time-input-${i}" spellcheck="false" data-slot="${i}">
                    <span class="day-badge" id="utc-day-${i}">-</span>
                </div>
            </td>
        `;
    }
    utcInner += "<td><div class=\"btn-group\"><button class=\"sm-btn\" onclick=\"copyRow('utc')\" title=\"복사\">📋</button></div></td>";
    utcTr.innerHTML = utcInner;
    container.appendChild(utcTr);

    for (let i = 0; i < effectiveSlotCount; i++) {
        const inp = utcTr.querySelector(`#utc-time-input-${i}`);
        inp.onchange = (e) => handleTimeChange(e.target.value, "UTC", i);
        inp.onkeydown = (e) => { if (e.key === "Enter") { handleTimeChange(e.target.value, "UTC", i); inp.blur(); } };
        if (isRealtime) inp.readOnly = true;
    }

    const currentZones = groups[activeGroupId].zones;
    currentZones.forEach(tz => {
        const tr = document.createElement("tr");
        tr.className = "time-row";
        tr.id = `tz-row-${tz.id}`;
        tr.draggable = true;
        let inner = `
            <td class="drag-handle">☰</td>
            <td><div class="zone-info"><span class="zone-code"></span><span class="zone-name">${tz.name}</span></div></td>
            <td><span class="offset-text"></span></td>
        `;
        for (let i = 0; i < effectiveSlotCount; i++) {
            inner += `
                <td class="dynamic-cell">
                    <div class="time-day-group">
                        <span class="dn-icon dn-slot-${i}"></span>
                        <input type="text" class="time-input slot-${i}" spellcheck="false" ${isRealtime ? "readonly" : ""} data-slot="${i}">
                        <span class="day-badge day-slot-${i}"></span>
                    </div>
                </td>
            `;
        }
        inner += `
            <td><div class="btn-group"><button class="sm-btn" onclick="copyRow('${tz.id}')" title="복사">📋</button>
                <button class="sm-btn danger" onclick="removeTimezone('${tz.id}')">✕</button></div></td>
        `;
        tr.innerHTML = inner;

        tr.querySelectorAll(".time-input").forEach(inp => {
            inp.onchange = (e) => handleTimeChange(e.target.value, tz.zone || "CUSTOM", parseInt(inp.dataset.slot));
            inp.onkeydown = (e) => { if (e.key === "Enter") { handleTimeChange(e.target.value, tz.zone || "CUSTOM", parseInt(inp.dataset.slot)); inp.blur(); } };
        });

        tr.addEventListener("dragstart", () => tr.classList.add("dragging"));
        tr.addEventListener("dragend", () => { tr.classList.remove("dragging"); saveOrder(); });
        container.appendChild(tr);
    });
    updateClocks();
}

// --- Exact Abbr Mapping (Expanded) ---
const ZONE_MAP = {
    "Asia/Seoul": "KST", "Asia/Tokyo": "JST", "Asia/Shanghai": "CST", "Asia/Hong_Kong": "HKT",
    "Asia/Singapore": "SGT", "Asia/Taipei": "NST", "Asia/Bangkok": "ICT", "Asia/Dubai": "GST",
    "Europe/Paris": ["CET", "CEST"], "Europe/London": ["GMT", "BST"], "Europe/Berlin": ["CET", "CEST"],
    "Europe/Moscow": "MSK", "Europe/Istanbul": "TRT", "America/New_York": ["EST", "EDT"],
    "America/Chicago": ["CST", "CDT"], "America/Los_Angeles": ["PST", "PDT"], "America/Sao_Paulo": "BRT",
    "Australia/Sydney": ["AEST", "AEDT"], "Australia/Perth": "AWST", "Pacific/Auckland": ["NZST", "NZDT"], "UTC": "UTC"
};

function getBetterAbbr(zone, date) {
    if (zone === "UTC") return "UTC";
    const mapping = ZONE_MAP[zone];
    let abbr = "";
    if (mapping) {
        abbr = (typeof mapping === "string") ? mapping : (isTimeZoneInDST(zone, date) ? mapping[1] : mapping[0]);
    } else {
        abbr = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" }).formatToParts(date).find(p => p.type === "timeZoneName")?.value || "";
    }
    return abbr.replace("GMT", "UTC");
}

function isTimeZoneInDST(zone, date) {
    try {
        const jan = new Date(date.getFullYear(), 0, 1);
        const jul = new Date(date.getFullYear(), 6, 1);
        const stdOffset = Math.max(getTimezoneOffset(zone, jan), getTimezoneOffset(zone, jul));
        return getTimezoneOffset(zone, date) < stdOffset;
    } catch (e) { return false; }
}

function getTimezoneOffset(zone, date) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(date);
    const offStr = parts.find(p => p.type === "timeZoneName")?.value || "GMT+0";
    const m = offStr.match(/[+-](\d{1,2}):?(\d{2})?/);
    if (!m) return 0;
    const sign = offStr.includes("+") ? 1 : -1;
    return sign * (parseInt(m[1]) * 60 + parseInt(m[2] || 0));
}

function pad(v) { return String(Math.abs(v)).padStart(2, "0"); }

// --- Clock Logic ---
function updateClocks() {
    updateRow("utc", { zone: "UTC", name: "표준시" });
    const currentZones = groups[activeGroupId].zones;
    currentZones.forEach(tz => updateRow(tz.id, tz));
}

function updateRow(id, tz) {
    const row = document.getElementById(`tz-row-${id}`);
    if (!row) return;

    let offsetStr = "";
    let zoneCodeMain = "";

    if (tz.type === "custom") {
        zoneCodeMain = "커스텀";
        offsetStr = `UTC${tz.offH >= 0 ? "+" : "-"}${pad(tz.offH)}:${pad(tz.offM)}`;
    } else {
        const offF = new Intl.DateTimeFormat("en-US", { timeZone: tz.zone, timeZoneName: "longOffset" });
        let partsArr = offF.formatToParts(globalTimes[0]);
        let offVal = partsArr.find(p => p.type === "timeZoneName")?.value || "GMT+0";
        // Normalize to UTC+HH:mm (No GMT)
        const match = offVal.match(/[+-](\d{1,2}):?(\d{2})?/);
        if (match) {
            const sign = offVal.includes("+") ? "+" : "-";
            offsetStr = `UTC${sign}${pad(match[1])}:${pad(match[2] || 0)}`;
        } else {
            offsetStr = "UTC+00:00";
        }
        zoneCodeMain = getBetterAbbr(tz.zone, globalTimes[0]);
    }

    const zoneCodeEl = row.querySelector(".zone-code");
    const offsetTextEl = row.querySelector(".offset-text");
    if (zoneCodeEl) zoneCodeEl.textContent = `[${zoneCodeMain}]`;
    if (offsetTextEl) offsetTextEl.textContent = offsetStr;

    const effectiveSlotCount = isRealtime ? 1 : slotCount;
    for (let i = 0; i < effectiveSlotCount; i++) {
        let t;
        if (tz.type === "custom") {
            const curBase = globalTimes[i];
            const tMs = curBase.getTime() + (tz.offH * 3600000) + (tz.offM * 60000);
            t = new Date(tMs);
        } else {
            const f = new Intl.DateTimeFormat("en-US", {
                timeZone: tz.zone, year: "numeric", month: "numeric", day: "numeric",
                hour: "numeric", minute: "numeric", second: "numeric", weekday: "short", hour12: false
            });
            const parts = f.formatToParts(globalTimes[i]);
            const get = type => parts.find(p => p.type === type)?.value || "";
            const h = parseInt(get("hour"));
            t = {
                str: `${get("year")}-${pad(get("month"))}-${pad(get("day"))} ${pad(h === 24 ? 0 : h)}:${pad(get("minute"))}:${pad(get("second"))}`,
                dow: { "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6 }[get("weekday")]
            };
        }

        const input = row.querySelector(`.slot-${i}`) || row.querySelector(`#utc-time-input-${i}`);
        const dayBadge = row.querySelector(`.day-slot-${i}`) || row.querySelector(`#utc-day-${i}`);
        const dnIcon = row.querySelector(`.dn-slot-${i}`) || row.querySelector(`#utc-dn-${i}`);

        // Day/Night Logic: Day: 06:00 ~ 18:00
        const updateDN = (hour, el) => {
            if (!el) return;
            const isDay = (hour >= 6 && hour <= 18);
            el.textContent = isDay ? "☀️" : "🌙";
            el.title = isDay ? "낮 (06:00~18:00)" : "밤 (18:01~05:59)";
        };

        if (tz.type === "custom") {
            const h = t.getUTCHours();
            const timeStr = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())} ${pad(h)}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}`;
            if (input && document.activeElement !== input) input.value = timeStr;
            const dIdx = t.getUTCDay();
            if (dayBadge) {
                dayBadge.textContent = DAYS_KR[dIdx];
                dayBadge.className = "day-badge " + (dIdx === 0 ? "day-sun" : (dIdx === 6 ? "day-sat" : ""));
            }
            updateDN(h, dnIcon);
        } else {
            const h = parseInt(t.str.split(" ")[1].split(":")[0]);
            if (input && document.activeElement !== input) input.value = t.str;
            if (dayBadge) {
                dayBadge.textContent = DAYS_KR[t.dow];
                dayBadge.className = "day-badge " + (t.dow === 0 ? "day-sun" : (t.dow === 6 ? "day-sat" : ""));
            }
            updateDN(h, dnIcon);
        }
    }
}

function handleTimeChange(val, timezone, slotIdx) {
    if (isRealtime) return;
    const date = new Date(val.replace(" ", "T"));
    if (isNaN(date.getTime())) {
        showToast("유효하지 않은 날짜 형식입니다.");
        renderList();
        return;
    }
    const match = val.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return;
    const [_, Y, M, D, H, min, S] = match.map(Number);
    const tempUTC = new Date(Date.UTC(Y, M - 1, D, H, min, S));
    if (isNaN(tempUTC.getTime())) return;

    if (timezone === "UTC") {
        globalTimes[slotIdx] = tempUTC;
    } else if (timezone === "CUSTOM") {
        const row = document.querySelector(".dragging") || document.activeElement.closest("tr");
        const tzId = row.id.replace("tz-row-", "");
        const currentZones = groups[activeGroupId].zones;
        const tz = currentZones.find(z => z.id === tzId);
        if (tz) {
            const offMs = (tz.offH * 3600000) + (tz.offM * 60000);
            globalTimes[slotIdx] = new Date(tempUTC.getTime() - offMs);
        }
    } else {
        const offMs = getTimezoneOffset(timezone, tempUTC) * 60000;
        globalTimes[slotIdx] = new Date(tempUTC.getTime() - offMs);
    }
    updateClocks();
}

// --- Utils ---
function initSearchAndSelect() {
    const input = document.getElementById("tz-search-input");
    const results = document.getElementById("search-results");
    const quickSelect = document.getElementById("tz-quick-select");
    TZ_DATABASE.forEach(t => { const o = document.createElement("option"); o.value = t.zone; o.textContent = `${t.name} - ${t.city}`; quickSelect.appendChild(o); });
    quickSelect.onchange = (e) => { const d = TZ_DATABASE.find(t => t.zone === e.target.value); if (d) addTimezone({ id: "tz-" + Date.now(), zone: d.zone, name: `${d.name} - ${d.city}`, type: "standard" }); quickSelect.value = ""; };
    input.oninput = () => {
        const v = input.value.trim().toLowerCase();
        if (!v) { results.style.display = "none"; return; }
        const m = TZ_DATABASE.filter(t => t.name.toLowerCase().includes(v) || t.city.toLowerCase().includes(v));
        results.innerHTML = m.map(t => `<div class="tz-item" onclick="addFromSearch('${t.zone}', '${t.name} - ${t.city}')">${t.name} - ${t.city}</div>`).join("");
        results.style.display = m.length ? "block" : "none";
    };
    document.getElementById("show-all-tz").onclick = () => {
        const o = document.getElementById("full-tz-overlay");
        document.getElementById("full-tz-list").innerHTML = TZ_DATABASE.map(t => `<div class="tz-item" onclick="addFromSearch('${t.zone}', '${t.name} - ${t.city}'); document.getElementById('full-tz-overlay').style.display='none'">${t.name} - ${t.city}</div>`).join("");
        o.style.display = "flex";
    };
    document.getElementById("close-overlay").onclick = () => document.getElementById("full-tz-overlay").style.display = "none";
}

function addFromSearch(zone, label) { addTimezone({ id: "tz-" + Date.now(), zone, name: label, type: "standard" }); document.getElementById("tz-search-input").value = ""; document.getElementById("search-results").style.display = "none"; }
function addTimezone(tz) { groups[activeGroupId].zones.push(tz); savePersistence(); renderList(); updateClocks(); }
function removeTimezone(id) { groups[activeGroupId].zones = groups[activeGroupId].zones.filter(z => z.id !== id); savePersistence(); renderList(); updateClocks(); }
function initDragAndDrop() {
    const c = document.getElementById("clocks-container");
    c.ondragover = e => { e.preventDefault(); const a = getAfter(c, e.clientY); const d = document.querySelector(".dragging"); if (d) c.insertBefore(d, a); };
}
function getAfter(c, y) { const drs = [...c.querySelectorAll(".time-row:not(.dragging):not(.static)")]; return drs.reduce((clo, ch) => { const b = ch.getBoundingClientRect(); const o = y - b.top - b.height / 2; if (o < 0 && o > clo.off) return { off: o, el: ch }; return clo; }, { off: Number.NEGATIVE_INFINITY }).el; }
function saveOrder() { const ids = [...document.querySelectorAll(".time-row:not(.static)")].map(r => r.id.replace("tz-row-", "")); groups[activeGroupId].zones.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); savePersistence(); }

function getRowCopyText(row) {
    const zoneCode = (row.querySelector(".zone-code")?.textContent || "[UTC]").trim();
    const offsetText = (row.querySelector(".offset-text")?.textContent || "[UTC+00:00]").trim();
    const offWrapped = offsetText.startsWith("[") ? offsetText : `[${offsetText}]`;

    // Separator changed to ' ~ '
    const times = [...row.querySelectorAll(".time-input")].map(i => i.value.trim()).filter(Boolean);
    if (!times.length) return `${zoneCode}${offWrapped}`;

    return `${zoneCode}${offWrapped} ${times.join(" ~ ")}`;
}

async function copyRow(id) {
    const row = document.getElementById(`tz-row-${id}`);
    if (!row) return;
    await navigator.clipboard.writeText(getRowCopyText(row));
    showToast("복사되었습니다.");
}

async function copyAllTimezones() {
    const lineArr = [...document.querySelectorAll(".time-row")].map(getRowCopyText);
    await navigator.clipboard.writeText(lineArr.join("\n"));
    showToast("전체 복사 완료");
}


function initCalculators() {
    const pS = document.getElementById("period-start"); const pE = document.getElementById("period-end");
    const oS = document.getElementById("offset-start"); const oV = document.getElementById("off-val"); const oU = document.getElementById("off-unit");
    const btnPlus = document.getElementById("off-plus"); const btnMinus = document.getElementById("off-minus");

    pS.valueAsDate = pE.valueAsDate = oS.valueAsDate = new Date();

    const calc = () => {
        if (pS.valueAsDate && pE.valueAsDate) document.getElementById("period-res").textContent = Math.round((pE.valueAsDate - pS.valueAsDate) / 86400000) + " 일";
        if (oS.valueAsDate) {
            const r = new Date(oS.valueAsDate); const v = parseInt(oV.value) || 0;
            if (oU.value === "day") r.setDate(r.getDate() + v);
            if (oU.value === "week") r.setDate(r.getDate() + v * 7);
            if (oU.value === "month") r.setMonth(r.getMonth() + v);
            document.getElementById("offset-res").textContent = r.toISOString().split("T")[0];
        }
    };

    [pS, pE, oS, oV, oU].forEach(el => el.onchange = calc);
    if (btnPlus) btnPlus.onclick = () => { oV.value = (parseInt(oV.value) || 0) + 1; calc(); };
    if (btnMinus) btnMinus.onclick = () => { oV.value = (parseInt(oV.value) || 0) - 1; calc(); };
    calc();
    initConverter();
}

function initConverter() {
    const secIn = document.getElementById("conv-sec");
    const minIn = document.getElementById("conv-min");
    const hourIn = document.getElementById("conv-hour");
    const dayIn = document.getElementById("conv-day");
    if (!secIn) return;

    const updateFrom = (val, unit) => {
        if (val === "" || isNaN(val)) {
            [secIn, minIn, hourIn, dayIn].forEach(i => i.value = "");
            return;
        }
        let baseSec = 0;
        if (unit === "sec") baseSec = val;
        if (unit === "min") baseSec = val * 60;
        if (unit === "hour") baseSec = val * 3600;
        if (unit === "day") baseSec = val * 86400;

        if (unit !== "sec") secIn.value = parseFloat(baseSec.toFixed(4));
        if (unit !== "min") minIn.value = parseFloat((baseSec / 60).toFixed(4));
        if (unit !== "hour") hourIn.value = parseFloat((baseSec / 3600).toFixed(4));
        if (unit !== "day") dayIn.value = parseFloat((baseSec / 86400).toFixed(4));
    };

    secIn.oninput = (e) => updateFrom(parseFloat(e.target.value), "sec");
    minIn.oninput = (e) => updateFrom(parseFloat(e.target.value), "min");
    hourIn.oninput = (e) => updateFrom(parseFloat(e.target.value), "hour");
    dayIn.oninput = (e) => updateFrom(parseFloat(e.target.value), "day");
}

async function copyText(elementId, isInput = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = (isInput ? el.value : (el.textContent || "")).trim();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    showToast("복사 완료");
}

function savePersistence() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ groups, activeGroupId, slotCount })); }
function loadPersistence() {
    const s = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("GTV_v170_Data") || localStorage.getItem("GTV_v160_Data") || localStorage.getItem("GTV_v150_Data") || localStorage.getItem("GTV_v140_Data");
    if (s) { const d = JSON.parse(s); groups = d.groups; activeGroupId = d.activeGroupId || 0; slotCount = Math.min(2, Math.max(1, d.slotCount || 1)); }
    else groups = [{ name: "기본 그룹", zones: [{ id: "seoul", name: "대한민국 - 서울", zone: "Asia/Seoul", type: "standard" }] }];
}
