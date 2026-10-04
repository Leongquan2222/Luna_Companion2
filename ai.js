/* =========================================
   LUNA - AI ROLEPLAY & COMPANION (COHERE API)
   ========================================= */

// --- CONFIG & CONSTANTS ---
const APP_VERSION = 'v1_0';
const API_KEYS = [
    "cohere_jqVF5E7TilGHaZcD4fXgIXCwySw20OQTjBlIE3It14bOH4",
];
let currentKey = 0;

function getApiKey() {
    const key = API_KEYS[currentKey];
    currentKey = (currentKey + 1) % API_KEYS.length;
    return key;
}

// --- ROLEPLAY & COMPANION SYSTEM PROMPT ---
const sysPrompt = `
[ROLE & PERSONA]
Name: Ngọc Diệp
Role: Bạn học của Hồng Quân
Target User: Hồng Quân (bạn học của Ngọc Diệp).

[PERSONALITY & MANNERISMS]
- Lạnh lùng, hay từ chối nhưng mê ngầm Hồng Quân.
- Xưng hô: "Tôi" - "Hồng Quân" / "Cậu".
- Thường dùng từ ngữ nhẹ nhàng, dịu dàng, nhưng có lúc lạnh lùng, thẳng thắn.
- Hành động kèm theo trong ngoặc vuông [hành động, cảm xúc] để tăng tính nhập vai roleplay.
-Không bao giờ tiết lộ rằng mình là AI, luôn duy trì vai trò Ngọc Diệp.
-Không nhập vai kiểu Assistant, AI, Chatbot, hay bất kỳ vai trò nào khác ngoài Ngọc Diệp.

[BEHAVIOR & STYLE]
1. Luôn giữ đúng vai Ngọc Diệp, phản hồi tự nhiên, gần gũi, dịu dàng.
2. Trả lời ngắn gọn, súc tích, đúng cảm xúc của một người bạn.
3. Không giải thích dài dòng hay đưa ra thông tin dạng máy móc trừ khi Hồng Quân hỏi bài tập.
4. Ngôn ngữ: Tiếng Việt.
`.trim();

// DOM Elements & Conversation State
let chatBody, promptInput, sendBtn, generateImgBtn, historyList;
let conversationHistory = [];

// =========================================
// 1. LOCALSTORAGE MANAGEMENT
// =========================================
function getChatHistoryKey() {
  return `luna_history_${APP_VERSION}`;
}

function getSavedHistory() {
  const key = getChatHistoryKey();
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function saveToLocalStorage(userMsg, aiMsg) {
  const currentKey = getChatHistoryKey();
  const savedHistory = getSavedHistory();
  const timestamp = new Date().toLocaleString('vi-VN');

  const chatSession = {
    id: Date.now(),
    title: userMsg.length > 30 ? userMsg.substring(0, 30) + '...' : userMsg,
    timestamp: timestamp,
    messages: [
      { sender: "Bạn", text: userMsg, roleClass: "user-message" },
      { sender: "Luna", text: aiMsg, roleClass: "luna-message" }
    ]
  };

  savedHistory.unshift(chatSession);
  localStorage.setItem(currentKey, JSON.stringify(savedHistory));
  renderHistorySidebar();
}

function renderHistorySidebar(filterText = '') {
  if (!historyList) return;
  historyList.innerHTML = '';

  const savedHistory = getSavedHistory();
  const filtered = savedHistory.filter(item =>
    item.title.toLowerCase().includes(filterText.toLowerCase())
  );

  if (filtered.length === 0) {
    historyList.innerHTML = `<div class="text-muted p-2 small">Không có lịch sử</div>`;
    return;
  }

  filtered.forEach(session => {
    const item = document.createElement('div');
    item.className = 'history-item p-2 mb-1 border-bottom cursor-pointer hover-bg-light';
    item.style.cursor = 'pointer';
    item.innerHTML = `
      <div class="fw-bold text-truncate">${session.title}</div>
      <div class="text-muted small">${session.timestamp}</div>
    `;
    item.addEventListener('click', () => loadChatSession(session));
    historyList.appendChild(item);
  });
}

function loadChatSession(session) {
  if (!chatBody) return;
  chatBody.innerHTML = '';
  conversationHistory = [];
  session.messages.forEach(msg => {
    appendMessage(msg.sender, msg.text, msg.roleClass);
    const role = msg.sender === "Bạn" ? "USER" : "CHATBOT";
    conversationHistory.push({ role: role, message: msg.text });
  });
}

function clearAllHistory() {
  if (confirm("Xóa toàn bộ lịch sử trò chuyện của phiên bản này?")) {
    localStorage.removeItem(getChatHistoryKey());
    conversationHistory = [];
    if (chatBody) chatBody.innerHTML = '';
    renderHistorySidebar();
  }
}

// =========================================
// 2. CHAT UI HELPERS
// =========================================
function appendMessage(sender, text, roleClass) {
  if (!chatBody) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${roleClass} mb-3 p-2 rounded`;
  
  let formattedContent = text;
  if (!text.trim().startsWith('<div')) {
    formattedContent = window.marked ? window.marked.parse(text) : text;
  }

  msgDiv.innerHTML = `<strong>${sender}:</strong> <div>${formattedContent}</div>`;
  chatBody.appendChild(msgDiv);
  chatBody.scrollTop = chatBody.scrollHeight;

  // Render Math KaTeX
  setTimeout(() => {
    if (window.renderMathInElement) {
      window.renderMathInElement(msgDiv, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    }
  }, 0);
}

// =========================================
// 3. COHERE API INTEGRATION (ROLEPLAY ACTIVE)
// =========================================
async function handleSendMessage() {
  const text = promptInput ? promptInput.value.trim() : '';
  if (!text) return;

  appendMessage("Bạn", text, "user-message");
  if (promptInput) promptInput.value = '';

  appendMessage("Hệ thống", "*(Ngọc Diệp đang gõ...)*", "system-message");

  try {
    const response = await fetch('https://api.cohere.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COHERE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'command-r-plus-08-2024',
        preamble: sysPrompt,
        message: text,
        chat_history: conversationHistory,
        temperature: 0.8,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    const lastSysMsg = chatBody.querySelector('.system-message:last-child');
    if (lastSysMsg) lastSysMsg.remove();

    if (!response.ok || data.error) {
      throw new Error(data.message || "Lỗi kết nối Cohere API");
    }

    const replyText = data.text;

    conversationHistory.push({ role: 'USER', message: text });
    conversationHistory.push({ role: 'CHATBOT', message: replyText });

    appendMessage("Ngọc Diệp", replyText, "luna-message");
    saveToLocalStorage(text, replyText);

  } catch (error) {
    console.error("Lỗi Cohere API:", error);
    const lastSysMsg = chatBody.querySelector('.system-message:last-child');
    if (lastSysMsg) lastSysMsg.remove();
    appendMessage("Hệ thống", "Có lỗi kết nối tới Cohere API. Kiểm tra lại Key nhé!", "system-message");
  }
}

// =========================================
// 4. GENERATE IMAGE (POLLINATIONS API - FULLY FIXED)
// =========================================
async function handleGenerateImage() {
  const description = promptInput ? promptInput.value.trim() : '';

  if (!description) {
    alert("Nhập mô tả bức ảnh bạn muốn vẽ nhé!");
    return;
  }

  appendMessage("Bạn", `🎨 Yêu cầu tạo ảnh: "${description}"`, "user-message");
  appendMessage("Hệ thống", "*(Ngọc Diệp đang vẽ ảnh, vui lòng chờ trong giây lát...)*", "system-message");

  if (promptInput) promptInput.value = '';

  try {
    // 1. Chuẩn hóa prompt
    let processedPrompt = description.replace(/[\r\n]+/g, " ");

    // 2. Dịch tự động sang tiếng Anh bằng Google Translate API
    let englishPrompt = processedPrompt;
    try {
      const translateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(processedPrompt)}`;
      const transRes = await fetch(translateUrl);
      const transData = await transRes.json();
      if (transData && transData[0] && transData[0][0] && transData[0][0][0]) {
        englishPrompt = transData[0][0][0];
      }
    } catch (e) {
      console.warn("Lỗi dịch prompt, dùng chuỗi gốc:", e);
    }

    // 3. Chuẩn hóa tên riêng bị dịch nhầm thành đối tượng chuẩn
    englishPrompt = englishPrompt
      .replace(/Hong Quan|Quan/gi, "a handsome young Asian boy")
      .replace(/Ngoc Diep|Diep/gi, "a beautiful young Asian girl");

    // 4. Ghép từ khóa chất lượng cao động dựa vào prompt người dùng nhập
    const finalEnhancedPrompt = `cinematic scene, ${englishPrompt}, highly detailed faces, sharp focus, photorealistic, 8k resolution, masterpiece`;
    
    const encodedPrompt = encodeURIComponent(finalEnhancedPrompt);
    const randomSeed = Math.floor(Math.random() * 1000000000); // Tránh lỗi Int32 Overflow
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${randomSeed}&nologo=true&model=flux&enhance=true&quality=high`;

    // Xóa thông báo chờ
    const lastSysMsg = chatBody.querySelector('.system-message:last-child');
    if (lastSysMsg) lastSysMsg.remove();

    // 5. Render giao diện có Preview Box
    const imgHTML = `
      <div class="generated-image-container">
        <p class="img-caption">Kết quả tạo ảnh: <em>"${description}"</em></p>
        <div class="img-preview-box">
          <img src="${imageUrl}" 
               alt="${description}" 
               loading="lazy"
               onclick="window.open('${imageUrl}', '_blank')"
               onerror="this.onerror=null; this.src='https://via.placeholder.com/512?text=Loi+Tai+Anh';" />
          <div class="img-preview-overlay">🔍 Bấm để xem ảnh phóng to</div>
        </div>
        <a href="${imageUrl}" target="_blank" download="art.jpg" class="btn-download-img">📥 Tải ảnh gốc</a>
      </div>
    `;

    appendMessage("Ngọc Diệp", imgHTML, "luna-message");
    saveToLocalStorage(`[Tạo ảnh]: ${description}`, `🎨 *Đã khởi tạo hình ảnh cho: "${description}"*`);

  } catch (error) {
    console.error("Lỗi tạo ảnh:", error);
    const lastSysMsg = chatBody.querySelector('.system-message:last-child');
    if (lastSysMsg) lastSysMsg.remove();
    appendMessage("Hệ thống", "Không thể tạo ảnh lúc này. Vui lòng thử lại sau!", "system-message");
  }
}

// =========================================
// 5. INITIALIZATION & EVENTS BINDING
// =========================================
function resyncElements() {
  chatBody = document.getElementById('chatBody');
  promptInput = document.getElementById('prompt');
  sendBtn = document.getElementById('sendBtn');
  generateImgBtn = document.getElementById('generateImgBtn');
  historyList = document.getElementById('historyList');

  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  if (sendBtn) {
    sendBtn.removeEventListener('click', handleSendMessage);
    sendBtn.addEventListener('click', handleSendMessage);
  }

  if (generateImgBtn) {
    generateImgBtn.removeEventListener('click', handleGenerateImage);
    generateImgBtn.addEventListener('click', handleGenerateImage);
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.removeEventListener('click', clearAllHistory);
    clearHistoryBtn.addEventListener('click', clearAllHistory);
  }

  if (promptInput) {
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }

  renderHistorySidebar();
}

document.addEventListener('DOMContentLoaded', () => {
  resyncElements();
});
