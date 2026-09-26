// Biến trạng thái toàn cục
let isRunning = false;
let selectedGroups = new Set();
let observer = null;

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// 1. Gắn giao diện mới (Đẹp & chuẩn Zalo)
function createControlPanel() {
    if (document.getElementById('zalo-bulk-panel')) return;

    // Chèn thêm CSS riêng cho Extension để tạo hiệu ứng
    const style = document.createElement('style');
    style.innerHTML = `
        #zalo-bulk-panel button { transition: all 0.2s ease-in-out; }
        #btn-inject-cb:hover:not(:disabled) { background: #cce0ff !important; transform: translateY(-1px); }
        #btn-select-all:hover { background: #e4e6eb !important; transform: translateY(-1px); }
        #btn-run-out:hover { background: #b51515 !important; transform: translateY(-1px); }
        #btn-stop:hover { background: #e68a00 !important; }
        .zalo-out-cb { 
            width: 22px; height: 22px; margin-right: 15px; margin-left: 10px;
            cursor: pointer; accent-color: #005ae0; flex-shrink: 0;
            border-radius: 4px;
        }
        .has-zalo-cb { background-color: rgba(0, 90, 224, 0.03); } /* Highlight nhẹ dòng đã được chèn */
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'zalo-bulk-panel';
    panel.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 999999;
        background: #ffffff; border: 1px solid #e1e4ea; padding: 20px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.12); border-radius: 12px; 
        display: flex; flex-direction: column; gap: 12px; width: 310px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;

    panel.innerHTML = `
        <div style="font-size: 18px; font-weight: 700; color: #005ae0; text-align: center; padding-bottom: 12px; border-bottom: 1px solid #eee; margin-bottom: 4px;">
            🚀 Zalo Bulk Out Group
        </div>
        
        <button id="btn-inject-cb" style="
            background: #e5efff; color: #005ae0; border: none; padding: 12px; 
            border-radius: 8px; font-weight: 600; cursor: pointer;
        ">
            1. Bật Checkbox Chọn Nhóm
        </button>
        
        <button id="btn-select-all" style="
            background: #f4f5f7; color: #333; border: none; padding: 12px; 
            border-radius: 8px; font-weight: 600; cursor: pointer;
        ">
            2. Chọn / Bỏ chọn (Màn hình hiện tại)
        </button>
        
        <button id="btn-run-out" style="
            background: #cf1b1b; color: white; border: none; padding: 12px; 
            border-radius: 8px; font-weight: 600; cursor: pointer;
        ">
            3. Rời các nhóm đã chọn
        </button>
        
        <button id="btn-stop" style="
            background: #ff9800; color: white; border: none; padding: 12px; 
            border-radius: 8px; font-weight: 600; cursor: pointer; display: none;
        ">
            ⏹ Dừng tiến trình
        </button>
        
        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; border: 1px solid #eee;">
            <div id="zalo-bulk-status" style="text-align: center; font-size: 15px; font-weight: 700; color: #333; margin-bottom: 5px;">
                Đã chọn: <span id="count-number" style="color: #005ae0;">0</span> nhóm
            </div>
            <div id="zalo-action-log" style="font-size: 12px; color: #666; text-align: center; font-style: italic;">
                Vui lòng bấm nút số 1 để bắt đầu
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    // Gán sự kiện
    document.getElementById('btn-inject-cb').addEventListener('click', startAutoInject);
    document.getElementById('btn-select-all').addEventListener('click', toggleSelectAllVisible);
    document.getElementById('btn-run-out').addEventListener('click', startBulkLeave);
    document.getElementById('btn-stop').addEventListener('click', () => { isRunning = false; });
}

// Cập nhật UI trạng thái
function updateUI() {
    const countSpan = document.getElementById('count-number');
    if (countSpan) countSpan.innerText = selectedGroups.size;
}

function updateLog(text) {
    const logEl = document.getElementById('zalo-action-log');
    if (logEl) logEl.innerText = text;
}

// 2. Chèn Checkbox Tự động & Lắng nghe cuộn chuột
function startAutoInject() {
    injectCheckboxesAutomated();

    if (!observer) {
        observer = new MutationObserver(() => injectCheckboxesAutomated());
        observer.observe(document.body, { childList: true, subtree: true });

        const btn = document.getElementById('btn-inject-cb');
        btn.innerText = "✓ Chế độ Auto Checkbox đang bật";
        btn.style.background = "#28a745";
        btn.style.color = "#fff";
        btn.disabled = true;

        updateLog('Hãy tick vào nhóm bạn muốn rời');
    }
}

// Hàm lõi xử lý việc nhúng checkbox
function injectCheckboxesAutomated() {
    const items = document.querySelectorAll('.contact-item-v2-wrapper:not(.has-zalo-cb)');

    items.forEach(item => {
        // Trích xuất tên chính xác
        const nameEl = item.querySelector('.name');
        if (!nameEl) return;
        const groupName = nameEl.textContent.trim();

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'zalo-out-cb';
        cb.dataset.groupName = groupName;

        // Phục hồi trạng thái
        cb.checked = selectedGroups.has(groupName);

        // Chặn sự kiện nổi bọt (tránh click nhầm vào nhóm)
        cb.addEventListener('click', (e) => e.stopPropagation());

        // Bắt sự kiện thay đổi an toàn
        cb.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedGroups.add(groupName);
            } else {
                selectedGroups.delete(groupName);
            }
            updateUI(); // Bắt buộc cập nhật số lượng
        });

        item.prepend(cb);
        item.classList.add('has-zalo-cb');
        item.dataset.groupName = groupName;
    });
}

// 3. Chọn/Bỏ chọn toàn bộ Màn hình hiện tại
function toggleSelectAllVisible() {
    const visibleCheckboxes = document.querySelectorAll('.zalo-out-cb');
    if (visibleCheckboxes.length === 0) return;

    const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);

    visibleCheckboxes.forEach(cb => {
        cb.checked = !allChecked;
        const groupName = cb.dataset.groupName;

        if (!allChecked) {
            selectedGroups.add(groupName);
        } else {
            selectedGroups.delete(groupName);
        }
    });

    updateUI();
}

// 4. Bắt đầu tự động Rời nhóm
async function startBulkLeave() {
    if (isRunning) return;
    if (selectedGroups.size === 0) {
        alert('Vui lòng đánh dấu tick vào ít nhất 1 nhóm để rời!');
        return;
    }

    isRunning = true;
    document.getElementById('btn-stop').style.display = 'block';
    document.getElementById('btn-run-out').style.display = 'none';

    while (selectedGroups.size > 0 && isRunning) {
        const currentVisibleItems = Array.from(document.querySelectorAll('.contact-item-v2-wrapper')).filter(item => {
            return selectedGroups.has(item.dataset.groupName);
        });

        if (currentVisibleItems.length === 0) {
            updateLog(`Chờ hiển thị: Vui lòng cuộn danh sách xuống...`);
            await delay(2000);
            continue;
        }

        for (let i = 0; i < currentVisibleItems.length; i++) {
            if (!isRunning) break;
            const item = currentVisibleItems[i];
            const name = item.dataset.groupName;

            updateLog(`Đang xử lý: ${name.substring(0, 15)}...`);

            await processLeaveSingleGroup(item);

            selectedGroups.delete(name);
            updateUI();

            await delay(1800); // Khoảng nghỉ an toàn giữa các nhóm
        }

        await delay(1000);
    }

    isRunning = false;
    document.getElementById('btn-stop').style.display = 'none';
    document.getElementById('btn-run-out').style.display = 'block';

    if (selectedGroups.size === 0) updateLog('Hoàn tất toàn bộ!');
    else updateLog('Đã tạm dừng tiến trình!');
}

// Hàm mô phỏng chuột Y HỆT NGƯỜI THẬT (Bypass Anti-Bot của React)
async function simulateHumanClick(element) {
    if (!element) return;

    // Lấy tọa độ trung tâm của nút bấm
    const rect = element.getBoundingClientRect();
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;

    const eventOptions = { bubbles: true, cancelable: true, view: window, clientX, clientY, buttons: 1 };

    // 1. Di chuột vào nút
    element.dispatchEvent(new MouseEvent('mouseover', eventOptions));
    element.dispatchEvent(new MouseEvent('mouseenter', eventOptions));
    await delay(100);

    // 2. Ấn chuột xuống
    element.dispatchEvent(new MouseEvent('mousedown', eventOptions));
    await delay(150); // Giữ chuột 150ms như người thật

    // 3. Nhả chuột lên và Click
    element.dispatchEvent(new MouseEvent('mouseup', eventOptions));
    element.click(); // Dùng click gốc của trình duyệt
}

// ==========================================
// THAO TÁC RỜI 1 NHÓM
// ==========================================
// ==========================================
// THAO TÁC RỜI 1 NHÓM (LOGIC CHUẨN MỌI TRƯỜNG HỢP)
// ==========================================
async function processLeaveSingleGroup(groupItem) {
    try {
        console.log("BẮT ĐẦU XỬ LÝ NHÓM:", groupItem.dataset.groupName);

        // BƯỚC 1: CLICK CHUỘT PHẢI
        const rect = groupItem.getBoundingClientRect();
        const rightClickEvent = new MouseEvent('contextmenu', {
            bubbles: true, cancelable: true, view: window, button: 2, buttons: 2,
            clientX: rect.left + (rect.width / 2), clientY: rect.top + (rect.height / 2)
        });
        groupItem.dispatchEvent(rightClickEvent);

        await delay(1200);

        // BƯỚC 2: TÌM VÀ CLICK "RỜI NHÓM" TRÊN MENU
        const menuItems = Array.from(document.querySelectorAll('.zmenu-item, .zmenu-item--NORMAL, div[class*="zmenu-item"]'));
        const leaveTextItem = menuItems.find(el => el.textContent && el.textContent.trim() === 'Rời nhóm' && el.offsetParent !== null);

        if (!leaveTextItem) {
            console.error("❌ Không thấy menu Rời nhóm.");
            document.body.click();
            return;
        }

        await simulateHumanClick(leaveTextItem);
        await delay(2000); // Chờ hộp thoại đầu tiên bật lên

        // ==========================================
        // BƯỚC 3: KIỂM TRA QUYỀN TRƯỞNG NHÓM
        // ==========================================
        // Tìm xem có nút "Tiếp tục" hay "Chọn và tiếp tục" không
        const allButtons1 = Array.from(document.querySelectorAll('.zl-modal__footer_button-action div, div[class*="modal__footer"] div'));
        const continueBtn = allButtons1.find(btn => btn.textContent && btn.textContent.toLowerCase().includes('tiếp tục'));

        if (continueBtn) {
            console.log("-> Thuộc quyền Trưởng nhóm. Bấm Tiếp tục...");
            // Bấm chọn thành viên đầu tiên để nhường quyền (nếu Zalo chưa chọn sẵn)
            const firstMemberRadio = document.querySelector('.zl-modal__dialog-body div[class*="radio"], .zl-modal__dialog-body input[type="radio"]');
            if (firstMemberRadio) await simulateHumanClick(firstMemberRadio);

            await simulateHumanClick(continueBtn);

            console.log("-> Đang chờ hộp thoại xác nhận cuối cùng...");
            await delay(2000); // BẮT BUỘC CHỜ hộp thoại thứ 2 (Rời nhóm) bật lên
        }

        // ==========================================
        // BƯỚC 4: BẬT "RỜI NHÓM TRONG IM LẶNG" (Áp dụng cho mọi trường hợp)
        // ==========================================
        // Dựa vào ảnh bạn cung cấp, class khi được bật là 'z-toggle--active'
        const toggleBtn = document.querySelector('.z-toggle');
        if (toggleBtn) {
            if (!toggleBtn.classList.contains('z-toggle--active')) {
                console.log("-> Đang BẬT 'Rời nhóm trong im lặng'...");
                await simulateHumanClick(toggleBtn);
                await delay(500);
            } else {
                console.log("-> 'Rời nhóm trong im lặng' đã được BẬT SẴN.");
            }
        }

        // ==========================================
        // BƯỚC 5: BẤM NÚT "RỜI NHÓM" MÀU ĐỎ
        // ==========================================
        const allButtons2 = Array.from(document.querySelectorAll('.zl-modal__footer_button-action div, div[class*="modal__footer"] div'));
        const redConfirmBtn = allButtons2.find(btn =>
            btn.textContent &&
            btn.textContent.trim() === 'Rời nhóm' &&
            (btn.classList.contains('btn-danger') || btn.className.includes('danger'))
        );

        if (redConfirmBtn) {
            console.log("-> Đã thấy nút Xác Nhận màu đỏ, THỰC HIỆN OUT!");
            redConfirmBtn.focus && redConfirmBtn.focus();

            // Dùng click() gốc để tránh lỗi Promise của Zalo ở bước cuối
            redConfirmBtn.click();

            await delay(2500); // Chờ server xử lý
            console.log("✅ ĐÃ OUT NHÓM THÀNH CÔNG!");
        } else {
            console.error("❌ Không tìm thấy nút Xác nhận màu đỏ.");
            const overlay = document.querySelector('.zl-modal__container');
            if (overlay) overlay.click(); // Đóng modal nếu lỗi
        }

    } catch (error) {
        console.error("❌ Lỗi trong quá trình thao tác:", error);
    }
}


//
// 1. Gắn giao diện mới (Có nút Đóng)
function createControlPanel() {
    if (document.getElementById('zalo-bulk-panel')) {
        // Nếu đã có thì hiển thị lên lại
        document.getElementById('zalo-bulk-panel').style.display = 'flex';
        return;
    }

    const style = document.createElement('style');
    style.innerHTML = `
        #zalo-bulk-panel button { transition: all 0.2s ease-in-out; }
        #btn-inject-cb:hover:not(:disabled) { background: #cce0ff !important; transform: translateY(-1px); }
        #btn-select-all:hover { background: #e4e6eb !important; transform: translateY(-1px); }
        #btn-run-out:hover { background: #b51515 !important; transform: translateY(-1px); }
        #btn-stop:hover { background: #e68a00 !important; }
        .zalo-out-cb { width: 22px; height: 22px; margin-right: 15px; margin-left: 10px; cursor: pointer; accent-color: #005ae0; flex-shrink: 0; border-radius: 4px;}
        .has-zalo-cb { background-color: rgba(0, 90, 224, 0.03); }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'zalo-bulk-panel';
    panel.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 999999;
        background: #ffffff; border: 1px solid #e1e4ea; padding: 20px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.12); border-radius: 12px; 
        display: flex; flex-direction: column; gap: 12px; width: 310px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;

    // Cấu trúc lại Header để có nút Đóng (X)
    panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 12px; margin-bottom: 4px;">
            <div style="font-size: 17px; font-weight: 700; color: #005ae0;">🚀 Zalo Bulk Out Group</div>
            <button id="btn-close-panel" style="background: none; border: none; font-size: 22px; cursor: pointer; color: #999; padding: 0 5px; line-height: 1;">&times;</button>
        </div>
        
        <button id="btn-inject-cb" style="background: #e5efff; color: #005ae0; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">1. Bật Checkbox Chọn Nhóm</button>
        <button id="btn-select-all" style="background: #f4f5f7; color: #333; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">2. Chọn / Bỏ chọn (Màn hình hiện tại)</button>
        <button id="btn-run-out" style="background: #cf1b1b; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">3. Rời các nhóm đã chọn</button>
        <button id="btn-stop" style="background: #ff9800; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; display: none;">⏹ Dừng tiến trình</button>
        
        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; border: 1px solid #eee;">
            <div id="zalo-bulk-status" style="text-align: center; font-size: 15px; font-weight: 700; color: #333; margin-bottom: 5px;">Đã chọn: <span id="count-number" style="color: #005ae0;">0</span> nhóm</div>
            <div id="zalo-action-log" style="font-size: 12px; color: #666; text-align: center; font-style: italic;">Vui lòng bấm nút số 1 để bắt đầu</div>
        </div>
    `;

    document.body.appendChild(panel);

    // Sự kiện Đóng Panel
    document.getElementById('btn-close-panel').addEventListener('click', () => {
        panel.style.display = 'none';
    });

    document.getElementById('btn-inject-cb').addEventListener('click', startAutoInject);
    document.getElementById('btn-select-all').addEventListener('click', toggleSelectAllVisible);
    document.getElementById('btn-run-out').addEventListener('click', startBulkLeave);
    document.getElementById('btn-stop').addEventListener('click', () => { isRunning = false; });
}

// ... (Các hàm updateUI, injectCheckboxesAutomated, startBulkLeave, processLeaveSingleGroup giữ nguyên) ...

// ==========================================
// THAY THẾ DÒNG CUỐI CÙNG "setTimeout(createControlPanel, 3000);" BẰNG ĐOẠN NÀY:
// ==========================================

// Lắng nghe sự kiện click icon từ background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "togglePanel") {
        const panel = document.getElementById('zalo-bulk-panel');
        if (!panel) {
            createControlPanel(); // Lần đầu bấm: Tạo mới
        } else {
            // Các lần sau: Ẩn/Hiện
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        }
    }
});

// Khởi chạy sau khi Zalo tải xong
setTimeout(createControlPanel, 3000);