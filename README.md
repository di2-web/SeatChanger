# Seat Changer - 席替え＆配置管理アプリ

Firebase (Cloud Firestore) 連携対応の座席表・席替え管理アプリケーションです。
座席配置パターン（列・行・通路）の作成・保存や、席替え履歴、固定配置設定をクラウドデータベース（Firestore）に永続保存できます。

---

## 🚀 Firebase (Cloud Firestore) の接続方法

### 方法 1: アプリ画面上で Config を貼り付ける（推奨・最も手軽）
1. アプリを起動し、ヘッダー右上の**「Firebase設定」**または「設定」ページ内の**「Firebase Configを貼り付ける」**をクリックします。
2. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成し、**Firestore Database** を作成（テストモードまたは付属の `firestore.rules` を適用）。
3. 「プロジェクトの設定」>「全般」>「マイアプリ」からウェブアプリ（`</>`）を追加し、表示される `const firebaseConfig = { ... }` のコードをそのまま貼り付けます。
4. **「設定を保存して有効化」**をクリックすると、即座にFirestoreに接続され、席データや配置パターンがクラウドに保存・同期されます。

### 方法 2: ソースコードに直接貼り付ける
`src/firebaseConfig.ts` 内の `defaultFirebaseConfig` に直接貼り付けてビルド・デプロイすることも可能です。

```typescript
// src/firebaseConfig.ts
export const defaultFirebaseConfig: FirebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "...",
  appId: "...",
};
```

---

## 🗄️ Firestore データベース構造

- `/settings/layouts`: 教室の机配置パターン一覧および適用中のレイアウトID
- `/settings/classmates_settings`: 生徒名簿データおよび前2列固定設定
- `/settings/current_seat`: 現在の最新座席配置表データ
- `/seat_history/{historyId}`: 過去の席替え履歴（いつでも過去の配置をプレビュー・復元可能）

---

## 🛡️ セキュリティルール (firestore.rules)
プロジェクト直下に `firestore.rules` が配置されています。Firebase Console の Firestore ルールに貼り付けてデプロイしてください。
