# Urban Storm Rally 2026｜Google 表單報名串接

目前網站新增了裁判端「報名審核」介面。Google 表單不能直接安全寫入 GitHub Pages；必須設定 Apps Script 的安裝型觸發器，使用具備 IAM 權限的 Google Cloud OAuth 存取 Firestore。

## 設定步驟
1. 在 Google 表單「回覆」建立連結的 Google 試算表，於該試算表「擴充功能 → Apps Script」開啟編輯器。
2. 貼上 `google-apps-script/Code.gs`，並將 `appsscript.json` 的 OAuth scopes 合併到專案資訊清單。
3. 將 Apps Script 連結到 Firebase `urban-storm-rally-c775d` 所使用的**標準 Google Cloud 專案**（不是 Apps Script 預設自動建立的專案）。
4. 在 Google Cloud 啟用 Firestore API，並為**實際執行觸發器的 Google 帳號**授予 `Cloud Datastore User` (roles/datastore.user)；這是高權限，應使用專用受信任帳號並遵守最小權限。
5. Apps Script → 觸發條件 → 新增觸發器：函式 `onRegistrationSubmit`；事件來源「試算表」；事件類型「提交表單時」。
6. 檢查 `FIELD_ALIASES` 是否與表單**實際題目名稱完全一致**，必要時修改。測試提交一份表單，再到 Firestore `privateRace/registration_<uuid>` 確認資料。
7. 裁判登入網站，在「報名審核」查看 PENDING，按「核准」或「駁回」。核准時以 Firestore transaction 分配 01、02 等車號，並同步到公開賽事資料。
8. **電子郵件通知目前未啟用**：先確認表單是否收集 Email，再另行設定通知流程。
9. **截止限制**：Apps Script 依台灣時間 2026-11-19 23:59:59 拒絕匯入新提交；裁判後台也會拒絕截止後審核。請另在 Google 表單介面關閉接收回覆，避免提交者誤以為成功報名。

## 安全與已知限制
- 不要將 Google Cloud 服務帳戶私鑰、OAuth Token 或其他憑證放到 GitHub Pages。
- 參賽者 DC/ERLC/Email 只存 `privateRace`，不會複製到觀眾公開資料。
- Apps Script 觸發器不是 Firestore Rules 所約束的 Firebase 使用者：授權依 Google Cloud IAM，請審慎管理。
- 現有 Firebase 規則 `privateRace/{id}` 已允許指定裁判讀寫；其他使用者不得讀取。
- 正式賽事前，計時、跨裝置衝突與審核流水號仍應改由可信任後端控制並進行完整測試。
