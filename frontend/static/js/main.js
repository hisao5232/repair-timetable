// --- 予約登録の処理 ---
document.getElementById('reservation-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawDate = document.getElementById('appointment_date').value;
    const isoDate = new Date(rawDate).toISOString();

    const data = {
        customer_name: document.getElementById('customer_name').value,
        contact_person: document.getElementById('contact_person').value,
        phone_number: document.getElementById('phone_number').value,
        machine_model: document.getElementById('machine_model').value,
        serial_number: document.getElementById('serial_number').value,
        appointment_date: isoDate,
        location: document.getElementById('location').value,
        failure_symptoms: document.getElementById('failure_symptoms').value
    };

    try {
        const response = await fetch('https://repair-api.go-pro-world.net/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            alert('予約を登録しました！');
            document.getElementById('reservation-form').reset();
            loadTimetable(); // カレンダーを更新
        } else {
            const errorDetail = await response.json();
            console.error("エラー詳細:", errorDetail);
            alert('登録に失敗しました。');
        }
    } catch (error) {
        console.error('通信エラー:', error);
        alert('APIに接続できません。');
    }
});

// --- カレンダー読み込みと表示の処理 ---
document.addEventListener('DOMContentLoaded', () => {
    loadTimetable();
});

// loadTimetable関数を大幅にアップデート
async function loadTimetable() {
    const now = new Date();
    // 今週の月曜日を取得
    const dayOfWeek = now.getDay();
    const diffToMon = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startDate = new Date(now.setDate(diffToMon));

    const grid = document.querySelector('.timetable-grid');
    grid.innerHTML = ''; // 一旦空にする

    // ヘッダー作成（月〜土）
    const daysText = ['月', '火', '水', '木', '金', '土'];
    daysText.forEach(day => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.innerText = day;
        grid.appendChild(header);
    });

    // 4週間分（24日分）の枠を作成
    for (let i = 0; i < 24; i++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + Math.floor(i / 6) * 7 + (i % 6));
        
        const dateStr = targetDate.toISOString().split('T')[0];
        const displayDate = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
        
        const slot = document.createElement('div');
        slot.className = 'day-slot';
        slot.id = `day-${dateStr}`;
        slot.innerHTML = `<div class="date-label">${displayDate}</div>`;
        
        // 祝日判定（簡易的な日本の祝日判定ロジック）
        if (isJapaneseHoliday(targetDate)) {
            slot.classList.add('holiday');
        }
        
        grid.appendChild(slot);
    }

    // APIからデータ取得
    try {
        const response = await fetch('https://repair-api.go-pro-world.net/appointments');
        const appointments = await response.json();
        appointments.forEach(app => {
            const appDate = app.appointment_date.split('T')[0];
            const slot = document.getElementById(`day-${appDate}`);
            if (slot) {
                const item = document.createElement('div');
                item.className = 'appointment-item' + (app.status === 'completed' ? ' status-completed' : '');
                item.innerHTML = `<strong>${app.customer_name}</strong><br><small>${app.machine_model}</small>`;
                item.onclick = () => openCompletionModal(app);
                slot.appendChild(item);
            }
        });
    } catch (e) { console.error(e); }
}

// 簡易祝日判定関数（主要な固定祝日のみ。本格的には内閣府配布のCSV等が必要ですがまずはこれで）
function isJapaneseHoliday(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const holidays = ["1-1", "2-11", "2-23", "4-29", "5-3", "5-4", "5-5", "8-11", "11-3", "11-23"]; // 2026年想定
    return holidays.includes(`${m}-${d}`);
}

// --- ステータス管理（モーダル）の処理 ---

function openCompletionModal(app) {
    // すでに完了しているものは編集不可にするか、確認のみにするなどの拡張も可能です
    document.getElementById('status-modal').style.display = 'block';
    document.getElementById('modal-app-id').value = app.id;
    document.getElementById('modal-customer-name').innerText = app.customer_name + " 様の修理完了報告";
    
    // 既存データがある場合は表示（再編集用）
    document.getElementById('worker_name').value = app.worker_name || '';
    document.getElementById('completion_notes').value = app.completion_notes || '';
}

async function submitCompletion() {
    const appId = document.getElementById('modal-app-id').value;
    const data = {
        status: "completed",
        worker_name: document.getElementById('worker_name').value,
        completion_notes: document.getElementById('completion_notes').value,
        completed_at: new Date().toISOString()
    };

    try {
        const response = await fetch(`https://repair-api.go-pro-world.net/appointments/${appId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert("完了報告を保存しました");
            closeModal();
            loadTimetable();
        } else {
            alert("更新に失敗しました");
        }
    } catch (error) {
        console.error("更新エラー:", error);
    }
}

function closeModal() {
    document.getElementById('status-modal').style.display = 'none';
}
