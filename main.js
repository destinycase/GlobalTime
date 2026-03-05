let isRealtime = true;
let globalTimes = [new Date(), new Date()];
let slotCount = 1;
let uiScale = 1.0;
let showTimeAdjust = true;
let showCopyFormat = false;
const COPY_FORMAT_KEYS = ["timezone", "region", "offset", "time", "period_days", "period_time"];
const TIME_PART_KEYS = ["dn", "date", "time", "weekday"];
const PERIOD_RESULT_IDS = new Set(["period-res", "period-hour-res", "period-min-res", "period-sec-res"]);
const MAIN_TABS = ["live", "fixed", "multi", "calc"];
const MIN_TIME_ADJUST_DAY_STEP = 1;
const MAX_TIME_ADJUST_DAY_STEP = 36500;
const DEFAULT_TIME_ADJUST_DAY_STEP = 1;
const MIN_MULTI_RANGE_COUNT = 1;
const MAX_MULTI_RANGE_COUNT = 12;
const DEFAULT_MULTI_RANGE_TITLE = "Range";
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
let multiRangeCount = 1;
let multiRangeTitle = t("placeholder_range_title");
let multiRanges = [];
let multiRangeCollapsed = [];
let multiRangeStartEditEnabled = [];
let multiRangeEndEditEnabled = [];
let currentMainTab = "live";
let activeGroupIdByMainTab = { live: 0, fixed: 0 };
const VERSION = "3.4.3";
const STORAGE_KEY = "GTV_v323_Data";
const THEME_STORAGE_KEY = "GTV_Theme";
const LANG_STORAGE_KEY = "GTV_Lang";
const UI_SCALE_STORAGE_KEY = "GTV_UIScale";
const MIN_UI_SCALE_PERCENT = 50;
const MAX_UI_SCALE_PERCENT = 200;
const DEFAULT_UI_SCALE_PERCENT = 100;
const UI_SCALE_PERCENT_OPTIONS = [50, 75, 100, 125, 150, 175, 200];
const LEGACY_STORAGE_KEYS = ["GTV_v322_Data", "GTV_v321_Data", "GTV_v320_Data", "GTV_v310_Data", "GTV_v300_Data", "GTV_v200_Data", "GTV_v170_Data", "GTV_v160_Data", "GTV_v150_Data", "GTV_v140_Data"];
const THEME_LIST = ["dark", "light"];
const TABLE_IMAGE_EXPORT_WIDTH = 1920;
const EXPORT_MONO_FONT_FAMILY = "'JetBrains Mono', 'Consolas', 'Courier New', monospace";
let currentTheme = "dark";
const TIMEZONE_VALIDATION_CACHE = new Map();
let canUseForeignObjectRenderer = null;
let timePartsOutsideHandlerBound = false;
let timezoneIdSeed = 0;
let multiSubgroupIdSeed = 0;
let pendingGroupImportIndex = null;
let pendingSubgroupImportTarget = null;
let floatingTooltipEl = null;
let floatingTooltipTarget = null;
let floatingTooltipBound = false;
let standardTimezoneEntriesCache = null;
let standardTimezoneEntriesCacheYear = null;
let standardTimezoneWarmupQueued = false;
let fullTimezoneOverlayStandardEntries = [];
let fullTimezoneOverlayCountryEntries = [];
let fullTimezoneOverlayActiveTab = "standard";
let lastPersistenceErrorToastAt = 0;

function applyVersionBranding() {
    const titleText = `Global Time v${VERSION}`;
    document.title = titleText;
    const badge = document.getElementById("version-badge");
    if (badge) badge.textContent = `ver ${VERSION}`;
}

function setCustomTooltip(el, text) {
    if (!(el instanceof Element)) return;
    const tooltip = (typeof text === "string") ? text.trim() : "";
    if (!tooltip) {
        el.removeAttribute("data-tooltip");
        if (!el.classList.contains("info-tip")) el.classList.remove("custom-tooltip");
        el.removeAttribute("title");
        return;
    }
    el.setAttribute("data-tooltip", tooltip);
    el.setAttribute("aria-label", tooltip);
    el.removeAttribute("title");
    if (!el.classList.contains("info-tip")) el.classList.add("custom-tooltip");
}

function upgradeNativeTitleTooltips(root = document) {
    if (!root) return;
    const candidates = root.querySelectorAll(
        'button.copy-row-btn[title], button.remove-row-btn[title]'
    );
    candidates.forEach((el) => {
        const text = (el.getAttribute("title") || "").trim();
        if (!text) {
            el.removeAttribute("title");
            return;
        }
        setCustomTooltip(el, text);
    });
}

function ensureFloatingTooltipElement() {
    if (floatingTooltipEl && floatingTooltipEl.isConnected) return floatingTooltipEl;
    const tooltip = document.createElement("div");
    tooltip.className = "app-floating-tooltip";
    tooltip.id = "app-floating-tooltip";
    document.body.appendChild(tooltip);
    floatingTooltipEl = tooltip;
    return tooltip;
}

function hideFloatingTooltip() {
    if (floatingTooltipEl) floatingTooltipEl.classList.remove("visible");
    floatingTooltipTarget = null;
}

function positionFloatingTooltip() {
    if (!floatingTooltipEl || !floatingTooltipTarget) return;
    if (!(floatingTooltipTarget instanceof Element) || !floatingTooltipTarget.isConnected) {
        hideFloatingTooltip();
        return;
    }

    const targetRect = floatingTooltipTarget.getBoundingClientRect();
    floatingTooltipEl.style.left = "0px";
    floatingTooltipEl.style.top = "0px";
    const tooltipRect = floatingTooltipEl.getBoundingClientRect();
    const viewportPadding = 8;
    const offset = 10;

    let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
    left = Math.min(
        window.innerWidth - tooltipRect.width - viewportPadding,
        Math.max(viewportPadding, left)
    );

    let top = targetRect.top - tooltipRect.height - offset;
    if (top < viewportPadding) {
        top = targetRect.bottom + offset;
    }
    top = Math.min(
        window.innerHeight - tooltipRect.height - viewportPadding,
        Math.max(viewportPadding, top)
    );

    floatingTooltipEl.style.left = `${Math.round(left)}px`;
    floatingTooltipEl.style.top = `${Math.round(top)}px`;
}

function showFloatingTooltip(target) {
    if (!(target instanceof Element)) {
        hideFloatingTooltip();
        return;
    }
    const text = (target.getAttribute("data-tooltip") || "").trim();
    if (!text) {
        hideFloatingTooltip();
        return;
    }

    const tooltip = ensureFloatingTooltipElement();
    tooltip.textContent = text;
    floatingTooltipTarget = target;
    tooltip.classList.add("visible");
    positionFloatingTooltip();
}

function bindFloatingTooltipEvents() {
    if (floatingTooltipBound) return;
    floatingTooltipBound = true;

    document.addEventListener("pointerenter", (e) => {
        const target = e.target instanceof Element ? e.target.closest("[data-tooltip]") : null;
        if (!target) return;
        showFloatingTooltip(target);
    }, true);

    document.addEventListener("pointerleave", (e) => {
        const target = e.target instanceof Element ? e.target.closest("[data-tooltip]") : null;
        if (!target) return;
        const relatedTarget = e.relatedTarget;
        if (relatedTarget instanceof Element && target.contains(relatedTarget)) return;
        if (floatingTooltipTarget === target) hideFloatingTooltip();
    }, true);

    document.addEventListener("focusin", (e) => {
        const target = e.target instanceof Element ? e.target.closest("[data-tooltip]") : null;
        if (!target) return;
        showFloatingTooltip(target);
    }, true);

    document.addEventListener("focusout", (e) => {
        const target = e.target instanceof Element ? e.target.closest("[data-tooltip]") : null;
        if (!target) return;
        const relatedTarget = e.relatedTarget;
        if (relatedTarget instanceof Element && target.contains(relatedTarget)) return;
        if (floatingTooltipTarget === target) hideFloatingTooltip();
    }, true);

    window.addEventListener("scroll", positionFloatingTooltip, true);
    window.addEventListener("resize", positionFloatingTooltip, true);
    document.addEventListener("pointerdown", hideFloatingTooltip, true);
    document.addEventListener("keydown", hideFloatingTooltip, true);
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

function formatUtcOffsetLabel(totalMinutes = 0) {
    const safeMinutes = Number.isFinite(Number(totalMinutes)) ? Math.trunc(Number(totalMinutes)) : 0;
    const sign = safeMinutes >= 0 ? "+" : "-";
    const abs = Math.abs(safeMinutes);
    const hh = String(Math.floor(abs / 60)).padStart(2, "0");
    const mm = String(abs % 60).padStart(2, "0");
    return `UTC${sign}${hh}:${mm}`;
}

function getZoneStandardDaylightOffsets(zone) {
    const safeZone = (typeof zone === "string") ? zone.trim() : "";
    if (!safeZone) return { standard: null, daylight: null };
    try {
        const now = new Date();
        const year = now.getUTCFullYear();
        const jan = new Date(Date.UTC(year, 0, 1, 12, 0, 0));
        const jul = new Date(Date.UTC(year, 6, 1, 12, 0, 0));
        const janOffset = getTimezoneOffset(safeZone, jan);
        const julOffset = getTimezoneOffset(safeZone, jul);
        if (!Number.isFinite(janOffset) || !Number.isFinite(julOffset)) {
            return { standard: null, daylight: null };
        }
        if (janOffset === julOffset) {
            return { standard: janOffset, daylight: null };
        }
        return {
            standard: Math.min(janOffset, julOffset),
            daylight: Math.max(janOffset, julOffset)
        };
    } catch (err) {
        return { standard: null, daylight: null };
    }
}

function normalizeZoneAbbreviation(value) {
    return String(value || "").replace("GMT", "UTC").trim().toUpperCase();
}

function getAllSupportedTimezoneNames() {
    try {
        if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
            const values = Intl.supportedValuesOf("timeZone");
            if (Array.isArray(values) && values.length) return values;
        }
    } catch (err) {
        // Fallback below.
    }
    const fallback = new Set(["UTC"]);
    TZ_DATABASE.forEach((tzData) => {
        if (tzData?.zone) fallback.add(tzData.zone);
    });
    return [...fallback];
}

function getSelectableTZEntries() {
    const entries = [];
    getSortedTZData(TZ_DATABASE).forEach((tzData) => {
        const mapping = ZONE_MAP[tzData.zone];
        if (Array.isArray(mapping) && mapping.length >= 2) {
            const offsets = getZoneStandardDaylightOffsets(tzData.zone);
            if (Number.isFinite(offsets.daylight) && Number.isFinite(offsets.standard) && offsets.daylight !== offsets.standard) {
                entries.push({
                    ...tzData,
                    kind: "country_region",
                    key: `${tzData.zone}|dst`,
                    abbr: normalizeZoneAbbreviation(mapping[1]),
                    fixedOffsetMinutes: offsets.daylight
                });
                entries.push({
                    ...tzData,
                    kind: "country_region",
                    key: `${tzData.zone}|std`,
                    abbr: normalizeZoneAbbreviation(mapping[0]),
                    fixedOffsetMinutes: offsets.standard
                });
                return;
            }
        }

        const baseAbbr = Array.isArray(mapping)
            ? normalizeZoneAbbreviation(mapping[0])
            : normalizeZoneAbbreviation(mapping || getBetterAbbr(tzData.zone, new Date()));
        entries.push({
            ...tzData,
            kind: "country_region",
            key: `${tzData.zone}|auto`,
            abbr: baseAbbr || normalizeZoneAbbreviation(getBetterAbbr(tzData.zone, new Date())),
            fixedOffsetMinutes: null
        });
    });
    return entries;
}

function getStandardTimezoneEntries() {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    if (standardTimezoneEntriesCacheYear === currentYear && Array.isArray(standardTimezoneEntriesCache)) {
        return standardTimezoneEntriesCache.map((entry) => ({ ...entry }));
    }

    const entries = [];
    const seen = new Set();

    const pushEntry = (abbrValue, offsetMinutes, zone = "UTC") => {
        if (!Number.isFinite(offsetMinutes)) return;
        const safeOffset = Math.min(14 * 60, Math.max(-14 * 60, Math.trunc(offsetMinutes)));
        const abbr = normalizeZoneAbbreviation(abbrValue) || formatUtcOffsetLabel(safeOffset);
        const dedupeKey = `${abbr}|${safeOffset}`;
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);
        entries.push({
            kind: "standard_list",
            key: `std:${abbr}:${safeOffset}`,
            zone,
            abbr,
            fixedOffsetMinutes: safeOffset
        });
    };

    pushEntry("UTC", 0, "UTC");

    const janDate = new Date(Date.UTC(currentYear, 0, 1, 12, 0, 0));
    const julDate = new Date(Date.UTC(currentYear, 6, 1, 12, 0, 0));
    getAllSupportedTimezoneNames().forEach((zone) => {
        if (zone === "UTC") return;
        const janOffset = getTimezoneOffset(zone, janDate);
        const julOffset = getTimezoneOffset(zone, julDate);
        if (!Number.isFinite(janOffset) || !Number.isFinite(julOffset)) return;

        const janAbbr = normalizeZoneAbbreviation(getBetterAbbr(zone, janDate)) || formatUtcOffsetLabel(janOffset);
        const julAbbr = normalizeZoneAbbreviation(getBetterAbbr(zone, julDate)) || formatUtcOffsetLabel(julOffset);

        if (janOffset === julOffset) {
            pushEntry(janAbbr, janOffset, zone);
            return;
        }

        const standardOffset = Math.min(janOffset, julOffset);
        const daylightOffset = Math.max(janOffset, julOffset);
        const standardAbbr = (janOffset === standardOffset) ? janAbbr : julAbbr;
        const daylightAbbr = (janOffset === daylightOffset) ? janAbbr : julAbbr;
        pushEntry(daylightAbbr, daylightOffset, zone);
        pushEntry(standardAbbr, standardOffset, zone);
    });

    const sorted = entries.sort((a, b) => {
        const diff = a.fixedOffsetMinutes - b.fixedOffsetMinutes;
        if (diff !== 0) return diff;
        return a.abbr.localeCompare(b.abbr, "en-US", { sensitivity: "base" });
    });
    standardTimezoneEntriesCache = sorted.map((entry) => ({ ...entry }));
    standardTimezoneEntriesCacheYear = currentYear;
    return sorted;
}

function queueStandardTimezoneWarmup() {
    const currentYear = new Date().getUTCFullYear();
    if (standardTimezoneEntriesCacheYear === currentYear && Array.isArray(standardTimezoneEntriesCache)) return;
    if (standardTimezoneWarmupQueued) return;
    standardTimezoneWarmupQueued = true;

    const warmup = () => {
        standardTimezoneWarmupQueued = false;
        try {
            getStandardTimezoneEntries();
        } catch (err) {
            console.warn("Failed to warm up standard timezone cache.", err);
        }
    };

    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(warmup, { timeout: 1200 });
        return;
    }
    if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
        window.setTimeout(warmup, 120);
        return;
    }
    warmup();
}

function getTimezoneEntryTitle(entry) {
    if (entry?.kind === "standard_list") {
        const offsetLabel = formatUtcOffsetLabel(entry.fixedOffsetMinutes);
        return currentLang === "en" ? `${offsetLabel} Standard Time` : `${offsetLabel} 표준시`;
    }
    return getLocalizedTZLabel(entry);
}

function getSelectableTZEntryByKey(entryKey) {
    const key = (typeof entryKey === "string") ? entryKey.trim() : "";
    if (!key) return null;
    const countryEntry = getSelectableTZEntries().find((entry) => entry.key === key);
    if (countryEntry) return countryEntry;
    return getStandardTimezoneEntries().find((entry) => entry.key === key) || null;
}

function getSelectableTZOptionLabel(entry) {
    const line1 = getTimezoneEntryTitle(entry);
    const abbr = normalizeZoneAbbreviation(entry?.abbr);
    return abbr ? `${line1} [${abbr}]` : line1;
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

function createTimezoneListItem(tzEntry, closeOverlay = false) {
    const item = document.createElement("div");
    item.className = "tz-item";
    const title = document.createElement("div");
    title.className = "tz-item-title";
    title.textContent = getTimezoneEntryTitle(tzEntry);
    const abbr = document.createElement("div");
    abbr.className = "tz-item-abbr";
    const abbrText = tzEntry?.kind === "standard_list"
        ? formatUtcOffsetLabel(tzEntry?.fixedOffsetMinutes)
        : (
            normalizeZoneAbbreviation(tzEntry?.abbr)
            || normalizeZoneAbbreviation(getBetterAbbr(tzEntry?.zone, new Date()))
            || "UTC"
        );
    abbr.textContent = `[${abbrText}]`;
    item.appendChild(title);
    item.appendChild(abbr);
    item.addEventListener("click", () => {
        addFromSearchWithData(tzEntry.key);
        if (closeOverlay) {
            const overlay = document.getElementById("full-tz-overlay");
            if (overlay) overlay.style.display = "none";
        }
    });
    return item;
}

function sanitizeFullTimezoneOverlayTab(value) {
    return value === "country" ? "country" : "standard";
}

function renderFullTimezoneOverlayList() {
    const list = document.getElementById("full-tz-list");
    if (!list) return;

    list.innerHTML = "";
    const entries = fullTimezoneOverlayActiveTab === "country"
        ? fullTimezoneOverlayCountryEntries
        : fullTimezoneOverlayStandardEntries;
    entries.forEach((entry) => list.appendChild(createTimezoneListItem(entry, true)));
}

function updateFullTimezoneOverlayTabButtons() {
    const standardTabBtn = document.getElementById("tz-tab-standard");
    const countryTabBtn = document.getElementById("tz-tab-country");
    if (standardTabBtn) {
        standardTabBtn.classList.toggle("active", fullTimezoneOverlayActiveTab === "standard");
        standardTabBtn.setAttribute("aria-selected", fullTimezoneOverlayActiveTab === "standard" ? "true" : "false");
    }
    if (countryTabBtn) {
        countryTabBtn.classList.toggle("active", fullTimezoneOverlayActiveTab === "country");
        countryTabBtn.setAttribute("aria-selected", fullTimezoneOverlayActiveTab === "country" ? "true" : "false");
    }
}

function setFullTimezoneOverlayTab(value) {
    fullTimezoneOverlayActiveTab = sanitizeFullTimezoneOverlayTab(value);
    updateFullTimezoneOverlayTabButtons();
    renderFullTimezoneOverlayList();
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

function sanitizeMultiSubgroupId(value) {
    return (typeof value === "string" && value.trim()) ? value.trim() : "";
}

function sanitizeMultiSubgroupName(value, fallback = "") {
    const trimmed = (typeof value === "string" ? value : "").trim();
    if (trimmed) return trimmed.slice(0, 60);
    const fallbackTrimmed = (typeof fallback === "string" ? fallback : "").trim();
    if (fallbackTrimmed) return fallbackTrimmed.slice(0, 60);
    return t("default_subgroup_name");
}

function getDefaultMultiSubgroupName(index = 0) {
    const base = t("default_subgroup_name");
    return `${base} ${index + 1}`;
}

function parseAutoGeneratedIndexedName(name, baseCandidates = []) {
    const text = (typeof name === "string") ? name.trim() : "";
    if (!text) return { matched: false, number: null };

    for (const base of baseCandidates) {
        const safeBase = String(base || "").trim();
        if (!safeBase) continue;
        if (text === safeBase) {
            return { matched: true, number: null };
        }
        const escapedBase = safeBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const matched = text.match(new RegExp(`^${escapedBase}\\s+(\\d+)$`));
        if (matched) {
            return { matched: true, number: parseInt(matched[1], 10) };
        }
    }
    return { matched: false, number: null };
}

function localizeAutoGeneratedNamesForCurrentLanguage() {
    if (!Array.isArray(groups) || !groups.length) return false;
    let changed = false;

    const groupBaseCandidates = ["Default Group", "기본 그룹"];
    const subgroupBaseCandidates = ["Subgroup", "Aux Group", "서브 그룹", "보조 그룹"];
    const nextGroupBase = t("default_group_name");
    const nextSubgroupBase = t("default_subgroup_name");

    groups.forEach((group, groupIdx) => {
        if (!group || typeof group !== "object") return;
        const parsedGroup = parseAutoGeneratedIndexedName(group.name, groupBaseCandidates);
        if (parsedGroup.matched) {
            const nextGroupName = Number.isFinite(parsedGroup.number)
                ? `${nextGroupBase} ${parsedGroup.number}`
                : nextGroupBase;
            if (group.name !== nextGroupName) {
                group.name = nextGroupName;
                changed = true;
            }
        }

        ensureGroupMultiSubgroups(group);
        group.multiSubgroups.forEach((subgroup, subgroupIdx) => {
            const parsedSubgroup = parseAutoGeneratedIndexedName(subgroup?.name, subgroupBaseCandidates);
            if (!parsedSubgroup.matched) return;
            const nextSubgroupName = Number.isFinite(parsedSubgroup.number)
                ? `${nextSubgroupBase} ${parsedSubgroup.number}`
                : `${nextSubgroupBase} ${subgroupIdx + 1}`;
            if (subgroup.name !== nextSubgroupName) {
                subgroup.name = nextSubgroupName;
                changed = true;
            }
        });
    });

    return changed;
}

function getUsedMultiSubgroupIds() {
    const usedIds = new Set();
    groups.forEach((group) => {
        if (!group || !Array.isArray(group.multiSubgroups)) return;
        group.multiSubgroups.forEach((subgroup) => {
            const subgroupId = sanitizeMultiSubgroupId(subgroup?.id);
            if (subgroupId) usedIds.add(subgroupId);
        });
    });
    return usedIds;
}

function createUniqueMultiSubgroupId(prefix = "subgroup") {
    const normalizedPrefix = (typeof prefix === "string" && prefix.trim()) ? prefix.trim() : "subgroup";
    const usedIds = getUsedMultiSubgroupIds();

    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        const uuidId = `${normalizedPrefix}-${crypto.randomUUID()}`;
        if (!usedIds.has(uuidId)) return uuidId;
    }

    for (let attempt = 0; attempt < 10000; attempt++) {
        multiSubgroupIdSeed = (multiSubgroupIdSeed + 1) % 1000000;
        const candidate = `${normalizedPrefix}-${Date.now()}-${multiSubgroupIdSeed}`;
        if (!usedIds.has(candidate)) return candidate;
    }

    return `${normalizedPrefix}-${Date.now()}-${Math.floor(Math.random() * 1000000000)}`;
}

function sanitizeMultiStatePayload(rawState = null, fallbackState = null) {
    const defaults = getDefaultMultiRangeBounds();
    const fallback = fallbackState && typeof fallbackState === "object"
        ? fallbackState
        : {
            multiRangeCount: MIN_MULTI_RANGE_COUNT,
            multiRanges: [{ startUtcMs: defaults.startMs, endUtcMs: defaults.endMs }],
            multiRangeCollapsed: [],
            multiRangeStartEditEnabled: [],
            multiRangeEndEditEnabled: []
        };

    const nextCount = sanitizeMultiRangeCount(rawState?.multiRangeCount ?? fallback.multiRangeCount);
    const sourceRanges = Array.isArray(rawState?.multiRanges)
        ? rawState.multiRanges
        : (Array.isArray(fallback.multiRanges) ? fallback.multiRanges : []);
    const sourceCollapsed = Array.isArray(rawState?.multiRangeCollapsed)
        ? rawState.multiRangeCollapsed
        : (Array.isArray(fallback.multiRangeCollapsed) ? fallback.multiRangeCollapsed : []);
    const sourceStartEdit = Array.isArray(rawState?.multiRangeStartEditEnabled)
        ? rawState.multiRangeStartEditEnabled
        : (Array.isArray(fallback.multiRangeStartEditEnabled) ? fallback.multiRangeStartEditEnabled : []);
    const sourceEndEdit = Array.isArray(rawState?.multiRangeEndEditEnabled)
        ? rawState.multiRangeEndEditEnabled
        : (Array.isArray(fallback.multiRangeEndEditEnabled) ? fallback.multiRangeEndEditEnabled : []);

    let nextRanges = sourceRanges
        .map((item) => sanitizeMultiRangeItem(item, defaults.startMs, defaults.endMs))
        .slice(0, nextCount);
    if (!nextRanges.length) {
        const fallbackRange = sanitizeMultiRangeItem(sourceRanges[0], defaults.startMs, defaults.endMs);
        nextRanges = [fallbackRange];
    }

    const firstDuration = nextRanges[0].endUtcMs - nextRanges[0].startUtcMs;
    while (nextRanges.length < nextCount) {
        const prev = nextRanges[nextRanges.length - 1];
        const startUtcMs = prev.endUtcMs;
        nextRanges.push({
            startUtcMs,
            endUtcMs: startUtcMs + firstDuration
        });
    }

    const nextCollapsed = Array.from({ length: nextCount }, (_, idx) => !!sourceCollapsed[idx]);
    const nextStartEditEnabled = Array.from({ length: nextCount }, (_, idx) => (idx === 0 ? false : !!sourceStartEdit[idx]));
    const nextEndEditEnabled = Array.from({ length: nextCount }, (_, idx) =>
        (sourceEndEdit[idx] === undefined ? true : !!sourceEndEdit[idx])
    );

    nextRanges[0].startUtcMs = sanitizeUtcMs(nextRanges[0].startUtcMs, defaults.startMs);
    nextRanges[0].endUtcMs = sanitizeUtcMs(nextRanges[0].endUtcMs, defaults.endMs);
    for (let i = 1; i < nextRanges.length; i++) {
        nextRanges[i].startUtcMs = sanitizeUtcMs(nextRanges[i].startUtcMs, nextRanges[i - 1].endUtcMs);
        if (!nextStartEditEnabled[i]) {
            nextRanges[i].startUtcMs = nextRanges[i - 1].endUtcMs;
        }
        nextRanges[i].endUtcMs = sanitizeUtcMs(nextRanges[i].endUtcMs, nextRanges[i].startUtcMs);
    }

    return {
        multiRangeCount: nextCount,
        multiRanges: nextRanges,
        multiRangeCollapsed: nextCollapsed,
        multiRangeStartEditEnabled: nextStartEditEnabled,
        multiRangeEndEditEnabled: nextEndEditEnabled
    };
}

function createMultiSubgroupState(name = "", index = 0, state = null) {
    const normalized = sanitizeMultiStatePayload(state, null);
    return {
        id: createUniqueMultiSubgroupId(),
        name: sanitizeMultiSubgroupName(name, getDefaultMultiSubgroupName(index)),
        ...normalized
    };
}

function ensureGroupMultiSubgroups(group, options = {}) {
    if (!group || typeof group !== "object") return;
    const { legacyMultiState = null } = options;
    const rawSubgroups = Array.isArray(group.multiSubgroups) ? group.multiSubgroups : [];
    const fallbackState = sanitizeMultiStatePayload(legacyMultiState, null);

    let normalizedSubgroups = rawSubgroups.map((subgroup, idx) => {
        const subgroupState = sanitizeMultiStatePayload(subgroup, fallbackState);
        return {
            id: sanitizeMultiSubgroupId(subgroup?.id) || createUniqueMultiSubgroupId(),
            name: sanitizeMultiSubgroupName(subgroup?.name, getDefaultMultiSubgroupName(idx)),
            ...subgroupState
        };
    });

    if (!normalizedSubgroups.length) {
        normalizedSubgroups = [{
            id: createUniqueMultiSubgroupId(),
            name: sanitizeMultiSubgroupName(group.multiRangeTitle || legacyMultiState?.multiRangeTitle || "", getDefaultMultiSubgroupName(0)),
            ...fallbackState
        }];
    }

    const used = new Set();
    normalizedSubgroups.forEach((subgroup, idx) => {
        if (!subgroup.id || used.has(subgroup.id)) subgroup.id = createUniqueMultiSubgroupId();
        used.add(subgroup.id);
        subgroup.name = sanitizeMultiSubgroupName(subgroup.name, getDefaultMultiSubgroupName(idx));
    });

    group.multiSubgroups = normalizedSubgroups;
    const requestedActiveSubgroupId = sanitizeMultiSubgroupId(group.activeMultiSubgroupId);
    group.activeMultiSubgroupId = normalizedSubgroups.some((subgroup) => subgroup.id === requestedActiveSubgroupId)
        ? requestedActiveSubgroupId
        : normalizedSubgroups[0].id;
}

function getCurrentGroupMultiSubgroups() {
    const group = getCurrentGroup();
    if (!group) return [];
    ensureGroupMultiSubgroups(group);
    return group.multiSubgroups;
}

function getCurrentMultiSubgroup() {
    const group = getCurrentGroup();
    if (!group) return null;
    ensureGroupMultiSubgroups(group);
    return group.multiSubgroups.find((subgroup) => subgroup.id === group.activeMultiSubgroupId) || group.multiSubgroups[0] || null;
}

function getCurrentMultiSubgroupName() {
    const subgroup = getCurrentMultiSubgroup();
    return sanitizeMultiSubgroupName(subgroup?.name, getDefaultMultiSubgroupName(0));
}

function syncCurrentMultiStateToActiveSubgroup() {
    const group = getCurrentGroup();
    if (!group) return;
    ensureGroupMultiSubgroups(group);
    ensureMultiRangeState();

    const subgroup = getCurrentMultiSubgroup();
    if (!subgroup) return;

    subgroup.name = sanitizeMultiSubgroupName(subgroup.name, getDefaultMultiSubgroupName(0));
    subgroup.multiRangeCount = sanitizeMultiRangeCount(multiRangeCount);
    subgroup.multiRanges = multiRanges.map((range) => ({
        startUtcMs: sanitizeUtcMs(range.startUtcMs, Date.now()),
        endUtcMs: sanitizeUtcMs(range.endUtcMs, Date.now())
    }));
    subgroup.multiRangeCollapsed = multiRangeCollapsed.map((flag) => !!flag);
    subgroup.multiRangeStartEditEnabled = multiRangeStartEditEnabled.map((flag) => !!flag);
    subgroup.multiRangeEndEditEnabled = multiRangeEndEditEnabled.map((flag) => !!flag);
}

function loadCurrentMultiStateFromActiveSubgroup() {
    const subgroup = getCurrentMultiSubgroup();
    const normalized = sanitizeMultiStatePayload(subgroup, null);
    multiRangeCount = normalized.multiRangeCount;
    multiRanges = normalized.multiRanges;
    multiRangeCollapsed = normalized.multiRangeCollapsed;
    multiRangeStartEditEnabled = normalized.multiRangeStartEditEnabled;
    multiRangeEndEditEnabled = normalized.multiRangeEndEditEnabled;
    multiRangeTitle = sanitizeMultiRangeTitle(getCurrentMultiSubgroupName());
    ensureMultiRangeState();
    refreshMultiRangeControls();
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
    const fixedAbbr = normalizeZoneAbbreviation(tz.fixedAbbr);
    if (fixedAbbr) return fixedAbbr;
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

function isMultiTab() {
    return currentMainTab === "multi";
}

function sanitizeMultiRangeCount(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return MIN_MULTI_RANGE_COUNT;
    return Math.min(MAX_MULTI_RANGE_COUNT, Math.max(MIN_MULTI_RANGE_COUNT, parsed));
}

function sanitizeMultiRangeTitle(value) {
    const text = (typeof value === "string") ? value.trim() : "";
    if (!text) return t("placeholder_range_title");
    return text.slice(0, 40);
}

function sanitizeUtcMs(value, fallbackMs) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber;
    if (value instanceof Date && Number.isFinite(value.getTime())) return value.getTime();
    return fallbackMs;
}

function getDefaultMultiRangeBounds() {
    const nowMs = Date.now();
    const startMs = sanitizeUtcMs(globalTimes[0]?.getTime?.(), nowMs);
    const endMs = sanitizeUtcMs(globalTimes[1]?.getTime?.(), startMs);
    return { startMs, endMs };
}

function sanitizeMultiRangeItem(rawRange, fallbackStartMs, fallbackEndMs) {
    if (!rawRange || typeof rawRange !== "object") {
        return { startUtcMs: fallbackStartMs, endUtcMs: fallbackEndMs };
    }
    const startUtcMs = sanitizeUtcMs(rawRange.startUtcMs, fallbackStartMs);
    const endUtcMs = sanitizeUtcMs(rawRange.endUtcMs, fallbackEndMs);
    return { startUtcMs, endUtcMs };
}

function isMultiRangeStartEditEnabled(rangeIdx) {
    if (!Number.isInteger(rangeIdx) || rangeIdx <= 0) return false;
    return !!multiRangeStartEditEnabled[rangeIdx];
}

function isMultiRangeEndEditEnabled(rangeIdx) {
    if (!Number.isInteger(rangeIdx) || rangeIdx < 0) return false;
    return !!multiRangeEndEditEnabled[rangeIdx];
}

function isMultiRangeStartLinked(rangeIdx) {
    return rangeIdx > 0 && !isMultiRangeStartEditEnabled(rangeIdx);
}

function ensureMultiRangeState() {
    multiRangeCount = sanitizeMultiRangeCount(multiRangeCount);
    multiRangeTitle = sanitizeMultiRangeTitle(multiRangeTitle);
    const defaults = getDefaultMultiRangeBounds();
    const normalized = Array.isArray(multiRanges)
        ? multiRanges.map((item) => sanitizeMultiRangeItem(item, defaults.startMs, defaults.endMs))
        : [];
    const normalizedCollapsed = Array.isArray(multiRangeCollapsed)
        ? multiRangeCollapsed.map((flag) => !!flag)
        : [];
    const normalizedStartEdit = Array.isArray(multiRangeStartEditEnabled)
        ? multiRangeStartEditEnabled.map((flag) => !!flag)
        : [];
    const normalizedEndEdit = Array.isArray(multiRangeEndEditEnabled)
        ? multiRangeEndEditEnabled.map((flag) => !!flag)
        : [];

    let nextRanges = normalized.slice(0, multiRangeCount);
    if (!nextRanges.length) {
        nextRanges = [{
            startUtcMs: defaults.startMs,
            endUtcMs: defaults.endMs
        }];
    }

    const firstDuration = nextRanges[0].endUtcMs - nextRanges[0].startUtcMs;
    while (nextRanges.length < multiRangeCount) {
        const prev = nextRanges[nextRanges.length - 1];
        const startUtcMs = prev.endUtcMs;
        nextRanges.push({
            startUtcMs,
            endUtcMs: startUtcMs + firstDuration
        });
    }

    const nextStartEditEnabled = Array.from({ length: multiRangeCount }, (_, idx) => (idx === 0 ? false : !!normalizedStartEdit[idx]));
    const nextEndEditEnabled = Array.from({ length: multiRangeCount }, (_, idx) =>
        (normalizedEndEdit[idx] === undefined ? true : !!normalizedEndEdit[idx])
    );
    nextRanges[0].startUtcMs = sanitizeUtcMs(nextRanges[0].startUtcMs, defaults.startMs);
    nextRanges[0].endUtcMs = sanitizeUtcMs(nextRanges[0].endUtcMs, defaults.endMs);
    for (let i = 1; i < nextRanges.length; i++) {
        nextRanges[i].startUtcMs = sanitizeUtcMs(nextRanges[i].startUtcMs, nextRanges[i - 1].endUtcMs);
        if (!nextStartEditEnabled[i]) {
            nextRanges[i].startUtcMs = nextRanges[i - 1].endUtcMs;
        }
        nextRanges[i].endUtcMs = sanitizeUtcMs(nextRanges[i].endUtcMs, nextRanges[i].startUtcMs);
    }

    multiRanges = nextRanges;
    multiRangeCollapsed = Array.from({ length: multiRangeCount }, (_, idx) => !!normalizedCollapsed[idx]);
    multiRangeStartEditEnabled = nextStartEditEnabled;
    multiRangeEndEditEnabled = nextEndEditEnabled;
}

function setMultiRangeStartEditEnabled(rangeIdx, enabled, options = {}) {
    const { persist = true, rerender = true } = options;
    ensureMultiRangeState();
    if (!Number.isInteger(rangeIdx) || rangeIdx <= 0 || rangeIdx >= multiRangeCount) return false;

    const nextEnabled = !!enabled;
    multiRangeStartEditEnabled[rangeIdx] = nextEnabled;
    if (!nextEnabled) {
        multiRanges[rangeIdx].startUtcMs = multiRanges[rangeIdx - 1].endUtcMs;
    }

    if (rerender && isMultiTab()) renderMultiRanges();
    if (persist) savePersistence();
    return true;
}

function setMultiRangeEndEditEnabled(rangeIdx, enabled, options = {}) {
    const { persist = true, rerender = true } = options;
    ensureMultiRangeState();
    if (!Number.isInteger(rangeIdx) || rangeIdx < 0 || rangeIdx >= multiRangeCount) return false;

    multiRangeEndEditEnabled[rangeIdx] = !!enabled;

    if (rerender && isMultiTab()) renderMultiRanges();
    if (persist) savePersistence();
    return true;
}

function setAllMultiRangeStartEditEnabled(enabled, options = {}) {
    const { persist = true, rerender = true } = options;
    ensureMultiRangeState();
    const next = !!enabled;

    for (let idx = 1; idx < multiRangeCount; idx++) {
        multiRangeStartEditEnabled[idx] = next;
        if (!next) {
            multiRanges[idx].startUtcMs = multiRanges[idx - 1].endUtcMs;
        }
    }

    if (rerender && isMultiTab()) renderMultiRanges();
    if (persist) savePersistence();
    return true;
}

function setAllMultiRangeEndEditEnabled(enabled, options = {}) {
    const { persist = true, rerender = true } = options;
    ensureMultiRangeState();
    const next = !!enabled;

    for (let idx = 0; idx < multiRangeCount; idx++) {
        multiRangeEndEditEnabled[idx] = next;
    }

    if (rerender && isMultiTab()) renderMultiRanges();
    if (persist) savePersistence();
    return true;
}

function refreshMultiRangeControls() {
    const countInput = document.getElementById("multi-range-count-input");
    if (countInput) countInput.value = String(multiRangeCount);

    const decreaseBtn = document.getElementById("multi-range-count-decrease");
    const increaseBtn = document.getElementById("multi-range-count-increase");
    if (decreaseBtn) decreaseBtn.disabled = multiRangeCount <= MIN_MULTI_RANGE_COUNT;
    if (increaseBtn) increaseBtn.disabled = multiRangeCount >= MAX_MULTI_RANGE_COUNT;

}

function renderMultiBulkToolSets() {
    const startTools = document.getElementById("multi-bulk-start-tools");
    const allTools = document.getElementById("multi-bulk-all-tools");
    if (!allTools) return;

    const hasRanges = multiRangeCount > 0;
    allTools.innerHTML = "";
    if (startTools) {
        startTools.innerHTML = "";
        startTools.style.display = "none";
    }
    allTools.style.display = "flex";
    allTools.style.flexDirection = "column";
    allTools.style.alignItems = "flex-start";
    allTools.style.gap = "8px";

    const bulkSet = renderTimeAdjustSet(1, {
        labelText: t("label_range_bulk"),
        disabled: !hasRanges,
        onAction: applyBulkRangeAllAction,
        includeFixedActions: false
    });
    const zeroDayBtn = createTimeAdjustActionButton("btn_set_zero_day", 1, "set_zero_day", applyBulkRangeAllAction, !hasRanges);
    zeroDayBtn.classList.add("time-adjust-bulk-zero-btn");
    const firstActionNode = [...bulkSet.children].find((node, idx) => idx > 0);
    if (firstActionNode) {
        bulkSet.insertBefore(zeroDayBtn, firstActionNode);
        bulkSet.insertBefore(createTimeAdjustDivider(), firstActionNode);
    } else {
        bulkSet.appendChild(zeroDayBtn);
    }
    const bulkToolBlock = document.createElement("div");
    bulkToolBlock.className = "multi-tool-block";
    bulkToolBlock.appendChild(bulkSet);

    const createBulkToggleButton = (buttonText, onClick) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "sm-btn time-adjust-bulk-toggle-btn";
        button.textContent = buttonText;
        button.disabled = !hasRanges;
        button.addEventListener("click", () => {
            if (button.disabled) return;
            onClick();
        });
        return button;
    };

    const bulkToggleSet = document.createElement("div");
    bulkToggleSet.className = "time-adjust-set";
    const bulkToggleLabel = document.createElement("span");
    bulkToggleLabel.className = "time-adjust-set-label";
    bulkToggleLabel.textContent = t("label_all_range_time_adjust");
    bulkToggleSet.appendChild(bulkToggleLabel);
    bulkToggleSet.appendChild(createBulkToggleButton(
        t("btn_enable_all_start_time_adjust"),
        () => setAllMultiRangeStartEditEnabled(true, { persist: true, rerender: true })
    ));
    bulkToggleSet.appendChild(createBulkToggleButton(
        t("btn_disable_all_start_time_adjust"),
        () => setAllMultiRangeStartEditEnabled(false, { persist: true, rerender: true })
    ));
    bulkToggleSet.appendChild(createTimeAdjustDivider());
    bulkToggleSet.appendChild(createBulkToggleButton(
        t("btn_enable_all_end_time_adjust"),
        () => setAllMultiRangeEndEditEnabled(true, { persist: true, rerender: true })
    ));
    bulkToggleSet.appendChild(createBulkToggleButton(
        t("btn_disable_all_end_time_adjust"),
        () => setAllMultiRangeEndEditEnabled(false, { persist: true, rerender: true })
    ));
    const toggleToolBlock = document.createElement("div");
    toggleToolBlock.className = "multi-tool-block";
    toggleToolBlock.appendChild(bulkToggleSet);
    allTools.appendChild(toggleToolBlock);
    allTools.appendChild(bulkToolBlock);

    const syncZeroButtonWidth = () => {
        const bulkZeroBtn = allTools.querySelector(".time-adjust-bulk-zero-btn");
        if (!bulkZeroBtn) return;
        const rangeButtons = [...document.querySelectorAll('.multi-range-adjust-row [data-action="set_zero_day"], .multi-range-adjust-row [data-action="sync_prev_end"]')];
        const targetButtons = [bulkZeroBtn, ...rangeButtons].filter((btn) => btn instanceof HTMLElement);
        if (!targetButtons.length) return;

        targetButtons.forEach((btn) => {
            btn.style.width = "";
            btn.style.minWidth = "";
            btn.style.justifyContent = "";
            btn.style.textAlign = "";
        });

        const firstRangeStartSet = document.querySelector('.multi-range-adjust-row .time-adjust-set [data-action="now"]')?.closest(".time-adjust-set");
        let desiredSpanToDivider = 0;
        if (firstRangeStartSet) {
            const nowBtn = firstRangeStartSet.querySelector('[data-action="now"]');
            const firstDivider = firstRangeStartSet.querySelector(".time-adjust-divider");
            if (nowBtn && firstDivider) {
                const nowRect = nowBtn.getBoundingClientRect();
                const dividerRect = firstDivider.getBoundingClientRect();
                desiredSpanToDivider = Math.round(dividerRect.left - nowRect.left);
            }
        }

        if (desiredSpanToDivider > 0) {
            targetButtons.forEach((btn) => {
                const set = btn.closest(".time-adjust-set");
                const setStyle = set ? window.getComputedStyle(set) : null;
                const gap = setStyle ? (parseFloat(setStyle.columnGap || setStyle.gap || "0") || 0) : 0;
                const btnStyle = window.getComputedStyle(btn);
                const marginRight = parseFloat(btnStyle.marginRight || "0") || 0;
                const nextWidth = Math.max(150, Math.round(desiredSpanToDivider - marginRight - gap));
                const widthPx = `${nextWidth}px`;
                btn.style.width = widthPx;
                btn.style.minWidth = widthPx;
            });
            return;
        }

        const fallbackWidth = Math.max(
            180,
            ...targetButtons.map((btn) => Math.ceil(btn.getBoundingClientRect().width)),
            ...targetButtons.map((btn) => Math.ceil(btn.scrollWidth + 18))
        );
        if (fallbackWidth <= 0) return;
        const widthPx = `${fallbackWidth}px`;
        targetButtons.forEach((btn) => {
            btn.style.width = widthPx;
            btn.style.minWidth = widthPx;
        });
    };

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(syncZeroButtonWidth);
    } else {
        syncZeroButtonWidth();
    }
    upgradeNativeTitleTooltips(allTools);
}

function syncMultiRangeStartLinks(startIdx = 1) {
    ensureMultiRangeState();
    for (let idx = Math.max(1, startIdx); idx < multiRanges.length; idx++) {
        if (!isMultiRangeStartLinked(idx)) continue;
        multiRanges[idx].startUtcMs = multiRanges[idx - 1].endUtcMs;
    }
}

function syncFollowingRangesByDuration(changedRangeIdx) {
    if (!Number.isInteger(changedRangeIdx) || changedRangeIdx < 0 || changedRangeIdx >= multiRanges.length) return;
    if (changedRangeIdx >= multiRanges.length - 1) return;

    const fallbackNow = Date.now();
    const durations = multiRanges.map((range) => {
        const startUtcMs = sanitizeUtcMs(range?.startUtcMs, fallbackNow);
        const endUtcMs = sanitizeUtcMs(range?.endUtcMs, startUtcMs);
        return endUtcMs - startUtcMs;
    });

    let cursor = sanitizeUtcMs(multiRanges[changedRangeIdx]?.endUtcMs, fallbackNow);
    for (let idx = changedRangeIdx + 1; idx < multiRanges.length; idx++) {
        const duration = durations[idx] ?? 0;
        if (isMultiRangeStartLinked(idx)) {
            multiRanges[idx].startUtcMs = cursor;
            multiRanges[idx].endUtcMs = cursor + duration;
        } else {
            multiRanges[idx].startUtcMs = sanitizeUtcMs(multiRanges[idx].startUtcMs, cursor);
            multiRanges[idx].endUtcMs = sanitizeUtcMs(multiRanges[idx].endUtcMs, multiRanges[idx].startUtcMs);
        }
        cursor = sanitizeUtcMs(multiRanges[idx].endUtcMs, cursor);
    }
}

function syncLinkedRangesFrom(rangeIdx, options = {}) {
    const { includeCurrent = true, stopAtFirstUnlocked = true, baseDurations = null } = options;
    ensureMultiRangeState();
    if (!Number.isInteger(rangeIdx) || rangeIdx < 0 || rangeIdx >= multiRanges.length) return;

    const fallbackNow = Date.now();
    const durations = Array.isArray(baseDurations) && baseDurations.length
        ? baseDurations
        : multiRanges.map((range) => {
            const startUtcMs = sanitizeUtcMs(range?.startUtcMs, fallbackNow);
            const endUtcMs = sanitizeUtcMs(range?.endUtcMs, startUtcMs);
            return endUtcMs - startUtcMs;
        });

    let anchorIdx = rangeIdx;
    if (includeCurrent) {
        const startUtcMs = sanitizeUtcMs(multiRanges[anchorIdx]?.startUtcMs, fallbackNow);
        multiRanges[anchorIdx].startUtcMs = startUtcMs;
        multiRanges[anchorIdx].endUtcMs = startUtcMs + (durations[anchorIdx] ?? 0);
    }

    let cursor = sanitizeUtcMs(multiRanges[anchorIdx]?.endUtcMs, fallbackNow);
    for (let idx = anchorIdx + 1; idx < multiRanges.length; idx++) {
        if (!isMultiRangeStartLinked(idx)) {
            if (stopAtFirstUnlocked) break;
            cursor = sanitizeUtcMs(multiRanges[idx]?.endUtcMs, cursor);
            continue;
        }
        multiRanges[idx].startUtcMs = cursor;
        multiRanges[idx].endUtcMs = cursor + (durations[idx] ?? 0);
        cursor = sanitizeUtcMs(multiRanges[idx].endUtcMs, cursor);
    }
}

function setMultiRangeCount(value, options = {}) {
    const { persist = true, rerender = true, showBoundaryToast = false } = options;
    const parsed = parseInt(value, 10);
    const nextCount = sanitizeMultiRangeCount(value);

    if (showBoundaryToast && Number.isFinite(parsed)) {
        if (parsed >= MAX_MULTI_RANGE_COUNT) {
            showToast(t("toast_range_count_max"));
        } else if (parsed <= MIN_MULTI_RANGE_COUNT) {
            showToast(t("toast_range_count_min"));
        }
    }

    multiRangeCount = nextCount;
    ensureMultiRangeState();
    refreshMultiRangeControls();

    if (rerender && isMultiTab()) renderMultiRanges();
    if (persist) savePersistence();
}

function setMultiRangeTitle(value, options = {}) {
    const { persist = true, rerender = true } = options;
    const subgroup = getCurrentMultiSubgroup();
    if (subgroup) {
        subgroup.name = sanitizeMultiSubgroupName(value, subgroup.name || getDefaultMultiSubgroupName(0));
        multiRangeTitle = sanitizeMultiRangeTitle(subgroup.name);
    } else {
        multiRangeTitle = sanitizeMultiRangeTitle(value);
    }
    ensureMultiRangeState();
    refreshMultiRangeControls();

    if (rerender && isMultiTab()) renderMultiRanges();
    if (persist) savePersistence();
}

function toggleMultiRangeCollapsed(rangeIdx) {
    ensureMultiRangeState();
    if (!Number.isInteger(rangeIdx) || rangeIdx < 0 || rangeIdx >= multiRangeCollapsed.length) return;
    multiRangeCollapsed[rangeIdx] = !multiRangeCollapsed[rangeIdx];
    if (isMultiTab()) renderMultiRanges();
    savePersistence();
}

function setAllMultiRangesCollapsed(collapsed) {
    ensureMultiRangeState();
    const next = !!collapsed;
    multiRangeCollapsed = Array.from({ length: multiRangeCount }, () => next);
    if (isMultiTab()) renderMultiRanges();
    savePersistence();
}

function setMultiRangesCollapsedBelow(rangeIdx, collapsed) {
    ensureMultiRangeState();
    if (!Number.isInteger(rangeIdx) || rangeIdx < 0 || rangeIdx >= multiRangeCount) return;

    const startIdx = rangeIdx; // "below ranges": include current range
    if (startIdx >= multiRangeCount) return;

    const next = !!collapsed;
    for (let idx = startIdx; idx < multiRangeCount; idx++) {
        multiRangeCollapsed[idx] = next;
    }

    if (isMultiTab()) renderMultiRanges();
    savePersistence();
}

function getMultiRangeSlotDate(rangeIdx, slotIdx) {
    ensureMultiRangeState();
    const range = multiRanges[rangeIdx];
    if (!range) return new Date();
    const utcMs = slotIdx === 0 ? range.startUtcMs : range.endUtcMs;
    return new Date(utcMs);
}

function setMultiRangeSlotDate(rangeIdx, slotIdx, nextDate) {
    ensureMultiRangeState();
    const range = multiRanges[rangeIdx];
    if (!range || !(nextDate instanceof Date) || !Number.isFinite(nextDate.getTime())) return false;
    const nextMs = nextDate.getTime();
    if (slotIdx === 0) range.startUtcMs = nextMs;
    else range.endUtcMs = nextMs;
    return true;
}

function sanitizeUiScalePercent(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_UI_SCALE_PERCENT;
    const clamped = Math.min(MAX_UI_SCALE_PERCENT, Math.max(MIN_UI_SCALE_PERCENT, parsed));
    return UI_SCALE_PERCENT_OPTIONS.reduce((closest, percent) => (
        Math.abs(percent - clamped) < Math.abs(closest - clamped) ? percent : closest
    ), UI_SCALE_PERCENT_OPTIONS[0]);
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
    UI_SCALE_PERCENT_OPTIONS.forEach((percent) => {
        const option = document.createElement("option");
        option.value = String(percent);
        option.textContent = `${percent}%`;
        selectEl.appendChild(option);
    });
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
    if (localizeAutoGeneratedNamesForCurrentLanguage()) {
        savePersistence();
    }
    loadCurrentMultiStateFromActiveSubgroup();
    applyTheme(loadThemePreference(), false);
    applyUiScale(loadUiScalePreference(), false);
    applyTranslations();
    applyVersionBranding();
    initUI();
    bindFloatingTooltipEvents();
    initDragAndDrop();
    initSearchAndSelect();
    queueStandardTimezoneWarmup();
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
    const multiRangeCountInput = document.getElementById("multi-range-count-input");
    const multiRangeDecreaseBtn = document.getElementById("multi-range-count-decrease");
    const multiRangeIncreaseBtn = document.getElementById("multi-range-count-increase");
    if (multiRangeCountInput) {
        const commitRangeCount = () => {
            setMultiRangeCount(multiRangeCountInput.value, { persist: true, rerender: true, showBoundaryToast: true });
        };
        multiRangeCountInput.addEventListener("input", () => {
            multiRangeCountInput.value = String(multiRangeCountInput.value || "").replace(/[^0-9]/g, "");
        });
        multiRangeCountInput.addEventListener("change", commitRangeCount);
        multiRangeCountInput.addEventListener("blur", commitRangeCount);
        multiRangeCountInput.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;
            commitRangeCount();
            multiRangeCountInput.blur();
        });
    }
    if (multiRangeDecreaseBtn) {
        multiRangeDecreaseBtn.addEventListener("click", () => {
            setMultiRangeCount(multiRangeCount - 1, { persist: true, rerender: true, showBoundaryToast: true });
        });
    }
    if (multiRangeIncreaseBtn) {
        multiRangeIncreaseBtn.addEventListener("click", () => {
            setMultiRangeCount(multiRangeCount + 1, { persist: true, rerender: true, showBoundaryToast: true });
        });
    }

    refreshMultiRangeControls();

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
        const name = prompt(t("prompt_new_group"), t("default_group_name"));
        if (name) {
            syncCurrentMultiStateToActiveSubgroup();
            const nextGroup = {
                name: name.trim(),
                zones: [],
                baseTimezoneId: "utc",
                showUtcRow: true,
                utcRowOrder: 0
            };
            ensureGroupMultiSubgroups(nextGroup);
            groups.push(nextGroup);
            activeGroupId = groups.length - 1;
            if (currentMainTab === "live" || currentMainTab === "fixed") {
                activeGroupIdByMainTab[currentMainTab] = activeGroupId;
            }
            loadCurrentMultiStateFromActiveSubgroup();
            savePersistence();
            renderGroups();
            renderMultiSubgroups();
            if (isMultiTab()) {
                renderBaseTimeSelect();
                renderMultiRanges();
            }
            else renderList();
        }
    };
    const addMultiSubgroupBtn = document.getElementById("add-multi-subgroup-btn");
    if (addMultiSubgroupBtn) {
        addMultiSubgroupBtn.onclick = addMultiSubgroup;
    }

    document.getElementById("copy-all-btn").onclick = copyAllTimezones;
    const saveTableImageBtn = document.getElementById("save-table-image-btn");
    const saveMultiRangeTitlesImageBtn = document.getElementById("save-multi-range-titles-image-btn");
    const saveMultiRangeByRangeImageBtn = document.getElementById("save-multi-range-by-range-image-btn");
    if (saveTableImageBtn) {
        saveTableImageBtn.onclick = saveTimezoneTableImage;
    }
    if (saveMultiRangeTitlesImageBtn) {
        saveMultiRangeTitlesImageBtn.onclick = saveMultiRangeTitlesImage;
    }
    if (saveMultiRangeByRangeImageBtn) {
        saveMultiRangeByRangeImageBtn.onclick = saveMultiRangeImagesByRange;
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
    const groupImportFile = document.getElementById("group-import-file");
    if (groupImportFile) {
        groupImportFile.onchange = handleGroupImportFile;
    }
    const subgroupImportFile = document.getElementById("subgroup-import-file");
    if (subgroupImportFile) {
        subgroupImportFile.onchange = handleSubgroupImportFile;
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
            hideFloatingTooltip();
            setLanguage(e.target.value);
            if (localizeAutoGeneratedNamesForCurrentLanguage()) {
                savePersistence();
            }
            applyVersionBranding();
            updateTZDropdown(); // Ensure dropdown is updated
            renderGroups();
            renderMultiSubgroups();
            renderList();
            updateTimeAdjustPanel();
            renderCopyFormatControls();
            refreshSelectWidths();
            if (typeof window !== "undefined" && typeof window.__gtvCalcRefresh === "function") {
                window.__gtvCalcRefresh();
            }
        };
    }

    const resetExceptGroupTzBtn = document.getElementById("reset-except-group-tz-btn");
    if (resetExceptGroupTzBtn) {
        resetExceptGroupTzBtn.onclick = resetExceptGroupsAndTimezones;
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
    upgradeNativeTitleTooltips(document);
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

function isQuotaExceededError(err) {
    if (!err || typeof err !== "object") return false;
    const code = Number(err.code);
    const name = (typeof err.name === "string") ? err.name : "";
    return code === 22 || code === 1014 || name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
}

function showPersistenceErrorToast(err) {
    const now = Date.now();
    if (now - lastPersistenceErrorToastAt < 2500) return;
    lastPersistenceErrorToastAt = now;
    showToast(t(isQuotaExceededError(err) ? "toast_storage_quota_exceeded" : "toast_storage_save_failed"));
}

function setLocalStorageValue(key, value, options = {}) {
    const { suppressToast = false } = options;
    try {
        localStorage.setItem(key, value);
        return { ok: true, error: null };
    } catch (err) {
        console.error(`Failed to write localStorage key "${key}".`, err);
        if (!suppressToast) showPersistenceErrorToast(err);
        return { ok: false, error: err };
    }
}

function persistStorageSnapshot(snapshot, options = {}) {
    let serialized = "";
    try {
        serialized = JSON.stringify(snapshot);
    } catch (err) {
        console.error("Failed to serialize persistence snapshot.", err);
        if (!options?.suppressToast) showPersistenceErrorToast(err);
        return { ok: false, error: err };
    }
    return setLocalStorageValue(STORAGE_KEY, serialized, options);
}

function switchMainTab(tab) {
    const nextTab = sanitizeMainTab(tab);
    hideFloatingTooltip();
    syncCurrentMultiStateToActiveSubgroup();

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
    const isMulti = isMultiTab();
    const isCalc = currentMainTab === "calc";
    document.getElementById("timezone-section").classList.toggle("active", !isCalc && !isMulti);
    document.getElementById("multi-range-section").classList.toggle("active", isMulti);
    document.getElementById("calc-section").classList.toggle("active", isCalc);
    document.getElementById("group-tabs-container").style.display = isCalc ? "none" : "flex";
    document.getElementById("top-control-bar").style.display = isCalc ? "none" : "flex";

    isRealtime = (currentMainTab === "live");
    const extraTimeToggle = document.getElementById("toggle-extra-time");
    const copyFormatToggle = document.getElementById("toggle-copy-format");

    const statusText = document.getElementById("status-text");
    if (statusText) {
        if (isRealtime) statusText.textContent = t("status_sync");
        else if (isMulti) statusText.textContent = t("status_multi");
        else statusText.textContent = t("status_fixed");
    }

    if (extraTimeToggle) {
        extraTimeToggle.disabled = isRealtime || isMulti;
        if (isRealtime) extraTimeToggle.checked = false;
        else if (isMulti) extraTimeToggle.checked = true;
        else extraTimeToggle.checked = (slotCount > 1);
    }

    if (copyFormatToggle) {
        copyFormatToggle.checked = showCopyFormat;
    }
    updateOptionRowVisibility();

    if (isMulti) {
        renderBaseTimeSelect();
        loadCurrentMultiStateFromActiveSubgroup();
    }
    renderGroups();
    renderMultiSubgroups();
    if (isMulti) {
        renderMultiRanges();
    } else {
        renderList();
        updateTimeAdjustPanel();
    }
    renderCopyFormatControls();
    savePersistence();
}

function updateOptionRowVisibility() {
    const optionRow = document.getElementById("control-option-row");
    if (!optionRow) return;

    const extraTimeGroup = document.getElementById("toggle-extra-time")?.closest(".control-group");
    const copyFormatGroup = document.getElementById("toggle-copy-format")?.closest(".control-group");
    const rangeCountGroup = document.getElementById("multi-range-count-group");
    const multiToolsRow = document.getElementById("multi-tools-row");
    const multiSubgroupRow = document.getElementById("multi-subgroup-row");
    const multiControlsFrame = document.getElementById("multi-controls-frame");
    const saveTableImageBtn = document.getElementById("save-table-image-btn");
    const saveMultiRangeTitlesImageBtn = document.getElementById("save-multi-range-titles-image-btn");
    const saveMultiRangeByRangeImageBtn = document.getElementById("save-multi-range-by-range-image-btn");
    const isMulti = isMultiTab();

    optionRow.style.display = "flex";
    if (extraTimeGroup) extraTimeGroup.style.display = (isRealtime || isMulti) ? "none" : "flex";
    if (copyFormatGroup) copyFormatGroup.style.display = "flex";
    if (rangeCountGroup) rangeCountGroup.style.display = isMulti ? "flex" : "none";
    if (multiControlsFrame) multiControlsFrame.style.display = isMulti ? "block" : "none";
    if (multiSubgroupRow) multiSubgroupRow.style.display = isMulti ? "flex" : "none";
    if (multiToolsRow) multiToolsRow.style.display = isMulti ? "flex" : "none";
    if (saveTableImageBtn) saveTableImageBtn.style.display = isMulti ? "none" : "";
    if (saveMultiRangeTitlesImageBtn) saveMultiRangeTitlesImageBtn.style.display = isMulti ? "" : "none";
    if (saveMultiRangeByRangeImageBtn) saveMultiRangeByRangeImageBtn.style.display = isMulti ? "" : "none";
    refreshMultiRangeControls();
    refreshOptionToggleDividers();
}

function refreshOptionToggleDividers() {
    const optionRow = document.getElementById("control-option-row");
    if (!optionRow) return;
    const optionGroups = [...optionRow.querySelectorAll(".option-toggle-group")];
    optionGroups.forEach((group) => group.classList.remove("option-with-divider"));
    const visibleGroups = optionGroups.filter((group) => group.style.display !== "none");
    visibleGroups.forEach((group, idx) => {
        if (idx < visibleGroups.length - 1) group.classList.add("option-with-divider");
    });
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
    adjustSelectWidthForContent(document.getElementById("tz-quick-select"), 118);
    adjustSelectWidthForContent(document.getElementById("base-time-select"), 200);
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

function createTimeAdjustActionButton(labelKey, slotIdx, action, onAction = applyTimeAdjustAction, disabled = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sm-btn";
    button.dataset.action = action;
    button.textContent = t(labelKey);
    button.disabled = !!disabled;
    button.addEventListener("click", () => {
        if (button.disabled) return;
        onAction(slotIdx, action);
    });
    return button;
}

function createTimeAdjustDivider() {
    const divider = document.createElement("span");
    divider.className = "time-adjust-divider";
    divider.textContent = "|";
    return divider;
}

function attachTimeAdjustToggleLabel(setEl, checked, text, onChange) {
    if (!(setEl instanceof HTMLElement) || typeof onChange !== "function") return;
    const label = setEl.querySelector(".time-adjust-set-label");
    if (!label) return;

    label.classList.add("time-adjust-set-label-with-toggle");
    label.textContent = "";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "time-adjust-set-toggle";
    toggle.checked = !!checked;
    toggle.addEventListener("change", () => onChange(toggle.checked));

    const textEl = document.createElement("span");
    textEl.textContent = text;

    label.appendChild(toggle);
    label.appendChild(textEl);
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

function createTimeAdjustCustomDaysControl(slotIdx, onAction = applyTimeAdjustAction, disabled = false) {
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
    dayInput.disabled = !!disabled;

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "sm-btn time-adjust-custom-btn";
    minusBtn.textContent = "-";
    minusBtn.disabled = !!disabled;
    minusBtn.addEventListener("click", () => {
        if (minusBtn.disabled) return;
        onAction(slotIdx, "minus_custom_days");
    });

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "sm-btn time-adjust-custom-btn";
    plusBtn.textContent = "+";
    plusBtn.disabled = !!disabled;
    plusBtn.addEventListener("click", () => {
        if (plusBtn.disabled) return;
        onAction(slotIdx, "plus_custom_days");
    });

    const syncInputAndLabel = (persist = false) => {
        const normalized = setTimeAdjustDayStep(slotIdx, dayInput.value);
        dayInput.value = String(normalized);
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

function renderTimeAdjustSet(slotIdx, options = {}) {
    const {
        onAction = applyTimeAdjustAction,
        labelText = "",
        disabled = false,
        includeFixedActions = true,
        includeZeroDayAction = false,
        includeSyncPreviousEndAction = false
    } = options;
    const set = document.createElement("div");
    set.className = "time-adjust-set";

    const label = document.createElement("span");
    label.className = "time-adjust-set-label";
    label.textContent = labelText || (slotIdx === 0 ? t("th_time_day_main") : t("th_time_day_extra"));
    set.appendChild(label);

    if (includeFixedActions) {
        const fixedActions = [
            ["btn_now", "now"],
            ["btn_midnight", "midnight"],
            ["btn_sharp_hour", "sharp_hour"]
        ];
        fixedActions.forEach(([labelKey, action]) => {
            set.appendChild(createTimeAdjustActionButton(labelKey, slotIdx, action, onAction, disabled));
        });
        set.appendChild(createTimeAdjustDivider());
    }

    if (includeZeroDayAction) {
        const zeroDayBtn = createTimeAdjustActionButton("btn_set_zero_day", slotIdx, "set_zero_day", onAction, disabled);
        zeroDayBtn.classList.add("time-adjust-zero-btn");
        set.appendChild(zeroDayBtn);
        set.appendChild(createTimeAdjustDivider());
    }

    if (includeSyncPreviousEndAction) {
        const syncPrevBtn = createTimeAdjustActionButton("btn_sync_extra_time", slotIdx, "sync_prev_end", onAction, disabled);
        syncPrevBtn.classList.add("time-adjust-sync-btn");
        set.appendChild(syncPrevBtn);
        set.appendChild(createTimeAdjustDivider());
    }

    const shiftActionGroups = [
        [["btn_minus_hour", "minus_hour"], ["btn_plus_hour", "plus_hour"]],
        [["btn_minus_day", "minus_day"], ["btn_plus_day", "plus_day"]],
        [["btn_minus_week", "minus_week"], ["btn_plus_week", "plus_week"]]
    ];
    shiftActionGroups.forEach((group, groupIdx) => {
        group.forEach(([labelKey, action]) => {
            set.appendChild(createTimeAdjustActionButton(labelKey, slotIdx, action, onAction, disabled));
        });
        if (groupIdx < shiftActionGroups.length - 1) {
            set.appendChild(createTimeAdjustDivider());
        }
    });

    set.appendChild(createTimeAdjustDivider());
    set.appendChild(createTimeAdjustActionButton("btn_minus_four_weeks", slotIdx, "minus_four_weeks", onAction, disabled));
    set.appendChild(createTimeAdjustActionButton("btn_plus_four_weeks", slotIdx, "plus_four_weeks", onAction, disabled));
    set.appendChild(createTimeAdjustDivider());
    set.appendChild(createTimeAdjustCustomDaysControl(slotIdx, onAction, disabled));

    return set;
}

function updateTimeAdjustPanel() {
    const frame = document.getElementById("time-adjust-frame");
    const row = document.getElementById("time-adjust-row");
    const buttonsContainer = document.getElementById("time-adjust-buttons");
    if (!frame || !row || !buttonsContainer) return;

    const visible = currentMainTab === "fixed";
    frame.style.display = visible ? "block" : "none";
    row.style.display = visible ? "block" : "none";

    if (!visible) {
        buttonsContainer.innerHTML = "";
        return;
    }

    const effectiveSlotCount = isRealtime ? 1 : slotCount;
    buttonsContainer.innerHTML = "";
    if (effectiveSlotCount > 1) {
        buttonsContainer.appendChild(renderTimeAdjustSet(0, {
            labelText: t("label_start_time_adjust"),
            includeFixedActions: true
        }));
        buttonsContainer.appendChild(renderTimeAdjustSet(1, {
            labelText: t("label_extra_time_adjust"),
            includeFixedActions: false,
            includeZeroDayAction: true
        }));
    } else {
        buttonsContainer.appendChild(renderTimeAdjustSet(0, {
            labelText: t("label_main_time_adjust"),
            includeFixedActions: true
        }));
    }

    const syncFixedZeroButtonWidth = () => {
        const sets = [...buttonsContainer.querySelectorAll(".time-adjust-set")];
        if (sets.length < 2) return;
        const startSet = sets[0];
        const endSet = sets[1];
        const zeroBtn = endSet.querySelector('[data-action="set_zero_day"]');
        if (!(zeroBtn instanceof HTMLElement)) return;

        zeroBtn.style.width = "";
        zeroBtn.style.minWidth = "";

        const nowBtn = startSet.querySelector('[data-action="now"]');
        const firstDivider = startSet.querySelector(".time-adjust-divider");
        if (nowBtn instanceof HTMLElement && firstDivider instanceof HTMLElement) {
            const nowRect = nowBtn.getBoundingClientRect();
            const dividerRect = firstDivider.getBoundingClientRect();
            const desiredSpanToDivider = Math.round(dividerRect.left - nowRect.left);
            if (desiredSpanToDivider > 0) {
                const endSetStyle = window.getComputedStyle(endSet);
                const gap = parseFloat(endSetStyle.columnGap || endSetStyle.gap || "0") || 0;
                const btnStyle = window.getComputedStyle(zeroBtn);
                const marginRight = parseFloat(btnStyle.marginRight || "0") || 0;
                const widthPx = `${Math.max(150, Math.round(desiredSpanToDivider - marginRight - gap))}px`;
                zeroBtn.style.width = widthPx;
                zeroBtn.style.minWidth = widthPx;
                return;
            }
        }

        const fallbackWidth = Math.max(150, Math.ceil(zeroBtn.scrollWidth + 18));
        const widthPx = `${fallbackWidth}px`;
        zeroBtn.style.width = widthPx;
        zeroBtn.style.minWidth = widthPx;
    };

    if (effectiveSlotCount > 1) {
        if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(syncFixedZeroButtonWidth);
        } else {
            syncFixedZeroButtonWidth();
        }
    }

    upgradeNativeTitleTooltips(buttonsContainer);
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
        dragHandle.textContent = "⠿";
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
    upgradeNativeTitleTooltips(row);
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
    const useRangeTimeLabels = !isRealtime && slotCount > 1;
    switch (colKey) {
        case "timezone":
            return `<th style="width: 110px;">${t("th_tz_abbr")}</th>`;
        case "region":
            return `<th style="width: 220px;">${t("th_region")}</th>`;
        case "offset":
            return `<th style="width: 140px;">${t("th_utc_offset")}</th>`;
        case "time_main":
            return `<th class="dynamic-col">${t(useRangeTimeLabels ? "th_time_day_start" : "th_time_day_main")}</th>`;
        case "time_extra":
            return `<th class="dynamic-col">${t(useRangeTimeLabels ? "th_time_day_end" : "th_time_day_extra")}</th>`;
        case "period_days":
            return `<th style="width: 90px;">${t("th_period_days")}</th>`;
        case "period_time":
            return `<th style="width: 170px;">${t("th_period_time")}</th>`;
        default:
            return "";
    }
}

function getMultiDisplayColumnHeader(colKey) {
    switch (colKey) {
        case "timezone":
            return `<th style="width: 96px;">${t("th_tz_abbr")}</th>`;
        case "region":
            return `<th style="width: 180px;">${t("th_region")}</th>`;
        case "offset":
            return `<th style="width: 118px;">${t("th_utc_offset")}</th>`;
        case "time_main":
            return `<th class="dynamic-col">${t("th_time_day_start")}</th>`;
        case "time_extra":
            return `<th class="dynamic-col">${t("th_time_day_end")}</th>`;
        case "period_days":
            return `<th style="width: 82px;">${t("th_period_days")}</th>`;
        case "period_time":
            return `<th style="width: 136px;">${t("th_period_time")}</th>`;
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

function buildRowActionCells(copyButtonTitle, removeButtonText, removeButtonTitle = "") {
    const copyCell = `<td class="export-exclude copy-cell"><div class="btn-group"><button class="sm-btn copy-row-btn" title="${copyButtonTitle}">📋</button></div></td>`;
    const removeTitleAttr = (typeof removeButtonTitle === "string" && removeButtonTitle.trim())
        ? ` title="${removeButtonTitle.trim()}"`
        : "";
    const removeCell = removeButtonText
        ? `<td class="export-exclude remove-cell"><div class="btn-group"><button class="sm-btn danger remove-row-btn"${removeTitleAttr}>${removeButtonText}</button></div></td>`
        : `<td class="export-exclude remove-cell"></td>`;
    return `${copyCell}${removeCell}`;
}

function createInteractiveTimezoneRow(tz, effectiveSlotCount, displayColumns, rowId = tz.id) {
    const tr = document.createElement("tr");
    tr.className = "time-row";
    tr.id = `tz-row-${rowId}`;
    tr.draggable = false;

    const dragHandleHtml = `<button type="button" class="drag-handle" draggable="true">⠿</button>`;
    let inner = `<td class="move-cell"><div class="btn-group">${dragHandleHtml}</div></td>`;
    displayColumns.forEach((colKey) => {
        inner += buildDynamicRowCell(colKey, effectiveSlotCount);
    });
    inner += buildRowActionCells(t("tooltip_copy"), "✖", t("tooltip_remove_row"));
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

function getRenderableTimezoneRows(baseRef) {
    const zoneRows = getCurrentGroupZones().filter(
        tz => tz.id !== baseRef.id && !(tz.type === "standard" && tz.zone === "UTC")
    );
    const rowsToRender = [...zoneRows];
    if (baseRef.id !== "utc" && isCurrentGroupUtcRowVisible()) {
        const utcRef = getUTCRef();
        const insertIndex = Math.min(Math.max(getCurrentGroupUtcRowOrder(), 0), rowsToRender.length);
        rowsToRender.splice(insertIndex, 0, utcRef);
    }
    return rowsToRender;
}

function getTimezoneDisplayPointAtDate(date, tz, fixedDisplayOffsetMinutes = null) {
    let timeStr = "";
    let dayIndex = 0;
    let hour = 0;

    if (tz.type === "custom" || Number.isFinite(fixedDisplayOffsetMinutes)) {
        const offsetMin = tz.type === "custom" ? getCustomOffsetMinutes(tz) : fixedDisplayOffsetMinutes;
        const shifted = new Date(date.getTime() + (offsetMin * 60000));
        hour = shifted.getUTCHours();
        dayIndex = shifted.getUTCDay();
        timeStr = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(hour)}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
    } else {
        const formatter = new Intl.DateTimeFormat("en-US", {
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
        const parts = formatter.formatToParts(date);
        const get = (type) => parts.find(p => p.type === type)?.value || "";
        const rawHour = parseInt(get("hour"), 10);
        hour = rawHour === 24 ? 0 : rawHour;
        const weekday = get("weekday");
        dayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday] ?? 0;
        timeStr = `${get("year")}-${pad(get("month"))}-${pad(get("day"))} ${pad(hour)}:${pad(get("minute"))}:${pad(get("second"))}`;
    }

    const [dateStr, clockStrRaw] = timeStr.split(" ");
    return {
        timeStr,
        dateStr,
        clockStr: (clockStrRaw || "").trim(),
        dayIndex,
        hour,
        dayName: I18N_DATA[currentLang].days[dayIndex] || "",
        dayNightIcon: (hour >= 6 && hour <= 18) ? "☀️" : "🌙"
    };
}

function buildTimezoneComputedSnapshotForRange(tz, startDate, endDate) {
    if (!tz) return null;

    let zoneCodeMain = "";
    let offsetStr = "";
    const fixedDisplayOffsetMinutes = getFixedOffsetForDisplayAtDate(tz, startDate);

    if (tz.type === "custom") {
        zoneCodeMain = normalizeCustomAbbr(tz.abbr);
        const offsetMin = getCustomOffsetMinutes(tz);
        const sign = offsetMin >= 0 ? "+" : "-";
        const absMin = Math.abs(offsetMin);
        offsetStr = `UTC${sign}${pad(Math.floor(absMin / 60))}:${pad(absMin % 60)}`;
    } else {
        zoneCodeMain = getZoneAbbreviation(tz, startDate);
        if (Number.isFinite(fixedDisplayOffsetMinutes)) {
            const sign = fixedDisplayOffsetMinutes >= 0 ? "+" : "-";
            const absMin = Math.abs(fixedDisplayOffsetMinutes);
            offsetStr = `UTC${sign}${pad(Math.floor(absMin / 60))}:${pad(absMin % 60)}`;
        } else {
            const offF = new Intl.DateTimeFormat("en-US", { timeZone: tz.zone, timeZoneName: "longOffset" });
            const partsArr = offF.formatToParts(startDate);
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

    const points = [
        getTimezoneDisplayPointAtDate(startDate, tz, fixedDisplayOffsetMinutes),
        getTimezoneDisplayPointAtDate(endDate, tz, fixedDisplayOffsetMinutes)
    ];

    const times = points.map(p => p.timeStr);
    const dates = points.map(p => p.dateStr);
    const clocks = points.map(p => p.clockStr);
    const dayNames = points.map(p => p.dayName);
    const dayIndexes = points.map(p => p.dayIndex);
    const dayNightIcons = points.map(p => p.dayNightIcon);

    const spanDays = getSignedInclusiveDaySpan(times[0], times[1]);
    const spanTime = getSignedDurationDayHourMinute(times[0], times[1]);

    return {
        timezone: zoneCodeMain,
        region: getZoneDisplayName(tz),
        offset: offsetStr,
        times,
        dates,
        clocks,
        dayNames,
        dayIndexes,
        dayNightIcons,
        periodDays: spanDays === null ? "" : `${spanDays}${t("unit_days_suffix")}`,
        periodTime: spanTime === null ? "" : spanTime
    };
}

function applySnapshotToRow(row, snapshot) {
    if (!row || !snapshot) return;

    const zoneCodeEl = row.querySelector(".zone-code");
    if (zoneCodeEl) zoneCodeEl.textContent = snapshot.timezone || "";

    const zoneNameEl = row.querySelector(".zone-name");
    if (zoneNameEl && !zoneNameEl.textContent) zoneNameEl.textContent = snapshot.region || "";

    const offsetTextEl = row.querySelector(".offset-text");
    if (offsetTextEl) offsetTextEl.textContent = snapshot.offset || "";

    for (let slotIdx = 0; slotIdx < 2; slotIdx++) {
        const timeStr = snapshot.times?.[slotIdx] || "";
        const dateStr = snapshot.dates?.[slotIdx] || "";
        const clockStr = snapshot.clocks?.[slotIdx] || "";
        const dayName = snapshot.dayNames?.[slotIdx] || "";
        const dayIndex = snapshot.dayIndexes?.[slotIdx] ?? 0;
        const dnIcon = snapshot.dayNightIcons?.[slotIdx] || "";

        row.querySelectorAll(`.time-input[data-slot="${slotIdx}"]`).forEach((input) => {
            const inputMode = input.dataset.inputMode || "datetime";
            let nextValue = timeStr;
            if (inputMode === "date") nextValue = dateStr;
            else if (inputMode === "time") nextValue = clockStr;
            else if (inputMode === "none") nextValue = "";
            if (document.activeElement !== input) input.value = nextValue;
        });

        row.querySelectorAll(`.day-slot-${slotIdx}`).forEach((badge) => {
            badge.textContent = dayName;
            badge.className = `day-badge day-slot-${slotIdx}`;
            if (dayIndex === 0) badge.classList.add("day-sun");
            else if (dayIndex === 6) badge.classList.add("day-sat");
        });

        row.querySelectorAll(`.dn-slot-${slotIdx}`).forEach((dnEl) => {
            dnEl.textContent = dnIcon;
            const isDay = dnIcon === "☀️";
            dnEl.title = isDay ? t("dn_day") : t("dn_night");
        });
    }

    const periodEl = row.querySelector(".period-days-text");
    if (periodEl) periodEl.textContent = (snapshot.periodDays || "").trim() || "-";

    const periodTimeEl = row.querySelector(".period-time-text");
    if (periodTimeEl) periodTimeEl.textContent = (snapshot.periodTime || "").trim() || "-";
}

function formatRangeDurationText(startUtcMs, endUtcMs) {
    const diffMs = endUtcMs - startUtcMs;
    const sign = diffMs < 0 ? "-" : "";
    const totalMinutes = Math.floor(Math.abs(diffMs) / 60000);
    const day = Math.floor(totalMinutes / 1440);
    const hour = Math.floor((totalMinutes % 1440) / 60);
    const minute = totalMinutes % 60;
    if (currentLang === "en") return `${sign}${day}d ${hour}h ${minute}m`;
    return `${sign}${day}일 ${hour}시간 ${minute}분`;
}

function getMultiRangeTitleText(rangeIdx, range, baseRef) {
    const safeTitle = sanitizeMultiSubgroupName(getCurrentMultiSubgroupName(), sanitizeMultiRangeTitle(multiRangeTitle));
    const durationText = formatRangeDurationText(range.startUtcMs, range.endUtcMs);
    const baseSnapshot = buildTimezoneComputedSnapshotForRange(
        baseRef,
        new Date(range.startUtcMs),
        new Date(range.endUtcMs)
    );
    const startText = baseSnapshot?.times?.[0] || "-";
    const endText = baseSnapshot?.times?.[1] || "-";
    return `${safeTitle} #${rangeIdx + 1} - ${startText} ~ ${endText} [${durationText}]`;
}

function createMultiRangeTableRow(tz, options = {}) {
    const { rangeIdx, range, displayColumns, isBase = false, rowId = tz.id, baseNameHtml = "" } = options;
    const tr = document.createElement("tr");
    tr.className = isBase ? "time-row static base-row" : "time-row";
    tr.id = `multi-r${rangeIdx}-tz-row-${rowId}`;

    let inner = "";
    displayColumns.forEach((colKey) => {
        inner += isBase ? buildStaticRowCell(colKey, 2, baseNameHtml) : buildDynamicRowCell(colKey, 2);
    });
    inner += `<td class="export-exclude copy-cell"><div class="btn-group"><button class="sm-btn copy-row-btn" title="${t("tooltip_copy")}">📋</button></div></td>`;
    tr.innerHTML = inner;

    if (!isBase) {
        const zoneNameEl = tr.querySelector(".zone-name");
        if (zoneNameEl) zoneNameEl.textContent = getZoneDisplayName(tz);
    }

    const copyBtn = tr.querySelector(".copy-row-btn");
    if (copyBtn) {
        copyBtn.addEventListener("click", () => copyMultiRangeRow(rangeIdx, rowId));
    }

    tr.querySelectorAll(".time-input").forEach((inp) => {
        const slotIdx = parseInt(inp.dataset.slot, 10);
        const inputMode = inp.dataset.inputMode || "datetime";
        const timezoneId = rowId === "utc" ? null : tz.id;
        const lockedByChain = slotIdx === 0 && rangeIdx > 0 && !isMultiRangeStartEditEnabled(rangeIdx);
        const lockedByEndToggle = slotIdx === 1 && !isMultiRangeEndEditEnabled(rangeIdx);
        const lockedByToggle = lockedByChain || lockedByEndToggle;
        if (lockedByToggle) inp.readOnly = true;
        inp.onchange = (e) => {
            if (lockedByToggle) return;
            handleMultiRangeTimeChange(rangeIdx, e.target.value, tz.zone || "CUSTOM", slotIdx, timezoneId, inputMode);
        };
        inp.onkeydown = (e) => {
            if (e.key !== "Enter") return;
            if (!lockedByToggle) handleMultiRangeTimeChange(rangeIdx, inp.value, tz.zone || "CUSTOM", slotIdx, timezoneId, inputMode);
            inp.blur();
        };
    });

    const snapshot = buildTimezoneComputedSnapshotForRange(
        tz,
        new Date(range.startUtcMs),
        new Date(range.endUtcMs)
    );
    applySnapshotToRow(tr, snapshot);
    return tr;
}

function renderMultiRanges() {
    hideFloatingTooltip();
    const container = document.getElementById("multi-ranges-container");
    if (!container) return;

    ensureMultiRangeState();
    refreshMultiRangeControls();
    renderMultiBulkToolSets();

    const baseRef = getBaseTimezoneRef();
    const baseRefName = escapeHtml(getZoneDisplayName(baseRef));
    const displayColumns = getDisplayColumns(2);
    const rowsToRender = getRenderableTimezoneRows(baseRef);

    container.innerHTML = "";
    multiRanges.forEach((range, rangeIdx) => {
        const block = document.createElement("div");
        block.className = "multi-range-block";
        const isCollapsed = !!multiRangeCollapsed[rangeIdx];
        if (isCollapsed) block.classList.add("collapsed");

        const header = document.createElement("div");
        header.className = "multi-range-header";
        const title = document.createElement("div");
        title.className = "multi-range-title";
        title.textContent = getMultiRangeTitleText(rangeIdx, range, baseRef);

        const headerActions = document.createElement("div");
        headerActions.className = "multi-range-header-actions";
        const createHeaderActionDivider = () => {
            const divider = document.createElement("span");
            divider.className = "multi-range-header-divider";
            divider.textContent = "|";
            divider.setAttribute("aria-hidden", "true");
            return divider;
        };

        const copyRangeBtn = document.createElement("button");
        copyRangeBtn.type = "button";
        copyRangeBtn.className = "sm-btn multi-range-copy-btn";
        copyRangeBtn.textContent = t("btn_copy_range");
        copyRangeBtn.addEventListener("click", () => {
            copyWholeMultiRange(rangeIdx);
        });

        const collapseBelowBtn = document.createElement("button");
        collapseBelowBtn.type = "button";
        collapseBelowBtn.className = "sm-btn multi-range-toggle-btn";
        collapseBelowBtn.textContent = t("btn_collapse_below");
        collapseBelowBtn.disabled = rangeIdx >= (multiRangeCount - 1);
        collapseBelowBtn.addEventListener("click", () => setMultiRangesCollapsedBelow(rangeIdx, true));

        const expandBelowBtn = document.createElement("button");
        expandBelowBtn.type = "button";
        expandBelowBtn.className = "sm-btn multi-range-toggle-btn";
        expandBelowBtn.textContent = t("btn_expand_below");
        expandBelowBtn.disabled = rangeIdx >= (multiRangeCount - 1);
        expandBelowBtn.addEventListener("click", () => setMultiRangesCollapsedBelow(rangeIdx, false));

        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "sm-btn multi-range-toggle-btn";
        toggleBtn.textContent = isCollapsed ? t("btn_expand_this_range") : t("btn_collapse_this_range");
        toggleBtn.addEventListener("click", () => toggleMultiRangeCollapsed(rangeIdx));

        headerActions.appendChild(copyRangeBtn);
        headerActions.appendChild(createHeaderActionDivider());
        headerActions.appendChild(collapseBelowBtn);
        headerActions.appendChild(expandBelowBtn);
        headerActions.appendChild(createHeaderActionDivider());
        headerActions.appendChild(toggleBtn);
        header.appendChild(title);
        header.appendChild(headerActions);
        block.appendChild(header);

        const adjustRow = document.createElement("div");
        adjustRow.className = "multi-range-adjust-row";
        const startAdjustEnabled = rangeIdx === 0 ? true : isMultiRangeStartEditEnabled(rangeIdx);
        const startAdjustSet = renderTimeAdjustSet(0, {
            labelText: t("label_start_time_adjust"),
            includeFixedActions: rangeIdx === 0,
            includeSyncPreviousEndAction: rangeIdx > 0,
            disabled: rangeIdx > 0 ? !startAdjustEnabled : false,
            onAction: (slotIdx, action) => applyMultiRangeTimeAdjustAction(rangeIdx, slotIdx, action)
        });
        if (rangeIdx > 0) {
            attachTimeAdjustToggleLabel(
                startAdjustSet,
                startAdjustEnabled,
                t("label_start_time_adjust"),
                (nextChecked) => setMultiRangeStartEditEnabled(rangeIdx, nextChecked, { persist: true, rerender: true })
            );
        }
        adjustRow.appendChild(startAdjustSet);
        const endAdjustEnabled = isMultiRangeEndEditEnabled(rangeIdx);
        const endAdjustSet = renderTimeAdjustSet(1, {
            labelText: t("label_extra_time_adjust"),
            includeFixedActions: false,
            includeZeroDayAction: true,
            disabled: !endAdjustEnabled,
            onAction: (slotIdx, action) => applyMultiRangeTimeAdjustAction(rangeIdx, slotIdx, action)
        });
        attachTimeAdjustToggleLabel(
            endAdjustSet,
            endAdjustEnabled,
            t("label_extra_time_adjust"),
            (nextChecked) => setMultiRangeEndEditEnabled(rangeIdx, nextChecked, { persist: true, rerender: true })
        );
        adjustRow.appendChild(endAdjustSet);
        block.appendChild(adjustRow);

        const tableWrap = document.createElement("div");
        tableWrap.className = "multi-range-table-wrap";
        const table = document.createElement("table");
        table.className = "data-table multi-range-table";

        const thead = document.createElement("thead");
        const headCells = [];
        headCells.push(...displayColumns.map(getMultiDisplayColumnHeader).filter(Boolean));
        headCells.push(`<th class="export-exclude" style="width: 70px;">${t("th_copy")}</th>`);
        thead.innerHTML = `<tr>${headCells.join("")}</tr>`;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        const baseRow = createMultiRangeTableRow(baseRef, {
            rangeIdx,
            range,
            displayColumns,
            isBase: true,
            rowId: baseRef.id,
            baseNameHtml: baseRefName
        });
        tbody.appendChild(baseRow);

        rowsToRender.forEach((tz) => {
            const rowId = tz.id === "utc" ? "utc" : tz.id;
            tbody.appendChild(createMultiRangeTableRow(tz, {
                rangeIdx,
                range,
                displayColumns,
                isBase: false,
                rowId
            }));
        });

        table.appendChild(tbody);
        tableWrap.appendChild(table);
        block.appendChild(tableWrap);
        container.appendChild(block);
    });

    updateTimeAdjustPanel();
    updateCopyFormatPreview();
    upgradeNativeTitleTooltips(container);
}

// --- Group Management ---
function activateGroupTab(idx) {
    if (idx === activeGroupId) return;
    syncCurrentMultiStateToActiveSubgroup();
    activeGroupId = idx;
    normalizeGroupTabState();
    if (currentMainTab === "live" || currentMainTab === "fixed") {
        activeGroupIdByMainTab[currentMainTab] = activeGroupId;
    }
    loadCurrentMultiStateFromActiveSubgroup();
    savePersistence();
    renderGroups();
    renderMultiSubgroups();
    if (isMultiTab()) {
        renderBaseTimeSelect();
        renderMultiRanges();
    }
    else {
        renderList();
    }
}

function renderGroups() {
    hideFloatingTooltip();
    const container = document.getElementById("group-tabs-container");
    const addBtn = document.getElementById("add-group-btn");
    if (!container || !addBtn) return;
    container.innerHTML = "";

    groups.forEach((group, idx) => {
        ensureGroupMultiSubgroups(group);
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
            if (target instanceof Element && target.closest(".group-edit-btn, .group-export-btn, .group-import-btn, .group-del-btn")) return;
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
        setCustomTooltip(editBtn, t("tooltip_edit"));
        editBtn.onclick = (e) => {
            e.stopPropagation();
            renameGroup(idx);
        };

        const exportBtn = document.createElement("button");
        exportBtn.className = "group-export-btn";
        exportBtn.innerHTML = "⤴";
        setCustomTooltip(exportBtn, t("tooltip_group_export"));
        exportBtn.onclick = (e) => {
            e.stopPropagation();
            exportGroupToJSON(idx);
        };

        const importBtn = document.createElement("button");
        importBtn.className = "group-import-btn";
        importBtn.innerHTML = "⤵";
        setCustomTooltip(importBtn, t("tooltip_group_import"));
        importBtn.onclick = (e) => {
            e.stopPropagation();
            triggerGroupImportFor(idx);
        };

        const delBtn = document.createElement("button");
        delBtn.className = "group-del-btn";
        delBtn.innerHTML = "✖";
        setCustomTooltip(delBtn, t("tooltip_delete"));
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (groups.length > 1 && confirm(t("confirm_delete_group"))) {
                syncCurrentMultiStateToActiveSubgroup();
                groups.splice(idx, 1);
                activeGroupId = Math.max(0, activeGroupId - 1);
                normalizeGroupTabState();
                if (currentMainTab === "live" || currentMainTab === "fixed") {
                    activeGroupIdByMainTab[currentMainTab] = activeGroupId;
                }
                loadCurrentMultiStateFromActiveSubgroup();
                savePersistence();
                renderGroups();
                renderMultiSubgroups();
                if (isMultiTab()) {
                    renderBaseTimeSelect();
                    renderMultiRanges();
                }
                else renderList();
                showToast(t("toast_group_deleted"));
            } else if (groups.length <= 1) {
                showToast(t("toast_group_min"));
            }
        };

        btn.appendChild(label);
        if (idx === activeGroupId) {
            btn.appendChild(editBtn);
            btn.appendChild(exportBtn);
            btn.appendChild(importBtn);
            btn.appendChild(delBtn);
        }
        container.appendChild(btn);
    });
    container.appendChild(addBtn);
    upgradeNativeTitleTooltips(container);
}

function renameGroup(idx) {
    const group = groups[idx];
    const newName = prompt(t("prompt_rename_group"), group.name);
    if (newName && newName.trim()) {
        group.name = newName.trim();
        savePersistence();
        renderGroups();
        renderMultiSubgroups();
        showToast(t("toast_name_changed"));
    }
}

function activateMultiSubgroup(subgroupId) {
    const group = getCurrentGroup();
    if (!group) return;
    ensureGroupMultiSubgroups(group);
    if (!group.multiSubgroups.some((subgroup) => subgroup.id === subgroupId)) return;

    syncCurrentMultiStateToActiveSubgroup();
    group.activeMultiSubgroupId = subgroupId;
    loadCurrentMultiStateFromActiveSubgroup();
    savePersistence();
    renderMultiSubgroups();
    if (isMultiTab()) renderMultiRanges();
}

function addMultiSubgroup() {
    const group = getCurrentGroup();
    if (!group) return;
    ensureGroupMultiSubgroups(group);

    const defaultName = getDefaultMultiSubgroupName(group.multiSubgroups.length);
    const nextName = prompt(t("prompt_new_subgroup"), defaultName);
    if (!nextName || !nextName.trim()) return;

    syncCurrentMultiStateToActiveSubgroup();
    const subgroup = createMultiSubgroupState(nextName, group.multiSubgroups.length, null);
    group.multiSubgroups.push(subgroup);
    group.activeMultiSubgroupId = subgroup.id;
    loadCurrentMultiStateFromActiveSubgroup();
    savePersistence();
    renderMultiSubgroups();
    if (isMultiTab()) renderMultiRanges();
}

function renameMultiSubgroup(subgroupId) {
    const group = getCurrentGroup();
    if (!group) return;
    ensureGroupMultiSubgroups(group);
    const subgroup = group.multiSubgroups.find((item) => item.id === subgroupId);
    if (!subgroup) return;

    const nextName = prompt(t("prompt_rename_subgroup"), subgroup.name);
    if (!nextName || !nextName.trim()) return;
    subgroup.name = sanitizeMultiSubgroupName(nextName, subgroup.name);
    multiRangeTitle = sanitizeMultiRangeTitle(subgroup.name);
    savePersistence();
    renderMultiSubgroups();
    if (isMultiTab()) renderMultiRanges();
    showToast(t("toast_subgroup_name_changed"));
}

function deleteMultiSubgroup(subgroupId) {
    const group = getCurrentGroup();
    if (!group) return;
    ensureGroupMultiSubgroups(group);
    if (group.multiSubgroups.length <= 1) {
        showToast(t("toast_subgroup_min"));
        return;
    }
    if (!confirm(t("confirm_delete_subgroup"))) return;

    syncCurrentMultiStateToActiveSubgroup();
    const removeIdx = group.multiSubgroups.findIndex((item) => item.id === subgroupId);
    if (removeIdx < 0) return;
    group.multiSubgroups.splice(removeIdx, 1);
    if (!group.multiSubgroups.length) {
        group.multiSubgroups.push(createMultiSubgroupState(getDefaultMultiSubgroupName(0), 0, null));
    }
    group.activeMultiSubgroupId = group.multiSubgroups[Math.max(0, removeIdx - 1)]?.id || group.multiSubgroups[0].id;
    loadCurrentMultiStateFromActiveSubgroup();
    savePersistence();
    renderMultiSubgroups();
    if (isMultiTab()) renderMultiRanges();
    showToast(t("toast_subgroup_deleted"));
}

function renderMultiSubgroups() {
    hideFloatingTooltip();
    const container = document.getElementById("multi-subgroup-tabs-container");
    const addBtn = document.getElementById("add-multi-subgroup-btn");
    if (!container || !addBtn) return;

    if (!isMultiTab()) {
        container.style.display = "none";
        return;
    }

    const group = getCurrentGroup();
    if (!group) {
        container.innerHTML = "";
        container.appendChild(addBtn);
        container.style.display = "flex";
        return;
    }

    ensureGroupMultiSubgroups(group);
    container.innerHTML = "";
    group.multiSubgroups.forEach((subgroup) => {
        const tab = document.createElement("div");
        const isActive = subgroup.id === group.activeMultiSubgroupId;
        tab.className = `multi-subgroup-tab ${isActive ? "active" : ""}`;
        tab.setAttribute("role", "button");
        tab.tabIndex = 0;
        tab.addEventListener("click", () => activateMultiSubgroup(subgroup.id));
        tab.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            activateMultiSubgroup(subgroup.id);
        });

        const label = document.createElement("span");
        label.className = "multi-subgroup-name-label";
        label.textContent = subgroup.name;
        tab.appendChild(label);

        if (isActive) {
            const editBtn = document.createElement("button");
            editBtn.className = "multi-subgroup-edit-btn";
            editBtn.type = "button";
            editBtn.innerHTML = "✎";
            setCustomTooltip(editBtn, t("tooltip_subgroup_edit"));
            editBtn.onclick = (e) => {
                e.stopPropagation();
                renameMultiSubgroup(subgroup.id);
            };

            const exportBtn = document.createElement("button");
            exportBtn.className = "multi-subgroup-export-btn";
            exportBtn.type = "button";
            exportBtn.innerHTML = "⤴";
            setCustomTooltip(exportBtn, t("tooltip_subgroup_export"));
            exportBtn.onclick = (e) => {
                e.stopPropagation();
                exportSubgroupToJSON(activeGroupId, subgroup.id);
            };

            const importBtn = document.createElement("button");
            importBtn.className = "multi-subgroup-import-btn";
            importBtn.type = "button";
            importBtn.innerHTML = "⤵";
            setCustomTooltip(importBtn, t("tooltip_subgroup_import"));
            importBtn.onclick = (e) => {
                e.stopPropagation();
                triggerSubgroupImportFor(activeGroupId, subgroup.id);
            };

            const delBtn = document.createElement("button");
            delBtn.className = "multi-subgroup-del-btn";
            delBtn.type = "button";
            delBtn.innerHTML = "✖";
            setCustomTooltip(delBtn, t("tooltip_subgroup_delete"));
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deleteMultiSubgroup(subgroup.id);
            };
            tab.appendChild(editBtn);
            tab.appendChild(exportBtn);
            tab.appendChild(importBtn);
            tab.appendChild(delBtn);
        }

        container.appendChild(tab);
    });

    container.appendChild(addBtn);
    container.style.display = "flex";
    upgradeNativeTitleTooltips(container);
}

// --- List Rendering (Dynamic Slots) ---
function renderList() {
    hideFloatingTooltip();
    if (isMultiTab()) {
        renderMultiRanges();
        return;
    }

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
    upgradeNativeTitleTooltips(container);
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

function getFixedOffsetForDisplayAtDate(tz, anchorDate) {
    if (!tz || tz.type !== "standard" || !tz.zone || tz.zone === "UTC") return null;
    const parsed = Number(tz.fixedOffsetMinutes);
    if (!Number.isFinite(parsed)) return null;
    return Math.min(14 * 60, Math.max(-14 * 60, Math.trunc(parsed)));
}

function getFixedOffsetForDisplay(tz) {
    return getFixedOffsetForDisplayAtDate(tz, globalTimes[0]);
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
        case "set_zero_day":
            if (slotIdx !== 1) return;
            globalTimes[1] = new Date(globalTimes[0].getTime());
            updateClocks();
            return;
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

function getAdjustedUtcDateByAction(baseDate, action, slotIdx, baseRef, fixedOffsetMinutes) {
    if (!(baseDate instanceof Date) || !Number.isFinite(baseDate.getTime())) return null;

    if (action === "now") return new Date();

    let parts = getLocalPartsByTimezone(baseDate, baseRef, fixedOffsetMinutes);
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
            return null;
    }
    return getUTCDateFromLocalParts(parts, baseRef, fixedOffsetMinutes);
}

function applyBulkRangeStartAction(slotIdx, action) {
    ensureMultiRangeState();
    if (!multiRanges.length) return;

    const baseRef = getBaseTimezoneRef();
    const anchorDate = new Date(multiRanges[0].startUtcMs);
    const fixedOffsetMinutes = getFixedOffsetForDisplayAtDate(baseRef, anchorDate);
    const adjustedFirstStart = getAdjustedUtcDateByAction(new Date(multiRanges[0].startUtcMs), action, slotIdx, baseRef, fixedOffsetMinutes);
    if (!(adjustedFirstStart instanceof Date) || !Number.isFinite(adjustedFirstStart.getTime())) return;

    const durations = multiRanges.map((range) => range.endUtcMs - range.startUtcMs);
    let cursor = adjustedFirstStart.getTime();
    multiRanges = multiRanges.map((range, idx) => {
        const startUtcMs = cursor;
        const endUtcMs = startUtcMs + durations[idx];
        cursor = endUtcMs;
        return { startUtcMs, endUtcMs };
    });

    if (isMultiTab()) renderMultiRanges();
    savePersistence();
}

function applyBulkRangeAllAction(slotIdx, action) {
    ensureMultiRangeState();
    if (!multiRanges.length) return;

    const baseDurations = multiRanges.map((range) => range.endUtcMs - range.startUtcMs);
    let nextDurations = [];

    if (action === "set_zero_day") {
        nextDurations = baseDurations.map(() => 0);
    } else {
        let deltaMs = 0;
        switch (action) {
            case "plus_hour":
                deltaMs = 60 * 60 * 1000;
                break;
            case "minus_hour":
                deltaMs = -60 * 60 * 1000;
                break;
            case "plus_day":
                deltaMs = 24 * 60 * 60 * 1000;
                break;
            case "minus_day":
                deltaMs = -24 * 60 * 60 * 1000;
                break;
            case "plus_week":
                deltaMs = 7 * 24 * 60 * 60 * 1000;
                break;
            case "minus_week":
                deltaMs = -7 * 24 * 60 * 60 * 1000;
                break;
            case "plus_four_weeks":
                deltaMs = 28 * 24 * 60 * 60 * 1000;
                break;
            case "minus_four_weeks":
                deltaMs = -28 * 24 * 60 * 60 * 1000;
                break;
            case "plus_custom_days":
                deltaMs = getTimeAdjustDayStep(slotIdx) * 24 * 60 * 60 * 1000;
                break;
            case "minus_custom_days":
                deltaMs = -getTimeAdjustDayStep(slotIdx) * 24 * 60 * 60 * 1000;
                break;
            default:
                return;
        }
        nextDurations = baseDurations.map((durationMs) => durationMs + deltaMs);
    }

    let cursor = sanitizeUtcMs(multiRanges[0]?.startUtcMs, Date.now());
    for (let idx = 0; idx < multiRanges.length; idx++) {
        const current = multiRanges[idx];
        if (!current) continue;
        if (idx === 0 || isMultiRangeStartLinked(idx)) {
            current.startUtcMs = cursor;
        } else {
            current.startUtcMs = sanitizeUtcMs(current.startUtcMs, cursor);
        }
        current.endUtcMs = current.startUtcMs + (nextDurations[idx] ?? 0);
        cursor = current.endUtcMs;
    }

    if (isMultiTab()) renderMultiRanges();
    savePersistence();
}

function applyMultiRangeTimeAdjustAction(rangeIdx, slotIdx, action) {
    if (!isMultiTab()) return;
    if (rangeIdx > 0 && slotIdx === 0 && !isMultiRangeStartEditEnabled(rangeIdx)) return;
    if (slotIdx === 1 && !isMultiRangeEndEditEnabled(rangeIdx)) return;

    ensureMultiRangeState();
    const range = multiRanges[rangeIdx];
    if (!range) return;

    if (slotIdx === 0 && action === "sync_prev_end") {
        if (rangeIdx <= 0) return;
        const durationSnapshot = multiRanges.map((item) => item.endUtcMs - item.startUtcMs);
        range.startUtcMs = multiRanges[rangeIdx - 1].endUtcMs;
        syncLinkedRangesFrom(rangeIdx, {
            includeCurrent: true,
            stopAtFirstUnlocked: true,
            baseDurations: durationSnapshot
        });
    } else if (slotIdx === 1 && action === "set_zero_day") {
        range.endUtcMs = range.startUtcMs;
    } else {
        const baseRef = getBaseTimezoneRef();
        const anchorDate = new Date(range.startUtcMs);
        const fixedOffsetMinutes = getFixedOffsetForDisplayAtDate(baseRef, anchorDate);
        const baseDate = getMultiRangeSlotDate(rangeIdx, slotIdx);
        const nextUtcDate = getAdjustedUtcDateByAction(baseDate, action, slotIdx, baseRef, fixedOffsetMinutes);
        if (!(nextUtcDate instanceof Date) || !Number.isFinite(nextUtcDate.getTime())) return;
        setMultiRangeSlotDate(rangeIdx, slotIdx, nextUtcDate);
    }

    if (slotIdx === 1) {
        syncFollowingRangesByDuration(rangeIdx);
    } else if (rangeIdx === 0) {
        syncMultiRangeStartLinks(1);
    }

    renderMultiRanges();
    savePersistence();
}

// --- Clock Logic ---
function updateClocks() {
    if (isMultiTab()) {
        renderMultiRanges();
        return;
    }

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
        zoneCodeMain = getZoneAbbreviation(tz, globalTimes[0]);
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

function resolveLocalDatePartsByTimezoneAtDate(timezone, utcDate, timezoneId = null) {
    const sourceDate = (utcDate instanceof Date && Number.isFinite(utcDate.getTime()))
        ? utcDate
        : new Date();

    if (timezone === "UTC") {
        return {
            Y: sourceDate.getUTCFullYear(),
            M: sourceDate.getUTCMonth() + 1,
            D: sourceDate.getUTCDate()
        };
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
        const shifted = new Date(sourceDate.getTime() + (getCustomOffsetMinutes(tz) * 60000));
        return { Y: shifted.getUTCFullYear(), M: shifted.getUTCMonth() + 1, D: shifted.getUTCDate() };
    }

    if (timezoneId) {
        const tz = getCurrentGroupZones().find((item) => item.id === timezoneId) || null;
        const fixedOffsetMinutes = getFixedOffsetForDisplayAtDate(tz, sourceDate);
        if (Number.isFinite(fixedOffsetMinutes)) {
            const shifted = new Date(sourceDate.getTime() + (fixedOffsetMinutes * 60000));
            return { Y: shifted.getUTCFullYear(), M: shifted.getUTCMonth() + 1, D: shifted.getUTCDate() };
        }
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour12: false
    });
    const parts = formatter.formatToParts(sourceDate);
    const get = (type) => parseInt(parts.find(p => p.type === type)?.value || "0", 10);
    return { Y: get("year"), M: get("month"), D: get("day") };
}

function resolveLocalDatePartsByTimezone(timezone, slotIdx, timezoneId = null) {
    return resolveLocalDatePartsByTimezoneAtDate(timezone, globalTimes[slotIdx], timezoneId);
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
        const zoneRef = timezoneId
            ? (getCurrentGroupZones().find((z) => z.id === timezoneId) || null)
            : null;
        const fixedOffsetMinutes = getFixedOffsetForDisplayAtDate(zoneRef, globalTimes[0]);
        const offMin = Number.isFinite(fixedOffsetMinutes)
            ? fixedOffsetMinutes
            : getTimezoneOffset(timezone, tempUTC);
        const offMs = offMin * 60000;
        globalTimes[slotIdx] = new Date(tempUTC.getTime() - offMs);
    }
    updateClocks();
}

function handleMultiRangeTimeChange(rangeIdx, val, timezone, slotIdx, timezoneId = null, inputMode = "datetime") {
    if (!isMultiTab()) return;
    if (rangeIdx > 0 && slotIdx === 0 && !isMultiRangeStartEditEnabled(rangeIdx)) return;
    if (slotIdx === 1 && !isMultiRangeEndEditEnabled(rangeIdx)) return;

    ensureMultiRangeState();
    const range = multiRanges[rangeIdx];
    if (!range) return;

    const normalized = (val || "").trim();
    const dateTimeMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeOnlyMatch = normalized.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    let Y = 0; let M = 0; let D = 0; let H = 0; let min = 0; let S = 0;

    if (inputMode === "none") return;

    if (inputMode === "datetime" && dateTimeMatch) {
        [Y, M, D, H, min, S] = dateTimeMatch.slice(1).map(Number);
    } else if (inputMode === "date" && dateOnlyMatch) {
        [Y, M, D] = dateOnlyMatch.slice(1).map(Number);
    } else if (inputMode === "time" && timeOnlyMatch) {
        const baseDate = getMultiRangeSlotDate(rangeIdx, slotIdx);
        const baseDateParts = resolveLocalDatePartsByTimezoneAtDate(timezone, baseDate, timezoneId);
        if (!baseDateParts) return;
        ({ Y, M, D } = baseDateParts);
        [H, min, S] = timeOnlyMatch.slice(1).map(Number);
    } else {
        showToast(t("toast_invalid_date"));
        renderMultiRanges();
        return;
    }

    const tempUTC = new Date(Date.UTC(Y, M - 1, D, H, min, S));
    if (!Number.isFinite(tempUTC.getTime())) return;

    let nextUtcDate = null;
    if (timezone === "UTC") {
        nextUtcDate = tempUTC;
    } else if (timezone === "CUSTOM") {
        const tz = getCurrentGroupZones().find(z => z.id === timezoneId) || null;
        if (!tz) return;
        const offMs = getCustomOffsetMinutes(tz) * 60000;
        nextUtcDate = new Date(tempUTC.getTime() - offMs);
    } else {
        const offsetAnchor = new Date(range.startUtcMs);
        const zoneRef = timezoneId
            ? (getCurrentGroupZones().find((z) => z.id === timezoneId) || null)
            : null;
        const fixedOffsetMinutes = getFixedOffsetForDisplayAtDate(zoneRef, offsetAnchor);
        const offMin = Number.isFinite(fixedOffsetMinutes)
            ? fixedOffsetMinutes
            : getTimezoneOffset(timezone, tempUTC);
        nextUtcDate = new Date(tempUTC.getTime() - (offMin * 60000));
    }

    if (!(nextUtcDate instanceof Date) || !Number.isFinite(nextUtcDate.getTime())) return;
    setMultiRangeSlotDate(rangeIdx, slotIdx, nextUtcDate);

    if (slotIdx === 1) {
        syncFollowingRangesByDuration(rangeIdx);
    } else if (rangeIdx === 0) {
        syncMultiRangeStartLinks(1);
    }

    renderMultiRanges();
    savePersistence();
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

    getSelectableTZEntries().forEach((entry) => {
        const o = document.createElement("option");
        o.value = entry.key;
        o.textContent = getSelectableTZOptionLabel(entry);
        quickSelect.appendChild(o);
    });
    adjustSelectWidthForContent(quickSelect, 118);
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
            }
            quickSelect.value = "";
            return;
        }
        const entry = getSelectableTZEntryByKey(e.target.value);
        if (entry) addFromSearchWithData(entry.key);
        quickSelect.value = "";
    };

    const showAllBtn = document.getElementById("show-all-tz");
    if (showAllBtn) {
        showAllBtn.onclick = () => {
            const o = document.getElementById("full-tz-overlay");
            if (!o) return;
            fullTimezoneOverlayStandardEntries = getStandardTimezoneEntries();
            fullTimezoneOverlayCountryEntries = getSelectableTZEntries();
            setFullTimezoneOverlayTab("standard");
            o.style.display = "flex";
        };
    }

    const standardTabBtn = document.getElementById("tz-tab-standard");
    const countryTabBtn = document.getElementById("tz-tab-country");
    if (standardTabBtn) {
        standardTabBtn.addEventListener("click", () => setFullTimezoneOverlayTab("standard"));
    }
    if (countryTabBtn) {
        countryTabBtn.addEventListener("click", () => setFullTimezoneOverlayTab("country"));
    }

    const closeOverlayBtn = document.getElementById("close-overlay");
    if (closeOverlayBtn) {
        closeOverlayBtn.onclick = () => {
            const overlay = document.getElementById("full-tz-overlay");
            if (overlay) overlay.style.display = "none";
        };
    }
}

function createStandardTimezoneFromSelectableEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    if (entry.kind === "standard_list") {
        const abbr = normalizeZoneAbbreviation(entry.abbr);
        const fixedOffsetMinutes = Number.isFinite(entry.fixedOffsetMinutes) ? Math.trunc(entry.fixedOffsetMinutes) : null;
        const offsetLabel = formatUtcOffsetLabel(fixedOffsetMinutes);
        return {
            id: createUniqueTimezoneId("tz"),
            zone: entry.zone || "UTC",
            name_ko: `${offsetLabel} 표준시`,
            name_en: `${offsetLabel} Standard Time`,
            type: "standard",
            fixedAbbr: abbr,
            fixedOffsetMinutes
        };
    }
    return {
        id: createUniqueTimezoneId("tz"),
        zone: entry.zone,
        name_ko: `${entry.name} - ${entry.city}`,
        name_en: `${entry.name_en} - ${entry.city_en}`,
        type: "standard",
        fixedAbbr: normalizeZoneAbbreviation(entry.abbr),
        fixedOffsetMinutes: Number.isFinite(entry.fixedOffsetMinutes) ? entry.fixedOffsetMinutes : null
    };
}

function addFromSearchWithData(entryKey) {
    const entry = getSelectableTZEntryByKey(entryKey);
    const nextZone = createStandardTimezoneFromSelectableEntry(entry);
    if (nextZone) {
        addTimezone({
            ...nextZone
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
        return;
    }
    activeGroup.zones = activeGroup.zones.filter(z => z.id !== id);
    savePersistence();
    renderList();
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
    const ids = [...document.querySelectorAll("#clocks-container .time-row:not(.static)")].map(r => r.id.replace("tz-row-", ""));
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
        zoneCodeMain = getZoneAbbreviation(tz, globalTimes[0]);
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

function formatSnapshotText(snapshot, order, enabled, timePartsEnabled = DEFAULT_COPY_TIME_PARTS_ENABLED) {
    if (!snapshot) return "";
    const orderedParts = [];
    sanitizeCopyFormatOrder(order).forEach(key => {
        if (!enabled?.[key]) return;
        const value = getCopyFieldText(snapshot, key, { timePartsEnabled });
        if (value) orderedParts.push(value);
    });
    return orderedParts.join(" ").trim();
}

function getRowFormattedText(rowOrId, order, enabled, timePartsEnabled = DEFAULT_COPY_TIME_PARTS_ENABLED) {
    const rowId = typeof rowOrId === "string"
        ? rowOrId
        : String(rowOrId?.id || "").replace("tz-row-", "");
    if (!rowId) return "";

    const snapshot = buildTimezoneComputedSnapshot(rowId);
    if (!snapshot) return "";
    return formatSnapshotText(snapshot, order, enabled, timePartsEnabled);
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

    if (isMultiTab()) {
        ensureMultiRangeState();
        const firstRange = multiRanges[0];
        const baseRef = getBaseTimezoneRef();
        const snapshot = firstRange
            ? buildTimezoneComputedSnapshotForRange(baseRef, new Date(firstRange.startUtcMs), new Date(firstRange.endUtcMs))
            : null;
        setPreview(copyPreviewEl, formatSnapshotText(snapshot, copyFormatOrder, copyFormatEnabled, copyTimePartsEnabled));
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
    if (isMultiTab()) {
        await copyAllMultiRangeTimezones();
        return;
    }

    const lineArr = [...document.querySelectorAll("#clocks-container .time-row")]
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

async function copyMultiRangeRow(rangeIdx, rowId) {
    ensureMultiRangeState();
    const range = multiRanges[rangeIdx];
    if (!range) return;
    const tz = getTimezoneRefById(rowId);
    if (!tz) return;

    const snapshot = buildTimezoneComputedSnapshotForRange(
        tz,
        new Date(range.startUtcMs),
        new Date(range.endUtcMs)
    );
    const text = formatSnapshotText(snapshot, copyFormatOrder, copyFormatEnabled, copyTimePartsEnabled);
    if (!text) return;

    try {
        await navigator.clipboard.writeText(text);
        showToast(t("toast_copy_success"));
    } catch (err) {
        console.error("copyMultiRangeRow failed:", err);
        showToast(t("toast_copy_failed"));
    }
}

async function copyWholeMultiRange(rangeIdx) {
    ensureMultiRangeState();
    const range = multiRanges[rangeIdx];
    if (!range) return;

    const baseRef = getBaseTimezoneRef();
    const dynamicRows = getRenderableTimezoneRows(baseRef);
    const rowRefs = [baseRef, ...dynamicRows];
    const lineArr = [getMultiRangeTitleText(rangeIdx, range, baseRef)];

    rowRefs.forEach((tz) => {
        const snapshot = buildTimezoneComputedSnapshotForRange(
            tz,
            new Date(range.startUtcMs),
            new Date(range.endUtcMs)
        );
        const line = formatSnapshotText(snapshot, copyFormatOrder, copyFormatEnabled, copyTimePartsEnabled);
        if (line) lineArr.push(line);
    });

    if (lineArr.length <= 1) return;
    try {
        await navigator.clipboard.writeText(lineArr.join("\n"));
        showToast(t("toast_copy_success"));
    } catch (err) {
        console.error("copyWholeMultiRange failed:", err);
        showToast(t("toast_copy_failed"));
    }
}

async function copyAllMultiRangeTimezones() {
    ensureMultiRangeState();
    const baseRef = getBaseTimezoneRef();
    const dynamicRows = getRenderableTimezoneRows(baseRef);
    const rowRefs = [baseRef, ...dynamicRows];
    const lineArr = [];

    multiRanges.forEach((range, rangeIdx) => {
        lineArr.push(getMultiRangeTitleText(rangeIdx, range, baseRef));
        rowRefs.forEach((tz) => {
            const snapshot = buildTimezoneComputedSnapshotForRange(
                tz,
                new Date(range.startUtcMs),
                new Date(range.endUtcMs)
            );
            const line = formatSnapshotText(snapshot, copyFormatOrder, copyFormatEnabled, copyTimePartsEnabled);
            if (line) lineArr.push(line);
        });
        if (rangeIdx < multiRanges.length - 1) {
            lineArr.push("");
        }
    });

    if (!lineArr.length) return;
    try {
        await navigator.clipboard.writeText(lineArr.join("\n"));
        showToast(t("toast_copy_all_success"));
    } catch (err) {
        console.error("copyAllMultiRangeTimezones failed:", err);
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

function getMultiRangeTableImageFilename(rangeIdx) {
    const baseName = getTimezoneTableImageFilename();
    const subgroupName = sanitizeMultiSubgroupName(getCurrentMultiSubgroupName(), "subgroup");
    const rangeLabel = sanitizeFilenamePart(`${subgroupName} ${rangeIdx + 1}`) || `range_${rangeIdx + 1}`;
    return `${baseName}_${rangeLabel}.png`;
}

function getMultiRangeTitlesImageFilename() {
    const baseName = getTimezoneTableImageFilename();
    const titleLabel = sanitizeFilenamePart(sanitizeMultiSubgroupName(getCurrentMultiSubgroupName(), "subgroup")) || "range";
    return `${baseName}_${titleLabel}_titles.png`;
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

function cloneMultiRangeBlockForImageExport(blockEl) {
    const clone = blockEl.cloneNode(true);
    const srcInputs = blockEl.querySelectorAll(".time-input");
    const clonedInputs = clone.querySelectorAll(".time-input");

    clonedInputs.forEach((inputEl, idx) => {
        const span = document.createElement("span");
        span.className = "export-time-text";
        span.textContent = srcInputs[idx]?.value || "";
        inputEl.replaceWith(span);
    });

    clone.classList.remove("collapsed");
    clone.querySelectorAll(".multi-range-header-actions, .multi-range-adjust-row, .export-exclude, .move-col, .move-cell").forEach((node) => node.remove());
    return clone;
}

function cloneMultiRangesForImageExport(containerEl) {
    const wrapper = document.createElement("div");
    wrapper.className = "multi-ranges-container";
    const blocks = [...containerEl.querySelectorAll(".multi-range-block")];
    blocks.forEach((blockEl) => {
        wrapper.appendChild(cloneMultiRangeBlockForImageExport(blockEl));
    });
    return wrapper;
}

async function renderElementWithForeignObjectToPngDataUrl(renderElement) {
    if (!renderElement) throw new Error("Render element not found");

    const measureHost = document.createElement("div");
    measureHost.style.position = "fixed";
    measureHost.style.left = "-100000px";
    measureHost.style.top = "0";
    measureHost.style.opacity = "0";
    measureHost.style.pointerEvents = "none";
    measureHost.style.width = "auto";
    measureHost.style.height = "auto";
    measureHost.appendChild(renderElement);
    document.body.appendChild(measureHost);

    const rect = renderElement.getBoundingClientRect();
    const width = Math.max(1, Math.ceil(rect.width));
    const height = Math.max(1, Math.ceil(rect.height));
    const targetWidth = TABLE_IMAGE_EXPORT_WIDTH;
    const targetHeight = Math.max(1, Math.round((height * targetWidth) / width));
    const markup = new XMLSerializer().serializeToString(renderElement);
    measureHost.remove();

    const cssText = collectDocumentCssText();
    const extraCss = `
        .data-table th { position: static !important; }
        .data-table th,
        .data-table td,
        .multi-range-title {
            font-family: ${EXPORT_MONO_FONT_FAMILY} !important;
            font-variant-numeric: tabular-nums;
            font-feature-settings: "tnum" 1;
        }
        .export-time-text {
            display: inline-block;
            width: var(--input-w);
            font-family: ${EXPORT_MONO_FONT_FAMILY};
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
                    ${markup}
                </div>
            </foreignObject>
        </svg>
    `;

    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
        await waitForDocumentFontsReady();
        const img = await loadImageElement(svgUrl);
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");
        ctx.fillStyle = getComputedStyle(document.body).backgroundColor || "#0f172a";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        return canvas.toDataURL("image/png");
    } finally {
        URL.revokeObjectURL(svgUrl);
    }
}

function loadImageElement(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

async function waitForDocumentFontsReady() {
    if (!document.fonts?.ready) return;
    try {
        await document.fonts.ready;
    } catch (_) {
        // Ignore font readiness failures and continue with fallback rendering.
    }
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
    const exportTimeText = cell.querySelector(".export-time-text");
    if (timeInput) {
        const dnText = (cell.querySelector(".dn-icon")?.textContent || "").trim();
        const dayBadge = cell.querySelector(".day-badge");
        const timeText = (timeInput.value || "").trim();
        const dayText = (dayBadge?.textContent || "").trim();
        return [dnText, timeText, dayText].filter(Boolean).join(" ").trim();
    }
    if (exportTimeText) {
        const dnText = (cell.querySelector(".dn-icon")?.textContent || "").trim();
        const dayBadge = cell.querySelector(".day-badge");
        const timeText = (exportTimeText.textContent || "").trim();
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

async function renderTimezoneTableFallbackDataUrl() {
    await waitForDocumentFontsReady();

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

    const exportBodyFont = `13px ${EXPORT_MONO_FONT_FAMILY}`;
    const exportHeaderFont = `600 13px ${EXPORT_MONO_FONT_FAMILY}`;
    const drawCellText = (text, x, y, w, h, align = "left", color = textColor, font = exportBodyFont) => {
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
        drawCellText(headText, x, y, w, headerHeight, isCenterHeader(c) ? "center" : "left", dimColor, exportHeaderFont);
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
            drawCellText(text, rowX, y, w, h, center ? "center" : "left", textColor, exportBodyFont);
            rowX += w;
        }
        y += h;
    });

    return canvas.toDataURL("image/png");
}

async function renderTimezoneTableToPngDataUrl() {
    const tableEl = document.querySelector("#timezone-section .data-table");
    if (!tableEl) throw new Error("Table element not found");
    return renderElementWithForeignObjectToPngDataUrl(cloneTableForImageExport(tableEl));
}

async function renderMultiRangesFallbackDataUrl(targetRangeIdx = null) {
    await waitForDocumentFontsReady();

    const containerEl = document.getElementById("multi-ranges-container");
    if (!containerEl) throw new Error("Multi-range container not found");

    const sourceBlocks = [...containerEl.querySelectorAll(".multi-range-block")];
    const selectedBlocks = Number.isInteger(targetRangeIdx)
        ? (sourceBlocks[targetRangeIdx] ? [sourceBlocks[targetRangeIdx]] : [])
        : sourceBlocks;
    if (!selectedBlocks.length) throw new Error("No multi-range table data to render");

    const clonedContainer = document.createElement("div");
    clonedContainer.className = "multi-ranges-container";
    selectedBlocks.forEach((blockEl) => {
        clonedContainer.appendChild(cloneMultiRangeBlockForImageExport(blockEl));
    });

    const measureHost = document.createElement("div");
    measureHost.style.position = "fixed";
    measureHost.style.left = "-100000px";
    measureHost.style.top = "0";
    measureHost.style.opacity = "0";
    measureHost.style.pointerEvents = "none";
    measureHost.style.width = "auto";
    measureHost.style.height = "auto";
    measureHost.appendChild(clonedContainer);
    document.body.appendChild(measureHost);

    const metrics = [];
    try {
        const blockEls = [...clonedContainer.querySelectorAll(".multi-range-block")];
        blockEls.forEach((block) => {
            const titleText = (block.querySelector(".multi-range-title")?.textContent || "").trim();
            const tableEl = block.querySelector(".data-table");
            if (!tableEl) return;

            const headerCells = [...tableEl.querySelectorAll("thead th")]
                .filter((th) => !th.classList.contains("export-exclude") && !th.classList.contains("move-col"));
            const bodyRows = [...tableEl.querySelectorAll("tbody tr.time-row")];
            if (!headerCells.length || !bodyRows.length) return;

            const colWidths = headerCells.map((th) => Math.max(Math.ceil(th.getBoundingClientRect().width), 70));
            const tableWidth = colWidths.reduce((acc, w) => acc + w, 0);
            const headerHeight = Math.max(34, Math.ceil(headerCells[0].getBoundingClientRect().height) || 40);
            const rowHeights = bodyRows.map((row) => Math.max(34, Math.ceil(row.getBoundingClientRect().height) || 40));
            const tableHeight = headerHeight + rowHeights.reduce((acc, h) => acc + h, 0);

            metrics.push({
                titleText,
                headerCells,
                bodyRows,
                colWidths,
                headerHeight,
                rowHeights,
                tableWidth,
                tableHeight
            });
        });
    } finally {
        measureHost.remove();
    }

    if (!metrics.length) throw new Error("No multi-range table data to render");

    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const pageBg = bodyStyle.backgroundColor || "#0f172a";
    const headBg = (rootStyle.getPropertyValue("--table-head-bg") || "#1e293b").trim();
    const borderColor = (rootStyle.getPropertyValue("--border") || "rgba(148,163,184,0.25)").trim();
    const textColor = (rootStyle.getPropertyValue("--text") || "#f1f5f9").trim();
    const dimColor = (rootStyle.getPropertyValue("--text-dim") || "#94a3b8").trim();
    const accentColor = (rootStyle.getPropertyValue("--accent") || "#38bdf8").trim();
    const rowBgA = "rgba(255,255,255,0.02)";
    const rowBgB = "rgba(255,255,255,0.04)";
    const titleBg = "rgba(56, 189, 248, 0.10)";
    const blockGap = 14;
    const titleHeight = 38;
    const maxTableWidth = Math.max(...metrics.map((metric) => metric.tableWidth));
    const sourceWidth = Math.max(1, maxTableWidth);
    const sourceHeight = metrics.reduce((sum, metric, idx) => (
        sum + titleHeight + metric.tableHeight + (idx < metrics.length - 1 ? blockGap : 0)
    ), 0);
    const targetWidth = TABLE_IMAGE_EXPORT_WIDTH;
    const renderRatio = targetWidth / sourceWidth;
    const targetHeight = Math.max(1, Math.round(sourceHeight * renderRatio));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.scale(renderRatio, renderRatio);

    ctx.fillStyle = pageBg;
    ctx.fillRect(0, 0, sourceWidth, sourceHeight);

    const exportBodyFont = `13px ${EXPORT_MONO_FONT_FAMILY}`;
    const exportHeaderFont = `600 13px ${EXPORT_MONO_FONT_FAMILY}`;
    const exportTitleFont = `700 16px ${EXPORT_MONO_FONT_FAMILY}`;
    const drawCellText = (text, x, y, w, h, align = "left", color = textColor, font = exportBodyFont) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 2, y + 1, Math.max(0, w - 4), Math.max(0, h - 2));
        ctx.clip();
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

    const isCenterBodyCell = (cell) => {
        if (!cell) return false;
        if (
            cell.classList.contains("timezone-cell") ||
            cell.classList.contains("period-days-cell") ||
            cell.classList.contains("period-time-cell")
        ) {
            return true;
        }
        return !!cell.querySelector(".offset-text");
    };

    let y = 0;
    metrics.forEach((metric, metricIdx) => {
        const titleText = metric.titleText || `${t("default_subgroup_name")} ${metricIdx + 1}`;
        ctx.fillStyle = titleBg;
        ctx.fillRect(0, y, sourceWidth, titleHeight);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y + titleHeight - 0.5);
        ctx.lineTo(sourceWidth, y + titleHeight - 0.5);
        ctx.stroke();
        drawCellText(titleText, 0, y, sourceWidth, titleHeight, "left", accentColor, exportTitleFont);
        y += titleHeight;

        ctx.fillStyle = headBg;
        ctx.fillRect(0, y, metric.tableWidth, metric.headerHeight);
        ctx.beginPath();
        ctx.moveTo(0, y + metric.headerHeight - 0.5);
        ctx.lineTo(metric.tableWidth, y + metric.headerHeight - 0.5);
        ctx.stroke();

        let x = 0;
        for (let c = 0; c < metric.colWidths.length; c++) {
            const w = metric.colWidths[c];
            const headText = (metric.headerCells[c].textContent || "").trim();
            drawCellText(headText, x, y, w, metric.headerHeight, "center", dimColor, exportHeaderFont);
            if (c < metric.colWidths.length - 1) {
                ctx.beginPath();
                ctx.moveTo(x + w - 0.5, y);
                ctx.lineTo(x + w - 0.5, y + metric.tableHeight);
                ctx.stroke();
            }
            x += w;
        }

        let rowY = y + metric.headerHeight;
        metric.bodyRows.forEach((row, rowIdx) => {
            const h = metric.rowHeights[rowIdx];
            ctx.fillStyle = rowIdx % 2 === 0 ? rowBgA : rowBgB;
            ctx.fillRect(0, rowY, metric.tableWidth, h);
            ctx.beginPath();
            ctx.moveTo(0, rowY + h - 0.5);
            ctx.lineTo(metric.tableWidth, rowY + h - 0.5);
            ctx.stroke();

            let rowX = 0;
            const cells = [...row.children]
                .filter((td) => !td.classList.contains("export-exclude") && !td.classList.contains("move-cell"));
            for (let c = 0; c < metric.colWidths.length; c++) {
                const w = metric.colWidths[c];
                const cell = cells[c];
                const text = extractTableCellText(cell);
                const center = isCenterBodyCell(cell);
                drawCellText(text, rowX, rowY, w, h, center ? "center" : "left", textColor, exportBodyFont);
                rowX += w;
            }
            rowY += h;
        });

        y += metric.tableHeight;
        if (metricIdx < metrics.length - 1) y += blockGap;
    });

    return canvas.toDataURL("image/png");
}

async function renderMultiRangesToPngDataUrl(targetRangeIdx = null) {
    const containerEl = document.getElementById("multi-ranges-container");
    if (!containerEl) throw new Error("Multi-range container not found");
    if (Number.isInteger(targetRangeIdx)) {
        const blockEls = [...containerEl.querySelectorAll(".multi-range-block")];
        const targetBlock = blockEls[targetRangeIdx];
        if (!targetBlock) throw new Error("Multi-range block not found");
        return renderElementWithForeignObjectToPngDataUrl(cloneMultiRangeBlockForImageExport(targetBlock));
    }
    return renderElementWithForeignObjectToPngDataUrl(cloneMultiRangesForImageExport(containerEl));
}

async function renderMultiRangeTitlesToPngDataUrl() {
    await waitForDocumentFontsReady();

    ensureMultiRangeState();
    const baseRef = getBaseTimezoneRef();
    const titles = multiRanges.map((range, rangeIdx) => getMultiRangeTitleText(rangeIdx, range, baseRef));
    if (!titles.length) throw new Error("No multi-range title data to render");

    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const pageBg = bodyStyle.backgroundColor || "#0f172a";
    const borderColor = (rootStyle.getPropertyValue("--border") || "rgba(148,163,184,0.25)").trim();
    const accentColor = (rootStyle.getPropertyValue("--accent") || "#38bdf8").trim();
    const titleFont = `700 16px ${EXPORT_MONO_FONT_FAMILY}`;
    const sidePadding = 16;
    const topBottomPadding = 12;
    const rowHeight = 40;
    const rowGap = 8;

    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d");
    let maxTextWidth = 0;
    if (measureCtx) {
        measureCtx.font = titleFont;
        titles.forEach((titleText) => {
            maxTextWidth = Math.max(maxTextWidth, Math.ceil(measureCtx.measureText(titleText).width));
        });
    }

    const sourceWidth = Math.max(640, maxTextWidth + (sidePadding * 2));
    const contentHeight = (titles.length * rowHeight) + (Math.max(0, titles.length - 1) * rowGap);
    const sourceHeight = contentHeight + (topBottomPadding * 2);
    const targetWidth = TABLE_IMAGE_EXPORT_WIDTH;
    const renderRatio = targetWidth / sourceWidth;
    const targetHeight = Math.max(1, Math.round(sourceHeight * renderRatio));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.scale(renderRatio, renderRatio);

    ctx.fillStyle = pageBg;
    ctx.fillRect(0, 0, sourceWidth, sourceHeight);

    let y = topBottomPadding;
    titles.forEach((titleText, idx) => {
        const rowBg = idx % 2 === 0 ? "rgba(56, 189, 248, 0.12)" : "rgba(56, 189, 248, 0.08)";
        const resolvedTitle = (titleText || "").trim() || `${t("default_subgroup_name")} ${idx + 1}`;

        ctx.fillStyle = rowBg;
        ctx.fillRect(0, y, sourceWidth, rowHeight);

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, y + 0.5, Math.max(1, sourceWidth - 1), Math.max(1, rowHeight - 1));

        ctx.fillStyle = accentColor;
        ctx.font = titleFont;
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText(resolvedTitle, sidePadding, y + (rowHeight / 2));

        y += rowHeight + rowGap;
    });

    return canvas.toDataURL("image/png");
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

async function saveMultiRangeTitlesImage() {
    try {
        if (!isMultiTab()) return;
        ensureMultiRangeState();
        const dataUrl = await renderMultiRangeTitlesToPngDataUrl();
        await downloadDataUrl(dataUrl, getMultiRangeTitlesImageFilename());
        showToast(t("toast_table_image_saved"));
    } catch (err) {
        console.error("Failed to save multi-range titles image:", err);
        showToast(t("toast_table_image_failed"));
    }
}

async function saveMultiRangeImagesByRange() {
    try {
        ensureMultiRangeState();
        const supportsPrimaryRenderer = await detectForeignObjectRendererSupport();
        let usePrimaryRenderer = supportsPrimaryRenderer;

        for (let rangeIdx = 0; rangeIdx < multiRanges.length; rangeIdx++) {
            let dataUrl = "";
            if (usePrimaryRenderer) {
                try {
                    dataUrl = await renderMultiRangesToPngDataUrl(rangeIdx);
                } catch (primaryErr) {
                    if (isDomExceptionLike(primaryErr)) {
                        canUseForeignObjectRenderer = false;
                        usePrimaryRenderer = false;
                    }
                    dataUrl = await renderMultiRangesFallbackDataUrl(rangeIdx);
                }
            } else {
                dataUrl = await renderMultiRangesFallbackDataUrl(rangeIdx);
            }
            await downloadDataUrl(dataUrl, getMultiRangeTableImageFilename(rangeIdx));
        }

        showToast(t("toast_table_image_saved"));
    } catch (err) {
        console.error("Failed to save multi-range images by range:", err);
        showToast(t("toast_table_image_failed"));
    }
}

async function saveTimezoneTableImage() {
    if (isMultiTab()) {
        await saveMultiRangeImagesByRange();
        return;
    }

    try {
        const supportsPrimaryRenderer = await detectForeignObjectRendererSupport();
        let dataUrl = "";
        if (supportsPrimaryRenderer) {
            try {
                dataUrl = await renderTimezoneTableToPngDataUrl();
            } catch (primaryErr) {
                if (isDomExceptionLike(primaryErr)) {
                    canUseForeignObjectRenderer = false;
                }
                dataUrl = await renderTimezoneTableFallbackDataUrl();
            }
        } else {
            dataUrl = await renderTimezoneTableFallbackDataUrl();
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
    const periodSwapBtn = document.getElementById("period-swap-btn");
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
    if (periodSwapBtn) {
        periodSwapBtn.onclick = () => {
            const startValue = pS.value;
            pS.value = pE.value;
            pE.value = startValue;
            calc();
        };
    }
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
    syncCurrentMultiStateToActiveSubgroup();
    if (currentMainTab === "live" || currentMainTab === "fixed") {
        activeGroupIdByMainTab[currentMainTab] = activeGroupId;
    }
    normalizeGroupTabState();
    ensureMultiRangeState();
    groups.forEach((group) => ensureGroupMultiSubgroups(group));

    return {
        groups,
        activeGroupId,
        currentMainTab,
        activeGroupIdByMainTab,
        slotCount,
        baseTimezoneId: getCurrentGroupBaseTimezoneId(),
        showTimeAdjust,
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
        ],
        multiRangeCount: sanitizeMultiRangeCount(multiRangeCount),
        multiRangeTitle: sanitizeMultiRangeTitle(getCurrentMultiSubgroupName()),
        multiRanges: multiRanges.map((range) => ({
            startUtcMs: sanitizeUtcMs(range.startUtcMs, Date.now()),
            endUtcMs: sanitizeUtcMs(range.endUtcMs, Date.now())
        })),
        multiRangeCollapsed: multiRangeCollapsed.map((flag) => !!flag),
        multiRangeStartEditEnabled: multiRangeStartEditEnabled.map((flag) => !!flag),
        multiRangeEndEditEnabled: multiRangeEndEditEnabled.map((flag) => !!flag)
    };
}

function getSettingsExportFileName() {
    const now = new Date();
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    return `GlobalTimeViewer_settings_${stamp}.json`;
}

function getGroupExportFileName(groupName = "") {
    const now = new Date();
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const safeName = sanitizeFilenamePart(groupName || "") || "group";
    return `GlobalTimeViewer_group_${safeName}_${stamp}.json`;
}

function getSubgroupExportFileName(groupName = "", subgroupName = "") {
    const now = new Date();
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const safeGroupName = sanitizeFilenamePart(groupName || "") || "group";
    const safeSubgroupName = sanitizeFilenamePart(subgroupName || "") || "subgroup";
    return `GlobalTimeViewer_subgroup_${safeGroupName}_${safeSubgroupName}_${stamp}.json`;
}

function isValidGroupImportSource(source) {
    if (!source || typeof source !== "object") return false;
    if (typeof source.name !== "string" || !source.name.trim()) return false;
    if (!Array.isArray(source.zones)) return false;
    return true;
}

function isValidSubgroupImportSource(source) {
    if (!source || typeof source !== "object") return false;
    if (typeof source.name !== "string" || !source.name.trim()) return false;
    if (!Array.isArray(source.multiRanges) || !source.multiRanges.length) return false;
    const count = parseInt(source.multiRangeCount, 10);
    if (!Number.isFinite(count) || count < MIN_MULTI_RANGE_COUNT) return false;
    return true;
}

function exportGroupToJSON(groupIdx = activeGroupId) {
    if (!groups.length) return;
    try {
        syncCurrentMultiStateToActiveSubgroup();
        const safeIdx = Math.min(Math.max(parseInt(groupIdx, 10) || 0, 0), groups.length - 1);
        const sourceGroup = groups[safeIdx];
        if (!sourceGroup) return;
        ensureGroupMultiSubgroups(sourceGroup);

        const groupPayload = {
            name: sourceGroup.name,
            zones: sourceGroup.zones,
            baseTimezoneId: sourceGroup.baseTimezoneId,
            showUtcRow: sourceGroup.showUtcRow,
            utcRowOrder: sourceGroup.utcRowOrder,
            activeMultiSubgroupId: sourceGroup.activeMultiSubgroupId,
            multiSubgroups: sourceGroup.multiSubgroups
        };
        const fileName = getGroupExportFileName(sourceGroup.name);
        const exportPayload = {
            app: "GlobalTimeViewer",
            type: "group",
            formatVersion: 1,
            version: VERSION,
            exportedAt: new Date().toISOString(),
            group: JSON.parse(JSON.stringify(groupPayload))
        };

        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        showToast(tFormat("toast_group_export_success", { filename: fileName }));
    } catch (err) {
        console.error("exportGroupToJSON failed:", err);
        showToast(t("toast_group_export_failed"));
    }
}

function triggerGroupImportFor(groupIdx = activeGroupId) {
    if (!groups.length) return;
    const safeIdx = Math.min(Math.max(parseInt(groupIdx, 10) || 0, 0), groups.length - 1);
    pendingGroupImportIndex = safeIdx;
    const groupImportFile = document.getElementById("group-import-file");
    if (!groupImportFile) return;
    groupImportFile.value = "";
    groupImportFile.click();
}

function applyImportedGroupSettings(importedRoot, targetGroupIdx = activeGroupId) {
    if (!groups.length) return;
    const rootType = (importedRoot && typeof importedRoot === "object" && typeof importedRoot.type === "string")
        ? importedRoot.type.trim().toLowerCase()
        : "";
    if (rootType && rootType !== "group") {
        throw new Error("Invalid group payload type");
    }
    const source = (importedRoot && typeof importedRoot === "object" && importedRoot.group && typeof importedRoot.group === "object")
        ? importedRoot.group
        : importedRoot;
    if (!isValidGroupImportSource(source)) {
        throw new Error("Invalid group payload");
    }

    const safeIdx = Math.min(Math.max(parseInt(targetGroupIdx, 10) || 0, 0), groups.length - 1);
    const sanitized = sanitizeGroup(source, safeIdx, null);
    if (!sanitized) {
        throw new Error("Invalid group payload");
    }
    ensureGroupMultiSubgroups(sanitized);
    syncCurrentMultiStateToActiveSubgroup();
    groups[safeIdx] = sanitized;

    if (activeGroupId === safeIdx) {
        loadCurrentMultiStateFromActiveSubgroup();
    }
    savePersistence();
    renderGroups();
    renderMultiSubgroups();
    if (isMultiTab()) {
        renderBaseTimeSelect();
        renderMultiRanges();
    }
    else {
        renderList();
    }
}

async function handleGroupImportFile(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) return;

    try {
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        applyImportedGroupSettings(parsed, pendingGroupImportIndex ?? activeGroupId);
        showToast(tFormat("toast_group_import_success", { filename: file.name || getGroupExportFileName("group") }));
    } catch (err) {
        console.error("handleGroupImportFile failed:", err);
        showToast(t("toast_group_import_failed"));
    } finally {
        pendingGroupImportIndex = null;
        if (input) input.value = "";
    }
}

function exportSubgroupToJSON(groupIdx = activeGroupId, subgroupId = "") {
    if (!groups.length) return;
    try {
        syncCurrentMultiStateToActiveSubgroup();
        const safeGroupIdx = Math.min(Math.max(parseInt(groupIdx, 10) || 0, 0), groups.length - 1);
        const sourceGroup = groups[safeGroupIdx];
        if (!sourceGroup) return;
        ensureGroupMultiSubgroups(sourceGroup);

        const targetSubgroupId = sanitizeMultiSubgroupId(subgroupId) || sourceGroup.activeMultiSubgroupId;
        const sourceSubgroup = sourceGroup.multiSubgroups.find((item) => item.id === targetSubgroupId) || sourceGroup.multiSubgroups[0];
        if (!sourceSubgroup) return;

        const subgroupPayload = {
            name: sourceSubgroup.name,
            multiRangeCount: sourceSubgroup.multiRangeCount,
            multiRanges: sourceSubgroup.multiRanges,
            multiRangeCollapsed: sourceSubgroup.multiRangeCollapsed,
            multiRangeStartEditEnabled: sourceSubgroup.multiRangeStartEditEnabled,
            multiRangeEndEditEnabled: sourceSubgroup.multiRangeEndEditEnabled
        };
        const fileName = getSubgroupExportFileName(sourceGroup.name, sourceSubgroup.name);
        const exportPayload = {
            app: "GlobalTimeViewer",
            type: "subgroup",
            formatVersion: 1,
            version: VERSION,
            exportedAt: new Date().toISOString(),
            groupName: sourceGroup.name,
            subgroup: JSON.parse(JSON.stringify(subgroupPayload))
        };

        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        showToast(tFormat("toast_subgroup_export_success", { filename: fileName }));
    } catch (err) {
        console.error("exportSubgroupToJSON failed:", err);
        showToast(t("toast_subgroup_export_failed"));
    }
}

function triggerSubgroupImportFor(groupIdx = activeGroupId, subgroupId = "") {
    if (!groups.length) return;
    const safeGroupIdx = Math.min(Math.max(parseInt(groupIdx, 10) || 0, 0), groups.length - 1);
    const group = groups[safeGroupIdx];
    if (!group) return;
    ensureGroupMultiSubgroups(group);
    const targetSubgroupId = sanitizeMultiSubgroupId(subgroupId) || group.activeMultiSubgroupId;
    const exists = group.multiSubgroups.some((item) => item.id === targetSubgroupId);
    if (!exists) return;

    pendingSubgroupImportTarget = { groupIdx: safeGroupIdx, subgroupId: targetSubgroupId };
    const subgroupImportFile = document.getElementById("subgroup-import-file");
    if (!subgroupImportFile) return;
    subgroupImportFile.value = "";
    subgroupImportFile.click();
}

function applyImportedSubgroupSettings(importedRoot, targetGroupIdx = activeGroupId, targetSubgroupId = "") {
    if (!groups.length) return;
    const rootType = (importedRoot && typeof importedRoot === "object" && typeof importedRoot.type === "string")
        ? importedRoot.type.trim().toLowerCase()
        : "";
    if (rootType && rootType !== "subgroup") {
        throw new Error("Invalid subgroup payload type");
    }
    const source = (importedRoot && typeof importedRoot === "object" && importedRoot.subgroup && typeof importedRoot.subgroup === "object")
        ? importedRoot.subgroup
        : importedRoot;
    if (!isValidSubgroupImportSource(source)) {
        throw new Error("Invalid subgroup payload");
    }

    const safeGroupIdx = Math.min(Math.max(parseInt(targetGroupIdx, 10) || 0, 0), groups.length - 1);
    const targetGroup = groups[safeGroupIdx];
    if (!targetGroup) {
        throw new Error("Invalid subgroup target group");
    }
    ensureGroupMultiSubgroups(targetGroup);
    const normalizedSubgroupId = sanitizeMultiSubgroupId(targetSubgroupId) || targetGroup.activeMultiSubgroupId;
    const targetSubgroup = targetGroup.multiSubgroups.find((item) => item.id === normalizedSubgroupId);
    if (!targetSubgroup) {
        throw new Error("Invalid subgroup target");
    }

    const normalizedState = sanitizeMultiStatePayload(source, null);
    syncCurrentMultiStateToActiveSubgroup();
    targetSubgroup.name = sanitizeMultiSubgroupName(source.name, targetSubgroup.name || getDefaultMultiSubgroupName(0));
    targetSubgroup.multiRangeCount = normalizedState.multiRangeCount;
    targetSubgroup.multiRanges = normalizedState.multiRanges;
    targetSubgroup.multiRangeCollapsed = normalizedState.multiRangeCollapsed;
    targetSubgroup.multiRangeStartEditEnabled = normalizedState.multiRangeStartEditEnabled;
    targetSubgroup.multiRangeEndEditEnabled = normalizedState.multiRangeEndEditEnabled;

    if (activeGroupId === safeGroupIdx && targetGroup.activeMultiSubgroupId === targetSubgroup.id) {
        loadCurrentMultiStateFromActiveSubgroup();
    }
    savePersistence();
    renderGroups();
    renderMultiSubgroups();
    if (isMultiTab()) {
        renderBaseTimeSelect();
        renderMultiRanges();
    }
    else {
        renderList();
    }
}

async function handleSubgroupImportFile(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) return;

    try {
        const raw = await file.text();
        const parsed = JSON.parse(raw);
        const target = pendingSubgroupImportTarget || { groupIdx: activeGroupId, subgroupId: getCurrentMultiSubgroup()?.id || "" };
        applyImportedSubgroupSettings(parsed, target.groupIdx, target.subgroupId);
        showToast(tFormat("toast_subgroup_import_success", { filename: file.name || getSubgroupExportFileName("group", "subgroup") }));
    } catch (err) {
        console.error("handleSubgroupImportFile failed:", err);
        showToast(t("toast_subgroup_import_failed"));
    } finally {
        pendingSubgroupImportTarget = null;
        if (input) input.value = "";
    }
}

function exportSettingsToJSON() {
    try {
        const fileName = getSettingsExportFileName();
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
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        showToast(tFormat("toast_settings_export_success", { filename: fileName }));
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

    const writeResult = persistStorageSnapshot(payload, { suppressToast: true });
    if (!writeResult.ok) {
        const persistErr = new Error("Failed to persist imported settings payload");
        persistErr.code = "PERSISTENCE_WRITE_FAILED";
        persistErr.cause = writeResult.error;
        throw persistErr;
    }

    const pref = (importedRoot && typeof importedRoot === "object" && importedRoot.preferences && typeof importedRoot.preferences === "object")
        ? importedRoot.preferences
        : importedRoot;

    if (pref && typeof pref === "object") {
        if (typeof pref.theme === "string") {
            setLocalStorageValue(THEME_STORAGE_KEY, sanitizeTheme(pref.theme), { suppressToast: true });
        }
        if (typeof pref.language === "string" && I18N_DATA[pref.language]) {
            setLocalStorageValue(LANG_STORAGE_KEY, pref.language, { suppressToast: true });
        }
        if (pref.uiScale !== undefined) {
            setLocalStorageValue(UI_SCALE_STORAGE_KEY, String(sanitizeUiScalePercent(pref.uiScale)), { suppressToast: true });
        }
    }

    const nextLang = localStorage.getItem(LANG_STORAGE_KEY) || "ko";
    currentLang = I18N_DATA[nextLang] ? nextLang : "ko";
    loadPersistence();
    if (localizeAutoGeneratedNamesForCurrentLanguage()) {
        savePersistence();
    }
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
    refreshMultiRangeControls();

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
        showToast(tFormat("toast_settings_import_success", { filename: file.name || getSettingsExportFileName() }));
    } catch (err) {
        console.error("handleSettingsImportFile failed:", err);
        const cause = (err && typeof err === "object" && err.code === "PERSISTENCE_WRITE_FAILED") ? err.cause : err;
        if (isQuotaExceededError(cause)) {
            showToast(t("toast_storage_quota_exceeded"));
        } else if (err && typeof err === "object" && err.code === "PERSISTENCE_WRITE_FAILED") {
            showToast(t("toast_storage_save_failed"));
        } else {
            showToast(t("toast_settings_import_failed"));
        }
    } finally {
        if (input) input.value = "";
    }
}

function savePersistence(options = {}) {
    const snapshot = getPersistenceSnapshot();
    const result = persistStorageSnapshot(snapshot, options);
    return result.ok;
}

function resetAllSettings() {
    if (!confirm(t("confirm_reset_all_settings"))) return;

    const keysToRemove = [STORAGE_KEY, THEME_STORAGE_KEY, LANG_STORAGE_KEY, UI_SCALE_STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    location.reload();
}

function resetExceptGroupsAndTimezones() {
    if (!confirm(t("confirm_reset_except_group_tz"))) return;

    syncCurrentMultiStateToActiveSubgroup();
    const preservedGroups = groups.map((group, idx) => sanitizeGroup({
        name: group?.name,
        zones: group?.zones,
        baseTimezoneId: group?.baseTimezoneId,
        showUtcRow: group?.showUtcRow,
        utcRowOrder: group?.utcRowOrder
    }, idx, null)).filter(Boolean);

    groups = preservedGroups.length ? preservedGroups : getDefaultGroups();
    groups.forEach((group) => ensureGroupMultiSubgroups(group));

    activeGroupId = 0;
    currentMainTab = "live";
    activeGroupIdByMainTab = { live: 0, fixed: 0 };
    slotCount = 1;
    showTimeAdjust = true;
    showCopyFormat = false;
    timeAdjustDayStepBySlot = [DEFAULT_TIME_ADJUST_DAY_STEP, DEFAULT_TIME_ADJUST_DAY_STEP];
    displayFormatOrder = [...COPY_FORMAT_KEYS];
    displayFormatEnabled = sanitizeCopyFormatEnabled(null, "display");
    displayTimePartsEnabled = sanitizeTimePartsEnabled(null, "display");
    copyFormatOrder = [...COPY_FORMAT_KEYS];
    copyFormatEnabled = sanitizeCopyFormatEnabled(null, "copy");
    copyTimePartsEnabled = sanitizeTimePartsEnabled(null, "copy");
    multiRangeCount = MIN_MULTI_RANGE_COUNT;
    multiRangeTitle = t("placeholder_range_title");
    multiRanges = [];
    multiRangeCollapsed = [];
    multiRangeStartEditEnabled = [];
    multiRangeEndEditEnabled = [];
    loadCurrentMultiStateFromActiveSubgroup();
    isRealtime = true;

    const keysToRemove = [THEME_STORAGE_KEY, LANG_STORAGE_KEY, UI_SCALE_STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(STORAGE_KEY);

    currentTheme = loadThemePreference();
    const nextLang = localStorage.getItem(LANG_STORAGE_KEY) || "ko";
    currentLang = I18N_DATA[nextLang] ? nextLang : "ko";
    applyTheme(currentTheme, false);
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

    refreshMultiRangeControls();
    updateTZDropdown();
    refreshSelectWidths();
    switchMainTab("live");
    savePersistence();
}

function getDefaultGroups() {
    const defaultGroup = {
        name: t("default_group_name"),
        zones: [],
        baseTimezoneId: "utc",
        showUtcRow: true,
        utcRowOrder: 0
    };
    ensureGroupMultiSubgroups(defaultGroup);
    return [defaultGroup];
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
    const fixedOffsetRaw = Number(zone.fixedOffsetMinutes);
    const fixedOffsetMinutes = Number.isFinite(fixedOffsetRaw)
        ? Math.min(14 * 60, Math.max(-14 * 60, Math.trunc(fixedOffsetRaw)))
        : null;
    const fixedAbbr = normalizeZoneAbbreviation(zone.fixedAbbr);
    return {
        id,
        type: "standard",
        zone: timeZoneName,
        name_ko: (typeof zone.name_ko === "string" && zone.name_ko.trim()) ? zone.name_ko : fallbackName,
        name_en: (typeof zone.name_en === "string" && zone.name_en.trim()) ? zone.name_en : fallbackName,
        fixedOffsetMinutes,
        fixedAbbr: fixedAbbr || ""
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

function sanitizeGroup(group, idx, legacyMultiState = null) {
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
    const rawMultiSubgroups = Array.isArray(group.multiSubgroups) ? group.multiSubgroups : [];
    const multiSubgroups = rawMultiSubgroups.map((subgroup) => ({
        id: sanitizeMultiSubgroupId(subgroup?.id),
        name: subgroup?.name,
        multiRangeCount: subgroup?.multiRangeCount,
        multiRanges: subgroup?.multiRanges,
        multiRangeCollapsed: subgroup?.multiRangeCollapsed,
        multiRangeStartEditEnabled: subgroup?.multiRangeStartEditEnabled,
        multiRangeEndEditEnabled: subgroup?.multiRangeEndEditEnabled
    }));
    const activeMultiSubgroupId = sanitizeMultiSubgroupId(group.activeMultiSubgroupId);
    const sanitizedGroup = {
        name,
        zones,
        baseTimezoneId: isBaseTimezoneValid ? requestedBaseTimezoneId : "utc",
        showUtcRow,
        utcRowOrder,
        activeMultiSubgroupId,
        multiSubgroups
    };
    const groupLegacyMultiState = (group.multiRanges || group.multiRangeCount || group.multiRangeCollapsed || group.multiRangeStartEditEnabled || group.multiRangeEndEditEnabled)
        ? {
            multiRangeCount: group.multiRangeCount,
            multiRanges: group.multiRanges,
            multiRangeCollapsed: group.multiRangeCollapsed,
            multiRangeStartEditEnabled: group.multiRangeStartEditEnabled,
            multiRangeEndEditEnabled: group.multiRangeEndEditEnabled,
            multiRangeTitle: group.multiRangeTitle
        }
        : null;
    ensureGroupMultiSubgroups(sanitizedGroup, { legacyMultiState: groupLegacyMultiState || legacyMultiState });
    return sanitizedGroup;
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
        showTimeAdjust = true;
        showCopyFormat = false;
        timeAdjustDayStepBySlot = [DEFAULT_TIME_ADJUST_DAY_STEP, DEFAULT_TIME_ADJUST_DAY_STEP];
        displayFormatOrder = [...COPY_FORMAT_KEYS];
        displayFormatEnabled = sanitizeCopyFormatEnabled(null, "display");
        displayTimePartsEnabled = sanitizeTimePartsEnabled(null, "display");
        copyFormatOrder = [...COPY_FORMAT_KEYS];
        copyFormatEnabled = sanitizeCopyFormatEnabled(null, "copy");
        copyTimePartsEnabled = sanitizeTimePartsEnabled(null, "copy");
        loadCurrentMultiStateFromActiveSubgroup();
        isRealtime = true;
        return;
    }

    try {
        const d = JSON.parse(s);
        const legacyGlobalMultiState = sanitizeMultiStatePayload({
            multiRangeCount: d?.multiRangeCount,
            multiRanges: d?.multiRanges,
            multiRangeCollapsed: d?.multiRangeCollapsed,
            multiRangeStartEditEnabled: d?.multiRangeStartEditEnabled,
            multiRangeEndEditEnabled: d?.multiRangeEndEditEnabled
        }, null);
        legacyGlobalMultiState.multiRangeTitle = sanitizeMultiRangeTitle(d?.multiRangeTitle);
        const parsedGroups = Array.isArray(d?.groups)
            ? d.groups.map((group, idx) => sanitizeGroup(group, idx, legacyGlobalMultiState)).filter(Boolean)
            : [];
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

        showTimeAdjust = true;
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
        multiRangeCount = MIN_MULTI_RANGE_COUNT;
        multiRangeTitle = t("placeholder_range_title");
        multiRanges = [];
        multiRangeCollapsed = [];
        multiRangeStartEditEnabled = [];
        multiRangeEndEditEnabled = [];
        normalizeGroupTabState();
        if (currentMainTab === "live" || currentMainTab === "fixed") {
            activeGroupId = activeGroupIdByMainTab[currentMainTab];
        }
        loadCurrentMultiStateFromActiveSubgroup();
        isRealtime = (currentMainTab === "live");
        ensureBaseTimezoneSelection();
    } catch (err) {
        console.warn("Failed to parse persisted data. Falling back to defaults.", err);
        groups = getDefaultGroups();
        activeGroupId = 0;
        currentMainTab = "live";
        activeGroupIdByMainTab = { live: 0, fixed: 0 };
        slotCount = 1;
        showTimeAdjust = true;
        showCopyFormat = false;
        timeAdjustDayStepBySlot = [DEFAULT_TIME_ADJUST_DAY_STEP, DEFAULT_TIME_ADJUST_DAY_STEP];
        displayFormatOrder = [...COPY_FORMAT_KEYS];
        displayFormatEnabled = sanitizeCopyFormatEnabled(null, "display");
        displayTimePartsEnabled = sanitizeTimePartsEnabled(null, "display");
        copyFormatOrder = [...COPY_FORMAT_KEYS];
        copyFormatEnabled = sanitizeCopyFormatEnabled(null, "copy");
        copyTimePartsEnabled = sanitizeTimePartsEnabled(null, "copy");
        loadCurrentMultiStateFromActiveSubgroup();
        isRealtime = true;
        savePersistence();
    }
}
