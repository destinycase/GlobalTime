let isRealtime = true;
let globalTimes = [new Date(), new Date()];
let slotCount = 1;
let uiScale = 1.0;
let baseTimezoneId = "utc";
let showTimeAdjust = false;
let showCopyFormat = false;
const COPY_FORMAT_KEYS = ["timezone", "region", "offset", "time", "period_days", "period_time"];
const PERIOD_RESULT_IDS = new Set(["period-res", "period-hour-res", "period-min-res", "period-sec-res"]);
const MAIN_TABS = ["live", "fixed", "calc"];
let copyFormatOrder = [...COPY_FORMAT_KEYS];
let copyFormatEnabled = {
    timezone: true,
    region: true,
    offset: true,
    time: true,
    period_days: true,
    period_time: true
};
let currentMainTab = "live";
let activeGroupIdByMainTab = { live: 0, fixed: 0 };
const VERSION = "3.2.0";
const STORAGE_KEY = "GTV_v320_Data";
const THEME_STORAGE_KEY = "GTV_Theme";
const THEME_LIST = ["dark", "light"];
let currentTheme = "dark";

// --- 타임존 마стер 데이터 (Extensive Mapping for Abbr) ---
const TZ_DATABASE = [
    { zone: "Asia/Seoul", name: "대한민국", city: "서울", name_en: "South Korea", city_en: "Seoul" },
    { zone: "Asia/Tokyo", name: "일본", city: "도쿄", name_en: "Japan", city_en: "Tokyo" },
    { zone: "Asia/Shanghai", name: "중국", city: "상하이", name_en: "China", city_en: "Shanghai" },
    { zone: "Asia/Hong_Kong", name: "홍콩", city: "홍콩", name_en: "Hong Kong", city_en: "Hong Kong" },
    { zone: "Asia/Singapore", name: "싱가포르", city: "싱가포르", name_en: "Singapore", city_en: "Singapore" },
    { zone: "Asia/Taipei", name: "대만", city: "타이베이", name_en: "Taiwan", city_en: "Taipei" },
    { zone: "Asia/Bangkok", name: "태국", city: "방콕", name_en: "Thailand", city_en: "Bangkok" },
    { zone: "Asia/Ho_Chi_Minh", name: "베트남", city: "호치민", name_en: "Vietnam", city_en: "Ho Chi Minh" },
    { zone: "Asia/Jakarta", name: "인도네시아", city: "자카르타", name_en: "Indonesia", city_en: "Jakarta" },
    { zone: "Asia/Dubai", name: "UAE", city: "두바이", name_en: "UAE", city_en: "Dubai" },
    { zone: "Asia/Kolkata", name: "인도", city: "뉴델리", name_en: "India", city_en: "New Delhi" },
    { zone: "Europe/London", name: "영국", city: "런던", name_en: "UK", city_en: "London" },
    { zone: "Europe/Paris", name: "프랑스", city: "파리", name_en: "France", city_en: "Paris" },
    { zone: "Europe/Berlin", name: "독일", city: "베를린", name_en: "Germany", city_en: "Berlin" },
    { zone: "Europe/Moscow", name: "러시아", city: "모스크바", name_en: "Russia", city_en: "Moscow" },
    { zone: "Europe/Istanbul", name: "터키", city: "이스탄불", name_en: "Turkey", city_en: "Istanbul" },
    { zone: "America/New_York", name: "미국", city: "뉴욕", name_en: "USA", city_en: "New York" },
    { zone: "America/Chicago", name: "미국", city: "시카고", name_en: "USA", city_en: "Chicago" },
    { zone: "America/Los_Angeles", name: "미국", city: "LA", name_en: "USA", city_en: "LA" },
    { zone: "America/Mexico_City", name: "멕시코", city: "멕시코시티", name_en: "Mexico", city_en: "Mexico City" },
    { zone: "America/Sao_Paulo", name: "브라질", city: "상파울루", name_en: "Brazil", city_en: "Sao Paulo" },
    { zone: "Australia/Sydney", name: "호주", city: "시드니", name_en: "Australia", city_en: "Sydney" },
    { zone: "Australia/Perth", name: "호주", city: "퍼스", name_en: "Australia", city_en: "Perth" },
    { zone: "Pacific/Auckland", name: "뉴질랜드", city: "오클랜드", name_en: "New Zealand", city_en: "Auckland" }
];

function getLocalizedTZLabel(tzData) {
    if (currentLang === "en") {
        return `${tzData.name_en} - ${tzData.city_en}`;
    }
    return `${tzData.name} - ${tzData.city}`;
}

function getSortedTZData(list) {
    const locale = currentLang === "en" ? "en-US" : "ko-KR";
    return [...list].sort((a, b) =>
        getLocalizedTZLabel(a).localeCompare(getLocalizedTZLabel(b), locale, { sensitivity: "base", numeric: true })
    );
}

function normalizeCustomAbbr(value) {
    const trimmed = (value || "").trim();
    if (!trimmed) return t("label_custom");
    return trimmed.toUpperCase().slice(0, 12);
}

function createTimezoneListItem(tzData, closeOverlay = false) {
    const item = document.createElement("div");
    item.className = "tz-item";
    item.textContent = getLocalizedTZLabel(tzData);
    item.addEventListener("click", () => {
        addFromSearchWithData(tzData.zone);
        if (closeOverlay) {
            const overlay = document.getElementById("full-tz-overlay");
            if (overlay) overlay.style.display = "none";
        }
    });
    return item;
}

function getCurrentGroupZones() {
    return groups[activeGroupId]?.zones || [];
}

function getZoneDisplayName(tz) {
    if (!tz) return "";
    if (tz.zone === "UTC") return t("utc_name");
    if (currentLang === "en") return tz.name_en || tz.name || tz.name_ko || tz.zone || "";
    return tz.name_ko || tz.name || tz.name_en || tz.zone || "";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getZoneAbbreviation(tz, date = globalTimes[0]) {
    if (!tz) return "";
    if (tz.zone === "UTC") return "UTC";
    if (tz.type === "custom") return normalizeCustomAbbr(tz.abbr);
    return getBetterAbbr(tz.zone, date);
}

function ensureBaseTimezoneSelection() {
    if (baseTimezoneId === "utc") return;
    const exists = getCurrentGroupZones().some(z => z.id === baseTimezoneId);
    if (!exists) baseTimezoneId = "utc";
}

function getUTCRef() {
    return { id: "utc", type: "standard", zone: "UTC", name: t("utc_name") };
}

function getBaseTimezoneRef() {
    ensureBaseTimezoneSelection();
    if (baseTimezoneId === "utc") return getUTCRef();
    const tz = getCurrentGroupZones().find(z => z.id === baseTimezoneId);
    if (!tz) return getUTCRef();
    return tz;
}

function sanitizeCopyFormatOrder(order) {
    const safeOrder = [];
    if (Array.isArray(order)) {
        order.forEach(key => {
            const normalizedKey = key === "period" ? "period_days" : key;
            if (COPY_FORMAT_KEYS.includes(normalizedKey) && !safeOrder.includes(normalizedKey)) safeOrder.push(normalizedKey);
        });
    }
    COPY_FORMAT_KEYS.forEach(key => {
        if (!safeOrder.includes(key)) safeOrder.push(key);
    });
    return safeOrder;
}

function sanitizeCopyFormatEnabled(enabled) {
    const safe = {};
    COPY_FORMAT_KEYS.forEach(key => {
        if (enabled && typeof enabled === "object") {
            if (Object.prototype.hasOwnProperty.call(enabled, key)) {
                safe[key] = !!enabled[key];
                return;
            }
            if (key === "period_days" && Object.prototype.hasOwnProperty.call(enabled, "period")) {
                safe[key] = !!enabled.period;
                return;
            }
        }
        safe[key] = true;
    });
    return safe;
}

function sanitizeTheme(theme) {
    return THEME_LIST.includes(theme) ? theme : "dark";
}

function applyTheme(theme, persist = true) {
    currentTheme = sanitizeTheme(theme);
    if (document.documentElement) {
        document.documentElement.setAttribute("data-theme", currentTheme);
    }
    if (persist) localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
}

function loadThemePreference() {
    return sanitizeTheme(localStorage.getItem(THEME_STORAGE_KEY) || "dark");
}

function sanitizeMainTab(tab) {
    return MAIN_TABS.includes(tab) ? tab : "live";
}

function clampGroupIndex(index) {
    const maxIndex = Math.max(0, groups.length - 1);
    const parsed = parseInt(index, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(Math.max(parsed, 0), maxIndex);
}

function normalizeGroupTabState() {
    activeGroupId = clampGroupIndex(activeGroupId);
    activeGroupIdByMainTab = {
        live: clampGroupIndex(activeGroupIdByMainTab?.live),
        fixed: clampGroupIndex(activeGroupIdByMainTab?.fixed)
    };
}

// --- Group Data Structure ---
let groups = [];
let activeGroupId = 0;

document.addEventListener("DOMContentLoaded", () => {
    loadPersistence();
    applyTheme(loadThemePreference(), false);
    applyTranslations();
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

    switchMainTab(currentMainTab);
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

    const timeAdjustToggle = document.getElementById("toggle-time-adjust");
    if (timeAdjustToggle) {
        timeAdjustToggle.checked = showTimeAdjust;
        timeAdjustToggle.onchange = (e) => {
            showTimeAdjust = !!e.target.checked;
            updateTimeAdjustPanel();
            savePersistence();
        };
    }

    const copyFormatToggle = document.getElementById("toggle-copy-format");
    if (copyFormatToggle) {
        copyFormatToggle.checked = showCopyFormat;
        copyFormatToggle.onchange = (e) => {
            showCopyFormat = !!e.target.checked;
            renderCopyFormatControls();
            savePersistence();
        };
    }

    const copyFormatResetBtn = document.getElementById("copy-format-reset-btn");
    if (copyFormatResetBtn) {
        copyFormatResetBtn.onclick = () => {
            copyFormatOrder = [...COPY_FORMAT_KEYS];
            copyFormatEnabled = sanitizeCopyFormatEnabled(null);
            renderCopyFormatControls();
            renderList();
            savePersistence();
        };
    }

    const baseTimeSelect = document.getElementById("base-time-select");
    if (baseTimeSelect) {
        baseTimeSelect.onchange = (e) => {
            baseTimezoneId = e.target.value || "utc";
            renderList();
            updateTimeAdjustPanel();
            savePersistence();
        };
    }

    // Custom Zone
    document.getElementById("add-custom-btn").onclick = () => {
        const abbr = normalizeCustomAbbr(document.getElementById("custom-abbr").value);
        const name = document.getElementById("custom-name").value.trim();
        const offH = parseInt(document.getElementById("custom-off-h").value) || 0;
        const offM = parseInt(document.getElementById("custom-off-m").value) || 0;
        if (!name) return showToast(t("toast_input_name"));
        addTimezone({ id: "tz-c-" + Date.now(), abbr, name, offH, offM, type: "custom" });
        document.getElementById("custom-abbr").value = "";
        document.getElementById("custom-name").value = "";
    };

    document.getElementById("add-group-btn").onclick = () => {
        const name = prompt(t("prompt_new_group"), t("nav_live"));
        if (name) {
            groups.push({ name, zones: [] });
            activeGroupId = groups.length - 1;
            if (currentMainTab === "live" || currentMainTab === "fixed") {
                activeGroupIdByMainTab[currentMainTab] = activeGroupId;
            }
            savePersistence();
            renderGroups();
            renderList();
        }
    };

    document.getElementById("copy-all-btn").onclick = copyAllTimezones;
    const saveTableImageBtn = document.getElementById("save-table-image-btn");
    if (saveTableImageBtn) {
        saveTableImageBtn.onclick = saveTimezoneTableImage;
    }

    const themeSelect = document.getElementById("theme-select");
    if (themeSelect) {
        themeSelect.value = currentTheme;
        themeSelect.onchange = (e) => {
            applyTheme(e.target.value);
        };
    }

    // Language Selector
    const langSelect = document.getElementById("lang-select");
    if (langSelect) {
        langSelect.value = currentLang;
        langSelect.onchange = (e) => {
            setLanguage(e.target.value);
            updateTZDropdown(); // Ensure dropdown is updated
            renderGroups();
            renderList();
            updateTimeAdjustPanel();
            renderCopyFormatControls();
            refreshSelectWidths();
            if (typeof window !== "undefined" && typeof window.__gtvCalcRefresh === "function") {
                window.__gtvCalcRefresh();
            }
        };
    }

    renderBaseTimeSelect();
    refreshSelectWidths();
    updateOptionRowVisibility();
    updateTimeAdjustPanel();
    renderCopyFormatControls();
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
    const nextTab = sanitizeMainTab(tab);

    if (currentMainTab === "live" || currentMainTab === "fixed") {
        activeGroupIdByMainTab[currentMainTab] = clampGroupIndex(activeGroupId);
    }

    currentMainTab = nextTab;
    if (currentMainTab === "live" || currentMainTab === "fixed") {
        activeGroupId = clampGroupIndex(activeGroupIdByMainTab[currentMainTab]);
    } else {
        activeGroupId = clampGroupIndex(activeGroupId);
    }
    normalizeGroupTabState();

    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.tab === currentMainTab));
    const isCalc = currentMainTab === "calc";
    document.getElementById("timezone-section").classList.toggle("active", !isCalc);
    document.getElementById("calc-section").classList.toggle("active", isCalc);
    document.getElementById("group-tabs-container").style.display = isCalc ? "none" : "flex";
    document.getElementById("top-control-bar").style.display = isCalc ? "none" : "flex";

    isRealtime = (currentMainTab === "live");
    const extraTimeToggle = document.getElementById("toggle-extra-time");
    const timeAdjustToggle = document.getElementById("toggle-time-adjust");
    const copyFormatToggle = document.getElementById("toggle-copy-format");

    const statusText = document.getElementById("status-text");
    if (statusText) statusText.textContent = isRealtime ? t("status_sync") : t("status_fixed");

    // UI Refinement: Logically disable extra time toggle in Real-time mode
    if (extraTimeToggle) {
        extraTimeToggle.disabled = isRealtime;
        if (isRealtime) extraTimeToggle.checked = false;
        else extraTimeToggle.checked = (slotCount > 1);
    }

    if (timeAdjustToggle) {
        timeAdjustToggle.disabled = isRealtime;
        timeAdjustToggle.checked = !isRealtime && showTimeAdjust;
    }
    if (copyFormatToggle) {
        copyFormatToggle.checked = showCopyFormat;
    }
    updateOptionRowVisibility();

    renderGroups();
    renderList();
    updateTimeAdjustPanel();
    renderCopyFormatControls();
    updateClocks();
    savePersistence();
}

function updateOptionRowVisibility() {
    const optionRow = document.getElementById("control-option-row");
    if (!optionRow) return;

    const extraTimeGroup = document.getElementById("toggle-extra-time")?.closest(".control-group");
    const timeAdjustGroup = document.getElementById("toggle-time-adjust")?.closest(".control-group");
    const copyFormatGroup = document.getElementById("toggle-copy-format")?.closest(".control-group");

    optionRow.style.display = "flex";
    if (extraTimeGroup) extraTimeGroup.style.display = isRealtime ? "none" : "flex";
    if (timeAdjustGroup) timeAdjustGroup.style.display = isRealtime ? "none" : "flex";
    if (copyFormatGroup) copyFormatGroup.style.display = "flex";
}

function adjustSelectWidthForContent(select, minWidth = 0) {
    if (!select) return;
    const canvas = adjustSelectWidthForContent.canvas || (adjustSelectWidthForContent.canvas = document.createElement("canvas"));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const computed = window.getComputedStyle(select);
    ctx.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;

    let maxTextWidth = 0;
    [...select.options].forEach(option => {
        const label = (option.textContent || "").trim();
        if (!label) return;
        maxTextWidth = Math.max(maxTextWidth, ctx.measureText(label).width);
    });

    const requiredWidth = Math.ceil(maxTextWidth + 72); // arrow + scrollbar + safety gap
    const currentWidth = parseInt(select.dataset.minWidth || "", 10);
    const baseMinWidth = Number.isFinite(currentWidth)
        ? currentWidth
        : (parseInt(select.style.width || "", 10) || minWidth || 0);
    if (!Number.isFinite(currentWidth)) select.dataset.minWidth = String(baseMinWidth);

    select.style.width = `${Math.max(baseMinWidth, requiredWidth)}px`;
}

function refreshSelectWidths() {
    adjustSelectWidthForContent(document.getElementById("tz-quick-select"), 130);
    adjustSelectWidthForContent(document.getElementById("base-time-select"), 220);
}

function renderBaseTimeSelect() {
    const select = document.getElementById("base-time-select");
    if (!select) return;

    ensureBaseTimezoneSelection();
    const selectedBefore = baseTimezoneId;
    select.innerHTML = "";

    const utcOption = document.createElement("option");
    utcOption.value = "utc";
    utcOption.textContent = `[UTC] ${t("utc_name")}`;
    select.appendChild(utcOption);

    getCurrentGroupZones().forEach(tz => {
        const option = document.createElement("option");
        option.value = tz.id;
        option.textContent = `[${getZoneAbbreviation(tz)}] ${getZoneDisplayName(tz)}`;
        select.appendChild(option);
    });

    baseTimezoneId = [...select.options].some(o => o.value === selectedBefore) ? selectedBefore : "utc";
    select.value = baseTimezoneId;
    if (baseTimezoneId !== selectedBefore) savePersistence();
    adjustSelectWidthForContent(select, 220);
}

function createTimeAdjustActionButton(labelKey, slotIdx, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sm-btn";
    if (action === "sync_to_extra" || action === "sync_to_main") {
        button.classList.add("time-adjust-sync-btn");
    }
    button.textContent = t(labelKey);
    button.addEventListener("click", () => applyTimeAdjustAction(slotIdx, action));
    return button;
}

function createTimeAdjustDivider() {
    const divider = document.createElement("span");
    divider.className = "time-adjust-divider";
    divider.textContent = "|";
    return divider;
}

function renderTimeAdjustSet(slotIdx, enableSyncButton = false) {
    const set = document.createElement("div");
    set.className = "time-adjust-set";

    const label = document.createElement("span");
    label.className = "time-adjust-set-label";
    label.textContent = slotIdx === 0 ? t("th_time_day_main") : t("th_time_day_extra");
    set.appendChild(label);

    const fixedActions = [
        ["btn_now", "now"],
        ["btn_midnight", "midnight"],
        ["btn_sharp_hour", "sharp_hour"]
    ];
    fixedActions.forEach(([labelKey, action]) => {
        set.appendChild(createTimeAdjustActionButton(labelKey, slotIdx, action));
    });

    if (enableSyncButton) {
        if (slotIdx === 0) {
            set.appendChild(createTimeAdjustActionButton("btn_sync_extra_time", slotIdx, "sync_to_extra"));
        } else if (slotIdx === 1) {
            set.appendChild(createTimeAdjustActionButton("btn_sync_main_time", slotIdx, "sync_to_main"));
        }
    }

    set.appendChild(createTimeAdjustDivider());

    const shiftActionGroups = [
        [["btn_minus_hour", "minus_hour"], ["btn_plus_hour", "plus_hour"]],
        [["btn_minus_day", "minus_day"], ["btn_plus_day", "plus_day"]],
        [["btn_minus_week", "minus_week"], ["btn_plus_week", "plus_week"]]
    ];
    shiftActionGroups.forEach((group, groupIdx) => {
        group.forEach(([labelKey, action]) => {
            set.appendChild(createTimeAdjustActionButton(labelKey, slotIdx, action));
        });
        if (groupIdx < shiftActionGroups.length - 1) {
            set.appendChild(createTimeAdjustDivider());
        }
    });

    return set;
}

function updateTimeAdjustPanel() {
    const row = document.getElementById("time-adjust-row");
    const buttonsContainer = document.getElementById("time-adjust-buttons");
    const bar = document.getElementById("top-control-bar");
    if (!row || !buttonsContainer || !bar) return;

    const visible = !isRealtime && showTimeAdjust;
    row.style.display = visible ? "block" : "none";
    bar.classList.toggle("time-adjust-enabled", visible);

    if (!visible) {
        buttonsContainer.innerHTML = "";
        return;
    }

    const effectiveSlotCount = isRealtime ? 1 : slotCount;
    buttonsContainer.innerHTML = "";
    buttonsContainer.appendChild(renderTimeAdjustSet(0, effectiveSlotCount > 1));
    if (effectiveSlotCount > 1) {
        buttonsContainer.appendChild(renderTimeAdjustSet(1, true));
    }
}

function getCopyFieldLabel(key) {
    const keyMap = {
        timezone: "copy_field_timezone",
        region: "copy_field_region",
        offset: "copy_field_offset",
        time: "copy_field_time",
        period_days: "copy_field_period",
        period_time: "copy_field_period_time"
    };
    return t(keyMap[key] || key);
}

function getCopyFormatDropTarget(container, x) {
    const draggableItems = [...container.querySelectorAll(".copy-format-item:not(.dragging)")];
    return draggableItems.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function renderCopyFormatControls() {
    const row = document.getElementById("copy-format-row");
    const list = document.getElementById("copy-format-list");
    if (!row || !list) return;

    row.style.display = showCopyFormat ? "flex" : "none";
    if (!showCopyFormat) {
        list.innerHTML = "";
        return;
    }

    list.innerHTML = "";
    copyFormatOrder.forEach(key => {
        if (!COPY_FORMAT_KEYS.includes(key)) return;

        const item = document.createElement("div");
        item.className = "copy-format-item";
        item.dataset.key = key;
        item.draggable = true;

        const dragHandle = document.createElement("span");
        dragHandle.className = "copy-format-drag";
        dragHandle.textContent = "☰";
        dragHandle.title = t("tooltip_reorder");

        const label = document.createElement("label");
        label.className = "copy-format-item-label";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = !!copyFormatEnabled[key];
        checkbox.addEventListener("change", () => {
            copyFormatEnabled[key] = checkbox.checked;
            renderList();
            savePersistence();
        });

        const text = document.createElement("span");
        text.textContent = getCopyFieldLabel(key);

        label.appendChild(checkbox);
        label.appendChild(text);
        item.appendChild(dragHandle);
        item.appendChild(label);

        item.addEventListener("dragstart", (e) => {
            item.classList.add("dragging");
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", key);
            }
        });
        item.addEventListener("dragend", () => {
            item.classList.remove("dragging");
            copyFormatOrder = [...list.querySelectorAll(".copy-format-item")].map(el => el.dataset.key);
            savePersistence();
        });

        list.appendChild(item);
    });

    list.ondragover = (e) => {
        e.preventDefault();
        const dragging = list.querySelector(".copy-format-item.dragging");
        if (!dragging) return;
        const after = getCopyFormatDropTarget(list, e.clientX);
        list.insertBefore(dragging, after);
    };
    list.ondrop = (e) => e.preventDefault();
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
        label.onclick = () => {
            activeGroupId = idx;
            if (currentMainTab === "live" || currentMainTab === "fixed") {
                activeGroupIdByMainTab[currentMainTab] = activeGroupId;
            }
            savePersistence();
            renderGroups();
            renderList();
            updateClocks();
        };

        const editBtn = document.createElement("button");
        editBtn.className = "group-edit-btn";
        editBtn.innerHTML = "✎"; // Pencil or Edit icon
        editBtn.title = t("tooltip_edit");
        editBtn.onclick = (e) => {
            e.stopPropagation();
            renameGroup(idx);
        };

        const delBtn = document.createElement("button");
        delBtn.className = "group-del-btn";
        delBtn.innerHTML = "✕";
        delBtn.title = t("tooltip_delete");
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (groups.length > 1 && confirm(t("confirm_delete_group"))) {
                groups.splice(idx, 1);
                activeGroupId = Math.max(0, activeGroupId - 1);
                normalizeGroupTabState();
                if (currentMainTab === "live" || currentMainTab === "fixed") {
                    activeGroupIdByMainTab[currentMainTab] = activeGroupId;
                }
                savePersistence();
                renderGroups();
                renderList();
                showToast(t("toast_group_deleted"));
            } else if (groups.length <= 1) {
                showToast(t("toast_group_min"));
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
    const newName = prompt(t("prompt_rename_group"), group.name);
    if (newName && newName.trim()) {
        group.name = newName.trim();
        savePersistence();
        renderGroups();
        showToast(t("toast_name_changed"));
    }
}

// --- List Rendering (Dynamic Slots) ---
const DAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];

function renderList() {
    // Mode Isolation: Realtime mode is always 1 slot
    const effectiveSlotCount = isRealtime ? 1 : slotCount;
    const showTimezoneCol = !!copyFormatEnabled.timezone;
    const showRegionCol = !!copyFormatEnabled.region;
    const showOffsetCol = !!copyFormatEnabled.offset;
    const showTimeCol = !!copyFormatEnabled.time;
    const showPeriodDays = effectiveSlotCount > 1 && !!copyFormatEnabled.period_days;
    const showPeriodTime = effectiveSlotCount > 1 && !!copyFormatEnabled.period_time;
    const baseRef = getBaseTimezoneRef();
    const baseRefName = escapeHtml(getZoneDisplayName(baseRef));
    const theadRow = document.querySelector("#table-head tr");
    if (theadRow) {
        const headCells = [];
        if (showTimezoneCol) headCells.push(`<th style="width: 110px;">${t("th_tz_abbr")}</th>`);
        if (showRegionCol) headCells.push(`<th style="width: 220px;">${t("th_region")}</th>`);
        if (showOffsetCol) headCells.push(`<th style="width: 140px;">${t("th_utc_offset")}</th>`);
        if (showTimeCol) {
            headCells.push(`<th class="dynamic-col">${t("th_time_day_main")}</th>`);
            if (effectiveSlotCount > 1) headCells.push(`<th class="dynamic-col">${t("th_time_day_extra")}</th>`);
        }
        if (showPeriodDays) headCells.push(`<th style="width: 90px;">${t("th_period_days")}</th>`);
        if (showPeriodTime) headCells.push(`<th style="width: 100px;">${t("th_period_time")}</th>`);
        headCells.push(`<th style="width: 70px;">${t("th_copy")}</th>`);
        headCells.push(`<th style="width: 70px;">${t("th_remove")}</th>`);
        theadRow.innerHTML = headCells.join("");
    }

    const container = document.getElementById("clocks-container");
    container.innerHTML = "";

    // Render Base Row (always pinned at top)
    const baseRow = document.createElement("tr");
    baseRow.className = "time-row static base-row";
    baseRow.id = `tz-row-${baseRef.id}`;
    let baseInner = "";
    if (showTimezoneCol) {
        baseInner += `<td><div class="abbr-cell"><span class="drag-spacer" aria-hidden="true"></span><span class="zone-code"></span></div></td>`;
    }
    if (showRegionCol) {
        baseInner += `<td><div class="zone-info"><span class="zone-name">${baseRefName}</span></div></td>`;
    }
    if (showOffsetCol) {
        baseInner += `<td><span class="offset-text"></span></td>`;
    }
    if (showTimeCol) {
        for (let i = 0; i < effectiveSlotCount; i++) {
            baseInner += `
                <td class="dynamic-cell">
                    <div class="time-day-group">
                        <span class="dn-icon dn-slot-${i}"></span>
                        <input type="text" class="time-input slot-${i}" spellcheck="false" data-slot="${i}">
                        <span class="day-badge day-slot-${i}">-</span>
                    </div>
                </td>
            `;
        }
    }
    if (showPeriodDays) {
        baseInner += `<td class="period-days-cell"><span class="period-days-text">-</span></td>`;
    }
    if (showPeriodTime) {
        baseInner += `<td class="period-time-cell"><span class="period-time-text">-</span></td>`;
    }
    baseInner += `<td><div class="btn-group"><button class="sm-btn copy-row-btn" title="${t("tooltip_copy")}">📋</button></div></td>`;
    baseInner += `<td></td>`;
    baseRow.innerHTML = baseInner;
    const baseCopyBtn = baseRow.querySelector(".copy-row-btn");
    if (baseCopyBtn) baseCopyBtn.addEventListener("click", () => copyRow(baseRef.id));
    container.appendChild(baseRow);

    for (let i = 0; i < effectiveSlotCount; i++) {
        const inp = baseRow.querySelector(`.slot-${i}`);
        if (!inp) continue;
        inp.onchange = (e) => handleTimeChange(e.target.value, baseRef.zone || "CUSTOM", i);
        inp.onkeydown = (e) => { if (e.key === "Enter") { handleTimeChange(e.target.value, baseRef.zone || "CUSTOM", i); inp.blur(); } };
        if (isRealtime) inp.readOnly = true;
    }

    if (baseRef.id !== "utc") {
        const utcRef = getUTCRef();
        const utcRefName = escapeHtml(getZoneDisplayName(utcRef));
        const utcRow = document.createElement("tr");
        utcRow.className = "time-row static utc-row";
        utcRow.id = "tz-row-utc";
        let utcInner = "";
        if (showTimezoneCol) {
            utcInner += `<td><div class="abbr-cell"><span class="drag-spacer" aria-hidden="true"></span><span class="zone-code"></span></div></td>`;
        }
        if (showRegionCol) {
            utcInner += `<td><div class="zone-info"><span class="zone-name">${utcRefName}</span></div></td>`;
        }
        if (showOffsetCol) {
            utcInner += `<td><span class="offset-text"></span></td>`;
        }
        if (showTimeCol) {
            for (let i = 0; i < effectiveSlotCount; i++) {
                utcInner += `
                    <td class="dynamic-cell">
                        <div class="time-day-group">
                            <span class="dn-icon dn-slot-${i}"></span>
                            <input type="text" class="time-input slot-${i}" spellcheck="false" data-slot="${i}">
                            <span class="day-badge day-slot-${i}">-</span>
                        </div>
                    </td>
                `;
            }
        }
        if (showPeriodDays) {
            utcInner += `<td class="period-days-cell"><span class="period-days-text">-</span></td>`;
        }
        if (showPeriodTime) {
            utcInner += `<td class="period-time-cell"><span class="period-time-text">-</span></td>`;
        }
        utcInner += `<td><div class="btn-group"><button class="sm-btn copy-row-btn" title="${t("tooltip_copy")}">📋</button></div></td>`;
        utcInner += `<td></td>`;
        utcRow.innerHTML = utcInner;
        const utcCopyBtn = utcRow.querySelector(".copy-row-btn");
        if (utcCopyBtn) utcCopyBtn.addEventListener("click", () => copyRow("utc"));
        container.appendChild(utcRow);

        for (let i = 0; i < effectiveSlotCount; i++) {
            const inp = utcRow.querySelector(`.slot-${i}`);
            if (!inp) continue;
            inp.onchange = (e) => handleTimeChange(e.target.value, utcRef.zone, i);
            inp.onkeydown = (e) => { if (e.key === "Enter") { handleTimeChange(e.target.value, utcRef.zone, i); inp.blur(); } };
            if (isRealtime) inp.readOnly = true;
        }
    }

    const rowsToRender = getCurrentGroupZones().filter(tz => tz.id !== baseRef.id);
    rowsToRender.forEach(tz => {
        const tr = document.createElement("tr");
        tr.className = "time-row";
        tr.id = `tz-row-${tz.id}`;
        tr.draggable = false;
        const displayName = escapeHtml(getZoneDisplayName(tz));
        const dragHandleHtml = `<button type="button" class="drag-handle" draggable="true" title="${t("tooltip_reorder")}">☰</button>`;
        const fallbackHandleNeeded = !showTimezoneCol;
        let handlePlaced = !fallbackHandleNeeded;
        const takeFallbackHandle = () => {
            if (handlePlaced) return "";
            handlePlaced = true;
            return dragHandleHtml;
        };

        let inner = "";
        if (showTimezoneCol) {
            inner += `<td><div class="abbr-cell">${dragHandleHtml}<span class="zone-code"></span></div></td>`;
        }
        if (showRegionCol) {
            const extraHandle = takeFallbackHandle();
            inner += `<td><div class="zone-info">${extraHandle}<span class="zone-name">${displayName}</span></div></td>`;
        }
        if (showOffsetCol) {
            const extraHandle = takeFallbackHandle();
            if (extraHandle) {
                inner += `<td><div class="abbr-cell">${extraHandle}<span class="offset-text"></span></div></td>`;
            } else {
                inner += `<td><span class="offset-text"></span></td>`;
            }
        }
        if (showTimeCol) {
            for (let i = 0; i < effectiveSlotCount; i++) {
                const extraHandle = i === 0 ? takeFallbackHandle() : "";
                if (extraHandle) {
                    inner += `
                        <td class="dynamic-cell">
                            <div class="time-day-group">
                                ${extraHandle}
                                <span class="dn-icon dn-slot-${i}"></span>
                                <input type="text" class="time-input slot-${i}" spellcheck="false" ${isRealtime ? "readonly" : ""} data-slot="${i}">
                                <span class="day-badge day-slot-${i}"></span>
                            </div>
                        </td>
                    `;
                } else {
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
            }
        }
        if (showPeriodDays) {
            const extraHandle = takeFallbackHandle();
            if (extraHandle) {
                inner += `<td class="period-days-cell"><div class="abbr-cell">${extraHandle}<span class="period-days-text">-</span></div></td>`;
            } else {
                inner += `<td class="period-days-cell"><span class="period-days-text">-</span></td>`;
            }
        }
        if (showPeriodTime) {
            const extraHandle = takeFallbackHandle();
            if (extraHandle) {
                inner += `<td class="period-time-cell"><div class="abbr-cell">${extraHandle}<span class="period-time-text">-</span></div></td>`;
            } else {
                inner += `<td class="period-time-cell"><span class="period-time-text">-</span></td>`;
            }
        }
        const copyCellHandle = takeFallbackHandle();
        inner += `
            <td><div class="btn-group">${copyCellHandle}<button class="sm-btn copy-row-btn" title="${t("tooltip_copy")}">📋</button></div></td>
            <td><div class="btn-group"><button class="sm-btn danger remove-row-btn">✕</button></div></td>
        `;
        tr.innerHTML = inner;
        const copyBtn = tr.querySelector(".copy-row-btn");
        if (copyBtn) copyBtn.addEventListener("click", () => copyRow(tz.id));
        const removeBtn = tr.querySelector(".remove-row-btn");
        if (removeBtn) removeBtn.addEventListener("click", () => removeTimezone(tz.id));

        tr.querySelectorAll(".time-input").forEach(inp => {
            const slotIdx = parseInt(inp.dataset.slot, 10);
            inp.onchange = (e) => handleTimeChange(e.target.value, tz.zone || "CUSTOM", slotIdx);
            inp.onkeydown = (e) => { if (e.key === "Enter") { handleTimeChange(e.target.value, tz.zone || "CUSTOM", slotIdx); inp.blur(); } };
        });

        const dragHandle = tr.querySelector(".drag-handle");
        const dragTarget = dragHandle || tr;
        if (!dragHandle) tr.draggable = true;
        dragTarget.addEventListener("dragstart", (e) => {
            tr.classList.add("dragging");
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", tz.id);
            }
        });
        dragTarget.addEventListener("dragend", () => {
            tr.classList.remove("dragging");
            saveOrder();
        });
        container.appendChild(tr);
    });
    renderBaseTimeSelect();
    updateTimeAdjustPanel();
    updateClocks();
}

// --- Exact Abbr Mapping (Expanded) ---
const ZONE_MAP = {
    "Asia/Seoul": "KST", "Asia/Tokyo": "JST", "Asia/Shanghai": "CST", "Asia/Hong_Kong": "HKT",
    "Asia/Singapore": "SGT", "Asia/Taipei": "CST", "Asia/Bangkok": "ICT", "Asia/Dubai": "GST",
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

function getCustomOffsetMinutes(tz) {
    const offH = Number.isFinite(parseInt(tz.offH, 10)) ? parseInt(tz.offH, 10) : 0;
    const offM = Number.isFinite(parseInt(tz.offM, 10)) ? Math.abs(parseInt(tz.offM, 10)) : 0;
    const minuteSign = offH < 0 ? -1 : 1;
    return (offH * 60) + (minuteSign * offM);
}

function getSignedInclusiveDaySpan(mainDateTimeStr, extraDateTimeStr) {
    const parseDateOnly = (dateTimeStr) => {
        const dateStr = (dateTimeStr || "").split(" ")[0] || "";
        const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        return Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    };

    const tA = parseDateOnly(mainDateTimeStr);
    const tB = parseDateOnly(extraDateTimeStr);
    if (tA === null || tB === null) return null;

    const dayMagnitude = Math.floor(Math.abs(tB - tA) / 86400000) + 1;
    const sign = extraDateTimeStr >= mainDateTimeStr ? 1 : -1;
    return sign * dayMagnitude;
}

function getSignedDurationHms(mainDateTimeStr, extraDateTimeStr) {
    const parseDateTimeToUtcMs = (dateTimeStr) => {
        const m = (dateTimeStr || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
        if (!m) return null;
        return Date.UTC(
            parseInt(m[1], 10),
            parseInt(m[2], 10) - 1,
            parseInt(m[3], 10),
            parseInt(m[4], 10),
            parseInt(m[5], 10),
            parseInt(m[6], 10)
        );
    };

    const tA = parseDateTimeToUtcMs(mainDateTimeStr);
    const tB = parseDateTimeToUtcMs(extraDateTimeStr);
    if (tA === null || tB === null) return null;

    const sign = tB >= tA ? "" : "-";
    const totalSec = Math.floor(Math.abs(tB - tA) / 1000);
    const hour = Math.floor(totalSec / 3600);
    const minute = Math.floor((totalSec % 3600) / 60);
    const second = totalSec % 60;
    return `${sign}${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

function getLocalPartsByTimezone(date, tz) {
    if (tz.type === "custom") {
        const offsetMin = getCustomOffsetMinutes(tz);
        const shifted = new Date(date.getTime() + (offsetMin * 60000));
        return {
            year: shifted.getUTCFullYear(),
            month: shifted.getUTCMonth() + 1,
            day: shifted.getUTCDate(),
            hour: shifted.getUTCHours(),
            minute: shifted.getUTCMinutes(),
            second: shifted.getUTCSeconds()
        };
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz.zone || "UTC",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    const get = type => parts.find(p => p.type === type)?.value || "0";
    const hour = parseInt(get("hour"), 10);
    return {
        year: parseInt(get("year"), 10),
        month: parseInt(get("month"), 10),
        day: parseInt(get("day"), 10),
        hour: hour === 24 ? 0 : hour,
        minute: parseInt(get("minute"), 10),
        second: parseInt(get("second"), 10)
    };
}

function getUTCDateFromLocalParts(parts, tz) {
    const utcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    if (tz.type === "custom") {
        const offsetMin = getCustomOffsetMinutes(tz);
        return new Date(utcMs - (offsetMin * 60000));
    }
    if (!tz.zone || tz.zone === "UTC") return new Date(utcMs);
    const tempUTC = new Date(utcMs);
    const offMs = getTimezoneOffset(tz.zone, tempUTC) * 60000;
    return new Date(utcMs - offMs);
}

function shiftLocalParts(parts, delta = {}) {
    const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
    if (delta.hours) d.setUTCHours(d.getUTCHours() + delta.hours);
    if (delta.days) d.setUTCDate(d.getUTCDate() + delta.days);
    if (delta.weeks) d.setUTCDate(d.getUTCDate() + (delta.weeks * 7));
    return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
        hour: d.getUTCHours(),
        minute: d.getUTCMinutes(),
        second: d.getUTCSeconds()
    };
}

function applyTimeAdjustAction(slotIdx, action) {
    if (isRealtime) return;

    if (action === "sync_to_extra") {
        if (slotCount < 2) return;
        globalTimes[1] = new Date(globalTimes[slotIdx].getTime());
        updateClocks();
        return;
    }

    if (action === "sync_to_main") {
        if (slotCount < 2) return;
        globalTimes[0] = new Date(globalTimes[slotIdx].getTime());
        updateClocks();
        return;
    }

    if (action === "now") {
        globalTimes[slotIdx] = new Date();
        updateClocks();
        return;
    }

    const baseRef = getBaseTimezoneRef();
    let parts = getLocalPartsByTimezone(globalTimes[slotIdx], baseRef);

    switch (action) {
        case "midnight":
            parts.hour = 0;
            parts.minute = 0;
            parts.second = 0;
            break;
        case "sharp_hour":
            parts.minute = 0;
            parts.second = 0;
            break;
        case "plus_hour":
            parts = shiftLocalParts(parts, { hours: 1 });
            break;
        case "minus_hour":
            parts = shiftLocalParts(parts, { hours: -1 });
            break;
        case "plus_day":
            parts = shiftLocalParts(parts, { days: 1 });
            break;
        case "minus_day":
            parts = shiftLocalParts(parts, { days: -1 });
            break;
        case "plus_week":
            parts = shiftLocalParts(parts, { weeks: 1 });
            break;
        case "minus_week":
            parts = shiftLocalParts(parts, { weeks: -1 });
            break;
        default:
            return;
    }

    globalTimes[slotIdx] = getUTCDateFromLocalParts(parts, baseRef);
    updateClocks();
}

// --- Clock Logic ---
function updateClocks() {
    const baseRef = getBaseTimezoneRef();
    const utcRef = getUTCRef();
    updateRow(baseRef.id, baseRef);
    if (baseRef.id !== "utc") updateRow(utcRef.id, utcRef);
    const currentZones = getCurrentGroupZones().filter(tz => tz.id !== baseRef.id);
    currentZones.forEach(tz => updateRow(tz.id, tz));
}

function updateRow(id, tz) {
    const row = document.getElementById(`tz-row-${id}`);
    if (!row) return;

    let offsetStr = "";
    let zoneCodeMain = "";

    if (tz.type === "custom") {
        zoneCodeMain = normalizeCustomAbbr(tz.abbr);
        const offsetMin = getCustomOffsetMinutes(tz);
        const sign = offsetMin >= 0 ? "+" : "-";
        const absMin = Math.abs(offsetMin);
        const absHour = Math.floor(absMin / 60);
        const minPart = absMin % 60;
        offsetStr = `UTC${sign}${pad(absHour)}:${pad(minPart)}`;
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
    if (zoneCodeEl) zoneCodeEl.textContent = zoneCodeMain;
    if (offsetTextEl) offsetTextEl.textContent = offsetStr;

    // Helper: updateDN inside updateRow
    const updateDN = (hour, el) => {
        if (!el) return;
        const isDay = (hour >= 6 && hour <= 18);
        el.textContent = isDay ? "☀️" : "🌙";
        el.title = isDay ? t("dn_day") : t("dn_night");
    };

    const effectiveSlotCount = isRealtime ? 1 : slotCount;
    const slotTimeParts = [];
    for (let i = 0; i < effectiveSlotCount; i++) {
        let t;
        if (tz.type === "custom") {
            const curBase = globalTimes[i];
            const tMs = curBase.getTime() + (getCustomOffsetMinutes(tz) * 60000);
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

        let displayHour = 0;
        let displayDow = 0;
        let timeStr = "";

        if (tz.type === "custom") {
            displayHour = t.getUTCHours();
            displayDow = t.getUTCDay();
            timeStr = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())} ${pad(displayHour)}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}`;
        } else {
            displayHour = parseInt(t.str.split(" ")[1].split(":")[0]);
            displayDow = t.dow;
            timeStr = t.str;
        }

        if (input && document.activeElement !== input) input.value = timeStr;
        if (dayBadge) {
            dayBadge.textContent = I18N_DATA[currentLang].days[displayDow];
            dayBadge.className = "day-badge " + (displayDow === 0 ? "day-sun" : (displayDow === 6 ? "day-sat" : ""));
        }
        updateDN(displayHour, dnIcon);
        slotTimeParts.push(timeStr);
    }

    const periodEl = row.querySelector(".period-days-text");
    if (periodEl) {
        if (effectiveSlotCount > 1 && slotTimeParts.length > 1) {
            const spanDays = getSignedInclusiveDaySpan(slotTimeParts[0], slotTimeParts[1]);
            periodEl.textContent = spanDays === null ? "-" : `${spanDays}${t("unit_days_suffix")}`;
        } else {
            periodEl.textContent = "-";
        }
    }

    const periodTimeEl = row.querySelector(".period-time-text");
    if (periodTimeEl) {
        if (effectiveSlotCount > 1 && slotTimeParts.length > 1) {
            const spanTime = getSignedDurationHms(slotTimeParts[0], slotTimeParts[1]);
            periodTimeEl.textContent = spanTime === null ? "-" : spanTime;
        } else {
            periodTimeEl.textContent = "-";
        }
    }
}

function handleTimeChange(val, timezone, slotIdx) {
    if (isRealtime) return;
    const date = new Date(val.replace(" ", "T"));
    if (isNaN(date.getTime())) {
        showToast(t("toast_invalid_date"));
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
        const row = document.querySelector(".dragging") || (document.activeElement?.closest ? document.activeElement.closest("tr") : null);
        if (!row || !row.id) return;
        const tzId = row.id.replace("tz-row-", "");
        const currentZones = getCurrentGroupZones();
        const tz = currentZones.find(z => z.id === tzId);
        if (tz) {
            const offMs = getCustomOffsetMinutes(tz) * 60000;
            globalTimes[slotIdx] = new Date(tempUTC.getTime() - offMs);
        }
    } else {
        const offMs = getTimezoneOffset(timezone, tempUTC) * 60000;
        globalTimes[slotIdx] = new Date(tempUTC.getTime() - offMs);
    }
    updateClocks();
}

// --- Utils ---
// Clear and Redraw Options on init/lang change
function updateTZDropdown() {
    const quickSelect = document.getElementById("tz-quick-select");
    if (!quickSelect) return;
    const placeholder = quickSelect.options[0]; // popular city select
    quickSelect.innerHTML = "";
    quickSelect.appendChild(placeholder);

    const utcOption = document.createElement("option");
    utcOption.value = "UTC";
    utcOption.textContent = t("utc_name");
    quickSelect.appendChild(utcOption);

    getSortedTZData(TZ_DATABASE).forEach(t => {
        const o = document.createElement("option");
        o.value = t.zone;
        o.textContent = getLocalizedTZLabel(t);
        quickSelect.appendChild(o);
    });
    adjustSelectWidthForContent(quickSelect, 130);
}

function initSearchAndSelect() {
    const input = document.getElementById("tz-search-input");
    const results = document.getElementById("search-results");
    const quickSelect = document.getElementById("tz-quick-select");

    updateTZDropdown();

    quickSelect.onchange = (e) => {
        if (e.target.value === "UTC") {
            addTimezone({
                id: "tz-" + Date.now(),
                zone: "UTC",
                name_ko: I18N_DATA.ko.utc_name || "표준시",
                name_en: I18N_DATA.en.utc_name || "UTC",
                type: "standard"
            });
            quickSelect.value = "";
            return;
        }
        const d = TZ_DATABASE.find(t => t.zone === e.target.value);
        if (d) addTimezone({ id: "tz-" + Date.now(), zone: d.zone, name_ko: `${d.name} - ${d.city}`, name_en: `${d.name_en} - ${d.city_en}`, type: "standard" });
        quickSelect.value = "";
    };

    input.oninput = () => {
        const v = input.value.trim().toLowerCase();
        if (!v) { results.style.display = "none"; return; }
        const m = TZ_DATABASE.filter(t =>
            t.name.toLowerCase().includes(v) || t.city.toLowerCase().includes(v) ||
            t.name_en.toLowerCase().includes(v) || t.city_en.toLowerCase().includes(v)
        );
        const sortedMatched = getSortedTZData(m);
        results.innerHTML = "";
        sortedMatched.forEach(tzData => results.appendChild(createTimezoneListItem(tzData)));
        results.style.display = sortedMatched.length ? "block" : "none";
    };

    document.getElementById("show-all-tz").onclick = () => {
        const o = document.getElementById("full-tz-overlay");
        const list = document.getElementById("full-tz-list");
        list.innerHTML = "";
        getSortedTZData(TZ_DATABASE).forEach(tzData => list.appendChild(createTimezoneListItem(tzData, true)));
        o.style.display = "flex";
    };
    document.getElementById("close-overlay").onclick = () => document.getElementById("full-tz-overlay").style.display = "none";
}

function addFromSearchWithData(zone) {
    const d = TZ_DATABASE.find(t => t.zone === zone);
    if (d) {
        addTimezone({
            id: "tz-" + Date.now(),
            zone: d.zone,
            name_ko: `${d.name} - ${d.city}`,
            name_en: `${d.name_en} - ${d.city_en}`,
            type: "standard"
        });
    }
    document.getElementById("tz-search-input").value = "";
    document.getElementById("search-results").style.display = "none";
}

// function addFromSearch is now replaced by addFromSearchWithData
function addTimezone(tz) {
    const activeGroup = groups[activeGroupId];
    if (!activeGroup) return;
    activeGroup.zones.push(tz);
    savePersistence();
    renderList();
    updateClocks();
}
function removeTimezone(id) {
    const activeGroup = groups[activeGroupId];
    if (!activeGroup) return;
    if (id === baseTimezoneId) return;
    activeGroup.zones = activeGroup.zones.filter(z => z.id !== id);
    savePersistence();
    renderList();
    updateClocks();
}
function initDragAndDrop() {
    const c = document.getElementById("clocks-container");
    c.ondragover = e => { e.preventDefault(); const a = getAfter(c, e.clientY); const d = document.querySelector(".dragging"); if (d) c.insertBefore(d, a); };
}
function getAfter(c, y) { const drs = [...c.querySelectorAll(".time-row:not(.dragging):not(.static)")]; return drs.reduce((clo, ch) => { const b = ch.getBoundingClientRect(); const o = y - b.top - b.height / 2; if (o < 0 && o > clo.off) return { off: o, el: ch }; return clo; }, { off: Number.NEGATIVE_INFINITY }).el; }
function saveOrder() {
    const activeGroup = groups[activeGroupId];
    if (!activeGroup) return;
    const ids = [...document.querySelectorAll(".time-row:not(.static)")].map(r => r.id.replace("tz-row-", ""));
    activeGroup.zones.sort((a, b) => {
        const idxA = ids.indexOf(a.id);
        const idxB = ids.indexOf(b.id);
        if (idxA < 0 || idxB < 0) return 0;
        return idxA - idxB;
    });
    savePersistence();
}

function getCopyFieldText(row, key) {
    if (key === "timezone") {
        const zoneCodeRaw = (row.querySelector(".zone-code")?.textContent || "").trim();
        if (!zoneCodeRaw) return "";
        return zoneCodeRaw.startsWith("[") ? zoneCodeRaw : `[${zoneCodeRaw}]`;
    }

    if (key === "region") {
        return (row.querySelector(".zone-name")?.textContent || "").trim();
    }

    if (key === "offset") {
        const offsetText = (row.querySelector(".offset-text")?.textContent || "").trim();
        if (!offsetText) return "";
        return offsetText.startsWith("[") ? offsetText : `[${offsetText}]`;
    }

    if (key === "time") {
        const times = [...row.querySelectorAll(".time-input")].map(i => i.value.trim()).filter(Boolean);
        if (!times.length) return "";
        return times.join(" ~ ");
    }

    if (key === "period_days") {
        const periodText = (row.querySelector(".period-days-text")?.textContent || "").trim();
        if (!periodText || periodText === "-") return "";
        return `[${periodText}]`;
    }

    if (key === "period_time") {
        const periodTimeText = (row.querySelector(".period-time-text")?.textContent || "").trim();
        if (!periodTimeText || periodTimeText === "-") return "";
        return `[${periodTimeText}]`;
    }

    return "";
}

function getRowCopyText(row) {
    const orderedParts = [];
    copyFormatOrder.forEach(key => {
        if (!copyFormatEnabled[key]) return;
        const value = getCopyFieldText(row, key);
        if (value) orderedParts.push(value);
    });
    return orderedParts.join(" ").trim();
}

async function copyRow(id) {
    const row = document.getElementById(`tz-row-${id}`);
    if (!row) return;
    const text = getRowCopyText(row);
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        showToast(t("toast_copy_success"));
    } catch (err) {
        console.error("copyRow failed:", err);
        showToast(t("toast_copy_failed"));
    }
}

async function copyAllTimezones() {
    const lineArr = [...document.querySelectorAll(".time-row")].map(getRowCopyText).filter(Boolean);
    if (!lineArr.length) return;
    try {
        await navigator.clipboard.writeText(lineArr.join("\n"));
        showToast(t("toast_copy_all_success"));
    } catch (err) {
        console.error("copyAllTimezones failed:", err);
        showToast(t("toast_copy_failed"));
    }
}

function sanitizeFilenamePart(value) {
    return String(value || "")
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function formatDateTimeByTimezone(date, tz) {
    if (tz?.type === "custom") {
        const offsetMin = getCustomOffsetMinutes(tz);
        const shifted = new Date(date.getTime() + (offsetMin * 60000));
        return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz?.zone || "UTC",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    const get = (type) => parts.find(p => p.type === type)?.value || "0";
    const hourRaw = parseInt(get("hour"), 10);
    const hour = hourRaw === 24 ? 0 : hourRaw;
    return `${get("year")}-${pad(get("month"))}-${pad(get("day"))} ${pad(hour)}:${pad(get("minute"))}:${pad(get("second"))}`;
}

function getTimezoneTableImageFilename() {
    const baseRef = getBaseTimezoneRef();
    const groupName = sanitizeFilenamePart(groups[activeGroupId]?.name || t("default_group_name")) || "Group";
    const baseAbbr = sanitizeFilenamePart(getZoneAbbreviation(baseRef) || "UTC") || "UTC";

    const baseRow = document.getElementById(`tz-row-${baseRef.id}`);
    const baseTimeInput = baseRow?.querySelector(".slot-0");
    const baseDateTime = (baseTimeInput?.value || formatDateTimeByTimezone(globalTimes[0], baseRef)).trim();
    const m = baseDateTime.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    const timePart = sanitizeFilenamePart(m ? `${m[1]} ${m[2]}${m[3]}${m[4]}` : baseDateTime.replace(/:/g, "")) || "time";

    return `${groupName}_${baseAbbr}_${timePart}`;
}

function collectDocumentCssText() {
    let cssText = "";
    for (const styleSheet of [...document.styleSheets]) {
        try {
            for (const rule of [...styleSheet.cssRules]) {
                cssText += `${rule.cssText}\n`;
            }
        } catch (err) {
            // Ignore stylesheets that are not readable due to browser security restrictions.
        }
    }
    return cssText;
}

function cloneTableForImageExport(tableEl) {
    const clone = tableEl.cloneNode(true);
    const srcInputs = tableEl.querySelectorAll(".time-input");
    const clonedInputs = clone.querySelectorAll(".time-input");

    clonedInputs.forEach((inputEl, idx) => {
        const span = document.createElement("span");
        span.className = "export-time-text";
        span.textContent = srcInputs[idx]?.value || "";
        inputEl.replaceWith(span);
    });

    return clone;
}

function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function extractTableCellText(cell) {
    if (!cell) return "";
    const timeInput = cell.querySelector(".time-input");
    if (timeInput) {
        const dayBadge = cell.querySelector(".day-badge");
        const timeText = (timeInput.value || "").trim();
        const dayText = (dayBadge?.textContent || "").trim();
        return dayText ? `${timeText} ${dayText}` : timeText;
    }

    const zoneCode = (cell.querySelector(".zone-code")?.textContent || "").trim();
    if (zoneCode) return zoneCode;
    const zoneName = (cell.querySelector(".zone-name")?.textContent || "").trim();
    if (zoneName) return zoneName;
    const offsetText = (cell.querySelector(".offset-text")?.textContent || "").trim();
    if (offsetText) return offsetText;
    const periodDays = (cell.querySelector(".period-days-text")?.textContent || "").trim();
    if (periodDays && periodDays !== "-") return periodDays;
    const periodTime = (cell.querySelector(".period-time-text")?.textContent || "").trim();
    if (periodTime && periodTime !== "-") return periodTime;
    const buttonText = (cell.querySelector("button")?.textContent || "").trim();
    if (buttonText) return buttonText;
    return (cell.textContent || "").trim();
}

function renderTimezoneTableFallbackDataUrl() {
    const table = document.querySelector("#timezone-section .data-table");
    if (!table) throw new Error("Table element not found");

    const headerCells = [...table.querySelectorAll("#table-head th")];
    const bodyRows = [...table.querySelectorAll("#clocks-container tr.time-row")];
    if (!headerCells.length || !bodyRows.length) {
        throw new Error("No table data to render");
    }

    const colCount = headerCells.length;
    const measuredColWidths = headerCells.map((th) => {
        const w = Math.ceil(th.getBoundingClientRect().width);
        return Math.max(w, 70);
    });
    const tableWidth = measuredColWidths.reduce((acc, w) => acc + w, 0);
    const headerHeight = Math.max(34, Math.ceil(headerCells[0].getBoundingClientRect().height) || 40);
    const rowHeights = bodyRows.map((row) => Math.max(34, Math.ceil(row.getBoundingClientRect().height) || 40));
    const tableHeight = headerHeight + rowHeights.reduce((acc, h) => acc + h, 0);

    const scale = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const canvas = document.createElement("canvas");
    canvas.width = tableWidth * scale;
    canvas.height = tableHeight * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.scale(scale, scale);

    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const headBg = (rootStyle.getPropertyValue("--table-head-bg") || "#1e293b").trim();
    const borderColor = (rootStyle.getPropertyValue("--border") || "rgba(148,163,184,0.25)").trim();
    const textColor = (rootStyle.getPropertyValue("--text") || "#f1f5f9").trim();
    const dimColor = (rootStyle.getPropertyValue("--text-dim") || "#94a3b8").trim();
    const rowBgA = "rgba(255,255,255,0.02)";
    const rowBgB = "rgba(255,255,255,0.04)";
    const pageBg = bodyStyle.backgroundColor || "#0f172a";

    ctx.fillStyle = pageBg;
    ctx.fillRect(0, 0, tableWidth, tableHeight);

    const drawCellText = (text, x, y, w, h, align = "left", color = textColor, font = "13px Inter") => {
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.textBaseline = "middle";
        const padX = 8;
        if (align === "center") {
            ctx.textAlign = "center";
            ctx.fillText(text, x + (w / 2), y + (h / 2));
        } else {
            ctx.textAlign = "left";
            ctx.fillText(text, x + padX, y + (h / 2));
        }
        ctx.restore();
    };

    const isCenterHeader = (idx) => true;
    const isCenterBodyByHeader = (headerText) => {
        const normalized = (headerText || "").toLowerCase();
        return (
            normalized.includes("utc") ||
            normalized.includes("기간") ||
            normalized.includes("period") ||
            normalized.includes("copy") ||
            normalized.includes("remove") ||
            normalized.includes("복사") ||
            normalized.includes("제거")
        );
    };

    let y = 0;
    ctx.fillStyle = headBg;
    ctx.fillRect(0, y, tableWidth, headerHeight);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + headerHeight - 0.5);
    ctx.lineTo(tableWidth, y + headerHeight - 0.5);
    ctx.stroke();

    let x = 0;
    for (let c = 0; c < colCount; c++) {
        const w = measuredColWidths[c];
        const headText = (headerCells[c].textContent || "").trim();
        drawCellText(headText, x, y, w, headerHeight, isCenterHeader(c) ? "center" : "left", dimColor, "600 13px Inter");
        if (c < colCount - 1) {
            ctx.beginPath();
            ctx.moveTo(x + w - 0.5, y);
            ctx.lineTo(x + w - 0.5, tableHeight);
            ctx.stroke();
        }
        x += w;
    }

    y += headerHeight;
    bodyRows.forEach((row, rowIdx) => {
        const h = rowHeights[rowIdx];
        ctx.fillStyle = rowIdx % 2 === 0 ? rowBgA : rowBgB;
        ctx.fillRect(0, y, tableWidth, h);
        ctx.beginPath();
        ctx.moveTo(0, y + h - 0.5);
        ctx.lineTo(tableWidth, y + h - 0.5);
        ctx.stroke();

        let rowX = 0;
        const cells = [...row.children];
        for (let c = 0; c < colCount; c++) {
            const w = measuredColWidths[c];
            const cell = cells[c];
            const text = extractTableCellText(cell);
            const headText = (headerCells[c]?.textContent || "").trim();
            const center = isCenterBodyByHeader(headText);
            drawCellText(text, rowX, y, w, h, center ? "center" : "left", textColor, "13px Inter");
            rowX += w;
        }
        y += h;
    });

    return canvas.toDataURL("image/png");
}

async function renderTimezoneTableToPngDataUrl() {
    const tableEl = document.querySelector("#timezone-section .data-table");
    if (!tableEl) throw new Error("Table element not found");

    const clonedTable = cloneTableForImageExport(tableEl);
    const measureHost = document.createElement("div");
    measureHost.style.position = "fixed";
    measureHost.style.left = "-100000px";
    measureHost.style.top = "0";
    measureHost.style.opacity = "0";
    measureHost.style.pointerEvents = "none";
    measureHost.appendChild(clonedTable);
    document.body.appendChild(measureHost);

    const rect = clonedTable.getBoundingClientRect();
    const width = Math.max(1, Math.ceil(rect.width));
    const height = Math.max(1, Math.ceil(rect.height));
    const tableMarkup = new XMLSerializer().serializeToString(clonedTable);
    measureHost.remove();

    const cssText = collectDocumentCssText();
    const extraCss = `
        .data-table th { position: static !important; }
        .export-time-text {
            display: inline-block;
            width: var(--input-w);
            font-family: 'JetBrains Mono', monospace;
            font-size: calc(16px * var(--ui-scale));
            line-height: 1.3;
            color: var(--text);
            padding: 7px 12px;
            border-radius: 4px;
            border: 1px solid transparent;
            background: transparent;
            white-space: nowrap;
        }
    `;
    const safeCssText = `${cssText}\n${extraCss}`.replace(/<\/style>/gi, "<\\/style>");

    const svgMarkup = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml">
                    <style>${safeCssText}</style>
                    ${tableMarkup}
                </div>
            </foreignObject>
        </svg>
    `;

    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
        if (document.fonts?.ready) {
            await document.fonts.ready;
        }
        const img = await loadImageElement(svgUrl);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");
        ctx.fillStyle = getComputedStyle(document.body).backgroundColor || "#0f172a";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL("image/png");
    } finally {
        URL.revokeObjectURL(svgUrl);
    }
}

function downloadDataUrl(dataUrl, filename) {
    return new Promise((resolve, reject) => {
        if (typeof chrome !== "undefined" && chrome.downloads?.download) {
            chrome.downloads.download(
                { url: dataUrl, filename, saveAs: false },
                (downloadId) => {
                    if (chrome.runtime?.lastError || !downloadId) {
                        // Fallback to anchor download when extension downloads API is unavailable.
                        try {
                            const anchor = document.createElement("a");
                            anchor.href = dataUrl;
                            anchor.download = filename;
                            document.body.appendChild(anchor);
                            anchor.click();
                            anchor.remove();
                            resolve();
                        } catch (fallbackErr) {
                            reject(fallbackErr);
                        }
                        return;
                    }
                    resolve();
                }
            );
            return;
        }

        try {
            const anchor = document.createElement("a");
            anchor.href = dataUrl;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            resolve();
        } catch (err) {
            reject(err);
        }
    });
}

async function saveTimezoneTableImage() {
    try {
        let dataUrl = "";
        try {
            dataUrl = await renderTimezoneTableToPngDataUrl();
        } catch (primaryErr) {
            console.warn("Primary table image render failed. Fallback renderer is used.", primaryErr);
            dataUrl = renderTimezoneTableFallbackDataUrl();
        }
        const filename = `${getTimezoneTableImageFilename()}.png`;
        await downloadDataUrl(dataUrl, filename);
        showToast(t("toast_table_image_saved"));
    } catch (err) {
        console.error("Failed to save timezone table image:", err);
        showToast(t("toast_table_image_failed"));
    }
}


function initCalculators() {
    const pS = document.getElementById("period-start"); const pE = document.getElementById("period-end");
    const oS = document.getElementById("offset-start"); const oV = document.getElementById("off-val"); const oU = document.getElementById("off-unit");
    const btnPlus = document.getElementById("off-plus"); const btnMinus = document.getElementById("off-minus");
    const periodDayRes = document.getElementById("period-res");
    const periodHourRes = document.getElementById("period-hour-res");
    const periodMinRes = document.getElementById("period-min-res");
    const periodSecRes = document.getElementById("period-sec-res");
    const copyBindings = [
        ["copy-conv-day-btn", "conv-day", true],
        ["copy-conv-hour-btn", "conv-hour", true],
        ["copy-conv-min-btn", "conv-min", true],
        ["copy-conv-sec-btn", "conv-sec", true],
        ["copy-period-res-btn", "period-res", false],
        ["copy-period-hour-res-btn", "period-hour-res", false],
        ["copy-period-min-res-btn", "period-min-res", false],
        ["copy-period-sec-res-btn", "period-sec-res", false],
        ["copy-offset-res-btn", "offset-res", false]
    ];

    pS.valueAsDate = pE.valueAsDate = oS.valueAsDate = new Date();

    const setPeriodResult = (el, value, unitKey) => {
        if (!el) return;
        el.textContent = `${value}${t(unitKey)}`;
    };

    const calc = () => {
        if (pS.valueAsDate && pE.valueAsDate) {
            const diffMs = pE.valueAsDate.getTime() - pS.valueAsDate.getTime();
            setPeriodResult(periodDayRes, Math.round(diffMs / 86400000), "unit_days_suffix");
            setPeriodResult(periodHourRes, Math.round(diffMs / 3600000), "unit_hours_suffix");
            setPeriodResult(periodMinRes, Math.round(diffMs / 60000), "unit_minutes_suffix");
            setPeriodResult(periodSecRes, Math.round(diffMs / 1000), "unit_seconds_suffix");
        } else {
            setPeriodResult(periodDayRes, 0, "unit_days_suffix");
            setPeriodResult(periodHourRes, 0, "unit_hours_suffix");
            setPeriodResult(periodMinRes, 0, "unit_minutes_suffix");
            setPeriodResult(periodSecRes, 0, "unit_seconds_suffix");
        }
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
    copyBindings.forEach(([btnId, targetId, isInput]) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener("click", () => copyText(targetId, isInput));
    });
    if (typeof window !== "undefined") window.__gtvCalcRefresh = calc;
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
    let text = (isInput ? el.value : (el.textContent || "")).trim();
    if (!isInput && PERIOD_RESULT_IDS.has(elementId)) {
        const matchedNumber = text.match(/-?\d+(\.\d+)?/);
        text = matchedNumber ? matchedNumber[0] : "";
    }
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        showToast(t("toast_copy_success"));
    } catch (err) {
        console.error("copyText failed:", err);
        showToast(t("toast_copy_failed"));
    }
}

function savePersistence() {
    currentMainTab = sanitizeMainTab(currentMainTab);
    if (currentMainTab === "live" || currentMainTab === "fixed") {
        activeGroupIdByMainTab[currentMainTab] = activeGroupId;
    }
    normalizeGroupTabState();

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        groups,
        activeGroupId,
        currentMainTab,
        activeGroupIdByMainTab,
        slotCount,
        baseTimezoneId,
        showTimeAdjust,
        showCopyFormat,
        copyFormatOrder: sanitizeCopyFormatOrder(copyFormatOrder),
        copyFormatEnabled: sanitizeCopyFormatEnabled(copyFormatEnabled)
    }));
}

function getDefaultGroups() {
    return [{ name: t("default_group_name"), zones: [{ id: "seoul", name_ko: "대한민국 - 서울", name_en: "South Korea - Seoul", zone: "Asia/Seoul", type: "standard" }] }];
}

function sanitizeTimezoneZone(zone) {
    if (!zone || typeof zone !== "object") return null;
    const id = (typeof zone.id === "string" && zone.id.trim()) ? zone.id : null;
    if (!id) return null;

    if (zone.type === "custom") {
        const offH = parseInt(zone.offH, 10);
        const offM = parseInt(zone.offM, 10);
        return {
            id,
            type: "custom",
            abbr: normalizeCustomAbbr(zone.abbr),
            name: (typeof zone.name === "string" && zone.name.trim()) ? zone.name.trim() : t("label_custom"),
            offH: Number.isFinite(offH) ? Math.max(-14, Math.min(14, offH)) : 0,
            offM: Number.isFinite(offM) ? Math.max(0, Math.min(59, Math.abs(offM))) : 0
        };
    }

    const timeZoneName = (typeof zone.zone === "string" && zone.zone.trim()) ? zone.zone : null;
    if (!timeZoneName) return null;
    const fallbackName = (typeof zone.name === "string" && zone.name.trim()) ? zone.name.trim() : timeZoneName;
    return {
        id,
        type: "standard",
        zone: timeZoneName,
        name_ko: (typeof zone.name_ko === "string" && zone.name_ko.trim()) ? zone.name_ko : fallbackName,
        name_en: (typeof zone.name_en === "string" && zone.name_en.trim()) ? zone.name_en : fallbackName
    };
}

function sanitizeGroup(group, idx) {
    if (!group || typeof group !== "object") return null;
    const zones = Array.isArray(group.zones) ? group.zones.map(sanitizeTimezoneZone).filter(Boolean) : [];
    const name = (typeof group.name === "string" && group.name.trim()) ? group.name.trim() : `${t("default_group_name")} ${idx + 1}`;
    return { name, zones };
}

function loadPersistence() {
    const legacyKeys = ["GTV_v310_Data", "GTV_v300_Data", "GTV_v200_Data", "GTV_v170_Data", "GTV_v160_Data", "GTV_v150_Data", "GTV_v140_Data"];
    let s = localStorage.getItem(STORAGE_KEY);
    if (!s) {
        for (const key of legacyKeys) {
            const legacy = localStorage.getItem(key);
            if (legacy) {
                s = legacy;
                break;
            }
        }
    }

    if (!s) {
        groups = getDefaultGroups();
        activeGroupId = 0;
        currentMainTab = "live";
        activeGroupIdByMainTab = { live: 0, fixed: 0 };
        slotCount = 1;
        baseTimezoneId = "utc";
        showTimeAdjust = false;
        showCopyFormat = false;
        copyFormatOrder = [...COPY_FORMAT_KEYS];
        copyFormatEnabled = sanitizeCopyFormatEnabled(null);
        isRealtime = true;
        return;
    }

    try {
        const d = JSON.parse(s);
        const parsedGroups = Array.isArray(d?.groups) ? d.groups.map(sanitizeGroup).filter(Boolean) : [];
        groups = parsedGroups.length ? parsedGroups : getDefaultGroups();

        const parsedActiveGroupId = parseInt(d?.activeGroupId, 10);
        activeGroupId = Number.isFinite(parsedActiveGroupId) ? Math.min(Math.max(parsedActiveGroupId, 0), groups.length - 1) : 0;
        currentMainTab = sanitizeMainTab(d?.currentMainTab);

        const rawGroupMap = (d?.activeGroupIdByMainTab && typeof d.activeGroupIdByMainTab === "object")
            ? d.activeGroupIdByMainTab
            : null;
        const fallbackGroupId = activeGroupId;
        const mapLive = parseInt(rawGroupMap?.live, 10);
        const mapFixed = parseInt(rawGroupMap?.fixed, 10);
        activeGroupIdByMainTab = {
            live: Number.isFinite(mapLive) ? mapLive : fallbackGroupId,
            fixed: Number.isFinite(mapFixed) ? mapFixed : fallbackGroupId
        };

        const parsedSlotCount = parseInt(d?.slotCount, 10);
        slotCount = Math.min(2, Math.max(1, Number.isFinite(parsedSlotCount) ? parsedSlotCount : 1));

        baseTimezoneId = (typeof d?.baseTimezoneId === "string" && d.baseTimezoneId.trim()) ? d.baseTimezoneId : "utc";
        showTimeAdjust = !!d?.showTimeAdjust;
        showCopyFormat = !!d?.showCopyFormat;
        copyFormatOrder = sanitizeCopyFormatOrder(d?.copyFormatOrder);
        copyFormatEnabled = sanitizeCopyFormatEnabled(d?.copyFormatEnabled);
        normalizeGroupTabState();
        if (currentMainTab === "live" || currentMainTab === "fixed") {
            activeGroupId = activeGroupIdByMainTab[currentMainTab];
        }
        isRealtime = (currentMainTab === "live");
        ensureBaseTimezoneSelection();
    } catch (err) {
        console.warn("Failed to parse persisted data. Falling back to defaults.", err);
        groups = getDefaultGroups();
        activeGroupId = 0;
        currentMainTab = "live";
        activeGroupIdByMainTab = { live: 0, fixed: 0 };
        slotCount = 1;
        baseTimezoneId = "utc";
        showTimeAdjust = false;
        showCopyFormat = false;
        copyFormatOrder = [...COPY_FORMAT_KEYS];
        copyFormatEnabled = sanitizeCopyFormatEnabled(null);
        isRealtime = true;
        savePersistence();
    }
}
