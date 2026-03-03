let isRealtime = true;
let globalTimes = [new Date(), new Date()];
let slotCount = 1;
let uiScale = 1.0;
let showTimeAdjust = false;
let showCopyFormat = false;
let ignoreDST = true;
const COPY_FORMAT_KEYS = ["timezone", "region", "offset", "time", "period_days", "period_time"];
const TIME_PART_KEYS = ["dn", "date", "time", "weekday"];
const PERIOD_RESULT_IDS = new Set(["period-res", "period-hour-res", "period-min-res", "period-sec-res"]);
const MAIN_TABS = ["live", "fixed", "calc"];
const MIN_TIME_ADJUST_DAY_STEP = 1;
const MAX_TIME_ADJUST_DAY_STEP = 36500;
const DEFAULT_TIME_ADJUST_DAY_STEP = 1;
const DEFAULT_DISPLAY_FORMAT_ENABLED = {
    timezone: true,
    region: true,
    offset: true,
    time: true,
    period_days: false,
    period_time: true
};
const DEFAULT_COPY_FORMAT_ENABLED = {
    timezone: true,
    region: true,
    offset: true,
    time: true,
    period_days: false,
    period_time: true
};
const DEFAULT_DISPLAY_TIME_PARTS_ENABLED = {
    dn: true,
    date: true,
    time: true,
    weekday: true
};
const DEFAULT_COPY_TIME_PARTS_ENABLED = {
    dn: false,
    date: true,
    time: true,
    weekday: false
};
let displayFormatOrder = [...COPY_FORMAT_KEYS];
let displayFormatEnabled = { ...DEFAULT_DISPLAY_FORMAT_ENABLED };
let copyFormatOrder = [...COPY_FORMAT_KEYS];
let copyFormatEnabled = { ...DEFAULT_COPY_FORMAT_ENABLED };
let displayTimePartsEnabled = { ...DEFAULT_DISPLAY_TIME_PARTS_ENABLED };
let copyTimePartsEnabled = { ...DEFAULT_COPY_TIME_PARTS_ENABLED };
let timeAdjustDayStepBySlot = [DEFAULT_TIME_ADJUST_DAY_STEP, DEFAULT_TIME_ADJUST_DAY_STEP];
let currentMainTab = "live";
let activeGroupIdByMainTab = { live: 0, fixed: 0 };
const VERSION = "3.2.11";
const STORAGE_KEY = "GTV_v323_Data";
const THEME_STORAGE_KEY = "GTV_Theme";
const LANG_STORAGE_KEY = "GTV_Lang";
const UI_SCALE_STORAGE_KEY = "GTV_UIScale";
const MIN_UI_SCALE_PERCENT = 50;
const MAX_UI_SCALE_PERCENT = 200;
const DEFAULT_UI_SCALE_PERCENT = 100;
const UI_SCALE_STEP_PERCENT = 10;
const LEGACY_STORAGE_KEYS = ["GTV_v322_Data", "GTV_v321_Data", "GTV_v320_Data", "GTV_v310_Data", "GTV_v300_Data", "GTV_v200_Data", "GTV_v170_Data", "GTV_v160_Data", "GTV_v150_Data", "GTV_v140_Data"];
const THEME_LIST = ["dark", "light"];
const TABLE_IMAGE_EXPORT_WIDTH = 1920;
let currentTheme = "dark";
const TIMEZONE_VALIDATION_CACHE = new Map();
let canUseForeignObjectRenderer = null;
let timePartsOutsideHandlerBound = false;
let timezoneIdSeed = 0;

function applyVersionBranding() {
    const titleText = `Global Time v${VERSION}`;
    document.title = titleText;
    const badge = document.getElementById("version-badge");
    if (badge) badge.textContent = `ver ${VERSION}`;
}

// --- ??꾩〈 留댮곎궿둘 ?곗씠??(Extensive Mapping for Abbr) ---
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
    { zone: "Europe/Istanbul", name: "튀르키예", city: "이스탄불", name_en: "Turkey", city_en: "Istanbul" },
    { zone: "America/New_York", name: "미국", city: "뉴욕", name_en: "USA", city_en: "New York" },
    { zone: "America/Chicago", name: "미국", city: "시카고", name_en: "USA", city_en: "Chicago" },
    { zone: "America/Los_Angeles", name: "미국", city: "로스앤젤레스", name_en: "USA", city_en: "Los Angeles" },
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

function getCurrentGroup() {
    return groups[activeGroupId] || null;
}

function sanitizeBaseTimezoneId(value) {
    return (typeof value === "string" && value.trim()) ? value.trim() : "utc";
}

function sanitizeUtcRowOrder(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
}

function getCurrentGroupBaseTimezoneId() {
    const group = getCurrentGroup();
    if (!group) return "utc";
    return sanitizeBaseTimezoneId(group.baseTimezoneId);
}

function setCurrentGroupBaseTimezoneId(value) {
    const group = getCurrentGroup();
    if (!group) return false;
    group.baseTimezoneId = sanitizeBaseTimezoneId(value);
    return true;
}

function getCurrentGroupZones() {
    return getCurrentGroup()?.zones || [];
}

function getUsedTimezoneIds() {
    const usedIds = new Set(["utc"]);
    groups.forEach((group) => {
        if (!group || !Array.isArray(group.zones)) return;
        group.zones.forEach((zone) => {
            const zoneId = (typeof zone?.id === "string") ? zone.id.trim() : "";
            if (zoneId) usedIds.add(zoneId);
        });
    });
    return usedIds;
}

function createUniqueTimezoneId(prefix = "tz") {
    const normalizedPrefix = (typeof prefix === "string" && prefix.trim()) ? prefix.trim() : "tz";
    const usedIds = getUsedTimezoneIds();

    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        const uuidId = `${normalizedPrefix}-${crypto.randomUUID()}`;
        if (!usedIds.has(uuidId)) return uuidId;
    }

    for (let attempt = 0; attempt < 10000; attempt++) {
        timezoneIdSeed = (timezoneIdSeed + 1) % 1000000;
        const candidate = `${normalizedPrefix}-${Date.now()}-${timezoneIdSeed}`;
        if (!usedIds.has(candidate)) return candidate;
    }

    return `${normalizedPrefix}-${Date.now()}-${Math.floor(Math.random() * 1000000000)}`;
}

function isCurrentGroupUtcRowVisible() {
    const group = getCurrentGroup();
    if (!group) return true;
    return group.showUtcRow !== false;
}

function getCurrentGroupUtcRowOrder() {
    const group = getCurrentGroup();
    if (!group) return 0;
    return sanitizeUtcRowOrder(group.utcRowOrder);
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
    const group = getCurrentGroup();
    if (!group) return;
    const currentBaseTimezoneId = getCurrentGroupBaseTimezoneId();
    if (currentBaseTimezoneId === "utc") {
        group.baseTimezoneId = "utc";
        return;
    }
    const exists = (group.zones || []).some(z => z.id === currentBaseTimezoneId);
    if (!exists) group.baseTimezoneId = "utc";
}

function getUTCRef() {
    return { id: "utc", type: "standard", zone: "UTC", name: t("utc_name") };
}

function getBaseTimezoneRef() {
    ensureBaseTimezoneSelection();
    const currentBaseTimezoneId = getCurrentGroupBaseTimezoneId();
    if (currentBaseTimezoneId === "utc") return getUTCRef();
    const tz = getCurrentGroupZones().find(z => z.id === currentBaseTimezoneId);
    if (!tz) return getUTCRef();
    return tz;
}

function getDefaultFormatEnabled(mode = "display") {
    return mode === "copy" ? { ...DEFAULT_COPY_FORMAT_ENABLED } : { ...DEFAULT_DISPLAY_FORMAT_ENABLED };
}

function getDefaultTimePartsEnabled(mode = "display") {
    return mode === "copy" ? { ...DEFAULT_COPY_TIME_PARTS_ENABLED } : { ...DEFAULT_DISPLAY_TIME_PARTS_ENABLED };
}

function normalizeCopyFormatKey(rawKey) {
    let normalizedKey = rawKey === "period" ? "period_days" : rawKey;
    if (normalizedKey === "time_day" || normalizedKey === "date_day" || normalizedKey === "date") {
        normalizedKey = "time";
    }
    return normalizedKey;
}

function sanitizeCopyFormatOrder(order) {
    const safeOrder = [];
    if (Array.isArray(order)) {
        order.forEach(key => {
            const normalizedKey = normalizeCopyFormatKey(key);
            if (COPY_FORMAT_KEYS.includes(normalizedKey) && !safeOrder.includes(normalizedKey)) safeOrder.push(normalizedKey);
        });
    }
    COPY_FORMAT_KEYS.forEach(key => {
        if (!safeOrder.includes(key)) safeOrder.push(key);
    });
    return safeOrder;
}

function sanitizeCopyFormatEnabled(enabled, mode = "display") {
    const safe = getDefaultFormatEnabled(mode);
    COPY_FORMAT_KEYS.forEach(key => {
        if (enabled && typeof enabled === "object") {
            if (Object.prototype.hasOwnProperty.call(enabled, key)) {
                safe[key] = !!enabled[key];
                return;
            }
            if (key === "time") {
                const hasLegacyTime = !!enabled.time_day || !!enabled.date_day || !!enabled.date;
                if (hasLegacyTime) {
                    safe[key] = true;
                    return;
                }
            }
            if (key === "period_days" && Object.prototype.hasOwnProperty.call(enabled, "period")) {
                safe[key] = !!enabled.period;
                return;
            }
        }
    });
    return safe;
}

function sanitizeTimePartsEnabled(parts, mode = "display") {
    const safe = getDefaultTimePartsEnabled(mode);
    if (!parts || typeof parts !== "object") return safe;
    TIME_PART_KEYS.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(parts, key)) {
            safe[key] = !!parts[key];
        }
    });
    return safe;
}

function deriveTimePartsFromLegacyEnabled(legacyEnabled, mode = "display") {
    return sanitizeTimePartsEnabled(null, mode);
}

function sanitizeUiScalePercent(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_UI_SCALE_PERCENT;
    return Math.min(MAX_UI_SCALE_PERCENT, Math.max(MIN_UI_SCALE_PERCENT, parsed));
}

function getCurrentUiScalePercent() {
    return Math.round(uiScale * 100);
}

function applyUiScale(scalePercent, persist = true) {
    const safePercent = sanitizeUiScalePercent(scalePercent);
    uiScale = safePercent / 100;

    if (document.documentElement) {
        document.documentElement.style.setProperty("--ui-zoom", uiScale.toFixed(2));
        document.documentElement.style.zoom = String(uiScale);
        document.documentElement.style.overflow = "hidden";
    }
    if (document.body) {
        document.body.style.overflow = "hidden";
    }

    if (persist) {
        localStorage.setItem(UI_SCALE_STORAGE_KEY, String(safePercent));
    }
}

function loadUiScalePreference() {
    return sanitizeUiScalePercent(localStorage.getItem(UI_SCALE_STORAGE_KEY) || DEFAULT_UI_SCALE_PERCENT);
}

function populateUiScaleSelect(selectEl) {
    if (!selectEl) return;

    selectEl.innerHTML = "";
    for (let percent = MIN_UI_SCALE_PERCENT; percent <= MAX_UI_SCALE_PERCENT; percent += UI_SCALE_STEP_PERCENT) {
        const option = document.createElement("option");
        option.value = String(percent);
        option.textContent = `${percent}%`;
        selectEl.appendChild(option);
    }
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
    applyUiScale(loadUiScalePreference(), false);
    applyTranslations();
    applyVersionBranding();
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

    const uiScaleSelect = document.getElementById("ui-scale-select");
    if (uiScaleSelect) {
        populateUiScaleSelect(uiScaleSelect);
        uiScaleSelect.value = String(getCurrentUiScalePercent());
        uiScaleSelect.onchange = (e) => {
            applyUiScale(e.target.value);
            uiScaleSelect.value = String(getCurrentUiScalePercent());
        };
    }

    // Populate Custom Offset Hour Select
    const hSel = document.getElementById("custom-off-h");
    if (hSel) {
        for (let i = 14; i >= -12; i--) {
            const o = document.createElement("option");
            o.value = i;
            const sign = i > 0 ? "+" : (i < 0 ? "-" : "+");
            o.textContent = `${sign}${String(Math.abs(i)).padStart(2, "0")}`;
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

    const ignoreDSTToggle = document.getElementById("toggle-ignore-dst");
    if (ignoreDSTToggle) {
        ignoreDSTToggle.checked = ignoreDST;
        ignoreDSTToggle.onchange = (e) => {
            ignoreDST = !!e.target.checked;
            updateClocks();
            savePersistence();
        };
    }

    const displayFormatResetBtn = document.getElementById("display-format-reset-btn");
    if (displayFormatResetBtn) {
        displayFormatResetBtn.onclick = () => {
            displayFormatOrder = [...COPY_FORMAT_KEYS];
            displayFormatEnabled = sanitizeCopyFormatEnabled(null, "display");
            displayTimePartsEnabled = sanitizeTimePartsEnabled(null, "display");
            renderCopyFormatControls();
            renderList();
            savePersistence();
        };
    }

    const copyFormatResetBtn = document.getElementById("copy-format-reset-btn");
    if (copyFormatResetBtn) {
        copyFormatResetBtn.onclick = () => {
            copyFormatOrder = [...COPY_FORMAT_KEYS];
            copyFormatEnabled = sanitizeCopyFormatEnabled(null, "copy");
            copyTimePartsEnabled = sanitizeTimePartsEnabled(null, "copy");
            renderCopyFormatControls();
            savePersistence();
        };
    }

    const baseTimeSelect = document.getElementById("base-time-select");
    if (baseTimeSelect) {
        baseTimeSelect.onchange = (e) => {
            const nextBaseId = e.target.value || "utc";
            if (nextBaseId === "utc") {
                const activeGroup = getCurrentGroup();
                if (activeGroup) {
                    activeGroup.showUtcRow = true;
                    activeGroup.utcRowOrder = 0;
                }
            }
            setCurrentGroupBaseTimezoneId(nextBaseId);
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
        addTimezone({ id: createUniqueTimezoneId("tz-c"), abbr, name, offH, offM, type: "custom" });
        document.getElementById("custom-abbr").value = "";
        document.getElementById("custom-name").value = "";
    };

    document.getElementById("add-group-btn").onclick = () => {
        const name = prompt(t("prompt_new_group"), "그룹");
        if (name) {
            groups.push({ name, zones: [], baseTimezoneId: "utc", showUtcRow: true, utcRowOrder: 0 });
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
    const exportSettingsBtn = document.getElementById("export-settings-btn");
    if (exportSettingsBtn) {
        exportSettingsBtn.onclick = exportSettingsToJSON;
    }
    const importSettingsBtn = document.getElementById("import-settings-btn");
    const settingsImportFile = document.getElementById("settings-import-file");
    if (importSettingsBtn && settingsImportFile) {
        importSettingsBtn.onclick = () => {
            settingsImportFile.value = "";
            settingsImportFile.click();
        };
        settingsImportFile.onchange = handleSettingsImportFile;
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
            applyVersionBranding();
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

    const resetAllSettingsBtn = document.getElementById("reset-all-settings-btn");
    if (resetAllSettingsBtn) {
        resetAllSettingsBtn.onclick = resetAllSettings;
    }

    document.addEventListener("dragstart", (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        if (target.closest("input, textarea, [contenteditable='true']")) return;
        if (!target.closest(".drag-handle, .copy-format-drag")) {
            e.preventDefault();
        }
    });

    document.querySelectorAll(".info-tip").forEach((tip) => {
        tip.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

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
    const ignoreDSTToggle = document.getElementById("toggle-ignore-dst");

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
    if (ignoreDSTToggle) {
        ignoreDSTToggle.disabled = isRealtime;
        ignoreDSTToggle.checked = !isRealtime && ignoreDST;
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
    const ignoreDSTGroup = document.getElementById("toggle-ignore-dst")?.closest(".control-group");
    const copyFormatGroup = document.getElementById("toggle-copy-format")?.closest(".control-group");

    optionRow.style.display = "flex";
    if (extraTimeGroup) extraTimeGroup.style.display = isRealtime ? "none" : "flex";
    if (timeAdjustGroup) timeAdjustGroup.style.display = isRealtime ? "none" : "flex";
    if (ignoreDSTGroup) ignoreDSTGroup.style.display = isRealtime ? "none" : "flex";
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
    const selectedBefore = getCurrentGroupBaseTimezoneId();
    select.innerHTML = "";

    const includeUtcOption = selectedBefore === "utc" || isCurrentGroupUtcRowVisible();
    if (includeUtcOption) {
        const utcOption = document.createElement("option");
        utcOption.value = "utc";
        utcOption.textContent = `[UTC] ${t("utc_name")}`;
        select.appendChild(utcOption);
    }

    getCurrentGroupZones().forEach(tz => {
        const option = document.createElement("option");
        option.value = tz.id;
        option.textContent = `[${getZoneAbbreviation(tz)}] ${getZoneDisplayName(tz)}`;
        select.appendChild(option);
    });

    const selectedNext = [...select.options].some(o => o.value === selectedBefore)
        ? selectedBefore
        : (select.options[0]?.value || "utc");
    setCurrentGroupBaseTimezoneId(selectedNext);
    select.value = selectedNext;
    if (selectedNext !== selectedBefore) savePersistence();
    adjustSelectWidthForContent(select, 220);
}

function createTimeAdjustActionButton(labelKey, slotIdx, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sm-btn";
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

function sanitizeTimeAdjustDayStep(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_TIME_ADJUST_DAY_STEP;
    return Math.min(MAX_TIME_ADJUST_DAY_STEP, Math.max(MIN_TIME_ADJUST_DAY_STEP, parsed));
}

function getTimeAdjustDayStep(slotIdx) {
    return sanitizeTimeAdjustDayStep(timeAdjustDayStepBySlot[slotIdx]);
}

function setTimeAdjustDayStep(slotIdx, value) {
    timeAdjustDayStepBySlot[slotIdx] = sanitizeTimeAdjustDayStep(value);
    return timeAdjustDayStepBySlot[slotIdx];
}

function getTimeAdjustCustomDayLabel(direction, dayStep) {
    const sign = direction < 0 ? "-" : "+";
    return `${sign}${dayStep}${t("unit_days_short")}`;
}

function createTimeAdjustCustomDaysControl(slotIdx) {
    const wrap = document.createElement("div");
    wrap.className = "time-adjust-custom-group";

    const label = document.createElement("span");
    label.className = "time-adjust-custom-label";
    label.textContent = t("label_custom_days");

    const dayInput = document.createElement("input");
    dayInput.type = "number";
    dayInput.className = "form-input time-adjust-days-input";
    dayInput.min = String(MIN_TIME_ADJUST_DAY_STEP);
    dayInput.step = "1";
    dayInput.inputMode = "numeric";
    dayInput.value = String(getTimeAdjustDayStep(slotIdx));

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "sm-btn time-adjust-custom-btn";
    minusBtn.textContent = "-";
    minusBtn.addEventListener("click", () => applyTimeAdjustAction(slotIdx, "minus_custom_days"));

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "sm-btn time-adjust-custom-btn";
    plusBtn.textContent = "+";
    plusBtn.addEventListener("click", () => applyTimeAdjustAction(slotIdx, "plus_custom_days"));

    const syncInputAndLabel = (persist = false) => {
        const normalized = setTimeAdjustDayStep(slotIdx, dayInput.value);
        dayInput.value = String(normalized);
        minusBtn.title = getTimeAdjustCustomDayLabel(-1, normalized);
        plusBtn.title = getTimeAdjustCustomDayLabel(1, normalized);
        minusBtn.setAttribute("aria-label", minusBtn.title);
        plusBtn.setAttribute("aria-label", plusBtn.title);
        if (persist) savePersistence();
    };

    dayInput.addEventListener("input", () => syncInputAndLabel(true));
    dayInput.addEventListener("change", () => syncInputAndLabel(true));
    dayInput.addEventListener("blur", () => syncInputAndLabel(true));
    syncInputAndLabel();

    wrap.appendChild(label);
    wrap.appendChild(minusBtn);
    wrap.appendChild(dayInput);
    wrap.appendChild(plusBtn);
    return wrap;
}

function renderTimeAdjustSet(slotIdx) {
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

    set.appendChild(createTimeAdjustDivider());
    set.appendChild(createTimeAdjustActionButton("btn_minus_four_weeks", slotIdx, "minus_four_weeks"));
    set.appendChild(createTimeAdjustActionButton("btn_plus_four_weeks", slotIdx, "plus_four_weeks"));
    set.appendChild(createTimeAdjustDivider());
    set.appendChild(createTimeAdjustCustomDaysControl(slotIdx));

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
    buttonsContainer.appendChild(renderTimeAdjustSet(0));
    if (effectiveSlotCount > 1) {
        buttonsContainer.appendChild(renderTimeAdjustSet(1));
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

function getTimePartLabel(partKey) {
    const map = {
        dn: "copy_time_part_dn",
        date: "copy_time_part_date",
        time: "copy_time_part_time",
        weekday: "copy_time_part_weekday"
    };
    return t(map[partKey] || partKey);
}

function closeAllTimePartsMenus() {
    document.querySelectorAll(".time-parts-dropdown.open").forEach((el) => {
        el.classList.remove("open");
    });
}

function bindTimePartsOutsideClickHandler() {
    if (timePartsOutsideHandlerBound) return;
    document.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        if (target.closest(".time-parts-dropdown")) return;
        closeAllTimePartsMenus();
    });
    timePartsOutsideHandlerBound = true;
}

function getCopyFormatDropTarget(container, x, y = null) {
    const draggableItems = [...container.querySelectorAll(".copy-format-item:not(.dragging)")];
    if (!draggableItems.length) return null;

    if (typeof y === "number") {
        for (const child of draggableItems) {
            const box = child.getBoundingClientRect();
            const halfY = box.top + (box.height / 2);
            const halfX = box.left + (box.width / 2);
            const inSameRow = y >= box.top && y <= box.bottom;

            if (y < halfY || (inSameRow && x < halfX)) {
                return child;
            }
        }
        return null;
    }

    return draggableItems.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

function renderFormatControlList(list, order, enabled, options = {}) {
    const { onToggle, onReorder, timePartsEnabled, onTimePartToggle } = options;
    if (!list) return;

    bindTimePartsOutsideClickHandler();
    list.innerHTML = "";
    order.forEach(key => {
        if (!COPY_FORMAT_KEYS.includes(key)) return;

        const item = document.createElement("div");
        item.className = "copy-format-item";
        item.dataset.key = key;
        item.draggable = false;

        const dragHandle = document.createElement("span");
        dragHandle.className = "copy-format-drag";
        dragHandle.textContent = "↔";
        dragHandle.title = t("tooltip_reorder");
        dragHandle.draggable = true;

        const label = document.createElement("label");
        label.className = "copy-format-item-label";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = !!enabled[key];
        checkbox.addEventListener("change", () => {
            if (typeof onToggle === "function") onToggle(key, checkbox.checked);
        });

        const text = document.createElement("span");
        text.textContent = getCopyFieldLabel(key);

        label.appendChild(checkbox);
        label.appendChild(text);
        item.appendChild(dragHandle);
        item.appendChild(label);

        if (key === "time") {
            const dropdown = document.createElement("div");
            dropdown.className = "time-parts-dropdown";

            const partsBtn = document.createElement("button");
            partsBtn.type = "button";
            partsBtn.className = "time-parts-toggle-btn";
            partsBtn.textContent = t("btn_time_parts");
            partsBtn.title = t("label_time_parts");
            partsBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const willOpen = !dropdown.classList.contains("open");
                closeAllTimePartsMenus();
                if (willOpen) dropdown.classList.add("open");
            });

            const menu = document.createElement("div");
            menu.className = "time-parts-menu";
            TIME_PART_KEYS.forEach((partKey) => {
                const rowEl = document.createElement("label");
                rowEl.className = "time-parts-option";

                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.checked = !!timePartsEnabled?.[partKey];
                cb.addEventListener("change", () => {
                    if (typeof onTimePartToggle === "function") onTimePartToggle(partKey, cb.checked);
                });

                const txt = document.createElement("span");
                txt.textContent = getTimePartLabel(partKey);

                rowEl.appendChild(cb);
                rowEl.appendChild(txt);
                menu.appendChild(rowEl);
            });

            dropdown.appendChild(partsBtn);
            dropdown.appendChild(menu);
            item.appendChild(dropdown);
        }

        dragHandle.addEventListener("dragstart", (e) => {
            item.classList.add("dragging");
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", key);
                e.dataTransfer.setDragImage(item, 12, 12);
            }
        });
        dragHandle.addEventListener("dragend", () => {
            item.classList.remove("dragging");
            const nextOrder = [...list.querySelectorAll(".copy-format-item")].map(el => el.dataset.key);
            if (typeof onReorder === "function") onReorder(nextOrder);
        });

        list.appendChild(item);
    });

    list.ondragover = (e) => {
        const dragging = list.querySelector(".copy-format-item.dragging");
        if (!dragging) return;
        e.preventDefault();
        const after = getCopyFormatDropTarget(list, e.clientX, e.clientY);
        list.insertBefore(dragging, after);
    };
    list.ondrop = (e) => {
        const dragging = list.querySelector(".copy-format-item.dragging");
        if (!dragging) return;
        e.preventDefault();
    };
}

function renderCopyFormatControls() {
    const row = document.getElementById("copy-format-row");
    const displayList = document.getElementById("display-format-list");
    const copyList = document.getElementById("copy-format-list");
    if (!row || !displayList || !copyList) return;

    row.style.display = showCopyFormat ? "flex" : "none";
    if (!showCopyFormat) {
        displayList.innerHTML = "";
        copyList.innerHTML = "";
        updateCopyFormatPreview();
        return;
    }

    renderFormatControlList(displayList, displayFormatOrder, displayFormatEnabled, {
        onToggle: (key, checked) => {
            displayFormatEnabled[key] = checked;
            renderList();
            updateCopyFormatPreview();
            savePersistence();
        },
        onReorder: (nextOrder) => {
            displayFormatOrder = sanitizeCopyFormatOrder(nextOrder);
            renderList();
            updateCopyFormatPreview();
            savePersistence();
        },
        timePartsEnabled: displayTimePartsEnabled,
        onTimePartToggle: (partKey, checked) => {
            displayTimePartsEnabled[partKey] = checked;
            renderList();
            updateCopyFormatPreview();
            savePersistence();
        }
    });

    renderFormatControlList(copyList, copyFormatOrder, copyFormatEnabled, {
        onToggle: (key, checked) => {
            copyFormatEnabled[key] = checked;
            updateCopyFormatPreview();
            savePersistence();
        },
        onReorder: (nextOrder) => {
            copyFormatOrder = sanitizeCopyFormatOrder(nextOrder);
            updateCopyFormatPreview();
            savePersistence();
        },
        timePartsEnabled: copyTimePartsEnabled,
        onTimePartToggle: (partKey, checked) => {
            copyTimePartsEnabled[partKey] = checked;
            updateCopyFormatPreview();
            savePersistence();
        }
    });
    updateCopyFormatPreview();
}

function getDisplayColumns(effectiveSlotCount) {
    const columns = [];
    sanitizeCopyFormatOrder(displayFormatOrder).forEach(key => {
        if (!displayFormatEnabled[key]) return;
        if (key === "time") {
            columns.push("time_main");
            if (effectiveSlotCount > 1) columns.push("time_extra");
            return;
        }
        if ((key === "period_days" || key === "period_time") && effectiveSlotCount <= 1) {
            return;
        }
        columns.push(key);
    });
    return columns;
}

function getDisplayTimeInputMode() {
    const showDate = !!displayTimePartsEnabled.date;
    const showTime = !!displayTimePartsEnabled.time;
    if (showDate && showTime) return "datetime";
    if (showDate) return "date";
    if (showTime) return "time";
    return "none";
}

function buildTimeColumnCell(slotIdx, slotCountToRender, options = {}) {
    if (slotIdx >= slotCountToRender) return "";
    const { isReadonly = false } = options;
    const showDn = !!displayTimePartsEnabled.dn;
    const showWeekday = !!displayTimePartsEnabled.weekday;
    const inputMode = getDisplayTimeInputMode();
    const hideInput = inputMode === "none";
    return `
        <td class="dynamic-cell">
            <div class="time-day-group">
                ${showDn ? `<span class="dn-icon dn-slot-${slotIdx}"></span>` : ""}
                <input
                    type="text"
                    class="time-input slot-${slotIdx}${hideInput ? " time-input-hidden" : ""}"
                    spellcheck="false"
                    data-slot="${slotIdx}"
                    data-field="time"
                    data-input-mode="${inputMode}"
                    ${isReadonly || hideInput ? "readonly" : ""}
                >
                ${showWeekday ? `<span class="day-badge day-slot-${slotIdx}">-</span>` : ""}
            </div>
        </td>
    `;
}

function getDisplayColumnHeader(colKey) {
    switch (colKey) {
        case "timezone":
            return `<th style="width: 110px;">${t("th_tz_abbr")}</th>`;
        case "region":
            return `<th style="width: 220px;">${t("th_region")}</th>`;
        case "offset":
            return `<th style="width: 140px;">${t("th_utc_offset")}</th>`;
        case "time_main":
            return `<th class="dynamic-col">${t("th_time_day_main")}</th>`;
        case "time_extra":
            return `<th class="dynamic-col">${t("th_time_day_extra")}</th>`;
        case "period_days":
            return `<th style="width: 90px;">${t("th_period_days")}</th>`;
        case "period_time":
            return `<th style="width: 170px;">${t("th_period_time")}</th>`;
        default:
            return "";
    }
}

function buildStaticRowCell(colKey, slotCountToRender, zoneNameHtml = "") {
    switch (colKey) {
        case "timezone":
            return `<td class="timezone-cell"><div class="abbr-cell"><span class="zone-code"></span></div></td>`;
        case "region":
            return `<td><div class="zone-info"><span class="zone-name">${zoneNameHtml}</span></div></td>`;
        case "offset":
            return `<td><span class="offset-text"></span></td>`;
        case "time_main":
        case "time_extra": {
            const slotIdx = colKey === "time_main" ? 0 : 1;
            return buildTimeColumnCell(slotIdx, slotCountToRender, { isReadonly: isRealtime });
        }
        case "period_days":
            return `<td class="period-days-cell"><span class="period-days-text">-</span></td>`;
        case "period_time":
            return `<td class="period-time-cell"><span class="period-time-text">-</span></td>`;
        default:
            return "";
    }
}

function buildDynamicRowCell(colKey, slotCountToRender) {
    switch (colKey) {
        case "timezone":
            return `<td class="timezone-cell"><div class="abbr-cell"><span class="zone-code"></span></div></td>`;
        case "region":
            return `<td><div class="zone-info"><span class="zone-name"></span></div></td>`;
        case "offset":
            return `<td><span class="offset-text"></span></td>`;
        case "time_main":
        case "time_extra": {
            const slotIdx = colKey === "time_main" ? 0 : 1;
            return buildTimeColumnCell(slotIdx, slotCountToRender, { isReadonly: isRealtime });
        }
        case "period_days":
            return `<td class="period-days-cell"><span class="period-days-text">-</span></td>`;
        case "period_time":
            return `<td class="period-time-cell"><span class="period-time-text">-</span></td>`;
        default:
            return "";
    }
}

function buildRowActionCells(copyButtonTitle, removeButtonText) {
    const copyCell = `<td class="export-exclude copy-cell"><div class="btn-group"><button class="sm-btn copy-row-btn" title="${copyButtonTitle}">📋</button></div></td>`;
    const removeCell = removeButtonText
        ? `<td class="export-exclude remove-cell"><div class="btn-group"><button class="sm-btn danger remove-row-btn">${removeButtonText}</button></div></td>`
        : `<td class="export-exclude remove-cell"></td>`;
    return `${copyCell}${removeCell}`;
}

function createInteractiveTimezoneRow(tz, effectiveSlotCount, displayColumns, rowId = tz.id) {
    const tr = document.createElement("tr");
    tr.className = "time-row";
    tr.id = `tz-row-${rowId}`;
    tr.draggable = false;

    const dragHandleHtml = `<button type="button" class="drag-handle" draggable="true" title="${t("tooltip_reorder")}">↕</button>`;
    let inner = `<td class="move-cell"><div class="btn-group">${dragHandleHtml}</div></td>`;
    displayColumns.forEach((colKey) => {
        inner += buildDynamicRowCell(colKey, effectiveSlotCount);
    });
    inner += buildRowActionCells(t("tooltip_copy"), "✖");
    tr.innerHTML = inner;

    const zoneNameEl = tr.querySelector(".zone-name");
    if (zoneNameEl) zoneNameEl.textContent = getZoneDisplayName(tz);

    const copyBtn = tr.querySelector(".copy-row-btn");
    if (copyBtn) copyBtn.addEventListener("click", () => copyRow(rowId));

    const removeBtn = tr.querySelector(".remove-row-btn");
    if (removeBtn) removeBtn.addEventListener("click", () => removeTimezone(rowId));

    tr.querySelectorAll(".time-input").forEach(inp => {
        const slotIdx = parseInt(inp.dataset.slot, 10);
        const inputMode = inp.dataset.inputMode || "datetime";
        const timezoneId = rowId === "utc" ? null : tz.id;
        inp.onchange = (e) => handleTimeChange(e.target.value, tz.zone || "CUSTOM", slotIdx, timezoneId, inputMode);
        inp.onkeydown = (e) => {
            if (e.key === "Enter") {
                handleTimeChange(e.target.value, tz.zone || "CUSTOM", slotIdx, timezoneId, inputMode);
                inp.blur();
            }
        };
    });

    const dragHandle = tr.querySelector(".drag-handle");
    if (dragHandle) dragHandle.draggable = true;
    if (dragHandle) {
        dragHandle.addEventListener("dragstart", (e) => {
            tr.classList.add("dragging");
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", rowId);
                e.dataTransfer.setDragImage(tr, 20, 20);
            }
        });
        dragHandle.addEventListener("dragend", () => {
            tr.classList.remove("dragging");
            saveOrder();
        });
    }

    return tr;
}

// --- Group Management ---
function activateGroupTab(idx) {
    if (idx === activeGroupId) return;
    activeGroupId = idx;
    if (currentMainTab === "live" || currentMainTab === "fixed") {
        activeGroupIdByMainTab[currentMainTab] = activeGroupId;
    }
    savePersistence();
    renderGroups();
    renderList();
    updateClocks();
}

function renderGroups() {
    const container = document.getElementById("group-tabs-container");
    const addBtn = document.getElementById("add-group-btn");
    container.innerHTML = "";

    groups.forEach((group, idx) => {
        const btn = document.createElement("div");
        btn.className = `group-tab ${idx === activeGroupId ? "active" : ""}`;
        btn.setAttribute("role", "button");
        btn.tabIndex = 0;

        const label = document.createElement("span");
        label.className = "group-name-label";
        label.textContent = group.name;
        let pointerDownX = 0;
        let pointerDownY = 0;
        btn.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            pointerDownX = e.clientX;
            pointerDownY = e.clientY;
        });
        btn.addEventListener("pointerup", (e) => {
            if (e.button !== 0) return;
            const target = e.target;
            if (target instanceof Element && target.closest(".group-edit-btn, .group-del-btn")) return;
            const deltaX = Math.abs(e.clientX - pointerDownX);
            const deltaY = Math.abs(e.clientY - pointerDownY);
            if (deltaX > 8 || deltaY > 8) return;
            activateGroupTab(idx);
        });
        btn.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            activateGroupTab(idx);
        });

        const editBtn = document.createElement("button");
        editBtn.className = "group-edit-btn";
        editBtn.innerHTML = "✎";
        editBtn.title = t("tooltip_edit");
        editBtn.onclick = (e) => {
            e.stopPropagation();
            renameGroup(idx);
        };

        const delBtn = document.createElement("button");
        delBtn.className = "group-del-btn";
        delBtn.innerHTML = "✖";
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
        if (idx === activeGroupId) {
            btn.appendChild(editBtn);
            btn.appendChild(delBtn);
        }
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
    const effectiveSlotCount = isRealtime ? 1 : slotCount;
    const displayColumns = getDisplayColumns(effectiveSlotCount);
    const baseRef = getBaseTimezoneRef();
    const baseRefName = escapeHtml(getZoneDisplayName(baseRef));
    const theadRow = document.querySelector("#table-head tr");

    if (theadRow) {
        const headCells = [`<th class="move-col" style="width: 70px;">${t("th_order")}</th>`];
        headCells.push(...displayColumns.map(getDisplayColumnHeader).filter(Boolean));
        headCells.push(`<th class="export-exclude" style="width: 70px;">${t("th_copy")}</th>`);
        headCells.push(`<th class="export-exclude" style="width: 70px;">${t("th_remove")}</th>`);
        theadRow.innerHTML = headCells.join("");
    }

    const container = document.getElementById("clocks-container");
    container.innerHTML = "";

    const baseRow = document.createElement("tr");
    baseRow.className = "time-row static base-row";
    baseRow.id = `tz-row-${baseRef.id}`;
    let baseInner = `<td class="move-cell"><span class="drag-spacer" aria-hidden="true"></span></td>`;
    displayColumns.forEach((colKey) => {
        baseInner += buildStaticRowCell(colKey, effectiveSlotCount, baseRefName);
    });
    baseInner += buildRowActionCells(t("tooltip_copy"), "");
    baseRow.innerHTML = baseInner;
    const baseCopyBtn = baseRow.querySelector(".copy-row-btn");
    if (baseCopyBtn) baseCopyBtn.addEventListener("click", () => copyRow(baseRef.id));
    container.appendChild(baseRow);

    for (let i = 0; i < effectiveSlotCount; i++) {
        const inputs = [...baseRow.querySelectorAll(`.time-input[data-slot="${i}"]`)];
        inputs.forEach(inp => {
            const inputMode = inp.dataset.inputMode || "datetime";
            inp.onchange = (e) => handleTimeChange(e.target.value, baseRef.zone || "CUSTOM", i, baseRef.id, inputMode);
            inp.onkeydown = (e) => {
                if (e.key === "Enter") {
                    handleTimeChange(e.target.value, baseRef.zone || "CUSTOM", i, baseRef.id, inputMode);
                    inp.blur();
                }
            };
            if (isRealtime) inp.readOnly = true;
        });
    }

    const zoneRows = getCurrentGroupZones().filter(
        tz => tz.id !== baseRef.id && !(tz.type === "standard" && tz.zone === "UTC")
    );
    const rowsToRender = [...zoneRows];

    if (baseRef.id !== "utc" && isCurrentGroupUtcRowVisible()) {
        const utcRef = getUTCRef();
        const insertIndex = Math.min(Math.max(getCurrentGroupUtcRowOrder(), 0), rowsToRender.length);
        rowsToRender.splice(insertIndex, 0, utcRef);
    }

    rowsToRender.forEach((tz) => {
        const rowId = tz.id === "utc" ? "utc" : tz.id;
        const tr = createInteractiveTimezoneRow(tz, effectiveSlotCount, displayColumns, rowId);
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
        const year = date.getUTCFullYear();
        // Use UTC-noon anchors to avoid local-timezone side effects near midnight boundaries.
        const jan = new Date(Date.UTC(year, 0, 1, 12, 0, 0));
        const jul = new Date(Date.UTC(year, 6, 1, 12, 0, 0));
        const janOffset = getTimezoneOffset(zone, jan);
        const julOffset = getTimezoneOffset(zone, jul);
        const standardOffset = Math.min(janOffset, julOffset);
        return getTimezoneOffset(zone, date) !== standardOffset;
    } catch (e) { return false; }
}

function getTimezoneOffset(zone, date) {
    try {
        const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(date);
        const offStr = parts.find(p => p.type === "timeZoneName")?.value || "GMT+0";
        const m = offStr.match(/[+-](\d{1,2}):?(\d{2})?/);
        if (!m) return 0;
        const sign = offStr.includes("+") ? 1 : -1;
        return sign * (parseInt(m[1]) * 60 + parseInt(m[2] || 0));
    } catch (err) {
        return 0;
    }
}

function getFixedOffsetForDisplay(tz) {
    if (!ignoreDST || !tz || tz.type !== "standard" || !tz.zone || tz.zone === "UTC") return null;
    return getTimezoneOffset(tz.zone, globalTimes[0]);
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

function getSignedDurationDayHourMinute(mainDateTimeStr, extraDateTimeStr) {
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

    const diffMs = tB - tA;
    const sign = diffMs < 0 ? "-" : "";
    const totalMinutes = Math.floor(Math.abs(diffMs) / 60000);
    const day = Math.floor(totalMinutes / 1440);
    const hour = Math.floor((totalMinutes % 1440) / 60);
    const minute = totalMinutes % 60;

    if (currentLang === "en") {
        return `${sign}${day}d ${hour}h ${minute}m`;
    }
    return `${sign}${day}일 ${hour}시간 ${minute}분`;
}

function getLocalPartsByTimezone(date, tz, fixedOffsetMinutes = null) {
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

    if (Number.isFinite(fixedOffsetMinutes)) {
        const shifted = new Date(date.getTime() + (fixedOffsetMinutes * 60000));
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

function getUTCDateFromLocalParts(parts, tz, fixedOffsetMinutes = null) {
    const utcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    if (tz.type === "custom") {
        const offsetMin = getCustomOffsetMinutes(tz);
        return new Date(utcMs - (offsetMin * 60000));
    }
    if (!tz.zone || tz.zone === "UTC") return new Date(utcMs);
    if (Number.isFinite(fixedOffsetMinutes)) {
        return new Date(utcMs - (fixedOffsetMinutes * 60000));
    }
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

    if (action === "now") {
        globalTimes[slotIdx] = new Date();
        updateClocks();
        return;
    }

    const baseRef = getBaseTimezoneRef();
    const fixedOffsetMinutes = getFixedOffsetForDisplay(baseRef);
    let parts = getLocalPartsByTimezone(globalTimes[slotIdx], baseRef, fixedOffsetMinutes);

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
        case "plus_four_weeks":
            parts = shiftLocalParts(parts, { weeks: 4 });
            break;
        case "minus_four_weeks":
            parts = shiftLocalParts(parts, { weeks: -4 });
            break;
        case "plus_custom_days":
            parts = shiftLocalParts(parts, { days: getTimeAdjustDayStep(slotIdx) });
            break;
        case "minus_custom_days":
            parts = shiftLocalParts(parts, { days: -getTimeAdjustDayStep(slotIdx) });
            break;
        default:
            return;
    }

    globalTimes[slotIdx] = getUTCDateFromLocalParts(parts, baseRef, fixedOffsetMinutes);
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
    updateCopyFormatPreview();
}

function updateRow(id, tz) {
    const row = document.getElementById(`tz-row-${id}`);
    if (!row) return;

    let offsetStr = "";
    let zoneCodeMain = "";
    const fixedDisplayOffsetMinutes = getFixedOffsetForDisplay(tz);

    if (tz.type === "custom") {
        zoneCodeMain = normalizeCustomAbbr(tz.abbr);
        const offsetMin = getCustomOffsetMinutes(tz);
        const sign = offsetMin >= 0 ? "+" : "-";
        const absMin = Math.abs(offsetMin);
        const absHour = Math.floor(absMin / 60);
        const minPart = absMin % 60;
        offsetStr = `UTC${sign}${pad(absHour)}:${pad(minPart)}`;
    } else {
        if (Number.isFinite(fixedDisplayOffsetMinutes)) {
            const sign = fixedDisplayOffsetMinutes >= 0 ? "+" : "-";
            const absMin = Math.abs(fixedDisplayOffsetMinutes);
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
        if (tz.type === "custom" || Number.isFinite(fixedDisplayOffsetMinutes)) {
            const curBase = globalTimes[i];
            const offsetMin = tz.type === "custom" ? getCustomOffsetMinutes(tz) : fixedDisplayOffsetMinutes;
            const tMs = curBase.getTime() + (offsetMin * 60000);
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

        const inputs = [...row.querySelectorAll(`.time-input[data-slot="${i}"]`)];
        const dayBadges = [...row.querySelectorAll(`.day-slot-${i}`)];
        const dnIcons = [...row.querySelectorAll(`.dn-slot-${i}`)];

        let displayHour = 0;
        let displayDow = 0;
        let timeStr = "";

        if (t instanceof Date) {
            displayHour = t.getUTCHours();
            displayDow = t.getUTCDay();
            timeStr = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())} ${pad(displayHour)}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}`;
        } else {
            displayHour = parseInt(t.str.split(" ")[1].split(":")[0]);
            displayDow = t.dow;
            timeStr = t.str;
        }

        const [dateStr, clockStrRaw] = timeStr.split(" ");
        const clockStr = (clockStrRaw || "").trim();
        inputs.forEach(input => {
            const inputMode = input.dataset.inputMode || "datetime";
            let nextValue = timeStr;
            if (inputMode === "date") nextValue = dateStr;
            else if (inputMode === "time") nextValue = clockStr;
            else if (inputMode === "none") nextValue = "";
            if (document.activeElement !== input) input.value = nextValue;
        });
        dayBadges.forEach(dayBadge => {
            dayBadge.textContent = I18N_DATA[currentLang].days[displayDow];
            dayBadge.className = "day-badge day-slot-" + i + " " + (displayDow === 0 ? "day-sun" : (displayDow === 6 ? "day-sat" : ""));
        });
        dnIcons.forEach(dnIcon => updateDN(displayHour, dnIcon));
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
            const spanTime = getSignedDurationDayHourMinute(slotTimeParts[0], slotTimeParts[1]);
            periodTimeEl.textContent = spanTime === null ? "-" : spanTime;
        } else {
            periodTimeEl.textContent = "-";
        }
    }
}

function resolveLocalDatePartsByTimezone(timezone, slotIdx, timezoneId = null) {
    if (timezone === "UTC") {
        const d = globalTimes[slotIdx];
        return { Y: d.getUTCFullYear(), M: d.getUTCMonth() + 1, D: d.getUTCDate() };
    }

    if (timezone === "CUSTOM") {
        const currentZones = getCurrentGroupZones();
        let tz = null;
        if (timezoneId) {
            tz = currentZones.find(z => z.id === timezoneId) || null;
        }
        if (!tz) {
            const row = document.querySelector(".dragging") || (document.activeElement?.closest ? document.activeElement.closest("tr") : null);
            const rowId = row?.id ? row.id.replace("tz-row-", "") : "";
            if (rowId) tz = currentZones.find(z => z.id === rowId) || null;
        }
        if (!tz) return null;
        const shifted = new Date(globalTimes[slotIdx].getTime() + (getCustomOffsetMinutes(tz) * 60000));
        return { Y: shifted.getUTCFullYear(), M: shifted.getUTCMonth() + 1, D: shifted.getUTCDate() };
    }

    const f = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour12: false
    });
    const parts = f.formatToParts(globalTimes[slotIdx]);
    const get = (type) => parseInt(parts.find(p => p.type === type)?.value || "0", 10);
    return { Y: get("year"), M: get("month"), D: get("day") };
}

function handleTimeChange(val, timezone, slotIdx, timezoneId = null, inputMode = "datetime") {
    if (isRealtime) return;
    const normalized = (val || "").trim();
    const dateTimeMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeOnlyMatch = normalized.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    let Y = 0; let M = 0; let D = 0; let H = 0; let min = 0; let S = 0;
    if (inputMode === "none") {
        return;
    }
    if (inputMode === "datetime" && dateTimeMatch) {
        [Y, M, D, H, min, S] = dateTimeMatch.slice(1).map(Number);
    } else if (inputMode === "date" && dateOnlyMatch) {
        [Y, M, D] = dateOnlyMatch.slice(1).map(Number);
    } else if (inputMode === "time" && timeOnlyMatch) {
        const baseDateParts = resolveLocalDatePartsByTimezone(timezone, slotIdx, timezoneId);
        if (!baseDateParts) return;
        ({ Y, M, D } = baseDateParts);
        [H, min, S] = timeOnlyMatch.slice(1).map(Number);
    } else {
        showToast(t("toast_invalid_date"));
        renderList();
        return;
    }
    const tempUTC = new Date(Date.UTC(Y, M - 1, D, H, min, S));
    if (isNaN(tempUTC.getTime())) return;

    if (timezone === "UTC") {
        globalTimes[slotIdx] = tempUTC;
    } else if (timezone === "CUSTOM") {
        const currentZones = getCurrentGroupZones();
        let tz = null;

        if (timezoneId) {
            tz = currentZones.find(z => z.id === timezoneId) || null;
        }
        // Backward fallback: resolve from focused/dragging row if id wasn't provided.
        if (!tz) {
            const row = document.querySelector(".dragging") || (document.activeElement?.closest ? document.activeElement.closest("tr") : null);
            const rowId = row?.id ? row.id.replace("tz-row-", "") : "";
            if (rowId) tz = currentZones.find(z => z.id === rowId) || null;
        }
        if (tz) {
            const offMs = getCustomOffsetMinutes(tz) * 60000;
            globalTimes[slotIdx] = new Date(tempUTC.getTime() - offMs);
        } else {
            return;
        }
    } else {
        const offMin = (ignoreDST && timezone !== "UTC")
            ? getTimezoneOffset(timezone, globalTimes[0])
            : getTimezoneOffset(timezone, tempUTC);
        const offMs = offMin * 60000;
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
    const quickSelect = document.getElementById("tz-quick-select");
    if (!quickSelect) return;

    updateTZDropdown();

    quickSelect.onchange = (e) => {
        if (e.target.value === "UTC") {
            const activeGroup = groups[activeGroupId];
            if (activeGroup) {
                activeGroup.showUtcRow = true;
                if (!Number.isFinite(parseInt(activeGroup.utcRowOrder, 10))) {
                    activeGroup.utcRowOrder = 0;
                }
                savePersistence();
                renderList();
                updateClocks();
            }
            quickSelect.value = "";
            return;
        }
        const d = TZ_DATABASE.find(t => t.zone === e.target.value);
        if (d) addTimezone({ id: createUniqueTimezoneId("tz"), zone: d.zone, name_ko: `${d.name} - ${d.city}`, name_en: `${d.name_en} - ${d.city_en}`, type: "standard" });
        quickSelect.value = "";
    };

    const showAllBtn = document.getElementById("show-all-tz");
    if (showAllBtn) {
        showAllBtn.onclick = () => {
            const o = document.getElementById("full-tz-overlay");
            const list = document.getElementById("full-tz-list");
            if (!o || !list) return;
            list.innerHTML = "";
            getSortedTZData(TZ_DATABASE).forEach(tzData => list.appendChild(createTimezoneListItem(tzData, true)));
            o.style.display = "flex";
        };
    }

    const closeOverlayBtn = document.getElementById("close-overlay");
    if (closeOverlayBtn) {
        closeOverlayBtn.onclick = () => {
            const overlay = document.getElementById("full-tz-overlay");
            if (overlay) overlay.style.display = "none";
        };
    }
}

function addFromSearchWithData(zone) {
    const d = TZ_DATABASE.find(t => t.zone === zone);
    if (d) {
        addTimezone({
            id: createUniqueTimezoneId("tz"),
            zone: d.zone,
            name_ko: `${d.name} - ${d.city}`,
            name_en: `${d.name_en} - ${d.city_en}`,
            type: "standard"
        });
    }
}

// function addFromSearch is now replaced by addFromSearchWithData
function addTimezone(tz) {
    const activeGroup = groups[activeGroupId];
    if (!activeGroup) return;
    if (!tz || typeof tz !== "object") return;
    if (tz?.type === "standard" && !isValidTimeZone(tz.zone)) {
        showToast(t("toast_invalid_timezone"));
        return;
    }
    const requestedId = (typeof tz.id === "string") ? tz.id.trim() : "";
    const existingIds = new Set(activeGroup.zones.map(zone => zone.id));
    let nextId = requestedId;
    if (!nextId || nextId === "utc" || existingIds.has(nextId)) {
        nextId = createUniqueTimezoneId(tz.type === "custom" ? "tz-c" : "tz");
    }
    activeGroup.zones.push({ ...tz, id: nextId });
    savePersistence();
    renderList();
    updateClocks();
}
function removeTimezone(id) {
    const activeGroup = groups[activeGroupId];
    if (!activeGroup) return;
    if (id === getCurrentGroupBaseTimezoneId()) return;
    if (id === "utc") {
        activeGroup.showUtcRow = false;
        activeGroup.utcRowOrder = 0;
        savePersistence();
        renderList();
        updateClocks();
        return;
    }
    activeGroup.zones = activeGroup.zones.filter(z => z.id !== id);
    savePersistence();
    renderList();
    updateClocks();
}
function initDragAndDrop() {
    const c = document.getElementById("clocks-container");
    if (!c) return;
    c.ondragover = (e) => {
        const draggingRow = c.querySelector(".time-row.dragging");
        if (!draggingRow) return;
        e.preventDefault();
        const a = getAfter(c, e.clientY);
        c.insertBefore(draggingRow, a);
    };
    c.ondrop = (e) => {
        const draggingRow = c.querySelector(".time-row.dragging");
        if (!draggingRow) return;
        e.preventDefault();
    };
}
function getAfter(c, y) { const drs = [...c.querySelectorAll(".time-row:not(.dragging):not(.static)")]; return drs.reduce((clo, ch) => { const b = ch.getBoundingClientRect(); const o = y - b.top - b.height / 2; if (o < 0 && o > clo.off) return { off: o, el: ch }; return clo; }, { off: Number.NEGATIVE_INFINITY }).el; }
function saveOrder() {
    const activeGroup = groups[activeGroupId];
    if (!activeGroup) return;
    const ids = [...document.querySelectorAll(".time-row:not(.static)")].map(r => r.id.replace("tz-row-", ""));
    const zoneIds = ids.filter(id => id !== "utc");
    activeGroup.zones.sort((a, b) => {
        const idxA = zoneIds.indexOf(a.id);
        const idxB = zoneIds.indexOf(b.id);
        if (idxA < 0 || idxB < 0) return 0;
        return idxA - idxB;
    });
    if (getCurrentGroupBaseTimezoneId() !== "utc") {
        const utcIndex = ids.indexOf("utc");
        activeGroup.showUtcRow = utcIndex >= 0;
        if (utcIndex >= 0) activeGroup.utcRowOrder = utcIndex;
    } else {
        activeGroup.showUtcRow = true;
        activeGroup.utcRowOrder = 0;
    }
    savePersistence();
}

function getTimezoneRefById(id) {
    if (!id) return null;
    if (id === "utc") return getUTCRef();
    const baseRef = getBaseTimezoneRef();
    if (baseRef.id === id) return baseRef;
    return getCurrentGroupZones().find(z => z.id === id) || null;
}

function buildTimezoneComputedSnapshot(id) {
    const tz = getTimezoneRefById(id);
    if (!tz) return null;

    let zoneCodeMain = "";
    let offsetStr = "";
    const fixedDisplayOffsetMinutes = getFixedOffsetForDisplay(tz);

    if (tz.type === "custom") {
        zoneCodeMain = normalizeCustomAbbr(tz.abbr);
        const offsetMin = getCustomOffsetMinutes(tz);
        const sign = offsetMin >= 0 ? "+" : "-";
        const absMin = Math.abs(offsetMin);
        const absHour = Math.floor(absMin / 60);
        const minPart = absMin % 60;
        offsetStr = `UTC${sign}${pad(absHour)}:${pad(minPart)}`;
    } else {
        zoneCodeMain = getBetterAbbr(tz.zone, globalTimes[0]);
        if (Number.isFinite(fixedDisplayOffsetMinutes)) {
            const sign = fixedDisplayOffsetMinutes >= 0 ? "+" : "-";
            const absMin = Math.abs(fixedDisplayOffsetMinutes);
            const absHour = Math.floor(absMin / 60);
            const minPart = absMin % 60;
            offsetStr = `UTC${sign}${pad(absHour)}:${pad(minPart)}`;
        } else {
            const offF = new Intl.DateTimeFormat("en-US", { timeZone: tz.zone, timeZoneName: "longOffset" });
            const partsArr = offF.formatToParts(globalTimes[0]);
            const offVal = partsArr.find(p => p.type === "timeZoneName")?.value || "GMT+0";
            const match = offVal.match(/[+-](\d{1,2}):?(\d{2})?/);
            if (match) {
                const sign = offVal.includes("+") ? "+" : "-";
                offsetStr = `UTC${sign}${pad(match[1])}:${pad(match[2] || 0)}`;
            } else {
                offsetStr = "UTC+00:00";
            }
        }
    }

    const effectiveSlotCount = isRealtime ? 1 : slotCount;
    const timeValues = [];
    const dateValues = [];
    const clockValues = [];
    const dayNameValues = [];
    const dayNightIconValues = [];
    for (let i = 0; i < effectiveSlotCount; i++) {
        if (tz.type === "custom" || Number.isFinite(fixedDisplayOffsetMinutes)) {
            const offsetMin = tz.type === "custom" ? getCustomOffsetMinutes(tz) : fixedDisplayOffsetMinutes;
            const tMs = globalTimes[i].getTime() + (offsetMin * 60000);
            const shifted = new Date(tMs);
            const timeStr = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
            const dateStr = timeStr.split(" ")[0];
            const dayStr = I18N_DATA[currentLang].days[shifted.getUTCDay()];
            const clockStr = timeStr.split(" ")[1] || "";
            const dayNightIcon = shifted.getUTCHours() >= 6 && shifted.getUTCHours() <= 18 ? "☀️" : "🌙";
            timeValues.push(timeStr);
            dateValues.push(dateStr);
            clockValues.push(clockStr);
            dayNameValues.push(dayStr);
            dayNightIconValues.push(dayNightIcon);
            continue;
        }
        const f = new Intl.DateTimeFormat("en-US", {
            timeZone: tz.zone,
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            weekday: "short",
            hour12: false
        });
        const parts = f.formatToParts(globalTimes[i]);
        const get = (type) => parts.find(p => p.type === type)?.value || "";
        const h = parseInt(get("hour"), 10);
        const weekday = get("weekday");
        const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const weekdayIdx = weekdayMap[weekday];
        const timeStr = `${get("year")}-${pad(get("month"))}-${pad(get("day"))} ${pad(h === 24 ? 0 : h)}:${pad(get("minute"))}:${pad(get("second"))}`;
        const dayStr = Number.isInteger(weekdayIdx) ? I18N_DATA[currentLang].days[weekdayIdx] : "";
        const dateStr = timeStr.split(" ")[0];
        const clockStr = timeStr.split(" ")[1] || "";
        const dayNightIcon = (h === 24 ? 0 : h) >= 6 && (h === 24 ? 0 : h) <= 18 ? "☀️" : "🌙";
        timeValues.push(timeStr);
        dateValues.push(dateStr);
        clockValues.push(clockStr);
        dayNameValues.push(dayStr);
        dayNightIconValues.push(dayNightIcon);
    }

    let periodDaysText = "";
    let periodTimeText = "";
    if (effectiveSlotCount > 1 && timeValues.length > 1) {
        const spanDays = getSignedInclusiveDaySpan(timeValues[0], timeValues[1]);
        const spanTime = getSignedDurationDayHourMinute(timeValues[0], timeValues[1]);
        periodDaysText = spanDays === null ? "" : `${spanDays}${t("unit_days_suffix")}`;
        periodTimeText = spanTime === null ? "" : spanTime;
    }

    return {
        timezone: zoneCodeMain,
        region: getZoneDisplayName(tz),
        offset: offsetStr,
        times: timeValues,
        dates: dateValues,
        clocks: clockValues,
        dayNames: dayNameValues,
        dayNightIcons: dayNightIconValues,
        periodDays: periodDaysText,
        periodTime: periodTimeText
    };
}

function formatTimeTextByParts(snapshot, timePartsEnabled) {
    const safeParts = sanitizeTimePartsEnabled(timePartsEnabled, "copy");
    const dates = Array.isArray(snapshot.dates) ? snapshot.dates : [];
    const clocks = Array.isArray(snapshot.clocks) ? snapshot.clocks : [];
    const dayNames = Array.isArray(snapshot.dayNames) ? snapshot.dayNames : [];
    const dayNightIcons = Array.isArray(snapshot.dayNightIcons) ? snapshot.dayNightIcons : [];
    const slotSize = Math.max(dates.length, clocks.length, dayNames.length, dayNightIcons.length);
    const rendered = [];

    for (let i = 0; i < slotSize; i++) {
        const tokens = [];
        if (safeParts.dn && dayNightIcons[i]) tokens.push(dayNightIcons[i]);
        if (safeParts.date && dates[i]) tokens.push(dates[i]);
        if (safeParts.time && clocks[i]) tokens.push(clocks[i]);
        if (safeParts.weekday && dayNames[i]) tokens.push(`(${dayNames[i]})`);
        const merged = tokens.join(" ").trim();
        if (merged) rendered.push(merged);
    }

    return rendered.join(" ~ ");
}

function getCopyFieldText(snapshot, key, options = {}) {
    const { timePartsEnabled = DEFAULT_COPY_TIME_PARTS_ENABLED } = options;
    if (!snapshot) return "";
    if (key === "timezone") {
        const zoneCodeRaw = (snapshot.timezone || "").trim();
        if (!zoneCodeRaw) return "";
        return zoneCodeRaw.startsWith("[") ? zoneCodeRaw : `[${zoneCodeRaw}]`;
    }

    if (key === "region") {
        return (snapshot.region || "").trim();
    }

    if (key === "offset") {
        const offsetText = (snapshot.offset || "").trim();
        if (!offsetText) return "";
        return offsetText.startsWith("[") ? offsetText : `[${offsetText}]`;
    }

    if (key === "time") {
        return formatTimeTextByParts(snapshot, timePartsEnabled);
    }

    if (key === "period_days") {
        const periodText = (snapshot.periodDays || "").trim();
        if (!periodText || periodText === "-") return "";
        return `[${periodText}]`;
    }

    if (key === "period_time") {
        const periodTimeText = (snapshot.periodTime || "").trim();
        if (!periodTimeText || periodTimeText === "-") return "";
        return `[${periodTimeText}]`;
    }

    return "";
}

function getRowCopyText(rowOrId) {
    return getRowFormattedText(rowOrId, copyFormatOrder, copyFormatEnabled, copyTimePartsEnabled);
}

function getRowFormattedText(rowOrId, order, enabled, timePartsEnabled = DEFAULT_COPY_TIME_PARTS_ENABLED) {
    const rowId = typeof rowOrId === "string"
        ? rowOrId
        : String(rowOrId?.id || "").replace("tz-row-", "");
    if (!rowId) return "";

    const snapshot = buildTimezoneComputedSnapshot(rowId);
    if (!snapshot) return "";

    const orderedParts = [];
    sanitizeCopyFormatOrder(order).forEach(key => {
        if (!enabled?.[key]) return;
        const value = getCopyFieldText(snapshot, key, { timePartsEnabled });
        if (value) orderedParts.push(value);
    });
    return orderedParts.join(" ").trim();
}

function updateCopyFormatPreview() {
    const copyPreviewEl = document.getElementById("copy-format-preview");
    if (!copyPreviewEl) return;

    const setPreview = (el, text) => {
        const resolved = text || "-";
        el.textContent = resolved;
        el.classList.toggle("empty", resolved === "-");
    };

    if (!showCopyFormat) {
        setPreview(copyPreviewEl, "-");
        return;
    }

    const baseRef = getBaseTimezoneRef();
    const baseRowId = baseRef?.id || "utc";
    setPreview(copyPreviewEl, getRowFormattedText(baseRowId, copyFormatOrder, copyFormatEnabled, copyTimePartsEnabled));
}

async function copyRow(id) {
    const text = getRowCopyText(id);
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
    const lineArr = [...document.querySelectorAll(".time-row")]
        .map(row => getRowCopyText(String(row.id || "").replace("tz-row-", "")))
        .filter(Boolean);
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
    const baseDateTime = formatDateTimeByTimezone(globalTimes[0], baseRef).trim();
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

    clone.querySelectorAll(".export-exclude, .move-col, .move-cell").forEach((node) => node.remove());

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

function isDomExceptionLike(err) {
    if (!err) return false;
    if (typeof DOMException !== "undefined" && err instanceof DOMException) return true;
    const name = typeof err.name === "string" ? err.name : "";
    return name === "SecurityError" || name === "InvalidStateError";
}

async function detectForeignObjectRendererSupport() {
    if (typeof canUseForeignObjectRenderer === "boolean") return canUseForeignObjectRenderer;
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
        canUseForeignObjectRenderer = false;
        return false;
    }

    const probeSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4">
            <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml" style="width:4px;height:4px;background:#000;"></div>
            </foreignObject>
        </svg>
    `;
    const probeBlob = new Blob([probeSvg], { type: "image/svg+xml;charset=utf-8" });
    const probeUrl = URL.createObjectURL(probeBlob);
    try {
        const img = await loadImageElement(probeUrl);
        const canvas = document.createElement("canvas");
        canvas.width = 4;
        canvas.height = 4;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            canUseForeignObjectRenderer = false;
            return false;
        }
        ctx.drawImage(img, 0, 0, 4, 4);
        canvas.toDataURL("image/png");
        canUseForeignObjectRenderer = true;
        return true;
    } catch (err) {
        canUseForeignObjectRenderer = false;
        return false;
    } finally {
        URL.revokeObjectURL(probeUrl);
    }
}

function extractTableCellText(cell) {
    if (!cell) return "";
    const timeInput = cell.querySelector(".time-input");
    if (timeInput) {
        const dnText = (cell.querySelector(".dn-icon")?.textContent || "").trim();
        const dayBadge = cell.querySelector(".day-badge");
        const timeText = (timeInput.value || "").trim();
        const dayText = (dayBadge?.textContent || "").trim();
        return [dnText, timeText, dayText].filter(Boolean).join(" ").trim();
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

    const headerCells = [...table.querySelectorAll("#table-head th")]
        .filter((th) => !th.classList.contains("export-exclude") && !th.classList.contains("move-col"));
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
    const targetWidth = TABLE_IMAGE_EXPORT_WIDTH;
    const renderRatio = targetWidth / Math.max(1, tableWidth);
    const targetHeight = Math.max(1, Math.round(tableHeight * renderRatio));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.scale(renderRatio, renderRatio);

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

    const isCenterHeader = () => true;
    const isCenterBodyCell = (cell) => {
        if (!cell) return false;
        if (
            cell.classList.contains("move-cell") ||
            cell.classList.contains("timezone-cell") ||
            cell.classList.contains("period-days-cell") ||
            cell.classList.contains("period-time-cell")
        ) {
            return true;
        }
        return !!cell.querySelector(".offset-text");
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
        const cells = [...row.children]
            .filter((td) => !td.classList.contains("export-exclude") && !td.classList.contains("move-cell"));
        for (let c = 0; c < colCount; c++) {
            const w = measuredColWidths[c];
            const cell = cells[c];
            const text = extractTableCellText(cell);
            const center = isCenterBodyCell(cell);
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
    const targetWidth = TABLE_IMAGE_EXPORT_WIDTH;
    const targetHeight = Math.max(1, Math.round((height * targetWidth) / width));
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
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");
        ctx.fillStyle = getComputedStyle(document.body).backgroundColor || "#0f172a";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const dataUrl = canvas.toDataURL("image/png");
        return dataUrl;
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
        const supportsPrimaryRenderer = await detectForeignObjectRendererSupport();
        if (supportsPrimaryRenderer) {
            try {
                dataUrl = await renderTimezoneTableToPngDataUrl();
            } catch (primaryErr) {
                if (isDomExceptionLike(primaryErr)) {
                    canUseForeignObjectRenderer = false;
                }
                dataUrl = renderTimezoneTableFallbackDataUrl();
            }
        } else {
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

function getPersistenceSnapshot() {
    currentMainTab = sanitizeMainTab(currentMainTab);
    if (currentMainTab === "live" || currentMainTab === "fixed") {
        activeGroupIdByMainTab[currentMainTab] = activeGroupId;
    }
    normalizeGroupTabState();

    return {
        groups,
        activeGroupId,
        currentMainTab,
        activeGroupIdByMainTab,
        slotCount,
        baseTimezoneId: getCurrentGroupBaseTimezoneId(),
        showTimeAdjust,
        ignoreDST,
        showCopyFormat,
        displayFormatOrder: sanitizeCopyFormatOrder(displayFormatOrder),
        displayFormatEnabled: sanitizeCopyFormatEnabled(displayFormatEnabled, "display"),
        displayTimePartsEnabled: sanitizeTimePartsEnabled(displayTimePartsEnabled, "display"),
        copyFormatOrder: sanitizeCopyFormatOrder(copyFormatOrder),
        copyFormatEnabled: sanitizeCopyFormatEnabled(copyFormatEnabled, "copy"),
        copyTimePartsEnabled: sanitizeTimePartsEnabled(copyTimePartsEnabled, "copy"),
        timeAdjustDayStepBySlot: [
            getTimeAdjustDayStep(0),
            getTimeAdjustDayStep(1)
        ]
    };
}

function getSettingsExportFileName() {
    const now = new Date();
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `GlobalTimeViewer_settings_${stamp}.json`;
}

function exportSettingsToJSON() {
    try {
        const exportPayload = {
            app: "GlobalTimeViewer",
            formatVersion: 1,
            version: VERSION,
            exportedAt: new Date().toISOString(),
            data: getPersistenceSnapshot(),
            preferences: {
                theme: sanitizeTheme(currentTheme),
                language: I18N_DATA[currentLang] ? currentLang : "ko",
                uiScale: getCurrentUiScalePercent()
            }
        };

        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = getSettingsExportFileName();
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        showToast(t("toast_settings_export_success"));
    } catch (err) {
        console.error("exportSettingsToJSON failed:", err);
        showToast(t("toast_settings_export_failed"));
    }
}

function ensureImportedGroupsFallbackToStandardTime() {
    let changed = false;
    groups.forEach((group) => {
        if (!group || typeof group !== "object") return;
        const zoneCount = Array.isArray(group.zones) ? group.zones.length : 0;
        if (zoneCount > 0) return;

        if (sanitizeBaseTimezoneId(group.baseTimezoneId) !== "utc") {
            group.baseTimezoneId = "utc";
            changed = true;
        }
        if (group.showUtcRow === false) {
            group.showUtcRow = true;
            changed = true;
        }
        if (sanitizeUtcRowOrder(group.utcRowOrder) !== 0) {
            group.utcRowOrder = 0;
            changed = true;
        }
    });
    return changed;
}

function applyImportedSettings(importedRoot) {
    const payload = (importedRoot && typeof importedRoot === "object" && importedRoot.data && typeof importedRoot.data === "object")
        ? importedRoot.data
        : importedRoot;
    if (!payload || typeof payload !== "object") {
        throw new Error("Invalid settings payload");
    }
    if (!Array.isArray(payload.groups)) {
        throw new Error("Invalid settings payload: groups is required");
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    const pref = (importedRoot && typeof importedRoot === "object" && importedRoot.preferences && typeof importedRoot.preferences === "object")
        ? importedRoot.preferences
        : importedRoot;

    if (pref && typeof pref === "object") {
        if (typeof pref.theme === "string") {
            localStorage.setItem(THEME_STORAGE_KEY, sanitizeTheme(pref.theme));
        }
        if (typeof pref.language === "string" && I18N_DATA[pref.language]) {
            localStorage.setItem(LANG_STORAGE_KEY, pref.language);
        }
        if (pref.uiScale !== undefined) {
            localStorage.setItem(UI_SCALE_STORAGE_KEY, String(sanitizeUiScalePercent(pref.uiScale)));
        }
    }

    const nextLang = localStorage.getItem(LANG_STORAGE_KEY) || "ko";
    currentLang = I18N_DATA[nextLang] ? nextLang : "ko";
    loadPersistence();
    if (ensureImportedGroupsFallbackToStandardTime()) {
        savePersistence();
    }
    applyTheme(loadThemePreference(), false);
    applyUiScale(loadUiScalePreference(), false);
    applyTranslations();
    applyVersionBranding();

    const langSelect = document.getElementById("lang-select");
    if (langSelect) langSelect.value = currentLang;

    const themeSelect = document.getElementById("theme-select");
    if (themeSelect) themeSelect.value = currentTheme;
    const uiScaleSelect = document.getElementById("ui-scale-select");
    if (uiScaleSelect) {
        populateUiScaleSelect(uiScaleSelect);
        uiScaleSelect.value = String(getCurrentUiScalePercent());
    }

    updateTZDropdown();
    refreshSelectWidths();
    switchMainTab(currentMainTab);
}

async function handleSettingsImportFile(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) return;

    try {
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        applyImportedSettings(parsed);
        showToast(t("toast_settings_import_success"));
    } catch (err) {
        console.error("handleSettingsImportFile failed:", err);
        showToast(t("toast_settings_import_failed"));
    } finally {
        if (input) input.value = "";
    }
}

function savePersistence() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getPersistenceSnapshot()));
}

function resetAllSettings() {
    if (!confirm(t("confirm_reset_all_settings"))) return;

    const keysToRemove = [STORAGE_KEY, THEME_STORAGE_KEY, LANG_STORAGE_KEY, UI_SCALE_STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    location.reload();
}

function getDefaultGroups() {
    return [{
        name: t("default_group_name"),
        zones: [],
        baseTimezoneId: "utc",
        showUtcRow: true,
        utcRowOrder: 0
    }];
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
    if (!timeZoneName || !isValidTimeZone(timeZoneName)) return null;
    const fallbackName = (typeof zone.name === "string" && zone.name.trim()) ? zone.name.trim() : timeZoneName;
    return {
        id,
        type: "standard",
        zone: timeZoneName,
        name_ko: (typeof zone.name_ko === "string" && zone.name_ko.trim()) ? zone.name_ko : fallbackName,
        name_en: (typeof zone.name_en === "string" && zone.name_en.trim()) ? zone.name_en : fallbackName
    };
}

function isValidTimeZone(zoneName) {
    const normalized = (typeof zoneName === "string") ? zoneName.trim() : "";
    if (!normalized) return false;
    if (TIMEZONE_VALIDATION_CACHE.has(normalized)) {
        return TIMEZONE_VALIDATION_CACHE.get(normalized);
    }
    let valid = false;
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format(new Date());
        valid = true;
    } catch (err) {
        valid = false;
    }
    TIMEZONE_VALIDATION_CACHE.set(normalized, valid);
    return valid;
}

function sanitizeGroup(group, idx) {
    if (!group || typeof group !== "object") return null;
    const rawZones = Array.isArray(group.zones) ? group.zones.map(sanitizeTimezoneZone).filter(Boolean) : [];
    const zones = rawZones.filter(z => !(z.type === "standard" && z.zone === "UTC"));
    const name = (typeof group.name === "string" && group.name.trim()) ? group.name.trim() : `${t("default_group_name")} ${idx + 1}`;
    let requestedBaseTimezoneId = sanitizeBaseTimezoneId(group.baseTimezoneId);
    if (requestedBaseTimezoneId !== "utc") {
        const baseIsLegacyUtcZone = rawZones.some(z => z.id === requestedBaseTimezoneId && z.type === "standard" && z.zone === "UTC");
        if (baseIsLegacyUtcZone) requestedBaseTimezoneId = "utc";
    }
    const isBaseTimezoneValid = requestedBaseTimezoneId === "utc" || zones.some(z => z.id === requestedBaseTimezoneId);
    const hasLegacyUtcZone = rawZones.length !== zones.length;
    const showUtcRow = hasLegacyUtcZone ? true : (typeof group.showUtcRow === "boolean" ? group.showUtcRow : true);
    const utcRowOrder = sanitizeUtcRowOrder(group.utcRowOrder);
    return {
        name,
        zones,
        baseTimezoneId: isBaseTimezoneValid ? requestedBaseTimezoneId : "utc",
        showUtcRow,
        utcRowOrder
    };
}

function loadPersistence() {
    let s = localStorage.getItem(STORAGE_KEY);
    if (!s) {
        for (const key of LEGACY_STORAGE_KEYS) {
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
        showTimeAdjust = false;
        ignoreDST = true;
        showCopyFormat = false;
        timeAdjustDayStepBySlot = [DEFAULT_TIME_ADJUST_DAY_STEP, DEFAULT_TIME_ADJUST_DAY_STEP];
        displayFormatOrder = [...COPY_FORMAT_KEYS];
        displayFormatEnabled = sanitizeCopyFormatEnabled(null, "display");
        displayTimePartsEnabled = sanitizeTimePartsEnabled(null, "display");
        copyFormatOrder = [...COPY_FORMAT_KEYS];
        copyFormatEnabled = sanitizeCopyFormatEnabled(null, "copy");
        copyTimePartsEnabled = sanitizeTimePartsEnabled(null, "copy");
        isRealtime = true;
        return;
    }

    try {
        const d = JSON.parse(s);
        const parsedGroups = Array.isArray(d?.groups) ? d.groups.map(sanitizeGroup).filter(Boolean) : [];
        groups = parsedGroups.length ? parsedGroups : getDefaultGroups();
        const rawGroups = Array.isArray(d?.groups) ? d.groups : [];
        const legacyGlobalBaseTimezoneId = sanitizeBaseTimezoneId(d?.baseTimezoneId);
        groups.forEach((group, idx) => {
            const rawGroup = rawGroups[idx];
            const hasGroupSpecificBase = typeof rawGroup?.baseTimezoneId === "string" && rawGroup.baseTimezoneId.trim();
            if (hasGroupSpecificBase || legacyGlobalBaseTimezoneId === "utc") return;
            group.baseTimezoneId = group.zones.some(z => z.id === legacyGlobalBaseTimezoneId) ? legacyGlobalBaseTimezoneId : "utc";
        });

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

        showTimeAdjust = !!d?.showTimeAdjust;
        ignoreDST = (typeof d?.ignoreDST === "boolean") ? d.ignoreDST : true;
        showCopyFormat = !!d?.showCopyFormat;
        const rawTimeAdjustStep = Array.isArray(d?.timeAdjustDayStepBySlot) ? d.timeAdjustDayStepBySlot : [];
        timeAdjustDayStepBySlot = [
            sanitizeTimeAdjustDayStep(rawTimeAdjustStep[0]),
            sanitizeTimeAdjustDayStep(rawTimeAdjustStep[1])
        ];
        const hasDisplayOrder = Array.isArray(d?.displayFormatOrder);
        const hasDisplayEnabled = !!(d?.displayFormatEnabled && typeof d.displayFormatEnabled === "object");
        const rawDisplayEnabled = hasDisplayEnabled ? d.displayFormatEnabled : d?.copyFormatEnabled;
        const fallbackCopyOrder = sanitizeCopyFormatOrder(d?.copyFormatOrder);
        const fallbackCopyEnabled = sanitizeCopyFormatEnabled(d?.copyFormatEnabled, "copy");

        displayFormatOrder = sanitizeCopyFormatOrder(hasDisplayOrder ? d.displayFormatOrder : d?.copyFormatOrder);
        displayFormatEnabled = sanitizeCopyFormatEnabled(rawDisplayEnabled, "display");
        displayTimePartsEnabled = sanitizeTimePartsEnabled(
            d?.displayTimePartsEnabled,
            "display"
        );
        if (!d?.displayTimePartsEnabled) {
            displayTimePartsEnabled = deriveTimePartsFromLegacyEnabled(rawDisplayEnabled, "display");
        }
        copyFormatOrder = fallbackCopyOrder;
        copyFormatEnabled = fallbackCopyEnabled;
        copyTimePartsEnabled = sanitizeTimePartsEnabled(d?.copyTimePartsEnabled, "copy");
        if (!d?.copyTimePartsEnabled) {
            copyTimePartsEnabled = deriveTimePartsFromLegacyEnabled(d?.copyFormatEnabled, "copy");
        }
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
        showTimeAdjust = false;
        ignoreDST = true;
        showCopyFormat = false;
        timeAdjustDayStepBySlot = [DEFAULT_TIME_ADJUST_DAY_STEP, DEFAULT_TIME_ADJUST_DAY_STEP];
        displayFormatOrder = [...COPY_FORMAT_KEYS];
        displayFormatEnabled = sanitizeCopyFormatEnabled(null, "display");
        displayTimePartsEnabled = sanitizeTimePartsEnabled(null, "display");
        copyFormatOrder = [...COPY_FORMAT_KEYS];
        copyFormatEnabled = sanitizeCopyFormatEnabled(null, "copy");
        copyTimePartsEnabled = sanitizeTimePartsEnabled(null, "copy");
        isRealtime = true;
        savePersistence();
    }
}
