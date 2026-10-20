/* 共通部品: ヘッダー・フッター・広告枠・PDFライブラリ読み込み・ダウンロード補助 */
(function () {
  // ▼ 広告を出すときだけここを設定する(空のままなら広告枠は表示されません)
  //   例: ADSENSE_CLIENT = "ca-pub-1234567890123456"; ADSENSE_SLOT = "1234567890";
  var ADSENSE_CLIENT = "";
  var ADSENSE_SLOT = "";
  // ▼ 公開後のメールアドレス(お問い合わせページに表示)
  window.CONTACT_EMAIL = "";

  var SITE = "かんたんPDF書類ツール";
  var NAV = [
    ["index.html", "トップ"],
    ["forms.html", "書類を一気に入力"],
    ["merge.html", "結合"],
    ["split.html", "分割・抽出"],
    ["text.html", "文字を入力"]
  ];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  var BASE = /\/app\/[^\/]*$/.test(location.pathname) ? "../" : "";
  function header() {
    var here = location.pathname.split("/").pop() || "index.html";
    var nav = NAV.map(function (n) {
      return '<a href="' + BASE + n[0] + '"' + (n[0] === here ? ' style="color:#1f6feb;font-weight:700"' : "") + ">" + n[1] + "</a>";
    }).join("");
    return '<div class="in"><a class="logo" href="' + BASE + 'index.html">' + esc(SITE) + '</a><nav>' + nav + "</nav></div>";
  }
  function footer() {
    return '<div class="in"><span>© ' + new Date().getFullYear() + " " + esc(SITE) + '</span>' +
      '<a href="' + BASE + 'privacy.html">プライバシーポリシー</a><a href="' + BASE + 'contact.html">お問い合わせ</a>' +
      '<span>PDFはお使いの端末の中だけで処理され、サーバーには送信されません。</span></div>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    var h = document.querySelector("header.site"); if (h) h.innerHTML = header();
    var f = document.querySelector("footer.site"); if (f) f.innerHTML = footer();

    var ads = document.querySelectorAll(".ad");
    if (!ADSENSE_CLIENT) {
      ads.forEach(function (a) { a.style.display = "none"; });
    } else {
      var s = document.createElement("script");
      s.async = true; s.crossOrigin = "anonymous";
      s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + ADSENSE_CLIENT;
      document.head.appendChild(s);
      ads.forEach(function (a) {
        a.innerHTML = '<ins class="adsbygoogle" style="display:block;width:100%" data-ad-client="' + ADSENSE_CLIENT +
          '" data-ad-slot="' + ADSENSE_SLOT + '" data-ad-format="auto" data-full-width-responsive="true"></ins>';
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
      });
    }
  });

  /* ---- ライブラリ読み込み ---- */
  var CDN = {
    pdflib: "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",
    pdfjs: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    pdfjsWorker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
  };
  var loaded = {};
  function load(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.onload = res;
      s.onerror = function () { rej(new Error("部品の読み込みに失敗しました。通信状況を確認してください。")); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }
  window.loadPdfLib = function () { return load(CDN.pdflib).then(function () { return window.PDFLib; }); };
  window.loadPdfJs = function () {
    return load(CDN.pdfjs).then(function () {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfjsWorker;
      return window.pdfjsLib;
    });
  };

  /* ---- 補助 ---- */
  window.readBuf = function (file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(new Error("ファイルを読み込めませんでした。")); };
      r.readAsArrayBuffer(file);
    });
  };
  window.fmtSize = function (n) {
    return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  };
  window.downloadBytes = function (bytes, name) {
    var blob = new Blob([bytes], { type: "application/pdf" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  };
  window.setStatus = function (el, msg, isErr) {
    el.textContent = msg || ""; el.className = "status" + (isErr ? " err" : "");
  };
  /* ドロップ領域とファイル選択の共通処理 */
  window.bindDrop = function (drop, input, onFiles) {
    drop.addEventListener("click", function () { input.click(); });
    input.addEventListener("change", function () { if (input.files.length) onFiles(Array.from(input.files)); input.value = ""; });
    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); });
    });
    drop.addEventListener("drop", function (e) {
      var fs = Array.from(e.dataTransfer.files || []);
      if (fs.length) onFiles(fs);
    });
  };
  /* "1,3-5" → [0,2,3,4] (0始まり) */
  window.parseRanges = function (text, max) {
    var out = [], seen = {};
    text.split(/[,、\s]+/).filter(Boolean).forEach(function (p) {
      p = p.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }).replace(/[-ー〜~－]/g, "-");
      var m = p.match(/^(\d+)(?:-(\d+))?$/);
      if (!m) throw new Error("「" + p + "」は読み取れません。例: 1,3-5");
      var a = +m[1], b = m[2] ? +m[2] : a;
      if (a < 1 || b < a || b > max) throw new Error("ページ番号は 1〜" + max + " の範囲で指定してください。");
      for (var i = a; i <= b; i++) if (!seen[i]) { seen[i] = 1; out.push(i - 1); }
    });
    if (!out.length) throw new Error("ページ番号を入力してください。");
    return out;
  };
})();
