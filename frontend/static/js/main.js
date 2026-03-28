// --- 共通設定 ---
const API_BASE_URL = 'https://repair-api.go-pro-world.net/appointments';
let currentMonthOffset = 0; // 今月からのズレ

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.timetable-grid');
    if (grid) {
        renderCalendar(); // カレンダー表示
    }
});

// --- 1. カレンダー描画ロジック ---
async function renderCalendar() {
    const grid = document.querySelector('.timetable-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // 表示する月の基準日（1日）を計算
    const now = new Date();
    const displayMonth = new Date(now.getFullYear(), now.getMonth() + currentMonthOffset, 1);
    
    // タイトルの更新 (index.htmlに id="calendar-month-title" がある前提)
    const titleEl = document.getElementById('calendar-month-title');
    if (titleEl) {
        titleEl.textContent = `📅 ${displayMonth.getFullYear()}年${displayMonth.getMonth() + 1}月`;
    }

    // 月〜土のヘッダー作成
    ['月', '火', '水', '木', '金', '土'].forEach(day => {
        const div = document.createElement('div');
        div.className = 'day-header';
        div.innerText = day;
        grid.appendChild(div);
    });

    // その月の末日を取得
    const lastDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();
    const todayStr = new Date().toLocaleDateString('sv-SE');

    // 1日から末日までループ
    for (let d = 1; d <= lastDay; d++) {
        const targetDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), d);
        const dayOfWeek = targetDate.getDay();

        // 日曜日(0)はスキップ（月〜土の6列表示に合わせるため）
        if (dayOfWeek === 0) continue;

        // 1日が火曜日などの場合、月曜日との間に空の枠を入れる必要があるが、
        // 現場の運用に合わせて「日付順に枠を埋める」シンプルな方式にします
        const dateStr = targetDate.toLocaleDateString('sv-SE');
        const displayDateLabel = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
        
        const slot = document.createElement('div');
        slot.className = 'day-slot';
        slot.id = `day-${dateStr}`;

        // 今日のハイライト
        if (dateStr === todayStr) slot.classList.add('today');
        // 祝日のハイライト
        if (isJapaneseHoliday(targetDate)) slot.classList.add('holiday');

        slot.innerHTML = `<div class="date-label">${displayDateLabel}</div>`;
        grid.appendChild(slot);
    }

    // データを取得してカレンダーに配置
    await loadAppointmentsIntoCalendar();
}

// 月移動ボタンから呼ばれる関数
function changeMonth(offset) {
    if (offset === 0) {
        currentMonthOffset = 0;
    } else {
        currentMonthOffset += offset;
    }
    renderCalendar();
}

// --- 2. データ取得と配置 ---
async function loadAppointmentsIntoCalendar() {
    try {
        const response = await fetch(API_BASE_URL);
        const appointments = await response.json();
        
        appointments.forEach(app => {
            const dateObj = new Date(app.appointment_date.replace('T', ' '));
            const appDate = app.appointment_date.split('T')[0];
            
            const slot = document.getElementById(`day-${appDate}`);
            if (slot) {
                const timeStr = (dateObj.getHours() === 0 && dateObj.getMinutes() === 0)
                    ? "時間指定なし"
                    : dateObj.getHours().toString().padStart(2, '0') + ':' +
                      dateObj.getMinutes().toString().padStart(2, '0');

                const item = document.createElement('div');
                item.className = `appointment-item ${app.status === 'completed' ? 'status-completed' : ''}`;
                
                let catHtml = app.cause_categories ? `<div class="app-category" style="font-size: 0.7em; color: #555;">🏷️ ${app.cause_categories}</div>` : "";

                item.innerHTML = `
                    <div class="app-time" style="${timeStr === '時間指定なし' ? 'color: #777; font-weight: normal;' : ''}">${timeStr}</div>
                    <div class="app-customer"><strong>${app.customer_name}</strong></div>
                    ${catHtml}
                    <div class="app-location"><small>📍${app.location}</small></div>
                `;
                item.onclick = (e) => {
                    e.stopPropagation();
                    openCompletionModal(app);
                };
                slot.appendChild(item);
            }
        });
    } catch (e) {
        console.error('データ取得失敗:', e);
    }
}

// --- 3. 予約登録処理 ---
document.getElementById('reservation-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    let appointmentDate = document.getElementById('appointment_date').value;
    const isNoTime = document.getElementById('no_time_specified').checked;
    
    if (isNoTime && appointmentDate) {
        appointmentDate = `${appointmentDate.split('T')[0]}T00:00`;
    }

    const valOrUnknown = (id, defaultValue = "不明") => {
        const value = document.getElementById(id).value.trim();
        return value === "" ? defaultValue : value;
    };

    const data = {
        customer_name: document.getElementById('customer_name').value,
        machine_model: document.getElementById('machine_model').value,
        contact_person: valOrUnknown('contact_person'),
        phone_number: valOrUnknown('phone_number'),
        serial_number: valOrUnknown('serial_number'),
        appointment_date: appointmentDate || new Date().toISOString().slice(0, 16),
        location: valOrUnknown('location', "現場不明"),
        failure_symptoms: valOrUnknown('failure_symptoms', "症状未確認"),
        received_by: valOrUnknown('received_by', "未設定"),
        is_own_lease: document.getElementById('is_own_lease').checked,
        lease_location: document.getElementById('is_own_lease').checked ? document.getElementById('lease_location').value : "",
        cause_categories: "" // 新規時は空
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
            renderCalendar(); // 再描画
        } else {
            alert('登録エラーが発生しました');
        }
    } catch (e) { 
        alert('通信エラーが発生しました'); 
    }
});

// --- 4. モーダル制御 ---
function openCompletionModal(app) {
    const modal = document.getElementById('status-modal');
    if (!modal) return;
    modal.style.display = 'block';
    
    document.getElementById('modal-app-id').value = app.id;
    document.getElementById('edit_customer_name').value = app.customer_name;
    document.getElementById('edit_contact_person').value = app.contact_person;
    document.getElementById('edit_phone_number').value = app.phone_number;
    document.getElementById('edit_machine_model').value = app.machine_model;
    document.getElementById('edit_serial_number').value = app.serial_number;
    document.getElementById('edit_location').value = app.location;
    document.getElementById('edit_failure_symptoms').value = app.failure_symptoms;
    
    if(document.getElementById('edit_received_by')) document.getElementById('edit_received_by').value = app.received_by || "";
    if(document.getElementById('edit_is_own_lease')) {
        document.getElementById('edit_is_own_lease').checked = app.is_own_lease || false;
        toggleLeaseLocation('edit');
    }
    if(document.getElementById('edit_lease_location')) document.getElementById('edit_lease_location').value = app.lease_location || "";

    const savedCats = app.cause_categories ? app.cause_categories.split(',') : [];
    document.querySelectorAll('#modal-category-group input[type="checkbox"]').forEach(cb => {
        cb.checked = savedCats.includes(cb.value);
    });

    const date = new Date(app.appointment_date.replace('T', ' '));
    const localISO = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    document.getElementById('edit_appointment_date').value = localISO;
    const noTimeCb = document.getElementById('edit_no_time_specified');
    if(noTimeCb) noTimeCb.checked = (date.getHours() === 0 && date.getMinutes() === 0);
    
    document.getElementById('worker_name').value = app.worker_name || '';
    document.getElementById('completion_notes').value = app.completion_notes || '';
}

async function submitCompletion() {
    const appId = document.getElementById('modal-app-id').value;
    let appointmentDate = document.getElementById('edit_appointment_date').value;
    const isNoTime = document.getElementById('edit_no_time_specified')?.checked;
    if (isNoTime && appointmentDate) {
        appointmentDate = `${appointmentDate.split('T')[0]}T00:00`;
    }

    const selectedCats = Array.from(document.querySelectorAll('#modal-category-group input[type="checkbox"]:checked'))
                              .map(cb => cb.value)
                              .join(',');

    const data = {
        customer_name: document.getElementById('edit_customer_name').value,
        contact_person: document.getElementById('edit_contact_person').value,
        phone_number: document.getElementById('edit_phone_number').value,
        machine_model: document.getElementById('edit_machine_model').value,
        serial_number: document.getElementById('edit_serial_number').value,
        location: document.getElementById('edit_location').value,
        failure_symptoms: document.getElementById('edit_failure_symptoms').value,
        appointment_date: appointmentDate,
        received_by: document.getElementById('edit_received_by').value,
        is_own_lease: document.getElementById('edit_is_own_lease').checked,
        lease_location: document.getElementById('edit_is_own_lease').checked ? document.getElementById('edit_lease_location').value : "",
        cause_categories: selectedCats,
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
        alert("更新しました");
        closeModal();
        renderCalendar();
    }
}

async function deleteAppointment() {
    if (!confirm("本当にこの予約を削除しますカ？")) return;
    const appId = document.getElementById('modal-app-id').value;
    const response = await fetch(`${API_BASE_URL}/${appId}`, { method: 'DELETE' });
    if (response.ok) { 
        alert("削除しました");
        closeModal(); 
        renderCalendar();
    }
}

function closeModal() { 
    const modal = document.getElementById('status-modal');
    if (modal) modal.style.display = 'none'; 
}

// --- 5. 祝日判定 (2026年対応) ---
function isJapaneseHoliday(date) {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const w = date.getDay();
    const nth = Math.floor((d - 1) / 7) + 1;
    const fixed = ["1-1", "2-11", "2-23", "4-29", "5-3", "5-4", "5-5", "8-11", "11-3", "11-23"];
    if (fixed.includes(`${m}-${d}`)) return true;
    if (m === 1 && nth === 2 && w === 1) return true;
    if (m === 5 && d === 6) return true;
    if (m === 7 && nth === 3 && w === 1) return true;
    if (m === 9 && nth === 3 && w === 1) return true;
    if (m === 10 && nth === 2 && w === 1) return true;
    if ((m === 3 && d === 20) || (m === 9 && d === 22)) return true;
    return false;
}

// --- 6. リース拠点表示切り替え ---
function toggleLeaseLocation(type) {
    const isChecked = type === 'new'
        ? document.getElementById('is_own_lease').checked
        : document.getElementById('edit_is_own_lease').checked;
    const selectBox = type === 'new'
        ? document.getElementById('lease_location')
        : document.getElementById('edit_lease_location');
    if(selectBox) {
        selectBox.style.display = isChecked ? 'block' : 'none';
    }
}
