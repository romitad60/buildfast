// ---------- CONFIG / INIT ----------
emailjs.init(window.BF_CONFIG.EMAILJS_PUBLIC_KEY);
const supa = window.supabase.createClient(
  window.BF_CONFIG.SUPABASE_URL,
  window.BF_CONFIG.SUPABASE_ANON_KEY
);

// Suppliers by tag (shortlist – expand as you go)
const SUPPLIERS = {
  electronics: [
    {name:"Fab Lab CDMX", city:"Mexico City"},
    {name:"La Nave Makerspace", city:"Mexico City"},
    {name:"Lab121 FabLab", city:"Alessandria"}
  ],
  drones: [
    {name:"Hacedores / community", city:"Mexico City"},
    {name:"SetLaser (metal/laser)", city:"Alessandria"}
  ],
  "3dprint": [
    {name:"Impresión 3D México", city:"Mexico City"},
    {name:"AB Games / stampa 3D", city:"Alessandria"},
    {name:"FabLab Alessandria", city:"Alessandria"}
  ],
  laser: [
    {name:"AC Corte y Grabado Láser", city:"Mexico City"},
    {name:"Bussetti & Mazza (acrylic/laser)", city:"Alessandria"}
  ],
  cnc: [
    {name:"JOBSHOP.mx (CNC)", city:"Mexico City"},
    {name:"Carpenteria locale", city:"Alessandria"}
  ],
  wood: [
    {name:"CNC / falegnamerie locali", city:"Alessandria"},
    {name:"Router CNC providers", city:"Mexico City"}
  ],
  textile: [
    {name:"Maquilas de ropa (CDMX)", city:"Mexico City"},
    {name:"Sartorie locali", city:"Alessandria"}
  ],
  apparel: [
    {name:"Workshops apparel (CDMX)", city:"Mexico City"},
    {name:"Confezioni locali", city:"Alessandria"}
  ],
  lighting: [
    {name:"Laser + acrylic vendors", city:"Mexico City"},
    {name:"FabLab / LED suppliers", city:"Alessandria"}
  ],
  metal: [
    {name:"Laserist / metal services", city:"Piemonte"},
    {name:"CNC aluminum shops", city:"Mexico City"}
  ],
  packaging: [
    {name:"NOVO Empaques", city:"Mexico City"}
  ]
};

// ---------- GALLERY (same as before; edit freely) ----------
const GALLERY = [
  { id:"A-DRONE", title:"Project A — Hawk FPV Drone", img:"", tags:["drones","electronics"], blurb:"5\" FPV kit + custom shell + LEDs" },
  { id:"B-LAMP", title:"Project B — Tree Motion Lamp", img:"", tags:["lighting","wood","electronics"], blurb:"USB-C, PIR auto-on, warm LED" },
  { id:"C-JACKET", title:"Project C — LED Festival Jacket", img:"", tags:["textile","electronics","lighting"], blurb:"ESP32, detachable LED panels" }
];

// ---------- UTIL ----------
const LS_KEY = "buildfast_projects";
function loadProjects(){ try{ return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }catch(e){ return []; } }
function saveLocal(p){ const arr = loadProjects(); arr.push(p); localStorage.setItem(LS_KEY, JSON.stringify(arr)); }
function uid(){ return "P-"+Math.random().toString(36).slice(2,10).toUpperCase(); }
function uniq(arr){ return [...new Set(arr)]; }

function suppliersFor(tags){
  const out = [];
  (tags||[]).forEach(t => (SUPPLIERS[t]||[]).forEach(s => out.push(`${s.name} — ${s.city}`)));
  return uniq(out);
}

// ---------- INDEX ----------
(function initIndex(){
  const grid = document.getElementById("gallery-grid");
  if(!grid) return;
  const renderCard = (item)=>{
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <div class="thumb" aria-label="thumbnail">${item.img ? `<img src="${item.img}" alt="">` : "Upload your own image"}</div>
      <h3>${item.title}</h3>
      <p>${item.blurb}</p>
      <div class="muted" style="font-size:12px">${item.tags.map(t=>"#"+t).join(" ")}</div>
    `;
    grid.appendChild(el);
  };
  GALLERY.forEach(renderCard);

  const fab = document.getElementById("fab");
  fab?.addEventListener("click", ()=>{
    const q = document.getElementById("q")?.value || "";
    const url = new URL("create.html", location.href);
    if(q) url.searchParams.set("q", q);
    location.href = url.toString();
  });

  const topSearch = document.getElementById("top-search");
  topSearch?.addEventListener("submit", (e)=>{
    e.preventDefault();
    const q = document.getElementById("q").value.trim();
    const url = new URL("create.html", location.href);
    if(q) url.searchParams.set("q", q);
    location.href = url.toString();
  });
})();

// ---------- WIZARD ----------
(function initWizard(){
  const form = document.getElementById("wizard-form");
  if(!form) return;

  const steps = [...document.querySelectorAll(".step")];
  let current = 0;
  function show(i){ steps.forEach((s,idx)=> s.hidden = idx!==i ); current = i; }

  // From URL prefill
  const params = new URLSearchParams(location.search);
  const q = params.get("q") || "";
  const desc = document.getElementById("desc");
  if(q && desc) desc.value = q;

  // Sketch preview
  const sketches = document.getElementById("sketches");
  const previews = document.getElementById("sketch-previews");
  sketches?.addEventListener("change", ()=>{
    previews.innerHTML = "";
    [...sketches.files].forEach(file=>{
      const url = URL.createObjectURL(file);
      const box = document.createElement("div");
      box.className = "preview";
      box.innerHTML = `<img src="${url}">`;
      previews.appendChild(box);
    });
  });

  // Next/back
  form.addEventListener("click", (e)=>{
    if(e.target.classList.contains("next")){
      if(current===0) show(1);            // Step1 -> Step2
      else if(current===2 || current===3 || current===4) show(5); // after any Step3 -> Review
    }
    if(e.target.classList.contains("prev")){
      if(current>0) show(current-1);
    }
  });

  // Choose path
  const choices = document.querySelectorAll(".option .choose");
  let path = ""; // "custom" | "scratch" | "business"
  choices.forEach(btn=> btn.addEventListener("click", (e)=>{
    const wrap = e.target.closest(".option");
    path = wrap?.dataset.choice || "";
    if(path==="custom"){ 
      show(2); // 3a
      const kw = document.getElementById("kw");
      const seed = (document.getElementById("desc").value || "").trim();
      kw.value = seed;
      updateMarketLinks();
    } else if(path==="scratch"){
      show(3); // 3b
    } else {
      show(4); // 3c
    }
  }));

  // Market links from keywords
  const kw = document.getElementById("kw");
  function updateMarketLinks(){
    const val = encodeURIComponent((kw?.value || "").trim());
    const setHref = (id, url)=>{ const a = document.getElementById(id); if(a) a.href = url; };
    setHref("link-amz", `https://www.amazon.com/s?k=${val}`);
    setHref("link-ebay", `https://www.ebay.com/sch/i.html?_nkw=${val}`);
    setHref("link-ali", `https://www.aliexpress.com/wholesale?SearchText=${val}`);
    setHref("link-gshop", `https://www.google.com/search?tbm=shop&q=${val}`);
  }
  kw?.addEventListener("input", updateMarketLinks);

  // Add base product
  const baseList = document.getElementById("base-list");
  document.getElementById("add-base")?.addEventListener("click", ()=>{
    const name = document.getElementById("base-name").value.trim();
    const url = document.getElementById("base-url").value.trim();
    if(!name || !url) return alert("Add both a name and a link.");
    const li = document.createElement("li");
    li.innerHTML = `<span>${name}</span> <a href="${url}" target="_blank" rel="noopener">${url}</a>`;
    baseList.appendChild(li);
    document.getElementById("base-name").value = "";
    document.getElementById("base-url").value = "";
  });

  // Submit/save
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();

    const order = {
      id: uid(),
      createdAt: new Date().toISOString(),
      customerName: document.getElementById("cust-name")?.value || "",
      customerEmail: document.getElementById("cust-email")?.value || "",
      desc: document.getElementById("desc").value,
      details: document.getElementById("details").value,
      tags: [...document.querySelectorAll("input[name='tags']:checked")].map(i=>i.value),
      path,
      keywords: document.getElementById("kw")?.value || "",
      baseItems: [...document.querySelectorAll("#base-list li")].map(li=>{
        const a = li.querySelector("a");
        return { name: li.querySelector("span").textContent, url: a?.href || "" };
      }),
      materials: document.getElementById("materials")?.value || "",
      components: document.getElementById("components")?.value || "",
      constraints: document.getElementById("constraints")?.value || "",
      shopDiscount: !!document.getElementById("shop-discount")?.checked,
      business: {
        batchQty: document.getElementById("batch-qty")?.value || "",
        certs: document.getElementById("certs")?.value || "",
        targetPrice: document.getElementById("target-price")?.value || ""
      }
    };

    // 1) Save to Supabase (orders)
    try{
      await supa.from("orders").insert([{
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        path: order.path,
        desc: order.desc,
        details: order.details,
        tags: order.tags,
        base_items: order.baseItems,
        materials: order.materials,
        components: order.components,
        constraints: order.constraints,
        shop_discount: order.shopDiscount,
        payment_link: null  // set later if you list it in Shop
      }]);
    }catch(err){ console.error("Supabase insert error", err); }

    // 2) Email you with suggested suppliers based on tags
    try{
      const suppliersTxt = suppliersFor(order.tags).join("\\n");
      const baseTxt = order.baseItems.map(b=> `${b.name}: ${b.url}`).join("\\n") || "(none)";

      await emailjs.send(
        window.BF_CONFIG.EMAILJS_SERVICE_ID,
        window.BF_CONFIG.EMAILJS_TEMPLATE_ID,
        {
          customer_name: order.customerName || "(no name)",
          customer_email: order.customerEmail || "(no email)",
          path: order.path,
          desc: order.desc,
          tags: (order.tags||[]).join(", "),
          suppliers: suppliersTxt || "(no suppliers mapped)",
          base_items: baseTxt,
          discount: order.shopDiscount ? "Yes" : "No",
          created_at: order.createdAt
        }
      );
    }catch(err){ console.error("EmailJS error", err); }

    // 3) Local JSON download (handy for manual tracking)
    const blob = new Blob([JSON.stringify(order,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${order.id}.json`; a.click();

    alert("Thanks! We received your order. We'll get back to you by email.");
    location.href = "index.html";
  });

  // Review render
  const review = document.getElementById("review");
  form.addEventListener("click", (e)=>{
    if(e.target.classList.contains("next") && (current===2 || current===3 || current===4)){
      const tags = [...document.querySelectorAll("input[name='tags']:checked")].map(i=>i.value);
      const summary = {
        Customer: (document.getElementById("cust-name")?.value || "") + " <" + (document.getElementById("cust-email")?.value || "") + ">",
        Description: document.getElementById("desc").value,
        Path: path || "(not chosen)",
        Tags: tags.join(", "),
        Suppliers: suppliersFor(tags).join(" | "),
        Keywords: document.getElementById("kw")?.value || "",
        BaseItems: [...document.querySelectorAll("#base-list li span")].map(s=>s.textContent).join(" | "),
        Materials: document.getElementById("materials")?.value || "",
        Components: (document.getElementById("components")?.value || "").slice(0,160) + "…",
        Constraints: document.getElementById("constraints")?.value || "",
        ShopDiscount: !!document.getElementById("shop-discount")?.checked
      };
      review.innerHTML = `<pre>${JSON.stringify(summary,null,2)}</pre>`;
    }
  });

  // show Step 1 initially
  show(0);
})();

// ---------- ADMIN (on admin.html) ----------
window.BF_adminInit = async function(){
  const loginForm = document.getElementById("login-form");
  const dash = document.getElementById("dashboard");
  const out = document.getElementById("orders");

  loginForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-pass").value;
    const { data, error } = await supa.auth.signInWithPassword({ email, password });
    if(error){ alert(error.message); return; }
    loginForm.hidden = true;
    dash.hidden = false;
    loadOrders();
  });

  async function loadOrders(){
    const { data, error } = await supa.from("orders").select("*").order("created_at",{ascending:false});
    if(error){ out.textContent = error.message; return; }
    if(!data.length){ out.innerHTML = "<p>No orders yet.</p>"; return; }

    // basic stats
    const total = data.length;
    const byPath = data.reduce((m,o)=>{ m[o.path]=(m[o.path]||0)+1; return m; },{});
    const byTag = {};
    data.forEach(o => (o.tags||[]).forEach(t => byTag[t]=(byTag[t]||0)+1));

    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-path").textContent = JSON.stringify(byPath);
    document.getElementById("stat-tag").textContent = JSON.stringify(byTag);

    // table
    out.innerHTML = `<table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th align="left">When</th><th align="left">Customer</th><th align="left">Path</th>
        <th align="left">Tags</th><th align="left">Desc</th><th align="left">Shop?</th>
      </tr></thead>
      <tbody>
      ${data.map(o => `
        <tr style="border-top:1px solid #eee">
          <td>${new Date(o.created_at).toLocaleString()}</td>
          <td>${o.customer_name||""} &lt;${o.customer_email||""}&gt;</td>
          <td>${o.path}</td>
          <td>${(o.tags||[]).join(", ")}</td>
          <td>${(o.desc||"").slice(0,60)}</td>
          <td>${o.shop_discount ? "Yes" : "No"}</td>
        </tr>`).join("")}
      </tbody></table>`;
  }
};

// ---------- SHOP (on shop.html) ----------
window.BF_shopInit = async function(){
  const grid = document.getElementById("shop-grid");
  const { data, error } = await supa.from("orders").select("*").eq("shop_discount", true).order("created_at",{ascending:false});
  if(error){ grid.textContent = error.message; return; }
  if(!data.length){ grid.innerHTML = "<p>No shared items yet.</p>"; return; }
  grid.innerHTML = data.map(o => `
    <article class="card">
      <div class="thumb">${o.path==="scratch" ? "Custom build" : "Base-mod"}</div>
      <h3>${o.desc||"Untitled"}</h3>
      <p class="muted">${(o.tags||[]).map(t=>"#"+t).join(" ")}</p>
      ${o.payment_link ? `<a class="pill" href="${o.payment_link}" target="_blank" rel="noopener">Buy</a>` : `<span class="muted small">Contact for price</span>`}
    </article>
  `).join("");
};
