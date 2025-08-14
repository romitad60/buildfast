// --- Gallery seed (edit this) ---
const GALLERY = [
  { id:"A-DRONE", title:"Project A — Hawk FPV Drone", img:"", tags:["drones","electronics"], blurb:"5\" FPV kit + custom shell + LEDs" },
  { id:"B-LAMP", title:"Project B — Tree Motion Lamp", img:"", tags:["lighting","wood","electronics"], blurb:"USB-C, PIR auto-on, warm LED" },
  { id:"C-JACKET", title:"Project C — LED Festival Jacket", img:"", tags:["textile","electronics","lighting"], blurb:"ESP32, detachable LED panels" }
];

// Local storage helpers
const LS_KEY = "buildfast_projects";
function loadProjects(){ try{ return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }catch(e){ return []; } }
function saveProject(p){ const arr = loadProjects(); arr.push(p); localStorage.setItem(LS_KEY, JSON.stringify(arr)); }
function uid(){ return "P-"+Math.random().toString(36).slice(2,10).toUpperCase(); }

// ---- Index page logic ----
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

// ---- Wizard logic ----
(function initWizard(){
  const form = document.getElementById("wizard-form");
  if(!form) return;

  const steps = [...document.querySelectorAll(".step")];
  let current = 0;
  function show(i){ steps.forEach((s,idx)=> s.hidden = idx!==i ); current = i; }

  // Pre-fill from query
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
      if(current===0) show(1);
      else if(current===2 || current===3) show(4);
    }
    if(e.target.classList.contains("prev")){
      if(current>0) show(current-1);
    }
  });

  // Choose path
  const choices = document.querySelectorAll(".option .choose");
  let path = ""; // "custom" or "scratch"
  choices.forEach(btn=> btn.addEventListener("click", (e)=>{
    const wrap = e.target.closest(".option");
    path = wrap?.dataset.choice || "";
    if(path==="custom"){ 
      show(2); // step 3a
      const kw = document.getElementById("kw");
      const seed = (document.getElementById("desc").value || "").trim();
      kw.value = seed;
      updateMarketLinks();
    } else {
      show(3); // step 3b
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
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const id = uid();
    const data = {
      id,
      desc: document.getElementById("desc").value,
      details: document.getElementById("details").value,
      tags: [...document.querySelectorAll("input[name='tags']:checked")].map(i=>i.value),
      path,
      keywords: document.getElementById("kw")?.value || "",
      baseItems: [...document.querySelectorAll("#base-list li")].map(li=>{
        const a = li.querySelector("a"); return { name: li.querySelector("span").textContent, url: a?.href || "" };
      }),
      scratch: {
        materials: document.getElementById("materials")?.value || "",
        components: document.getElementById("components")?.value || "",
        constraints: document.getElementById("constraints")?.value || ""
      },
      createdAt: new Date().toISOString()
    };
    saveProject(data);
    const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${id}.json`; a.click();
    alert("Saved locally. A JSON summary was downloaded. Connect a backend later.");
    location.href = "index.html";
  });

  // Review render
  const review = document.getElementById("review");
  form.addEventListener("click", (e)=>{
    if(e.target.classList.contains("next") && (current===2 || current===3)){
      const summary = {
        Description: document.getElementById("desc").value,
        Path: path || "(not chosen)",
        Tags: [...document.querySelectorAll("input[name='tags']:checked")].map(i=>i.value).join(", "),
        Keywords: document.getElementById("kw")?.value || "",
        BaseItems: [...document.querySelectorAll("#base-list li span")].map(s=>s.textContent).join(" | "),
        Materials: document.getElementById("materials")?.value || "",
        Components: (document.getElementById("components")?.value || "").slice(0,160) + "…",
        Constraints: document.getElementById("constraints")?.value || ""
      };
      review.innerHTML = `<pre>${JSON.stringify(summary,null,2)}</pre>`;
    }
  });

  show(0);
})();
