// --- 共通設定 ---
const API_BASE_URL = 'https://repair-api.go-pro-world.net/appointments';

// --- 1. カレンダー初期表示 ---
document.addEventListener('DOMContentLoaded', () => {
    loadTimetable();
});

// --- 2. カレンダー読み込みと表示 ---
async function loadTimetable() {
    const grid = document.querySelector('.timetable-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // 月〜土のヘッダー作成
    ['月', '火', '水', '木', '金', '土'].forEach(day => {
        const div = document.createElement('div');
        div.className = 'day-header';
        div.innerText = day;
        grid.appendChild(div);
    });

    // 今週の月曜日を計算
    const now = new Date();
    const dayOfWeek = now.getDay(); 
    const diffToMon = now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const startDate = new Date(now.getFullYear(), now.getMonth(), diffToMon);

    // 4週間分（24日分）の枠を作成
    for (let i = 0; i < 24; i++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + Math.floor(i / 6) * 7 + (i % 6));
        
        const dateStr = targetDate.toLocaleDateString('sv-SE'); // YYYY-MM-DD形式
        const displayDate = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
        
        const slot = document.createElement('div');
        slot.className = 'day-slot';
        slot.id = `day-${dateStr}`;
        slot.innerHTML = `<div class="date-label">${displayDate}</div>`;
        
        if (isJapaneseHoliday(targetDate)) slot.classList.add('holiday');
        grid.appendChild(slot);
    }

    // データ取得と配置
    try {
        const response = await fetch(API_BASE_URL);
        const appointments = await response.json();
        appointments.forEach(app => {
            const dateObj = new Date(app.appointment_date.replace('T', ' '));

            const appDate = app.appointment_date.split('T')[0];
            const timeStr = dateObj.getHours().toString().padStart(2, '0') + ':' + 
                    dateObj.getMinutes().toString().padStart(2, '0');

            const slot = document.getElementById(`day-${appDate}`);
            if (slot) {
                const item = document.createElement('div');
                // status-completed クラスを付与
                item.className = `appointment-item ${app.status === 'completed' ? 'status-completed' : ''}`;
                
                // ★ここを修正：時間、客先名、現場名を並べる
                item.innerHTML = `
                    <div class="app-time">${timeStr}</div>
                    <div class="app-customer"><strong>${app.customer_name}</strong></div>
                    <div class="app-location"><small>📍${app.location}</small></div>
                `;

                item.onclick = () => openCompletionModal(app);
                slot.appendChild(item);
            }
        });
    } catch (e) { console.error('データ取得失敗:', e); }
}

// --- 3. 予約登録処理 ---
document.getElementById('reservation-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawValue = document.getElementById('appointment_date').value; // "2026-01-20T10:30"
    if (!rawValue) return;

    const data = {
        customer_name: document.getElementById('customer_name').value,
        contact_person: document.getElementById('contact_person').value,
        phone_number: document.getElementById('phone_number').value,
        machine_model: document.getElementById('machine_model').value,
        serial_number: document.getElementById('serial_number').value,
        appointment_date: rawValue,
        location: document.getElementById('location').value,
        failure_symptoms: document.getElementById('failure_symptoms').value
    };

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (response.ok) {
            alert('登録完了！');
            e.target.reset();
            loadTimetable();
        }
    } catch (e) { alert('通信エラーが発生しました'); }
});

// --- 詳細・修正モーダルを開く ---
function openCompletionModal(app) {
    document.getElementById('status-modal').style.display = 'block';
    
    // 隠しフィールドにIDをセット
    document.getElementById('modal-app-id').value = app.id;
    
    // 各入力フィールドに現在の値をセット（修正可能にする）
    document.getElementById('edit_customer_name').value = app.customer_name;
    document.getElementById('edit_contact_person').value = app.contact_person;
    document.getElementById('edit_phone_number').value = app.phone_number;
    document.getElementById('edit_machine_model').value = app.machine_model;
    document.getElementById('edit_serial_number').value = app.serial_number;
    document.getElementById('edit_location').value = app.location;
    document.getElementById('edit_failure_symptoms').value = app.failure_symptoms;
    
    // 日時をdatetime-local形式 (YYYY-MM-DDTHH:MM) に変換してセット
    const date = new Date(app.appointment_date.replace('T', ' '));
    const localISO = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    document.getElementById('edit_appointment_date').value = localISO;

    // 完了報告用
    document.getElementById('worker_name').value = app.worker_name || '';
    document.getElementById('completion_notes').value = app.completion_notes || '';
}

// --- 予定を修正・保存（完了報告も含む） ---
async function submitCompletion() {
    const appId = document.getElementById('modal-app-id').value;
    
    const data = {
        // 詳細情報の修正
        customer_name: document.getElementById('edit_customer_name').value,
        contact_person: document.getElementById('edit_contact_person').value,
        phone_number: document.getElementById('edit_phone_number').value,
        machine_model: document.getElementById('edit_machine_model').value,
        serial_number: document.getElementById('edit_serial_number').value,
        location: document.getElementById('edit_location').value,
        failure_symptoms: document.getElementById('edit_failure_symptoms').value,
        appointment_date: document.getElementById('edit_appointment_date').value,
        
        // 完了報告ステータス
        status: document.getElementById('worker_name').value ? "completed" : "pending",
        worker_name: document.getElementById('worker_name').value,
        completion_notes: document.getElementById('completion_notes').value,
        completed_at: new Date().toISOString()
    };

    const response = await fetch(`${API_BASE_URL}/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        closeModal();
        loadTimetable();
    }
}

// --- 削除処理 ---
async function deleteAppointment() {
    if (!confirm("本当にこの予約を削除しますか？")) return;
    const appId = document.getElementById('modal-app-id').value;
    const response = await fetch(`${API_BASE_URL}/${appId}`, { method: 'DELETE' });
    if (response.ok) { closeModal(); loadTimetable(); }
}

function closeModal() { document.getElementById('status-modal').style.display = 'none'; }

// --- 5. 祝日判定 (2026年対応版) ---
function isJapaneseHoliday(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const w = date.getDay();
    const nth = Math.floor((d - 1) / 7) + 1;
    // 固定祝日
    const fixed = ["1-1", "2-11", "2-23", "4-29", "5-3", "5-4", "5-5", "8-11", "11-3", "11-23"];
    if (fixed.includes(`${m}-${d}`)) return true;
    // ハッピーマンデー & 振替(2026年5月6日)
    if (m === 1 && nth === 2 && w === 1) return true; // 成人の日
    if (m === 5 && d === 6) return true; // 憲法記念日振替
    if (m === 7 && nth === 3 && w === 1) return true; // 海の日
    if (m === 9 && nth === 3 && w === 1) return true; // 敬老の日
    if (m === 10 && nth === 2 && w === 1) return true; // スポーツの日
    // 春分・秋分
    if ((m === 3 && d === 20) || (m === 9 && d === 22)) return true;
    return false;
}
