# Vantage - Personal Stock Portfolio Manager

個人向け株式ポートフォリオ管理アプリケーション

## 🚀 Features

### 基本機能

- ✅ ポートフォリオ管理（株式・ETF・投資信託）
- ✅ リアルタイム株価取得
- ✅ 損益計算（税引後）
- ✅ 配当金予想
- ✅ 資産推移グラフ
- ✅ セクター別ポートフォリオ可視化
- ✅ 個別銘柄分析（チャート、財務指標）

### 新機能（2024年12月実装）

- ✅ **ウォッチリスト** - 購入検討銘柄の監視
- ✅ **価格アラート** - 目標価格到達通知
- ✅ **配当履歴管理** - 受取配当金の記録
- ✅ **取引履歴** - 売買記録の詳細管理
- ✅ **NISA枠管理** - 年度別投資枠の追跡
- ✅ **ポートフォリオ分析** - リスク指標、リバランス提案
- ✅ **AI銘柄推薦** - リスク許容度別の投資提案
- ✅ **PWA対応** - オフライン機能、ホーム画面追加

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI**: Material-UI v7, Emotion
- **State**: SWR
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth (Email/Password, GitHub OAuth)
- **Data**: Yahoo Finance API
- **Charts**: Recharts

## 📦 Installation

```bash
# 依存関係のインストール
pnpm install

# 環境変数の設定
cp .env.example .env.local
# .env.localにSupabase認証情報を設定

# データベースマイグレーション
# Supabase Dashboardから supabase/migrations/001_add_new_tables.sql を実行

# 開発サーバー起動
pnpm dev
```

## 🔧 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📊 Database Schema

主要テーブル:
- `portfolios` - ポートフォリオデータ
- `asset_history` - 資産推移履歴
- `operation_logs` - 操作ログ
- `watchlist` - ウォッチリスト
- `price_alerts` - 価格アラート
- `dividend_history` - 配当受取履歴
- `transactions` - 取引履歴
- `nisa_quota` - NISA枠管理
- `user_preferences` - ユーザー設定

## 🎯 Usage

### ポートフォリオ管理
1. ログイン後、右下の「+」ボタンから銘柄を追加
2. 口座区分（NISA成長/つみたて、特定、一般）を選択
3. 保有株数と平均取得単価を入力

### ウォッチリスト
```typescript
import WatchlistPanel from '@/components/WatchlistPanel';

<WatchlistPanel />
```

### ポートフォリオ分析
```typescript
import AnalysisPanel from '@/components/AnalysisPanel';

<AnalysisPanel />
```

### AI推薦
```typescript
import { api } from '@/lib/api';

const recommendations = await api.fetchStockRecommendations('medium');
```

## 📱 PWA

アプリはPWA（Progressive Web App）として動作します：
- オフライン対応
- ホーム画面に追加可能
- プッシュ通知対応（準備済み）

## 🔐 Security

- Row Level Security (RLS) による データアクセス制御
- Supabase Authによる認証
- API認証チェック

## 📈 Performance

- SWRによるデータキャッシング
- Service Workerによるオフライン対応
- リトライロジックによる信頼性向上

## 🤝 Contributing

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📄 License

MIT

## 🙏 Acknowledgments

- [Yahoo Finance API](https://github.com/gadicc/node-yahoo-finance2)
- [Supabase](https://supabase.com/)
- [Material-UI](https://mui.com/)
- [Next.js](https://nextjs.org/)
