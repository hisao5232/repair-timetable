// static/js/main.js

document.getElementById('reservation-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. フォームから値を取得
    const rawDate = document.getElementById('appointment_date').value; // 例: "2026-01-16T10:00"
    
    // 2. FastAPIが受け取れるISO形式 ("2026-01-16T10:00:00Z") に変換
    const isoDate = new Date(rawDate).toISOString();

    const data = {
        customer_name: document.getElementById('customer_name').value,
        contact_person: document.getElementById('contact_person').value,
        phone_number: document.getElementById('phone_number').value,
        machine_model: document.getElementById('machine_model').value,
        serial_number: document.getElementById('serial_number').value,
        appointment_date: isoDate, // 変換後の日付
        location: document.getElementById('location').value,
        failure_symptoms: document.getElementById('failure_symptoms').value
    };

    console.log("送信データ:", data); // デバッグ用

    try {
        const response = await fetch('https://repair-api.go-pro-world.net/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            const result = await response.json();
            console.log("成功:", result);
            alert('予約を登録しました！');
            document.getElementById('reservation-form').reset();
            // ここで一覧を再読み込みする関数を呼ぶ（後ほど作成）
        } else {
            // エラー内容を詳しく見る
            const errorDetail = await response.json();
            console.error("エラー詳細:", errorDetail);
            alert('登録に失敗しました。詳細はコンソールを確認してください。');
        }
    } catch (error) {
        console.error('通信エラー:', error);
        alert('APIに接続できません。');
    }
});

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', () => {
    loadTimetable();
});

async function loadTimetable() {
    // --- 1. 今週の月曜日を計算 ---
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0(日)〜6(土)
    const diffToMon = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diffToMon));

    // 各曜日の ID と日付を紐付け
    const dayIds = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    
    // --- 2. 曜日の見出し(日付)を更新 ---
    dayIds.forEach((id, index) => {
        const targetDate = new Date(monday);
        targetDate.setDate(monday.getDate() + index);
        const dateStr = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
        document.querySelector(`.day-header:nth-child(${index + 1})`).innerHTML = 
            `${['月','火','水','木','金','土','日'][index]}<br><small>${dateStr}</small>`;
        
        // 枠を空にする
        const slot = document.getElementById(`day-${id}`);
        slot.innerHTML = '';
        // 枠に日付データを属性として持たせておく（比較用）
        slot.dataset.date = targetDate.toISOString().split('T')[0];
    });

    // --- 3. APIからデータを取得して流し込む ---
    try {
        const response = await fetch('https://repair-api.go-pro-world.net/appointments');
        const appointments = await response.json();

        appointments.forEach(app => {
            const appDate = app.appointment_date.split('T')[0]; // "2026-01-15"
            
            // 該当する日付の枠を探す
            dayIds.forEach(id => {
                const slot = document.getElementById(`day-${id}`);
                if (slot.dataset.date === appDate) {
                    const item = document.createElement('div');
                    item.className = 'appointment-item';
                    item.innerHTML = `
                        <strong>${app.customer_name}</strong><br>
                        <small>${app.machine_model}</small><br>
                        <span class="location">📍${app.location}</span>
                    `;
                    slot.appendChild(item);
                }
            });
        });
    } catch (error) {
        console.error("データ取得失敗:", error);
    }
}
