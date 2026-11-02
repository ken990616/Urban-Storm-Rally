/**
 * Urban Storm Rally 2026 - Google Forms -> Firestore
 * Installable "On form submit" trigger attached to the response spreadsheet.
 * IMPORTANT: Bind this Apps Script to the SAME Google Cloud project as Firebase,
 * grant script runner Cloud Datastore User IAM, enable Firestore API, add OAuth scope.
 * Never publish this script as an anonymous web app.
 */
const PROJECT_ID = 'urban-storm-rally-c775d';
const DEADLINE_TAIPEI = '2026-11-19T23:59:59+08:00';
const FIELD_ALIASES = {
 team: ['車隊名稱','隊伍名稱','車隊名'],
 driver: ['駕駛 Roblox 帳號','駕駛RB','駕駛 Roblox','駕駛員 Roblox','賽車手 Roblox','駕駛'],
 codriver: ['領航員 Roblox 帳號','領航員RB','領航員 Roblox','副駕駛 Roblox','領航員'],
 driverDiscord: ['駕駛 Discord 帳號','駕駛 DC','駕駛Discord'],
 codriverDiscord: ['領航員 Discord 帳號','領航員 DC','領航員Discord'],
 driverERLC: ['駕駛 ERLC ID','駕駛 ERLC','駕駛ERLC'],
 codriverERLC: ['領航員 ERLC ID','領航員 ERLC','領航員ERLC'],
 vehicle: ['車輛型號','車輛','車型','賽車型號'],
 color: ['車輛顏色','車色','車身顏色'],
 email: ['電子郵件地址','電子郵件','Email Address','Email','電子郵件信箱'],
 agree: ['同意賽事規則','規則確認','是否同意規則','已閱讀並同意賽事規則']
};
const ALLOWED_CARS = [
 'BKM_Hofmeister_F_2021','Bullhorn Prancer Fury Widebody 2020','Chevlon Corbeta X08 2014'
];
function getValue_(answers, aliases) {
  for (const alias of aliases) {
    const exact = Object.keys(answers).find(k => k.trim().toLowerCase() === alias.toLowerCase());
    if (exact) return String((answers[exact] || [''])[0] || '').trim();
  }
  return '';
}
function onRegistrationSubmit(e) {
  if (!e || !e.namedValues) throw new Error('必須由試算表「表單提交時」安裝型觸發器執行');
  const submittedAt = new Date();
  if (submittedAt.getTime() > new Date(DEADLINE_TAIPEI).getTime()) {
    console.log('報名已截止，忽略提交');
    return;
  }
  const a = e.namedValues;
  const registration = {};
  Object.keys(FIELD_ALIASES).forEach(k => registration[k] = getValue_(a, FIELD_ALIASES[k]));
  if (!registration.team || !registration.driver || !registration.codriver || !registration.vehicle)
    throw new Error('缺少必要欄位，請檢查 FIELD_ALIASES 是否與 Google 表單題目一致：' + JSON.stringify(registration));
  // Preserve the original response text; car normalization happens in review.
  const id = 'registration_' + Utilities.getUuid().replace(/-/g,'');
  const payload = {
    fields: {
      type: {stringValue:'registration'},
      status: {stringValue:'PENDING'},
      team: {stringValue:registration.team},
      driver: {stringValue:registration.driver},
      codriver: {stringValue:registration.codriver},
      driverDiscord: {stringValue:registration.driverDiscord},
      codriverDiscord: {stringValue:registration.codriverDiscord},
      driverERLC: {stringValue:registration.driverERLC},
      codriverERLC: {stringValue:registration.codriverERLC},
      vehicle: {stringValue:registration.vehicle},
      color: {stringValue:registration.color},
      email: {stringValue:registration.email},
      agree: {stringValue:registration.agree},
      submittedAt: {timestampValue:submittedAt.toISOString()}
    }
  };
  const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID +
              '/databases/(default)/documents/privateRace/' + id;
  const response = UrlFetchApp.fetch(url, {
    method:'patch',
    contentType:'application/json',
    headers:{Authorization:'Bearer ' + ScriptApp.getOAuthToken()},
    payload:JSON.stringify(payload),
    muteHttpExceptions:true
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300)
    throw new Error('Firestore ' + response.getResponseCode() + ': ' + response.getContentText());
  console.log('報名已匯入：' + id);
}
