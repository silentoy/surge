const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const mod = fs.readFileSync(path.join(root, 'modules/paperclip-cookie.sgmodule'), 'utf8');
const lines = mod.split('\n').filter(l => l.includes(' = type=http-'));
assert.equal(lines.length, 31);
assert.equal(new Set(lines.map(l => l.split(' = ')[0])).size, 31);
assert(!mod.includes('request if'));
assert(mod.includes('hostname = %APPEND% '));
const rules = lines.map(l => ({
  line: l,
  regex: new RegExp(l.match(/pattern=\(\?i\)(.*?),requires-body=/)[1], 'i'),
}));
for (const url of [
  'https://client.app.coc.10086.cn/biz-orange/LN/uamonekeylogin/autoLogin',
  'https://client.app.coc.10086.cn/biz-orange/DN/uamrandcodelogin/autoLogin',
  'https://clientaccess.10086.cn/biz-orange/BN/scoreQueryService/getScoreQuery',
  'https://h5.bj.10086.cn/ActSignIn2023/doPrize',
]) {
  const matches = rules.filter(r => r.regex.test(url));
  assert.equal(matches.length, 1);
  assert(matches[0].line.includes('/cmcc/cmcc.js'));
  if (!url.includes('doPrize')) assert(matches[0].line.includes('requires-body=true'));
}
assert.equal(rules.filter(r => r.regex.test('https://example.com/')).length, 0);
console.log('PASS: 31 unique rules, CMCC matches and body capture');

async function capture(file, headers, url, initial = {}) {
  const data = {...initial};
  let done = 0, notifications = 0;
  const context = {
    $environment: {'surge-version': '6.100.0'},
    $request: {headers, url},
    $httpClient: {get() {throw Error('Unexpected network request');}, post() {throw Error('Unexpected network request');}},
    $persistentStore: {read: k => data[k] || null, write: (v, k) => {data[k] = v; return true;}},
    $notification: {post() {notifications++;}},
    $done() {done++;},
    console: {log() {}},
    setTimeout, clearTimeout,
    atob: s => Buffer.from(s, 'base64').toString('binary'),
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'scripts', file), 'utf8'), context, {timeout: 2000});
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(done, 1);
  return {data, notifications};
}
(async () => {
  const url = 'https://gw2c-hw-open.longfor.com/lmarketing-task-api-mvc-prod/openapi/task/v1/signature/clock';
  const app = await capture('paperclip-longfor-cookie.js', {'X-LF-CHANNEL': 'L0', 'X-LF-USERTOKEN': 'fake-app'}, url);
  assert.equal(JSON.parse(app.data.lhtj_app_data).usertoken, 'fake-app');
  assert.equal(app.data.lhtj_headers, undefined);
  const mini = await capture('paperclip-longfor-cookie.js', {'x-lf-channel': 'C2', 'x-lf-usertoken': 'fake-mini'}, url);
  assert.equal(JSON.parse(mini.data.lhtj_headers)['x-lf-usertoken'], 'fake-mini');
  assert.equal(mini.data.lhtj_app_data, undefined);
  const unknown = await capture('paperclip-longfor-cookie.js', {'x-lf-channel': 'other'}, url);
  assert.deepEqual(unknown.data, {});
  assert.equal(unknown.notifications, 0);
  console.log('PASS: Longfor App / mini-program / unknown channel isolation');
  const token = 'e30.' + Buffer.from(JSON.stringify({sub: 12, mall_id: 34, exp: 2000000000})).toString('base64url') + '.fake';
  const mallURL = 'https://a.china-smartech.com/restful/mall/34/checkInForm';
  const bhg = await capture('paperclip-mall-cookie.js', {Authorization: 'Bearer ' + token, Referer: 'https://servicewechat.com/wx1b1dda695dff82c8/1/page-frame.html'}, mallURL);
  assert.equal(bhg.data.bhg_token, token);
  assert.equal(bhg.data.bhg_mallid, '34');
  assert.equal(bhg.data.longde_token, undefined);
  const longde = await capture('paperclip-mall-cookie.js', {Authorization: 'Bearer ' + token}, mallURL);
  assert.equal(longde.data.longde_token, token);
  assert.equal(longde.data.bhg_token, undefined);
  const invalid = await capture('paperclip-mall-cookie.js', {Authorization: 'Bearer invalid'}, mallURL);
  assert.deepEqual(invalid.data, {});
  const unchanged = await capture('paperclip-mall-cookie.js', {Authorization: 'Bearer ' + token}, mallURL, {longde_token: token, longde_status: 'keep'});
  assert.equal(unchanged.data.longde_status, 'keep');
  assert.equal(unchanged.notifications, 0);
  console.log('PASS: BHG / Longde isolation, invalid and unchanged credentials');
})().catch(e => {console.error(e); process.exitCode = 1;});
