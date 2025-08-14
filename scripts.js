/* =========================================================
   BuildFast — unified, robust client script
   - Safe optional init for EmailJS & Supabase
   - Solid home page (+ button, search, gallery)
   - Wizard with 3 paths (custom / scratch / business)
   - Order submit → Supabase (if configured) + EmailJS (if configured)
   - Admin login + basic dashboard
   - Shop list (graceful if columns don’t exist yet)
   ========================================================= */

/* ---------------------------
   OPTIONAL SERVICES (guarded)
   --------------------------- */
let supa = null;
const CFG = (window.BF_CONFIG || {});
(function safeInit() {
  try {
    if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase) {
      supa = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    }
    if (CFG.EMAILJS_PUBLIC_KEY && window.emailjs && typeof window.emailjs.init === "function") {
      window.emailjs.init(CFG.EMAILJS_PUBLIC_KEY);
    }
  } catch (err) {
    console.warn("Optional services not available on this page:", err);
  }
})();

/* ---------------------------
   SMALL UTILITIES
   --------------------------- */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const uid = () => "P-" + Math.random().toString(36).slice(2, 10).toUpperCase();

/* ---------------------------
   SUPPLIER SHORTLISTS by tag
   (edit/extend freely)
   --------------------------- */
const SUPPLIERS = {
  electronics: [
    "Fab Lab CDMX — Mexico City",
    "La Nave Makerspace — Mexico City",
    "Lab121 FabLab — Alessandria"
  ],
  drones: [
    "Hacedores / community — Mexico City",
    "SetLaser (metal/laser) — Alessandria"
  ],
  "3dprint": [
    "Impresión 3D México — Mexico City",
    "AB Games (stampa 3D) — Alessandria",
    "FabLab Alessandria — Alessandria"
  ],
  laser: [
    "AC Corte y Grabado Láser — Mexico City",
    "Bussetti & Mazza (acrylic/laser) — Alessandria"
  ],
  cnc: [
    "JOBSHOP.mx (CNC) — Mexico City",
    "Carpenteria locale — Alessandria"
  ],
  wood: [
    "Router CNC providers — Mexico City",
    "Falegnamerie locali — Alessandria"
  ],
  textile: [
    "Maquilas de ropa — Mexico City",
    "Sartorie locali — Alessandria"
  ],
  apparel: [
    "Workshops apparel (CDMX) — Mexico City",
    "Confezioni locali — Alessandria"
  ],
  lighting: [
    "FabLab / LED suppliers — Alessandria",
    "Laser + acrylic vendors — Mexico City"
  ],
  metal: [
    "Laserist / metal services — Piemonte",
    "CNC aluminum shops — Mexico City"
  ],
  packaging: [
    "NOVO Empaques — Mexico City"
  ]
};
const uniq = arr => [...new Set(arr)];
const suppliersFor = (tags=[]) => uniq(tags.flatMap(t => SUPPLIERS[t] || [])).join("\n");

/* ---------------------------
   HOME PAGE (index.html)
   --------------------------- */
const GALLERY = [
  { id:"A-DRONE",  title:"Project A — Hawk FPV Drone",    img:"", tags:["drones","electronics"],   blurb:"5\" FPV kit + custom shell + LEDs" },
  { id:"B-LAMP",   title:"Project B — Tree Motion Lamp",  img:"", tags:["lighting","wood","electronics"], blurb:"USB-C, PIR auto-on, warm LED" },
  { id:"C-JACKET", title:"Project C — LED Festival Jacket", img:"", tags:["textile","electronics","lighting"], blurb:"ESP32, detachable LED panels" }
];

(function initHome(){
  const grid = $("#gallery-grid");
  if (!grid) return; // we’re not on the home page

  // Render cards (square, cover-fit handled by CSS)
  GALLERY.forEach(item => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="thumb">${item.img ? `<img src="${item.img}" alt="${item.title}">` : "Upload your own image"}</div>
      <h3>${item.title}</h3>
      <p>${item.blurb}</p>
      <div class="muted" style="font-size:12px">${item.tags.map(t => "#"+t).join(" ")}</div>
    `;
    grid.appendChild(card);
  });

  // Search → create.html?q=…
  const form = $("#top-search");
  form?.addEventListener("submit", (e)=>{
    e.preventDefault();
    const q = ($("#q")?.value || "").trim();
    const url = new URL("create.html", location.href);
    if (q) url.searchParams.set("q", q);
    location.href = url.toString();
  });

  // Floating + → create.html (carry query if present)
  const fab = $("#fab");
  if (fab) {
    fab.style.cursor = "pointer";
    fab.addEventListener("click", ()=>{
      const q = ($("#q")?.value || "").trim();
      const url = new URL("create.html", location.href);
      if (q) url.searchParams.set("q", q);
      location.href = url.toString();
    }, { passive:true });
  }
})();

/* ---------------------------
   WIZARD (create.html)
   - 3 paths: custom/scratch/business
   - Validations
   - Save → Supabase row (if supa)
   - Email → EmailJS (if configured)
   - JSON download (always)
   --------------------------- */
(function initWizard(){
  const form = $("#wizard-form");
  if (!form) return; // not on create.html

  // Stepper
  const steps = $$(".step");
  let current = 0;
  const show = i => { steps.forEach((s,k)=> s.hidden = (k!==i)); current = i; };
  show(0);

  // Prefill from ?q=
  const params = new URLSearchParams(location.search);
  const seed = params.get("q") || "";
  if (seed) $("#desc").value = seed;

  // Sketch previews
  const sketches = $("#sketches"), previews = $("#sketch-previews");
  sketches?.addEventListener("change", ()=>{
    previews.innerHTML = "";
    [...sketches.files].forEach(file=>{
      const u = URL.createObjectURL(file);
      const box = document.createElement("div");
      box.className = "preview";
      box.innerHTML = `<img src="${u}" alt="">`;
      previews.appendChild(box);
    });
  });

  // Next / Back buttons
  form.addEventListener("click", (e)=>{
    if (e.target.classList.contains("next")) {
      if (current===0) {
        // Minimal validation on step 1
        const desc = $("#desc").value.trim();
        const email = $("#cust-email").value.trim();
        const tags  = $$("input[name='tags']:checked").map(i=>i.value);
        if (!desc)  return alert("Please enter a short description.");
        if (!email) return alert("Please enter your email.");
        if (!tags.length) return alert("Pick at least one category.");
        show(1);
      } else if (current===2 || current===3 || current===4) {
        renderReview();
        show(5);
      }
    }
    if (e.target.classList.contains("prev")) {
      if (current>0) show(current-1);
    }
  });

  // Path selection
  let path = ""; // custom | scratch | business
  $$(".option .choose").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      path = e.target.closest(".option")?.dataset.choice || "";
      if (path==="custom") {
        show(2); // step 3a
        const kw = $("#kw");
        kw.value = ($("#desc").value || "").trim();
        updateMarketLinks();
      } else if (path==="scratch") {
        show(3); // step 3b
      } else {
        show(4); // step 3c (business)
      }
    });
  });

  // Market links for “custom”
  const kw = $("#kw");
  function updateMarketLinks(){
    const v = encodeURIComponent((kw?.value || "").trim());
    const set = (id,url)=>{ const a = $("#"+id); if (a) a.href = url; };
    set("link-amz",  `https://www.amazon.com/s?k=${v}`);
    set("link-ebay", `https://www.ebay.com/sch/i.html?_nkw=${v}`);
    set("link-ali",  `https://www.aliexpress.com/wholesale?SearchText=${v}`);
    set("link-gshop",`https://www.google.com/search?tbm=shop&q=${v}`);
  }
  kw?.addEventListener("input", updateMarketLinks);

  // Add base product lines
  $("#add-base")?.addEventListener("click", ()=>{
    const name = $("#base-name").value.trim();
    const url  = $("#base-url").value.trim();
    if (!name || !url) return alert("Please add both a name and a link.");
    const li = document.createElement("li");
    li.innerHTML = `<span>${name}</span> <a href="${url}" target="_blank" rel="noopener">${url}</a>`;
    $("#base-list").appendChild(li);
    $("#base-name").value = "";
    $("#base-url").value  = "";
  });

  // Review builder
  function renderReview(){
    const tags = $$("input[name='tags']:checked").map(i=>i.value);
    const supplierTxt = suppliersFor(tags) || "(no suppliers mapped)";
    const baseItems = $$("#base-list li").map(li => {
      const a = $("a", li);
      return `${$("span", li).textContent}: ${a ? a.href : ""}`;
    }).join(" | ") || "(none)";

    const summary = {
      Customer: `${$("#cust-name")?.value || ""} <${$("#cust-email")?.value || ""}>`,
      Description: $("#desc").value,
      Path: path || "(not chosen)",
      Tags: tags.join(", "),
      Suppliers: supplierTxt.split("\n").join(" | "),
      Keywords: $("#kw")?.value || "",
      BaseItems: baseItems,
      Materials: $("#materials")?.value || "",
      Components: ($("#components")?.value || "").slice(0,160),
      Constraints: $("#constraints")?.value || "",
      Business: {
        Quantity: $("#batch-qty")?.value || "",
        Certifications: $("#certs")?.value || "",
        TargetUnitPrice: $("#target-price")?.value || ""
      },
      ShopRightsDiscount: !!$("#shop-discount")?.checked
    };
    $("#review").innerHTML = `<pre>${JSON.stringify(summary, null, 2)}</pre>`;
  }

  // Submit
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();

    const tags = $$("input[name='tags']:checked").map(i=>i.value);
    const supplierTxt = suppliersFor(tags) || "";
    const baseItems = $$("#base-list li").map(li => {
      const a = $("a", li);
      return { name: $("span", li).textContent, url: a ? a.href : "" };
    });

    // Map to your current orders table columns:
    // id (server default), created_at (server default),
    // customer_name, customer_email, product_name, order_type,
    // product_category, product_description, supplier_list, status
    const row = {
      customer_name:  $("#cust-name")?.value || "",
      customer_email: $("#cust-email")?.value || "",
      product_name:   $("#desc")?.value || "(untitled)",
      order_type:     path || "custom",
      product_category: tags.join(", "),
      product_description: buildLongDescription(),
      supplier_list:  supplierTxt,
      status:         "Pending"
    };

    // 1) Save to Supabase (if configured)
    try {
      if (supa) {
        const { error } = await supa.from("orders").insert([ row ]);
        if (error) console.error("Supabase insert error:", error);
      }
    } catch (err) {
      console.error("Supabase error:", err);
    }

    // 2) Email notification (if configured)
    try {
      if (CFG.EMAILJS_SERVICE_ID && CFG.EMAILJS_TEMPLATE_ID && window.emailjs) {
        await window.emailjs.send(
          CFG.EMAILJS_SERVICE_ID,
          CFG.EMAILJS_TEMPLATE_ID,
          {
            customer_name:  row.customer_name || "(no name)",
            customer_email: row.customer_email || "(no email)",
            product_name:   row.product_name,
            order_type:     row.order_type,
            product_category: row.product_category,
            product_description: row.product_description,
            supplier_list:  row.supplier_list || "(none)"
          }
        );
      }
    } catch (err) {
      console.error("EmailJS error:", err);
    }

    // 3) Download JSON locally (always works)
    const order = {
      ...row,
      base_items: baseItems,
      createdAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(order, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${uid()}.json`; a.click();

    alert("Thanks! We received your request. We’ll follow up by email.");
    location.href = "index.html";
  });

  function buildLongDescription(){
    const parts = [];
    parts.push($("#details")?.value || "");
    const kw = $("#kw")?.value || "";
    if (kw) parts.push(`Keywords: ${kw}`);
    const base = $$("#base-list li").map(li=>{
      const a = $("a", li);
      return `${$("span", li).textContent}: ${a ? a.href : ""}`;
    });
    if (base.length) parts.push(`Base items: ${base.join(" | ")}`);
    const mats = $("#materials")?.value || "";
    if (mats) parts.push(`Materials: ${mats}`);
    const comps = $("#components")?.value || "";
    if (comps) parts.push(`Components: ${comps}`);
    const cons = $("#constraints")?.value || "";
    if (cons) parts.push(`Constraints: ${cons}`);
    const bq = $("#batch-qty")?.value || "";
    const certs = $("#certs")?.value || "";
    const tp = $("#target-price")?.value || "";
    if (bq || certs || tp) parts.push(`Business: qty=${bq || "-"}, certs=${certs || "-"}, target=${tp || "-"}`);
    if ($("#shop-discount")?.checked) parts.push("Shop rights discount: YES (10% + royalties)");
    return parts.filter(Boolean).join("\n");
  }
})();

/* ---------------------------
   ADMIN (admin.html)
   --------------------------- */
window.BF_adminInit = async function(){
  const loginForm = $("#login-form");
  const dash      = $("#dashboard");
  const out       = $("#orders");
  if (!loginForm || !supa) {
    if (!supa && out) out.textContent = "Supabase config missing.";
    return;
  }

  $("#login-btn")?.addEventListener("click", async (e)=>{
    e.preventDefault();
    const email = $("#login-email").value.trim();
    const pass  = $("#login-pass").value.trim();
    if (!email || !pass) return alert("Enter email and password.");
    const { error } = await supa.auth.signInWithPassword({ email, password: pass });
    if (error) return alert(error.message);
    loginForm.hidden = true;
    dash.hidden = false;
    loadOrders();
  });

  async function loadOrders(){
    out.innerHTML = "Loading…";
    const { data, error } = await supa.from("orders").select("*").order("created_at",{ascending:false});
    if (error) { out.textContent = error.message; return; }
    if (!data.length) { out.innerHTML = "<p>No orders yet.</p>"; return; }

    // Stats
    const total = data.length;
    const byType = data.reduce((m,o)=>((m[o.order_type]=(m[o.order_type]||0)+1),m),{});
    const byCat  = {};
    data.forEach(o => (o.product_category||"").split(",").map(s=>s.trim()).filter(Boolean)
      .forEach(c => byCat[c]=(byCat[c]||0)+1));

    $("#stat-total").textContent = total;
    $("#stat-path").textContent  = JSON.stringify(byType);
    $("#stat-tag").textContent   = JSON.stringify(byCat);

    // Table
    out.innerHTML = `
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>
          <th align="left">When</th>
          <th align="left">Customer</th>
          <th align="left">Type</th>
          <th align="left">Category</th>
          <th align="left">Name</th>
          <th align="left">Status</th>
        </tr></thead>
        <tbody>
          ${data.map(o=>`
            <tr style="border-top:1px solid #eee">
              <td>${o.created_at ? new Date(o.created_at).toLocaleString() : "-"}</td>
              <td>${o.customer_name || ""} &lt;${o.customer_email || ""}&gt;</td>
              <td>${o.order_type || "-"}</td>
              <td>${o.product_category || "-"}</td>
              <td>${(o.product_name || "").slice(0,60)}</td>
              <td>${o.status || "-"}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  }
};

/* ---------------------------
   SHOP (shop.html)
   --------------------------- */
window.BF_shopInit = async function(){
  const grid = $("#shop-grid");
  if (!grid) return;
  if (!supa) { grid.textContent = "Supabase config missing."; return; }

  // If you later add a boolean column (e.g., shop_publish),
  // you can filter here with .eq("shop_publish", true)
  const { data, error } = await supa.from("orders").select("*").order("created_at",{ascending:false});
  if (error) { grid.textContent = error.message; return; }
  if (!data.length) { grid.innerHTML = "<p>No shared items yet.</p>"; return; }

  grid.innerHTML = data.map(o => `
    <article class="card">
      <div class="thumb">Preview</div>
      <h3>${o.product_name || "Untitled"}</h3>
      <p class="muted">${o.product_category || ""}</p>
      <span class="muted small">Contact for price</span>
    </article>
  `).join("");
};
