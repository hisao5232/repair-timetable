# 🛠️ Repair-Timetable (建設機械 出張修理予約管理システム)
1983年生まれの建設機械修理エンジニアが、現場の効率化と副業プログラミング学習（Python）を兼ねて開発している、出張修理の予約・スケジュール管理ツールです。

## 🌟 プロジェクトの概要
現場からスマホで簡単に修理予約を入力し、一週間のスケジュールをタイムテーブル形式で可視化することを目的としています。 バックエンドに FastAPI、フロントエンドに Flask、データベースに PostgreSQL を採用し、Docker 上でマイクロサービスとして構成されています。

## 🚀 現在の機能
予約登録フォーム: 顧客名、担当者、連絡先、型式、シリアル、現場住所、故障症状の入力。

週次タイムテーブル: 今週の月曜日〜日曜日のスケジュールをグリッド表示。

自動同期: フォームからの登録後、非同期通信（JavaScript Fetch API）でカレンダーを更新。

APIドキュメント: Swagger UI を通じた API 仕様の可視化。

## 🏗️ 技術スタック
- Frontend: Flask (Python), JavaScript, CSS3

- Backend: FastAPI (Python), SQLAlchemy

- Database: PostgreSQL 16

- Infrastructure: Ubuntu 24.04 (VPS), Docker / Docker Compose

- Reverse Proxy: Traefik (HTTPS化 / Let's Encrypt)

## 🛠️ インストールと実行
リポジトリをクローン

Bash```
git clone https://github.com/hisao5232/repair-timetable.git
```

環境変数の設定 (.env)
```
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=repair_db
DB_HOST=db
CERT_RESOLVER=lets-encrypt
Dockerでの起動
```
Bash```
docker compose up -d
```
## 📅 今後の拡張予定 (Roadmap)
[ ] ステータス管理: 「受付中」「部品待ち」「修理完了」を色分けして表示。

[ ] Google Map連携: 現場住所をクリックすると地図アプリが起動。

[ ] 写真アップロード: 現場の故障箇所を写真で記録・共有する機能。

[ ] 通知機能: 予約が入った際に Discord / Slack へ通知。

[ ] パーツ発注連携: よく使う部品（オイル、フィルタ等）のリストアップ機能。

## 👤 Author
hisao5232

建設機械修理エンジニア / Python学習中

Portfolio: go-pro-world.net
