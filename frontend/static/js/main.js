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

async function loadTimetable() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMon = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diffToMon));

    const dayIds = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    
    // ヘッダーとスロットの初期化
    dayIds.forEach((id, index) => {
        const targetDate = new Date(monday);
        targetDate.setDate(monday.getDate() + index);
        const dateStr = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
        document.querySelector(`.day-header:nth-child(${index + 1})`).innerHTML = 
            `${['月','火','水','木','金','土','日'][index]}<br><small>${dateStr}</small>`;
        
        const slot = document.getElementById(`day-${id}`);
        slot.innerHTML = '';
        slot.dataset.date = targetDate.toISOString().split('T')[0];
    });

    try {
        const response = await fetch('https://repair-api.go-pro-world.net/appointments');
        const appointments = await response.json();

        appointments.forEach(app => {
            const appDate = app.appointment_date.split('T')[0];
            
            dayIds.forEach(id => {
                const slot = document.getElementById(`day-${id}`);
                if (slot.dataset.date === appDate) {
                    const item = document.createElement('div');
                    
                    // ステータスが completed ならクラスを追加
                    item.className = 'appointment-item' + (app.status === 'completed' ? ' status-completed' : '');
                    
                    item.innerHTML = `
                        <strong>${app.customer_name}</strong><br>
                        <small>${app.machine_model}</small><br>
                        <span class="location">📍${app.location}</span>
                    `;

                    // ★ ここでクリックイベントを追加
                    item.onclick = () => openCompletionModal(app);
                    
                    slot.appendChild(item);
                }
            });
        });
    } catch (error) {
        console.error("データ取得失敗:", error);
    }
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
