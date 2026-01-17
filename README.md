# 🛠️ Repair-Timetable (建設機械 出張修理予約管理システム)
1983年生まれの建設機械修理エンジニアが、現場の効率化と副業プログラミング学習（Python）を兼ねて開発している、出張修理の予約・スケジュール管理ツールです。

## 🌟 プロジェクトの概要
現場からスマホで簡単に修理予約を入力し、4週間分のスケジュールをタイムテーブル形式で可視化・管理することを目的としています。 バックエンドに FastAPI、フロントエンドに Flask、データベースに PostgreSQL を採用し、Docker 上でマイクロサービスとして構成。Traefik によるリバースプロキシとHTTPS化を実装した実用的な構成です。

## 🚀 現在の機能
認証システム: Flaskセッションによるログイン管理。管理者と一般ユーザーの使い分けが可能。

4週間カレンダー表示: 今週の月曜日を起点とした24日分（月〜土）のスケジュール表示。

高度な予約管理:

予約登録（顧客・型式・シリアル・現場住所・故障症状・日時）。

既存予約の詳細表示、情報の修正、および削除機能。

修理完了報告: 作業者名と作業メモを記録し、カレンダー上でのステータス色分け表示。

日本仕様への最適化:

JST（日本標準時）完全同期: サーバー・ブラウザ間での9時間の時差問題を解消。

2026年祝日対応: 日本の移動祝日（ハッピーマンデー等）や振替休日を考慮した自動グレーアウト。

APIドキュメント: Swagger UI を通じた API 仕様の可視化。

## 🏗️ 技術スタック
Frontend: Flask (Python), JavaScript (Vanilla JS), CSS3

Backend: FastAPI (Python), SQLAlchemy (ORM), Pydantic

Database: PostgreSQL 16

Infrastructure: Ubuntu 24.04 (VPS), Docker / Docker Compose

Network: Traefik (HTTPS化 / Let's Encrypt 自動更新)

##🛠️ インストールと実行
リポジトリをクローン

Bash```
git clone https://github.com/hisao5232/repair-timetable.git
cd repair-timetable
```
環境変数の設定 (.env)
```
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=repair_db
DB_HOST=db
# ログイン認証用
SECRET_KEY=your_random_secret
ADMIN_USER=hisao5232
ADMIN_PASSWORD=your_admin_pass
USER_NAME=worker01
USER_PASSWORD=your_user_pass
```
Dockerでの起動

Bash```
docker compose up -d --build
```
## 📅 今後の拡張予定 (Roadmap)
[ ] Google Map連携: 現場住所の横のアイコンをクリックすると地図アプリが即座に起動。

[ ] 写真アップロード: 現場の故障箇所を写真で記録し、報告書に添付する機能。

[ ] 通知機能: 予約が入った際に Discord / LINE 等へ通知を飛ばす。

[ ] パーツ発注リスト: よく使う消耗品（オイル、フィルタ等）をワンタップでリストアップ。

[ ] 月間/週間表示切り替え: より長期的な予定を把握しやすくするUI改善。

## 👤 Author
hisao5232

建設機械修理エンジニア / Python学習中

Portfolio: go-pro-world.net
