/*
 * Goku OS - Background Worker
 */

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

chrome.runtime.onMessage.addListener((e, t, s) => {
  
  // ========================================
  // 1. IP & SCAMALYTICS RISK SCORE
  // ========================================
  if (e && e.action === "getIpAndRisk") {
      (async () => {
          try {
              // Fetch IP from ipify
              const ipFetch = await fetch("https://api.ipify.org?format=json");
              const ipData = await ipFetch.json();
              const ipStr = ipData.ip || "—";
              
              let r = 0;           // Risk Score
              let o = "Low";       // Risk Label
              let c = "risk-low";  // CSS Class

              try {
                  if (ipStr !== "—") {
                      // Fetch from Scamalytics API using the structure you provided
                      const scamRes = await fetch(`https://api11.scamalytics.com/v3/6997fed1ad07f/?key=cab54eaa2517fa28d0cb03c84970af49e290cbd568d285d12cba4a3c2ccb18e3&ip=${ipStr}`);
                      const scamData = await scamRes.json();
                      
                      // Check if the nested 'scamalytics' object exists in the response
                      if (scamData && scamData.scamalytics) {
                          r = parseInt(scamData.scamalytics.scamalytics_score, 10);
                          const riskLevel = (scamData.scamalytics.scamalytics_risk || "").toLowerCase();
                          
                          // Map Scamalytics Risk Label to Dashboard UI Classes
                          if (riskLevel.includes("high")) {
                              o = "High";
                              c = "risk-high";
                          } else if (riskLevel.includes("medium")) {
                              o = "Medium";
                              c = "risk-medium";
                          } else {
                              o = "Low";
                              c = "risk-low";
                          }
                      }
                  }
              } catch (err) {
                  console.error("Scamalytics Error:", err);
              }
              
              // Send the parsed data back to content.js
              s({ ip: ipStr, riskScore: r, riskLabel: o, riskClass: c });
          } catch (err) {
              s({ ip: "—", riskScore: 0, riskLabel: "?", riskClass: "risk-low" });
          }
      })();
      return true; // Keep message channel open for async response
  }

  // ========================================
  // 2. LOGGING, NOTIFICATIONS & SCREENSHOTS
  // ========================================
  if ("log" !== e.action) {
      if ("show_notification" !== e.type && "show_notification" !== e.action) {
          if ("capture_and_send" === e.action) {
              try {
                  const r = t.tab?.id;
                  const o = t.tab?.windowId;
                  if (!r || !o) {
                      s({ status: "error", message: "No tab info" });
                      return true;
                  }
                  chrome.tabs.update(r, { active: !0 }, () => {
                      if (chrome.runtime.lastError) {
                          s({ status: "error", message: chrome.runtime.lastError?.message });
                          return;
                      }
                      setTimeout(() => {
                          try {
                              chrome.tabs.captureVisibleTab(o, { format: "png" }, (screenshotUrl) => {
                                  if (chrome.runtime.lastError || !screenshotUrl) {
                                      s({ status: "error", message: chrome.runtime.lastError?.message || "Capture failed" });
                                      return;
                                  }
                                  try {
                                      const filename = `Success_Payment_${e.card || "Unknown"}_${Date.now()}.png`;
                                      chrome.downloads.download({ url: screenshotUrl, filename: filename, saveAs: !1 });
                                  } catch (dlErr) {}
                                  s({ status: "success", screenshotUrl: screenshotUrl });
                              });
                          } catch (capErr) {
                              s({ status: "error", message: "captureVisibleTab not supported" });
                          }
                      }, 800);
                  });
              } catch (err) {
                  s({ status: "error", message: err.message || "Unknown error" });
              }
              return true;
          }
      } else {
          chrome.notifications.create({
              type: "basic",
              iconUrl: "icons/icon64.png",
              title: e.title || "GokuOS Alert",
              message: e.message || "Notification received."
          });
      }
  } else {
      const logData = { time: new Date().toISOString(), data: e.data };
      chrome.storage.local.get(["consoleLogs"], (res => {
          const logs = res.consoleLogs || [];
          if (logs.length > 100) logs.shift();
          logs.push(logData);
          chrome.storage.local.set({ consoleLogs: logs });
      }));
  }
});

// ========================================
// 3. PROXY & HCAPTCHA
// ========================================
const HCAPTCHA_FILTER = { urls: ["*://*.hcaptcha.com/*checksiteconfig*"] };

function parseProxyLine(e) {
  if (!(e = (e || "").trim())) return null;
  let t = "http", s = e;
  
  if (/^socks5:\/\//i.test(e)) { t = "socks5"; s = e.replace(/^socks5:\/\//i, ""); }
  else if (/^socks4:\/\//i.test(e)) { t = "socks4"; s = e.replace(/^socks4:\/\//i, ""); }
  else if (/^https:\/\//i.test(e)) { t = "https"; s = e.replace(/^https:\/\//i, ""); }
  else if (/^http:\/\//i.test(e)) { t = "http"; s = e.replace(/^http:\/\//i, ""); }
  
  const r = s.split(":");
  if (r.length < 2) return null;
  
  const o = r[0], c = parseInt(r[1], 10) || 8080;
  let a = "", i = "";
  
  if (r.length >= 4) {
      a = r[2];
      i = r.slice(3).join(":");
  } else if (r.length === 3) {
      a = r[2];
  }
  
  return { type: t, scheme: t === "socks5" ? "socks5" : t === "socks4" ? "socks4" : t === "https" ? "https" : "http", host: o, port: c, user: a, pass: i };
}

function applyProxy() {
  chrome.storage.sync.get(["proxyEnabled", "proxyType", "proxyHost", "proxyPort", "proxyUser", "proxyPass"], (e => {
      chrome.storage.local.get(["proxyList"], (t => {
          if (!chrome.proxy || !chrome.proxy.settings) return;
          
          if (!e.proxyEnabled) {
              chrome.proxy.settings.set({ value: { mode: "direct" }, scope: "regular" });
              chrome.storage.local.remove(["currentProxy"]);
              return;
          }
          
          let s = null;
          const r = Array.isArray(t.proxyList) ? t.proxyList.filter(Boolean) : [];
          
          if (r.length > 0) {
              s = parseProxyLine(r[Math.floor(Math.random() * r.length)]);
          }
          
          if (!s && e.proxyHost && e.proxyPort) {
              s = {
                  scheme: (e.proxyType || "http").toLowerCase().replace("socks5", "socks5").replace("socks4", "socks4").replace("https", "https") || "http",
                  host: e.proxyHost,
                  port: parseInt(e.proxyPort, 10) || 8080,
                  user: e.proxyUser || "",
                  pass: e.proxyPass || ""
              };
          }
          
          if (!s || !s.host) {
              chrome.proxy.settings.set({ value: { mode: "direct" }, scope: "regular" });
              chrome.storage.local.remove(["currentProxy"]);
              return;
          }
          
          const o = s.scheme === "socks5" ? "socks5" : s.scheme === "socks4" ? "socks4" : s.scheme === "https" ? "https" : "http";
          chrome.proxy.settings.set({
              value: { mode: "fixed_servers", rules: { singleProxy: { host: s.host, port: s.port, scheme: o } } },
              scope: "regular"
          });
          
          chrome.storage.local.set({ currentProxy: { user: s.user, pass: s.pass } });
      }));
  }));
}

function initProxy() { applyProxy(); }

chrome.webRequest.onCompleted.addListener((e => {
  if (200 === e.statusCode && e.tabId >= 0) {
      chrome.tabs.sendMessage(e.tabId, { type: "HCAPTCHA_TRIGGER_NOW", url: e.url }).catch((() => {}));
  }
}), HCAPTCHA_FILTER);

initProxy();
setTimeout(initProxy, 500);

chrome.storage.onChanged.addListener(((e, t) => {
  if ("sync" === t && ["proxyEnabled", "proxyType", "proxyHost", "proxyPort", "proxyUser", "proxyPass"].some(key => e[key])) {
      applyProxy();
  }
  if ("local" === t && e.proxyList) {
      applyProxy();
  }
}));

chrome.webRequest.onAuthRequired.addListener(((e, t) => {
  if (e.isProxy) {
      chrome.storage.local.get(["currentProxy"], (res => {
          if (res.currentProxy && res.currentProxy.user && res.currentProxy.pass) {
              t({ authCredentials: { username: res.currentProxy.user, password: res.currentProxy.pass } });
          } else {
              t();
          }
      }));
      return true;
  }
  t();
}), { urls: ["<all_urls>"] }, ["asyncBlocking"]);