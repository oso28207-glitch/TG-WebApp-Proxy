// ═══════════════════════════════════════════════════════════════
// TG-WebApp-Proxy — main.js
// نقطة الدخول الرئيسية للتطبيق
// ═══════════════════════════════════════════════════════════════

import { TGDownloader } from './tg-downloader.js';
import { initUI } from './ui.js';

// ═══════════════════════════════════════════════════════════════
// تحميل الإعدادات
// ═══════════════════════════════════════════════════════════════
function loadSettings() {
  try {
    const raw = localStorage.getItem('tgcf_settings_bot')
             || localStorage.getItem('tgcf_settings_user')
             || localStorage.getItem('tgcf_settings');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    workers: 4,
    chunkSize: 524288,
    proxyEnabled: false,
    proxyDomain: '',
    stealth: false,
  };
}

// ═══════════════════════════════════════════════════════════════
// Embed Mode — يعرض الفيديو مباشرة داخل iframe
// ═══════════════════════════════════════════════════════════════
async function runEmbedMode(tgUrl) {
  const setText = (t) => {
    const el = document.getElementById('embedText');
    if (el) el.textContent = t;
    if (window.parent !== window) {
      try { window.parent.postMessage({ type: 'tg-embed-progress', text: t }, '*'); } catch (e) {}
    }
  };

  const showVideo = (blobUrl) => {
    document.getElementById('app').innerHTML = `
      <video id="embedPlayer" src="${blobUrl}" controls autoplay playsinline
             style="width:100%;height:100%;object-fit:contain;background:#000;"></video>
    `;
    const v = document.getElementById('embedPlayer');
    if (v && v.play) v.play().catch(() => {});
  };

  const showError = (msg) => {
    document.getElementById('app').innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;padding:24px;text-align:center;color:#ddd;font-family:Cairo,sans-serif;">
        <div style="font-size:3rem;">❌</div>
        <h3 style="margin:0;">فشل تحميل الفيديو</h3>
        <p style="color:#999;max-width:420px;line-height:1.7;">${msg}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
          <a href="${tgUrl}" target="_blank" style="padding:10px 20px;background:#e50914;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">📱 فتح في تليجرام</a>
          <button onclick="location.reload()" style="padding:10px 20px;background:#2a2a33;color:#ddd;border:1px solid #444;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;">🔄 إعادة المحاولة</button>
        </div>
      </div>
    `;
    if (window.parent !== window) {
      try { window.parent.postMessage({ type: 'tg-embed-error', message: msg }, '*'); } catch (e) {}
    }
  };

  // ─── الحصول على الاعتماد ───
  const temp = new TGDownloader(() => {}, () => {});
  let saved = temp.getSavedCredentials();

  // إذا لم توجد محلياً، اطلب من الصفحة الأم
  if (!saved || !saved.apiId || !saved.apiHash || !saved.botToken) {
    setText('جاري طلب بيانات الجلسة...');

    if (window.parent !== window) {
      try { window.parent.postMessage({ type: 'tg-embed-request-creds' }, '*'); } catch (e) {}
    }

    saved = await new Promise((resolve) => {
      const handler = (event) => {
        if (event.data && event.data.type === 'tg-embed-creds') {
          window.removeEventListener('message', handler);
          resolve(event.data.credentials || null);
        }
      };
      window.addEventListener('message', handler);
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, 6000);
    });
  }

  // محاولة أخيرة من localStorage المحلي
  if (!saved || !saved.apiId || !saved.apiHash || !saved.botToken) {
    saved = temp.getSavedCredentials();
  }

  if (!saved || !saved.apiId || !saved.apiHash || !saved.botToken) {
    showError(
      'لا توجد جلسة مسجّلة. افتح الصفحة الرئيسية للمشغل وسجّل الدخول أولاً، ثم أعد تحميل هذه الصفحة.'
    );
    return;
  }

  // ─── تحليل الرابط ───
  let parsed = null;
  let m = tgUrl.match(/t\.me\/c\/(\d+)\/(\d+)/);
  if (m) parsed = { channel: '-100' + m[1], messageId: parseInt(m[2], 10) };
  if (!parsed) {
    m = tgUrl.match(/t\.me\/([A-Za-z0-9_]{4,})\/(\d+)/);
    if (m) parsed = { channel: m[1], messageId: parseInt(m[2], 10) };
  }
  if (!parsed) {
    showError('رابط تليجرام غير صالح');
    return;
  }

  setText('جاري الاتصال بـ Telegram...');

  const settings = loadSettings();
  const dl = new TGDownloader(
    (type, msg) => console.log(`[embed:${type}] ${msg}`),
    (p) => {
      const pct = Math.max(0, Math.min(100, Number(p.percent) || 0));
      setText(`جاري تحميل الفيديو... ${Math.round(pct)}%`);
    },
    settings
  );

  try {
    await dl.connect(saved.apiId, saved.apiHash, saved.botToken);
    setText('جاري جلب معلومات الملف...');
    const ref = await dl.fetchFileInfo(parsed.channel, parsed.messageId, tgUrl);
    setText('جاري التحميل...');
    const result = await dl.downloadFile(ref);
    const blob = result && result.blob ? result.blob : result;
    const url = URL.createObjectURL(blob);
    try { await dl.disconnect(); } catch (e) {}
    showVideo(url);

    if (window.parent !== window) {
      try { window.parent.postMessage({ type: 'tg-embed-success' }, '*'); } catch (e) {}
    }
  } catch (e) {
    console.error('[embed] error:', e);
    showError(e.message || String(e));
  }
}

// ═══════════════════════════════════════════════════════════════
// نقطة البداية
// ═══════════════════════════════════════════════════════════════
function boot() {
  const params = new URLSearchParams(location.search);
  const embed = params.get('embed');
  const url = params.get('url');

  // ─── Embed Mode ───
  if (embed === '1' && url) {
    document.getElementById('app').innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;background:#0b0b0f;color:#4ea8de;font-family:Cairo,sans-serif;">
        <div style="width:44px;height:44px;border:3px solid #222;border-top-color:#4ea8de;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <span id="embedText">جاري التحضير...</span>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      </div>
    `;

    // إرسال رسالة جاهزية إلى الصفحة الأم
    if (window.parent !== window) {
      try { window.parent.postMessage({ type: 'tg-embed-ready' }, '*'); } catch (e) {}
    }

    runEmbedMode(url).catch((e) => {
      console.error('[embed] fatal:', e);
      if (window.parent !== window) {
        try {
          window.parent.postMessage({ type: 'tg-embed-error', message: String(e) }, '*');
        } catch (err) {}
      }
    });
    return;
  }

  // ─── Normal Mode ───
  initUI();
}

// تشغيل عند تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// تصدير للاستخدام الخارجي
export { runEmbedMode, loadSettings };
