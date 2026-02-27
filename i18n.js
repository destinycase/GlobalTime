const I18N_DATA = {
    ko: {
        app_title: "세계 시간 v3.0.0",
        nav_live: "⏱️ 실시간 시간",
        nav_fixed: "📍 고정 시간",
        nav_calc: "📅 계산기 도구",
        status_sync: "동기화 중",
        status_fixed: "시간 고정 모드",
        label_add_tz: "타임존 추가",
        placeholder_search: "도시 검색...",
        placeholder_name: "이름",
        label_custom: "커스텀",
        label_extra_time: "추가 시간 표시",
        btn_copy_all: "📋 전체 복사",
        th_region: "지역 / 국가",
        th_utc_offset: "UTC Offset",
        th_time: "시간",
        th_day: "요일",
        th_action: "액션",
        th_time_day_main: "시간 / 요일",
        th_time_day_extra: "추가 시간 / 요일",
        utc_name: "표준시 (기준)",
        btn_add: "추가",
        btn_list: "📑 목록",
        calc_unit_title: "🔄 시간 단위 변환기",
        calc_period_title: "📅 기간 계산",
        calc_offset_title: "🚀 날짜 이동 계산",
        calc_label_day: "일 (Day)",
        calc_label_hour: "시 (Hour)",
        calc_label_min: "분 (Minute)",
        calc_label_sec: "초 (Second)",
        calc_label_start: "시작일",
        calc_label_end: "종료일",
        calc_label_base: "기준일",
        calc_label_result: "결과 날짜",
        calc_label_total_days: "총 일수",
        calc_label_after: "후",
        calc_unit_day: "일",
        calc_unit_week: "주",
        calc_unit_month: "월",
        option_popular: "인기 도시 선택...",
        overlay_select_tz: "타임존 선택",
        default_group_name: "기본 그룹",
        btn_rename: "변경",
        btn_delete: "삭제",
        unit_days_suffix: "일",
        tooltip_copy: "복사",
        tooltip_edit: "그룹 이름 변경",
        tooltip_delete: "그룹 삭제",
        dn_day: "낮 (06:00~18:00)",
        dn_night: "밤 (18:01~05:59)",
        days: ["일", "월", "화", "수", "목", "금", "토"],
        toast_copy_success: "복사되었습니다.",
        toast_copy_all_success: "전체 복사 완료",
        toast_invalid_date: "유효하지 않은 날짜 형식입니다.",
        toast_input_name: "이름을 입력하세요.",
        toast_group_deleted: "그룹이 삭제되었습니다.",
        toast_group_min: "최소 하나 이상의 그룹이 필요합니다.",
        toast_name_changed: "그룹 이름이 변경되었습니다.",
        confirm_delete_group: "정말로 이 그룹을 삭제하시겠습니까?",
        prompt_new_group: "새 그룹의 이름을 입력하세요:",
        prompt_rename_group: "그룹 이름 수정:"
    },
    en: {
        app_title: "Global Time v3.0.0",
        nav_live: "⏱️ Real-time",
        nav_fixed: "📍 Fixed Time",
        nav_calc: "📅 Calculator",
        status_sync: "Syncing",
        status_fixed: "Fixed Mode",
        label_add_tz: "Add Timezone",
        placeholder_search: "Search city...",
        placeholder_name: "Name",
        label_custom: "Custom",
        label_extra_time: "Show Extra Time",
        btn_copy_all: "📋 Copy All",
        th_region: "Region / Country",
        th_utc_offset: "UTC Offset",
        th_time: "Time",
        th_day: "Day",
        th_action: "Action",
        th_time_day_main: "Time / Day",
        th_time_day_extra: "Extra Time / Day",
        utc_name: "UTC (Base)",
        btn_add: "Add",
        btn_list: "📑 List",
        calc_unit_title: "🔄 Unit Converter",
        calc_period_title: "📅 Period Calc",
        calc_offset_title: "🚀 Date Offset",
        calc_label_day: "Day",
        calc_label_hour: "Hour",
        calc_label_min: "Minute",
        calc_label_sec: "Second",
        calc_label_start: "Start Date",
        calc_label_end: "End Date",
        calc_label_base: "Base Date",
        calc_label_result: "Result Date",
        calc_label_total_days: "Total Days",
        calc_label_after: "after",
        calc_unit_day: "Days",
        calc_unit_week: "Weeks",
        calc_unit_month: "Months",
        option_popular: "Select popular city...",
        overlay_select_tz: "Select Timezone",
        default_group_name: "Default Group",
        btn_rename: "Rename",
        btn_delete: "Delete",
        unit_days_suffix: " days",
        tooltip_copy: "Copy",
        tooltip_edit: "Rename Group",
        tooltip_delete: "Delete Group",
        dn_day: "Day (06:00~18:00)",
        dn_night: "Night (18:01~05:59)",
        days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        toast_copy_success: "Copied to clipboard.",
        toast_copy_all_success: "All copied.",
        toast_invalid_date: "Invalid date format.",
        toast_input_name: "Please enter a name.",
        toast_group_deleted: "Group deleted.",
        toast_group_min: "At least one group is required.",
        toast_name_changed: "Group name updated.",
        confirm_delete_group: "Are you sure you want to delete this group?",
        prompt_new_group: "Enter new group name:",
        prompt_rename_group: "Rename group to:"
    }
};

let currentLang = localStorage.getItem("GTV_Lang") || "ko";

function setLanguage(lang) {
    if (!I18N_DATA[lang]) return;
    currentLang = lang;
    localStorage.setItem("GTV_Lang", lang);
    applyTranslations();
}

function t(key) {
    return I18N_DATA[currentLang][key] || key;
}

function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        const translation = t(key);
        if (el.tagName === "INPUT" && (el.type === "text" || el.type === "number")) {
            el.placeholder = translation;
        } else if (el.tagName === "OPTION") {
            el.textContent = translation;
        } else {
            el.textContent = translation;
        }
    });

    // Update document title if applicable
    if (I18N_DATA[currentLang].app_title) {
        document.title = I18N_DATA[currentLang].app_title;
    }
}
