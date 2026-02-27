const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('main.js', 'utf8');

assert(html.includes('id="version-badge"'), 'version badge id should exist');
assert(html.includes('id="toggle-extra-time"'), 'extra time checkbox should exist');
assert(/추가 시간 표시/.test(html), 'extra time checkbox label should exist');
assert(/<title>세계 시간 v1\.5\.0<\/title>/.test(html), 'title should be 1.5.0');
assert(/style="width: 60px;">요일<\/th>\s*<th class="dynamic-col">시간<\/th>/.test(html), 'day column should be left of time column in base table');

assert(js.includes('const VERSION = "1.5.0"'), 'VERSION constant should be 1.5.0');
assert(js.includes('slotCount = e.target.checked ? 2 : 1;'), 'extra time should be limited to max 2 slots');
assert(js.includes("i === 0 ? '시간' : '추가 시간'"), 'second slot should be named 추가 시간');
assert(js.includes('function toCompactDateTime(iso)'), 'copy formatter helper should exist');
assert(js.includes("return `${zoneCode} ${times.join(' - ')}`;"), 'copy format should be [ZONE] time or [ZONE] time - time');

console.log('smoke-check passed');
