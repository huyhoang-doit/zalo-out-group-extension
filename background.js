chrome.action.onClicked.addListener((tab) => {
    // Chỉ kích hoạt khi đang ở trang Zalo
    if (tab.url && tab.url.includes("chat.zalo.me")) {
        chrome.tabs.sendMessage(tab.id, { action: "togglePanel" });
    }
});