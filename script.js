// helpers
const $ = (s, ctx = document) => ctx.querySelector(s);
const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const G = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : d;
  } catch {
    return d;
  }
};

// defaults
const defaults_local = {
  links_tools: [
    {
      name: "GitHub",
      url: "https://github.com/dashboard",
      desc: "GitHub Dashboard",
    },
    {
      name: "Exploit-DB",
      url: "https://www.exploit-db.com/",
      desc: "PoCs & exploits",
    },
    { name: "Hacker News", url: "https://news.ycombinator.com/", desc: "HN" },
    {
      name: "Hack The Box",
      url: "https://app.hackthebox.com/home",
      desc: "HTB",
    },
    { name: "TryHackMe", url: "https://tryhackme.com/", desc: "THM" },
    { name: "Shodan", url: "https://www.shodan.io/", desc: "Internet-scans" },
    { name: "Censys", url: "https://search.censys.io/", desc: "Asset search" },
    {
      name: "VirusTotal",
      url: "https://www.virustotal.com/",
      desc: "File/URL rep",
    },
    {
      name: "Have I Been Pwned",
      url: "https://haveibeenpwned.com/",
      desc: "Breach checks",
    },
  ],
  links_learn: [
    { name: "GTFOBins", url: "https://gtfobins.github.io/", desc: "Priv-esc" },
    {
      name: "PayloadsAllTheThings",
      url: "https://github.com/swisskyrepo/PayloadsAllTheThings",
      desc: "Payloads",
    },
    { name: "MITRE ATT&CK", url: "https://attack.mitre.org/", desc: "TTPs" },
    { name: "tldr pages", url: "https://tldr.sh/", desc: "CLI quickref" },
    { name: "Regex101", url: "https://regex101.com/", desc: "Regex helper" },
    {
      name: "CyberChef",
      url: "https://gchq.github.io/CyberChef/",
      desc: "Swiss‑Army knife",
    },
    {
      name: "OverTheWire",
      url: "https://overthewire.org/wargames/",
      desc: "Linux wargames",
    },
    {
      name: "PortSwigger Academy",
      url: "https://portswigger.net/web-security",
      desc: "Web app labs",
    },
    {
      name: "DFIR Training",
      url: "https://www.dfir.training/",
      desc: "Forensics hubs",
    },
    {
      name: "Blue Team Labs Online",
      url: "https://blueteamlabs.online/",
      desc: "Defense labs",
    },
    { name: "OWASP", url: "https://owasp.org/", desc: "Cheat sheets & guides" },
    {
      name: "SANS ISC",
      url: "https://isc.sans.edu/",
      desc: "Daily handler diary",
    },
    {
      name: "MITRE CVE",
      url: "https://cve.mitre.org/",
      desc: "Vuln directory",
    },
    {
      name: "Fedora Docs",
      url: "https://docs.fedoraproject.org/",
      desc: "Docs",
    },
  ],
  links_social: [
    { name: "Reddit", url: "https://www.reddit.com/", desc: "Front page" },
    { name: "LinkedIn", url: "https://www.linkedin.com/", desc: "Work" },
  ],
  rss_urls: [
    "https://hnrss.org/frontpage",
    "https://www.bleepingcomputer.com/feed/",
    "https://www.reddit.com/r/netsec/.rss",
    "https://krebsonsecurity.com/feed/",
    "https://www.darkreading.com/rss.xml",
    "https://feeds.feedburner.com/TheHackersNews",
    "https://threatpost.com/feed/",
    "https://isc.sans.edu/rssfeed_full.xml",
  ],
  rss_proxy: true,
  rss_count: 6,
  chat_action: "copy-open",
  duck: { hp: 10, hunger: 10, clean: 10, last: Date.now(), sleeping: false },
  duck_sleep: { start: "22:00", end: "06:00" },
};

function renderLinks(list, el) {
  if (!el) {
    console.warn("renderLinks: target missing");
    return;
  }
  const safe = Array.isArray(list) ? list : [];
  if (!safe.length) {
    el.innerHTML = '<div class="note">(no links) — open Settings</div>';
    return;
  }
  el.innerHTML = safe
    .map(
      (x) =>
        `<a class="link" href="${x.url}" target="_blank" rel="noopener">${x.name}${x.desc ? ` <small>— ${x.desc}</small>` : ""}</a>`,
    )
    .join("");
}

// RSS
async function fetchRss() {
  const listEl = $("#rssList");
  if (!listEl) return;
  listEl.innerHTML = '<div class="note">loading…</div>';
  const st = G("settings", defaults_local);
  const urls =
    Array.isArray(st.rss_urls) && st.rss_urls.length
      ? st.rss_urls
      : defaults_local.rss_urls;
  const useProxy = st.rss_proxy ?? true;
  const maxItems = st.rss_count || 6;
  const proxy = (u) =>
    useProxy
      ? `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`
      : u;
  const parse = (xmlText, sourceUrl) => {
    try {
      const p = new DOMParser().parseFromString(xmlText, "text/xml");
      const isAtom = !!p.querySelector("feed");
      const items = isAtom
        ? p.querySelectorAll("entry")
        : p.querySelectorAll("item");
      return Array.from(items)
        .slice(0, maxItems)
        .map((it) => {
          const title = (
            it.querySelector("title")?.textContent || "(no title)"
          ).trim();
          let link = sourceUrl;
          if (isAtom) {
            const ln = it.querySelector("link");
            link = ln?.getAttribute("href") || ln?.textContent || sourceUrl;
          } else {
            const ln = it.querySelector("link");
            link = ln?.textContent || ln?.getAttribute("href") || sourceUrl;
          }
          const date =
            it.querySelector("updated")?.textContent ||
            it.querySelector("pubDate")?.textContent ||
            "";
          const src = (() => {
            try {
              return new URL(sourceUrl).hostname;
            } catch {
              return sourceUrl;
            }
          })();
          return { title, link, date, src };
        });
    } catch {
      return [
        {
          title: `(failed) ${sourceUrl}`,
          link: sourceUrl,
          date: "",
          src: "error",
        },
      ];
    }
  };
  try {
    const all = [];
    for (const u of urls) {
      try {
        const r = await fetch(proxy(u));
        if (!r.ok) throw new Error(r.status);
        const txt = await r.text();
        all.push(...parse(txt, u));
      } catch (e) {
        all.push({
          title: `(feed failed) ${u}`,
          link: u,
          date: "",
          src: "error",
        });
      }
    }
    all.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    listEl.innerHTML = all
      .slice(0, maxItems)
      .map(
        (i) =>
          `<div class="item"><a href="${i.link}" target="_blank" rel="noopener">${i.title}</a><div class="meta">${i.src}${i.date ? ` • ${new Date(i.date).toLocaleString()}` : ""}</div></div>`,
      )
      .join("");
  } catch {
    listEl.innerHTML = '<div class="note">rss error</div>';
  }
}

// Duck
function loadDuck() {
  const store = G("settings", defaults_local);
  const st = store.duck || {
    hp: 10,
    hunger: 10,
    clean: 10,
    last: Date.now(),
    sleeping: false,
  };
  const sprite = $("#duckSprite"),
    stats = $("#duckStats"),
    log = $("#duckLog");
  const clamp = (x) => Math.max(0, Math.min(10, x));
  const save = () => {
    store.duck = st;
    S("settings", store);
  };
  const print = (m) => (log.textContent = `log: ${m}`);

  const autoSleepHours = () => {
    const conf = store.duck_sleep ||
      defaults_local.duck_sleep || { start: "22:00", end: "06:00" };
    const parse = (s) => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || ""));
      if (!m) return null;
      const h = +m[1],
        mi = +m[2];
      if (h > 23 || mi > 59) return null;
      return h * 60 + mi;
    };
    const n = new Date().getHours() * 60 + new Date().getMinutes();
    const s = parse(conf.start) ?? 22 * 60;
    const e = parse(conf.end) ?? 6 * 60;
    return e > s ? n >= s && n < e : n >= s || n < e;
  };

  function art() {
    const sum = st.hp + st.hunger + st.clean;
    if (st.sleeping) return "  __  zZ\n<( -)___\n ( _> /\n  `---'";
    if (sum > 24) return "  __\n<(o )___\n ( ._> /\n  `---'";
    if (sum > 15) return "  __\n<( .)___\n ( ._> /\n  `---'";
    if (sum > 8) return "  __\n<( -)___\n ( ._> /\n  `---'";
    return "  __\n<( x)___\n ( ._> /\n  `---'";
  }
  function render() {
    sprite.textContent = art();
    stats.textContent = `HP:${st.hp} HUNGER:${st.hunger} CLEAN:${st.clean}`;
  }

  function decay() {
    const shouldSleep = autoSleepHours();
    if (shouldSleep && !st.sleeping) {
      st.sleeping = true;
      print("night mode: sleeping");
      save();
    }
    if (!shouldSleep && st.sleeping) {
      st.sleeping = false;
      st.hp = clamp(st.hp + 2);
      print("morning: +2 HP");
      save();
    }
    const now = Date.now();
    const mins = Math.floor((now - (st.last || now)) / 60000);
    if (mins > 0) {
      const steps = Math.min(3, Math.floor(mins / 5));
      if (!st.sleeping) {
        st.hunger = clamp(st.hunger - steps);
        st.clean = clamp(st.clean - Math.floor(steps / 2));
      }
      st.hp = clamp(
        st.hp - (st.hunger === 0 ? 1 : 0) - (st.clean === 0 ? 1 : 0),
      );
      st.last = now;
      save();
    }
  }

  $("#duckFeed").addEventListener("click", () => {
    st.hunger = clamp(st.hunger + 2);
    st.hp = clamp(st.hp + 1);
    st.last = Date.now();
    print("feeding +2 HUNGER +1 HP");
    save();
    render();
  });
  $("#duckPlay").addEventListener("click", () => {
    st.hp = clamp(st.hp + 2);
    st.clean = clamp(st.clean - 1);
    st.last = Date.now();
    print("play +2 HP -1 CLEAN");
    save();
    render();
  });
  $("#duckClean").addEventListener("click", () => {
    st.clean = clamp(st.clean + 3);
    st.last = Date.now();
    print("bath +3 CLEAN");
    save();
    render();
  });
  $("#duckForage").addEventListener("click", () => {
    const r = Math.random();
    if (r < 0.15) {
      st.hp = clamp(st.hp - 1);
      print("cat! -1 HP");
    } else if (r < 0.45) {
      st.hunger = clamp(st.hunger + 2);
      print("seeds +2 HUNGER");
    } else if (r < 0.7) {
      st.clean = clamp(st.clean - 1);
      print("mud -1 CLEAN");
    } else {
      st.hp = clamp(st.hp + 1);
      print("friendly human +1 HP");
    }
    st.last = Date.now();
    save();
    render();
  });
  $("#duckNap").addEventListener("click", () => {
    st.sleeping = true;
    print("napping…");
    save();
    setTimeout(
      () => {
        st.sleeping = false;
        st.hp = clamp(st.hp + 2);
        print("woke +2 HP");
        save();
        render();
      },
      1000 * 60 * 5,
    );
  });

  decay();
  render();
  setInterval(() => {
    decay();
    render();
  }, 60000);
}

function initUI() {
  const dlg = $("#settings");
  $("#openSettings")?.addEventListener("click", () => {
    const st = G("settings", defaults_local);
    $("#set-rss").value = (st.rss_urls || []).join(", ");
    $("#set-rss-proxy").checked = !!(st.rss_proxy ?? true);
    $("#set-rss-count").value = st.rss_count || 6;
    $("#set-chatact").value = st.chat_action || "copy-open";
    $("#set-sleep-start").value = st.duck_sleep?.start || "22:00";
    $("#set-sleep-end").value = st.duck_sleep?.end || "06:00";
    dlg.showModal?.();
  });

  $("#apply")?.addEventListener("click", (e) => {
    e.preventDefault();
    try {
      const base = G("settings", defaults_local);
      const n = {
        ...base,
        rss_urls: ($("#set-rss").value || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        rss_proxy: $("#set-rss-proxy").checked,
        rss_count: Math.max(
          1,
          Math.min(50, parseInt($("#set-rss-count").value || 6)),
        ),
        chat_action: $("#set-chatact").value,
        duck_sleep: {
          start: $("#set-sleep-start").value || "22:00",
          end: $("#set-sleep-end").value || "06:00",
        },
      };
      S("settings", n);
      fetchRss();
      dlg.close?.();
    } catch (err) {
      alert("Settings save error: " + err.message);
    }
  });

  $("#reset")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Reset to curated CRT defaults?")) {
      S("settings", defaults_local);
      fetchRss();
      dlg.close?.();
    }
  });

  // chat actions
  $("#chatForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#chatInput").value.trim();
    if (!q) return;
    const st = G("settings", defaults_local);
    if ((st.chat_action || "copy-open") === "search") {
      window.open(
        `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
        "_blank",
      );
      return;
    }
    navigator.clipboard?.writeText(q).then(() => {
      toast("copied; opening gpt");
      window.open("https://chatgpt.com/", "_blank");
    });
  });
  $("#chatCopy")?.addEventListener("click", () => {
    const q = $("#chatInput").value.trim();
    if (!q) return;
    navigator.clipboard?.writeText(q).then(() => toast("copied"));
  });
  $("#openChat")?.addEventListener("click", () =>
    window.open("https://chatgpt.com/", "_blank"),
  );

  $("#refreshRss")?.addEventListener("click", fetchRss);
}

function loadAll() {
  const st = G("settings", defaults_local);

  const tools =
    st.links_tools && st.links_tools.length
      ? st.links_tools
      : defaults_local.links_tools;
  const learn =
    st.links_learn && st.links_learn.length
      ? st.links_learn
      : defaults_local.links_learn;
  const social =
    st.links_social && st.links_social.length
      ? st.links_social
      : defaults_local.links_social;

  renderLinks(tools, $("#links-tools"));
  renderLinks(learn, $("#links-learn"));
  renderLinks(social, $("#links-social"));

  if (st.background) {
    document.body.style.backgroundImage = st.background;
  }
}

function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1200);
}

// startup
document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("settings")) S("settings", defaults_local);
  loadAll();
  fetchRss();
  loadDuck();
  initUI();
});
