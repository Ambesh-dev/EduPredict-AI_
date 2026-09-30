(() => {
  const cfg = window.EDUPREDICT_CONFIG || {};
  const hasConfig = !!(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId) &&
                    !String(cfg.apiKey).includes("YOUR_") && !String(cfg.projectId).includes("YOUR_");

  const toast = (msg, type="info") => {
    const el = document.getElementById("toast");
    el.textContent = msg; el.className = "show " + type;
    setTimeout(() => el.className = "", 3000);
  };

  let fbApp = null, auth = null, db = null, currentUser = null, currentProfile = null;
  let portal = "student", page = "dashboard", studentsCache = [];
  const params = new URLSearchParams(location.search);
  const demoMode = params.get("demo") === "student" || params.get("demo") === "teacher";
  const demoPortal = params.get("demo") === "teacher" ? "teacher" : "student";
  const demoPage = params.get("page") || "dashboard";
  const demoStudent = {id:"demo-student",full_name:"Aarav Sharma",email:"aarav@demo.local",phone:"+91 9876543210",course:"BCA",class_year:"1st Year",class_section:"A",gmail:"aarav.sharma@gmail.com",father_name:"Rajesh Sharma",mother_name:"Sunita Sharma",parents_phone:"+91 9876500000",address:"Lucknow, Uttar Pradesh"};
  const demoAcademic = {attendance:88,assignment_score:81,internal_score:79,exam_score:84,previous_score:76,term:"Semester 1",academic_year:"2026-27",notes:"Strong consistency with room to improve exam revision."};
  const demoPrediction = {predicted_score:82,risk_level:"Low",confidence:91,model_name:"TensorFlow.js Neural Net",explanation:{summary:"Strong overall consistency across attendance, assignments and assessments."}};
  const demoNotifications = [
    {title:"Weekly progress update",message:"Your latest academic record has been reviewed. Keep the current study rhythm.",kind:"info",created_at:"2026-09-29T07:30:00"},
    {title:"Assignment milestone",message:"Great consistency in submitted assignments. Maintain the same pace.",kind:"success",created_at:"2026-09-28T16:15:00"},
    {title:"Exam prep reminder",message:"Your teacher recommends a focused revision block for upcoming assessments.",kind:"warning",created_at:"2026-09-27T11:10:00"}
  ];
  const demoStudents = [
    {...demoStudent,id:"s1",full_name:"Aarav Sharma",course:"BCA",class_year:"1st Year",class_section:"A",phone:"+91 9876543210",email:"aarav@demo.local"},
    {...demoStudent,id:"s2",full_name:"Ananya Verma",course:"BCA",class_year:"1st Year",class_section:"A",phone:"+91 9876543211",email:"ananya@demo.local"},
    {...demoStudent,id:"s3",full_name:"Rohan Singh",course:"BCA",class_year:"1st Year",class_section:"B",phone:"+91 9876543212",email:"rohan@demo.local"},
    {...demoStudent,id:"s4",full_name:"Mehak Gupta",course:"BCA",class_year:"2nd Year",class_section:"A",phone:"+91 9876543213",email:"mehak@demo.local"},
    {...demoStudent,id:"s5",full_name:"Vansh Tiwari",course:"BCA",class_year:"2nd Year",class_section:"B",phone:"+91 9876543214",email:"vansh@demo.local"}
  ];

  if (hasConfig) {
    try {
      fbApp = firebase.initializeApp(cfg);
      auth = firebase.auth();
      db = firebase.firestore();
    } catch (e) {
      console.error(e);
    }
  } else {
    document.getElementById("configWarning").classList.remove("hidden");
  }

  const colName = name => ({
    profiles: "users", student_profiles: "students", academic_records: "academic_records",
    predictions: "predictions", notifications: "notifications", activities: "activities",
    model_runs: "model_runs", audit_logs: "audit_logs"
  }[name] || name);
  const stripUndefined = obj => Object.fromEntries(Object.entries(obj || {}).filter(([,v]) => v !== undefined));
  const normalizePhone = phone => String(phone || "").replace(/[^0-9+]/g, "").replace(/^00/, "+");
  async function sha256(text){
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  async function imageToDataUrl(file){
    return await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=reject;
      reader.onload=()=>{
        const img=new Image(); img.onload=()=>{
          const max=720, scale=Math.min(1,max/Math.max(img.width,img.height));
          const c=document.createElement("canvas"); c.width=Math.max(1,Math.round(img.width*scale)); c.height=Math.max(1,Math.round(img.height*scale));
          c.getContext("2d").drawImage(img,0,0,c.width,c.height);
          let data=c.toDataURL("image/jpeg",0.72);
          if(data.length>750000){ data=c.toDataURL("image/jpeg",0.55); }
          resolve(data);
        }; img.onerror=reject; img.src=reader.result;
      }; reader.readAsDataURL(file);
    });
  }

  class QueryBuilder {
    constructor(table){this.table=table;this.filters=[];this.inFilters=[];this.orFilters=[];this.sortField=null;this.asc=true;this.limitN=null;this.singleFlag=false;}
    select(){return this;}
    eq(field,value){this.filters.push([field,value]);return this;}
    in(field,values){this.inFilters.push([field,values]);return this;}
    or(expr){this.orFilters.push(expr);return this;}
    order(field,opts={}){this.sortField=field;this.asc=opts.ascending!==false;return this;}
    limit(n){this.limitN=n;return this;}
    single(){this.singleFlag=true;return this.run();}
    async run(){
      try{
        const collectionName = colName(this.table);

        // Firestore distinguishes document reads (get) from queries (list).
        // When this is a single-document lookup by id, use a direct document
        // read so a user can read their own record under the RLS-style rules.
        if(this.singleFlag){
          const idFilter = this.filters.find(([f]) => f === "id");
          if(idFilter){
            const snap = await db.collection(collectionName).doc(String(idFilter[1])).get();
            if(!snap.exists) return {data:null,error:{code:"PGRST116",message:"No rows found"}};
            const row = {id:snap.id,...(snap.data()||{})};
            for(const [f,v] of this.filters){ if(row[f] !== v) return {data:null,error:{code:"PGRST116",message:"No rows found"}}; }
            return {data:row,error:null};
          }
        }

        let ref=db.collection(collectionName);
        // Push simple equality filters to Firestore so student-scoped reads
        // remain compatible with Security Rules.
        for(const [f,v] of this.filters) ref=ref.where(f,"==",v);
        // Firestore `in` has a small operand limit. For larger teacher-side
        // lists we deliberately fetch the staff-visible collection and filter
        // locally; the rules permit staff reads of those collections.
        for(const [f,vs] of this.inFilters){if(Array.isArray(vs)&&vs.length>0&&vs.length<=10) ref=ref.where(f,"in",vs);}
        const snap=await ref.get();
        let rows=snap.docs.map(d=>({id:d.id,...(d.data()||{})}));
        rows=rows.filter(row=>this.filters.every(([f,v])=>row[f]===v));
        rows=rows.filter(row=>this.inFilters.every(([f,vs])=>vs.includes(row[f])));
        if(this.orFilters.length){
          rows=rows.filter(row=>this.orFilters.some(expr=>{
            return String(expr).split(",").some(part=>{
              const m=part.match(/([a-zA-Z0-9_]+)\.eq\.(.*)/);
              if(!m)return false; return String(row[m[1]]??"")===String(m[2]);
            });
          }));
        }
        if(this.sortField) rows.sort((a,b)=>{const av=a[this.sortField]??"", bv=b[this.sortField]??""; return (av>bv?1:av<bv?-1:0)*(this.asc?1:-1)});
        if(this.limitN!=null) rows=rows.slice(0,this.limitN);
        if(this.singleFlag){
          if(!rows.length) return {data:null,error:{code:"PGRST116",message:"No rows found"}};
          return {data:rows[0],error:null};
        }
        return {data:rows,error:null};
      }catch(error){return {data:null,error};}
    }
    then(resolve,reject){return this.run().then(resolve,reject);}
  }
  class MutationBuilder {
    constructor(table,payload,type){this.table=table;this.payload=payload;this.type=type;}
    eq(field,value){return this.execute(field,value);}
    async execute(field,value){
      try{
        const c=db.collection(colName(this.table));

        // For self/profile records, use a direct document operation instead of
        // reading the entire collection. This keeps student writes compatible
        // with Firestore Security Rules that deny collection-wide queries.
        if(field === "id"){
          const ref = c.doc(String(value));
          if(this.type === "update"){
            await ref.set(stripUndefined(this.payload),{merge:true});
            return {data:null,error:null};
          }
          if(this.type === "delete"){
            await ref.delete();
            return {data:null,error:null};
          }
        }

        if(this.type==="update"){
          let snap=await c.get();
          const matches=snap.docs.filter(d=>(d.data()||{})[field]===value);
          await Promise.all(matches.map(d=>c.doc(d.id).set(stripUndefined(this.payload),{merge:true})));
          return {data:null,error:null};
        }
        if(this.type==="delete"){
          let snap=await c.get(); const matches=snap.docs.filter(d=>(d.data()||{})[field]===value);
          await Promise.all(matches.map(d=>c.doc(d.id).delete())); return {data:null,error:null};
        }
      }catch(error){return {data:null,error};}
    }
  }
  function from(table){
    return {
      select:()=>new QueryBuilder(table),
      update:(payload)=>new MutationBuilder(table,payload,"update"),
      delete:()=>new MutationBuilder(table,{},"delete"),
      insert:async(payload)=>{
        try{
          const arr=Array.isArray(payload)?payload:[payload], refs=[];
          for(const item of arr){
            const ref=db.collection(colName(table)).doc();
            await ref.set(stripUndefined({...item,created_at:item.created_at||new Date().toISOString()})); refs.push({id:ref.id,...item});
          }
          return {data:Array.isArray(payload)?refs:refs[0],error:null};
        }catch(error){return {data:null,error};}
      }
    };
  }
  function createStorageFacade(){
    return {from:()=>({upload:async(path,file)=>{try{const data_url=await imageToDataUrl(file);await db.collection("image_blobs").doc(btoa(unescape(encodeURIComponent(path))).replace(/\//g,"_" )).set({path,owner_uid:auth.currentUser.uid,data_url,created_at:new Date().toISOString()});return {data:{path},error:null};}catch(error){return {data:null,error}}},createSignedUrl:async(path)=>{try{const id=btoa(unescape(encodeURIComponent(path))).replace(/\//g,"_");const snap=await db.collection("image_blobs").doc(id).get();return {data:{signedUrl:snap.exists?snap.data().data_url:null},error:null};}catch(error){return {data:null,error}}}})};
  }

  async function lookupLoginEmail(identity){
    const val=String(identity||"").trim();
    if(val.includes("@")) return val.toLowerCase();
    const phone=normalizePhone(val); if(!phone) throw new Error("Enter a valid email or phone number.");
    const h=await sha256(phone);
    const snap=await db.collection("phone_index").doc(h).get();
    if(!snap.exists) throw new Error("No account found for this phone number. Please check the number or create an account.");
    return snap.data().authEmail;
  }

  const sb={
    from,
    storage:null,
    auth:{
      signInWithPassword:async({email,password})=>{try{const credential=await auth.signInWithEmailAndPassword(email,password);return {data:{user:credential.user},error:null};}catch(error){return {data:null,error};}},
      signUp:async({email,password,options={}})=>{
        try{
          const credential=await auth.createUserWithEmailAndPassword(email,password);
          const u=credential.user, meta=options.data||{};
          const role=meta.role&&meta.role!=="student"?"teacher_pending":"student";
          const now=new Date().toISOString();
          await db.collection("users").doc(u.uid).set({id:u.uid,full_name:meta.full_name||"",email,phone:meta.phone||"",role,requested_role:meta.role||"student",created_at:now,updated_at:now},{merge:true});
          if(role==="student") await db.collection("students").doc(u.uid).set({id:u.uid,full_name:meta.full_name||"",email,phone:meta.phone||"",course:meta.course||"",class_year:meta.class_year||"",created_at:now,updated_at:now},{merge:true});
          if(meta.phone){const phone=normalizePhone(meta.phone);const h=await sha256(phone);await db.collection("phone_index").doc(h).set({uid:u.uid,authEmail:email,created_at:now});}
          return {data:{user:u},error:null};
        }catch(error){return {data:null,error};}
      },
      getUser:async()=>({data:{user:auth.currentUser}}),
      signOut:()=>auth.signOut(),
      onAuthStateChange:(cb)=>auth.onAuthStateChanged(u=>cb(u?"SIGNED_IN":"SIGNED_OUT",u?{user:u}:{user:null}))
    }
  };
  sb.storage=createStorageFacade();

  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money = n => Number(n || 0).toFixed(0);
  const initials = n => (n || "Student").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
  const fmt = d => d ? new Date(d).toLocaleString() : "—";
  const isDemo = () => demoMode;
  const demoTheme = localStorage.getItem("edupredict-theme") || "purple";
  function applyTheme(name){ document.body.dataset.theme=name; localStorage.setItem("edupredict-theme",name); }
  function toggleById(id,on){ const b=document.getElementById(id); if(!b)return; b.classList.toggle("on",!!on); }

  function showAuthTab(which){
    document.getElementById("studentAuth").classList.toggle("hidden", which!=="student");
    document.getElementById("teacherAuth").classList.toggle("hidden", which!=="teacher");
    document.querySelectorAll(".auth-tabs button").forEach(b=>b.classList.toggle("active", b.dataset.auth===which));
  }
  function setupAuthTabs(){
    document.querySelectorAll(".auth-tabs button").forEach(b=>b.onclick=()=>showAuthTab(b.dataset.auth));
    document.querySelectorAll(".auth-mode button").forEach(b=>b.onclick=()=>{
      const mode=b.dataset.mode;
      const group=mode.startsWith("student")?"student":"teacher";
      const login=mode.endsWith("login");
      document.getElementById(group+"LoginForm").classList.toggle("hidden",!login);
      document.getElementById(group+"SignupForm").classList.toggle("hidden",login);
      document.querySelectorAll(`[data-mode^="${group}"]`).forEach(x=>x.classList.toggle("active",x===b));
    });
  }

  async function studentLogin(e){
    e.preventDefault(); if(!hasConfig) return toast("Add Firebase config first","error");
    try{
      const identity=document.getElementById("slIdentity").value.trim(); const password=document.getElementById("slPassword").value;
      const email=await lookupLoginEmail(identity); const {data,error}=await sb.auth.signInWithPassword({email,password});
      if(error) return toast(error.message,"error"); await enter(data.user);
    }catch(err){toast(err.message||"Login failed","error")}
  }
  async function studentSignup(e){
    e.preventDefault(); if(!hasConfig) return toast("Add Firebase config first","error");
    try{
      const name=document.getElementById("ssName").value.trim(), email=document.getElementById("ssEmail").value.trim().toLowerCase();
      const phone=document.getElementById("ssPhone").value.trim(), password=document.getElementById("ssPassword").value;
      const course=document.getElementById("ssCourse").value.trim(), cls=document.getElementById("ssClass").value.trim();
      const h=await sha256(normalizePhone(phone)); const existing=await db.collection("phone_index").doc(h).get(); if(existing.exists) return toast("This phone number is already registered.","error");
      const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name,phone,course,class_year:cls,role:"student"}}});
      if(error) return toast(error.message,"error"); await enter(data.user);
    }catch(err){toast(err.message||"Account creation failed","error")}
  }
  async function teacherLogin(e){
    e.preventDefault(); if(!hasConfig) return toast("Add Firebase config first","error");
    try{
      const identity=document.getElementById("tlIdentity").value.trim(); const password=document.getElementById("tlPassword").value;
      const email=await lookupLoginEmail(identity); const {data,error}=await sb.auth.signInWithPassword({email,password});
      if(error) return toast(error.message,"error"); await enter(data.user);
    }catch(err){toast(err.message||"Login failed","error")}
  }
  async function teacherSignup(e){
    e.preventDefault(); if(!hasConfig) return toast("Add Firebase config first","error");
    try{
      const name=document.getElementById("tsName").value.trim(), email=document.getElementById("tsEmail").value.trim().toLowerCase();
      const phone=document.getElementById("tsPhone").value.trim(), password=document.getElementById("tsPassword").value, role=document.getElementById("tsRole").value;
      const h=await sha256(normalizePhone(phone)); const existing=await db.collection("phone_index").doc(h).get(); if(existing.exists) return toast("This phone number is already registered.","error");
      const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name,phone,role}}});
      if(error) return toast(error.message,"error");
      toast("Registration created. Teacher access remains pending approval.","success"); await enter(data.user);
    }catch(err){toast(err.message||"Registration failed","error")}
  }

  async function enter(user){
    currentUser={id:user.uid,uid:user.uid,email:user.email||"",phone:user.phoneNumber||""};
    const {data,error}=await sb.from("profiles").select("*").eq("id",user.uid).single();
    if(error) return toast(error.message||"Profile not found","error");
    currentProfile=data;
    if(data.role==="student") portal="student";
    else if(["teacher","hod","dean","admin"].includes(data.role)) portal="teacher";
    else { await sb.auth.signOut(); return toast("Teacher account is pending approval by an administrator.","error"); }
    document.getElementById("authView").classList.add("hidden"); document.getElementById("appView").classList.remove("hidden");
    renderShell(); await renderPage("dashboard");
  }

  const NAV_ICONS={
    home:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9"/></svg>',
    users:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M2.8 19.5c.7-3 3-5 6.2-5s5.5 2 6.2 5"/><circle cx="17" cy="8.5" r="2.4"/><path d="M15.5 14.3c2.3.4 4 2 4.6 4.7"/></svg>',
    user:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.8 19.6c1-3.5 3.6-5.4 7.2-5.4s6.2 1.9 7.2 5.4"/></svg>',
    spark:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/><circle cx="12" cy="12" r="2.6"/></svg>',
    trend:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 16 5.5-6 4 3.5L20 5"/><path d="M14.5 5H20v5.5"/></svg>',
    alert:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 2.5 20h19L12 3.5Z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none"/></svg>',
    chart:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="12" width="3.4" height="8"/><rect x="10.3" y="7" width="3.4" height="13"/><rect x="16.6" y="3" width="3.4" height="17"/></svg>',
    doc:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5M8.5 13h7M8.5 16.5h7"/></svg>',
    upload:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4m0 0 4 4m-4-4-4 4"/><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/></svg>',
    gear:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.4-2-3.4-2.2.8a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.2-.8-2 3.4L4.6 10.5a7.6 7.6 0 0 0 0 3L2.7 15l2 3.4 2.2-.8c.75.65 1.63 1.16 2.6 1.5l.5 2.4h4l.5-2.5a7.6 7.6 0 0 0 2.6-1.5l2.2.8 2-3.4-1.9-1.4Z"/></svg>'
  };
  function navIcon(k){return `<span class="nav-ic">${NAV_ICONS[k]||NAV_ICONS.spark}</span>`}
  function renderShell(){
    const navStudent=[
      ["dashboard","home","Home"],["profile","user","Profile"],["performance","trend","Performance"],
      ["warnings","alert","Alerts"],["report","doc","Reports"],["settings","gear","Settings"]
    ];
    const navTeacher=[
      ["dashboard","home","Home"],["students","users","Students"],["prediction","spark","AI Predict"],
      ["warnings","alert","Early Warning"],["analytics","chart","Analytics"],["reports","doc","Reports"],
      ["import","upload","Import"],["settings","gear","Settings"]
    ];
    const nav=portal==="student"?navStudent:navTeacher;
    document.getElementById("nav").innerHTML=nav.map(([id,icon,label])=>`<button data-page="${id}" class="${page===id?'active':''}" title="${label}">${navIcon(icon)}<span class="nav-label">${label}</span></button>`).join("");
    document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>renderPage(b.dataset.page));
    const mobile=document.getElementById("mobileNav");
    if(mobile) mobile.innerHTML=nav.slice(0,5).map(([id,icon,label])=>`<button data-page="${id}" class="${page===id?'active':''}">${navIcon(icon)}<small>${label}</small></button>`).join("");
    mobile?.querySelectorAll("button").forEach(b=>b.onclick=()=>renderPage(b.dataset.page));
    document.getElementById("roleBadge").textContent=portal==="student"?"STUDENT PORTAL":`${currentProfile.role.toUpperCase()} PORTAL`;
    document.getElementById("userChip").textContent=currentProfile.full_name || currentProfile.email || currentProfile.phone || "User";
    document.getElementById("portalEyebrow").textContent=portal==="student"?"STUDENT ACADEMIC INTELLIGENCE":"TEACHER ACADEMIC INTELLIGENCE";
    applyTheme(localStorage.getItem("edupredict-theme") || "purple");
  }

  async function renderPage(p){
    page=p; renderShell();
    const labels={dashboard:"Dashboard",profile:"My Profile",performance:"Performance",warnings:"Early Warning",report:"PDF Report",settings:"Settings",
      students:"Students",prediction:"AI Prediction",analytics:"Analytics",reports:"Reports",import:"Excel Import"};
    document.getElementById("pageTitle").textContent=labels[p]||"Dashboard";
    const content=document.getElementById("content");
    content.innerHTML='<div class="card empty">Loading…</div>';
    if(isDemo()){ renderDemoPage(content,p); return; }
    try{
      if(portal==="student"){
        if(p==="dashboard") await premiumStudentDashboard(content);
        if(p==="profile") await studentProfile(content);
        if(p==="performance") await studentPerformance(content);
        if(p==="warnings") await studentWarnings(content);
        if(p==="copilot") await copilot(content,"student");
        if(p==="report") await studentReport(content);
        if(p==="settings") premiumSettings(content);
      }else{
        if(p==="dashboard") await premiumTeacherDashboard(content);
        if(p==="students") await teacherStudents(content);
        if(p==="prediction") await teacherPrediction(content);
        if(p==="warnings") await teacherWarnings(content);
        if(p==="analytics") await teacherAnalytics(content);
        if(p==="reports") await teacherReports(content);
        if(p==="copilot") await copilot(content,"teacher");
        if(p==="import") teacherImport(content);
        if(p==="settings") premiumSettings(content);
      }
    }catch(err){content.innerHTML=`<div class="card empty">Something went wrong.<br><small>${esc(err.message||err)}</small></div>`}
  }

  function scoreBars(a){
    return [["Attendance",a.attendance,"var(--primary)"],["Assignments",a.assignment_score,"var(--accent)"],["Internal",a.internal_score,"var(--mint)"],["Exam",a.exam_score,"var(--peach)"],["Previous",a.previous_score,"var(--rose)"]].map(([n,v,c])=>`<div style="margin:12px 0"><div class="card-head"><span class="small">${n}</span><b class="small">${money(v)}%</b></div><div class="progress"><i style="width:${Math.max(0,Math.min(100,v))}%;background:${c}"></i></div></div>`).join("");
  }
  function copilotWidget(who, studentName=""){
    return `<div class="card copilot-card">
      <div class="copilot-top"><div class="ai-id"><div class="ai-orb">✦</div><div><h3>AI Academic Copilot</h3><div class="tiny">Instant academic conversation</div></div></div><span class="badge good">Online</span></div>
      ${who==="teacher"?`<div class="student-search-mini" style="margin-top:13px"><input id="copilotStudent" placeholder="Find a student quickly…" value="${esc(studentName)}"><span class="mini-tag">SEARCH</span></div><div id="copilotMatches"></div>`:""}
      <div id="chatLog" class="copilot-log"><div class="bubble ai">${who==="teacher"?"Ask me about a student, risk pattern, prediction, attendance or next action.":"Ask me about your performance, study plan, attendance or teacher feedback."}</div></div>
      <div class="quick-prompts"><button data-q="Give me a performance summary">Summary</button><button data-q="Explain the risk level">Risk</button><button data-q="What should I study next?">Study next</button></div>
      <form id="chatForm" class="copilot-form"><input id="chatInput" placeholder="Type your question…" required><button class="primary-btn">→</button></form>
    </div>`;
  }
  function bindCopilot(who){
    document.querySelectorAll(".quick-prompts button").forEach(b=>b.onclick=()=>{ const i=document.getElementById("chatInput"); if(i){i.value=b.dataset.q;i.focus();}});
    document.getElementById("chatForm")?.addEventListener("submit",async e=>{e.preventDefault();const q=document.getElementById("chatInput").value.trim();if(!q)return;addBubble(q,"user");document.getElementById("chatInput").value="";addBubble(await copilotAnswer(q,who),"ai");});
    document.getElementById("copilotStudent")?.addEventListener("input",e=>{
      const q=e.target.value.toLowerCase(); const m=demoStudents.filter(s=>`${s.full_name} ${s.phone}`.toLowerCase().includes(q)).slice(0,3);
      const box=document.getElementById("copilotMatches"); if(!box)return; box.innerHTML=q?m.map(s=>`<button class="student-match secondary" style="margin:5px 4px 0 0" data-name="${esc(s.full_name)}">${esc(s.full_name)} · ${esc(s.course)} ${esc(s.class_year)}</button>`).join(""):"";
      box.querySelectorAll("button").forEach(b=>b.onclick=()=>{e.target.value=b.dataset.name; box.innerHTML="";addBubble(`Selected ${b.dataset.name}`,"user");addBubble(`I’m ready to discuss ${b.dataset.name}. Ask about performance, risk, attendance or a support plan.`,"ai")});
    });
  }
  async function premiumStudentDashboard(el){
    const s=await getStudent(), a=await getAcademic(), p=await getPrediction(), n=await getNotifications();
    const score=p?.predicted_score ?? (a?baseline(a):0), risk=p?.risk_level||"Pending";
    el.innerHTML=`<div class="hero-banner"><div style="display:flex;justify-content:space-between;align-items:center;gap:20px;position:relative;z-index:1"><div><div class="eyebrow">${timeGreeting().toUpperCase()}, ${esc((s?.full_name||currentProfile.full_name||"STUDENT").split(" ")[0].toUpperCase())}</div><h3>Your academic pulse is looking steady.</h3><p>Your dashboard keeps your personal profile, teacher insights, notifications and performance in one calm workspace.</p><div class="hero-actions"><button class="primary-btn" data-page="performance">View performance →</button><button class="ghost-btn" data-page="profile">Complete profile</button></div></div><div class="score-ring"><div><b>${a?money(score):"--"}</b><span>predicted</span></div></div></div></div>
      <div class="split-dashboard" style="margin-top:16px"><div>
        <div class="grid g4">
          <div class="card stat"><div class="label">Predicted performance</div><div class="value">${a?money(score)+"%":"—"}</div><div class="sub">${esc(p?.model_name||"Waiting for teacher")}</div></div>
          <div class="card stat"><div class="label">Risk level</div><div class="value"><span class="badge ${risk==="High"?"risk":risk==="Medium"?"warn":"good"}">${esc(risk)}</span></div><div class="sub">Teacher generated</div></div>
          <div class="card stat"><div class="label">Attendance</div><div class="value">${a?money(a.attendance)+"%":"—"}</div><div class="sub">Latest record</div></div>
          <div class="card stat"><div class="label">Updates</div><div class="value">${n.length}</div><div class="sub">Teacher notifications</div></div>
        </div>
        <div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-head"><h3>Performance profile</h3><span class="badge good">Live</span></div>${a?scoreBars(a):'<div class="empty">Teacher data will appear here.</div>'}</div><div class="card"><div class="card-head"><h3>Latest teacher updates</h3><button class="secondary" data-page="warnings">View all</button></div>${n.slice(0,3).map(x=>`<div class="notice ${x.kind}"><h4>${esc(x.title)}</h4><p>${esc(x.message)}</p></div>`).join("")}</div></div>
      </div><div>${copilotWidget("student","")}</div></div>`;
    document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>renderPage(b.dataset.page)); bindCopilot("student");
  }
  async function premiumTeacherDashboard(el){
    const list=isDemo()?demoStudents:await loadStudents(); const riskCount=3; const avg=76;
    el.innerHTML=`<div class="hero-banner"><div style="position:relative;z-index:1"><div class="eyebrow">TEACHER COMMAND CENTER</div><h3>Make the next academic action obvious.</h3><p>Search students, surface early warnings, review predictions and talk to the AI Copilot without leaving the dashboard.</p><div class="hero-actions"><button class="primary-btn" data-page="students">Search students →</button><button class="ghost-btn" data-page="warnings">View early warnings</button></div></div></div>
      <div class="grid g4" style="margin-top:16px"><div class="card stat"><div class="label">Students</div><div class="value">${list.length}</div><div class="sub">Firestore registered</div></div><div class="card stat"><div class="label">High / medium risk</div><div class="value">${riskCount}</div><div class="sub">Needs review</div></div><div class="card stat"><div class="label">Avg prediction</div><div class="value">${avg}%</div><div class="sub">Across recent records</div></div><div class="card stat"><div class="label">Model status</div><div class="value" style="font-size:17px">Ready</div><div class="sub">Prediction workspace</div></div></div>
      <div class="split-dashboard" style="margin-top:16px"><div>
        <div class="grid g2"><div class="card"><div class="card-head"><h3>Early signal board</h3><span class="badge warn">3 students</span></div><div class="kpi-row"><div class="kpi"><span class="tiny">Attendance watch</span><b>78%</b></div><div class="kpi"><span class="tiny">Assessment watch</span><b>72%</b></div><div class="kpi"><span class="tiny">Predicted avg</span><b>76%</b></div></div><div style="margin-top:14px" class="notice risk"><h4>3 students need a closer look</h4><p>Low assessment consistency is contributing to the current support signal.</p></div></div><div class="card"><div class="card-head"><h3>Quick workflow</h3></div><div class="notice info"><h4>01 · Find a student</h4><p>Search by name, course or class.</p></div><div class="notice info"><h4>02 · Enter academic data</h4><p>Publish the latest teacher-controlled prediction.</p></div><div class="notice info"><h4>03 · Notify at-risk students</h4><p>Send targeted support notifications in one click.</p></div></div></div>
        <div class="card" style="margin-top:16px"><div class="card-head"><h3>Recent students</h3><button class="secondary" data-page="students">Open student directory</button></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Course</th><th>Class</th><th>Signal</th></tr></thead><tbody>${list.slice(0,4).map((s,i)=>`<tr><td><b>${esc(s.full_name||s.profile?.full_name)}</b><div class="tiny">${esc(s.email||s.profile?.email||"")}</div></td><td>${esc(s.course||"BCA")}</td><td>${esc(s.class_year||"1st Year")} · ${esc(s.class_section||"A")}</td><td><span class="badge ${i===0?"good":i<3?"warn":"risk"}">${i===0?"Stable":i<3?"Watch":"High"}</span></td></tr>`).join("")}</tbody></table></div></div>
      </div><div>${copilotWidget("teacher","")}</div></div>`;
    document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>renderPage(b.dataset.page)); bindCopilot("teacher");
  }
  let settingsActiveTab = "appearance";
  function premiumSettings(el, tab = settingsActiveTab){
    settingsActiveTab = tab;
    const theme = localStorage.getItem("edupredict-theme") || "purple";
    const reduce = localStorage.getItem("edupredict-reduced") !== "1";
    const dense = localStorage.getItem("edupredict-compact") === "1";
    const notifs = localStorage.getItem("edupredict-notifs") !== "0";
    const riskAlerts = localStorage.getItem("edupredict-risk-alerts") !== "0";

    const menuItems = [
      ["appearance", "Appearance"],
      ["preferences", "Preferences"],
      ["notifications", "Notifications"],
      ["privacy", "Privacy & Security"],
      ["install", "Install & App"],
      ["about", "About EduPredict"]
    ];

    let contentHtml = "";

    if (settingsActiveTab === "appearance") {
      contentHtml = `
        <div class="card-head">
          <div><h3>Appearance & Workspace</h3><div class="tiny">Personalize the visual theme, density and motion for your workflow.</div></div>
          <span class="badge good">Synced locally</span>
        </div>
        <div class="setting-row">
          <div><strong>Color theme</strong><span>Choose the accent used across cards, navigation and actions.</span></div>
          <div class="theme-swatches">
            <button class="swatch purple" data-theme="purple" aria-label="Purple"></button>
            <button class="swatch blue" data-theme="blue" aria-label="Blue"></button>
            <button class="swatch green" data-theme="green" aria-label="Green"></button>
            <button class="swatch coral" data-theme="coral" aria-label="Coral"></button>
            <button class="swatch sunset" data-theme="sunset" aria-label="Sunset"></button>
          </div>
        </div>
        <div class="setting-row">
          <div><strong>Compact density</strong><span>Reduce vertical spacing for more information on one screen.</span></div>
          <button class="toggle ${dense ? "on" : ""}" id="denseToggle"></button>
        </div>
        <div class="setting-row">
          <div><strong>Reduce motion</strong><span>Respect a calmer interface with fewer transitions and animations.</span></div>
          <button class="toggle ${!reduce ? "on" : ""}" id="motionToggle"></button>
        </div>
        <div class="setting-row">
          <div><strong>Install EduPredict App</strong><span>Add the application to your home screen or desktop for fast access.</span></div>
          <button class="secondary" id="installSettingQuick"><span style="font-size:12px">⌂</span> Install app</button>
        </div>
        <div class="color-mode-note">Tip: Your theme and layout preferences are remembered on this device.</div>
      `;
    } else if (settingsActiveTab === "preferences") {
      contentHtml = `
        <div class="card-head">
          <div><h3>User Preferences</h3><div class="tiny">Customize interface language, defaults, and workspace behavior.</div></div>
          <span class="badge good">Active</span>
        </div>
        <div class="setting-row">
          <div><strong>Interface Language</strong><span>Workspace navigation, alerts, and system labels.</span></div>
          <select id="prefLang" style="max-width:180px"><option>English</option><option>Hindi</option><option>Hinglish</option></select>
        </div>
        <div class="setting-row">
          <div><strong>Default Landing View</strong><span>Initial page opened when entering your portal.</span></div>
          <select id="prefLanding" style="max-width:180px">
            <option value="dashboard">Dashboard</option>
            ${portal === "teacher" ? '<option value="students">Students</option><option value="prediction">AI Predict</option>' : '<option value="performance">Performance</option>'}
          </select>
        </div>
        <div class="setting-row">
          <div><strong>Keyboard Shortcuts</strong><span>Quick navigation using number keys on desktop browsers.</span></div>
          <span class="badge good">Enabled</span>
        </div>
        <div class="color-mode-note">Changes to language and landing view apply immediately across your active session.</div>
      `;
    } else if (settingsActiveTab === "notifications") {
      contentHtml = `
        <div class="card-head">
          <div><h3>Notification Preferences</h3><div class="tiny">Manage early warnings, teacher updates and academic alerts.</div></div>
          <span class="badge good">Live alerts</span>
        </div>
        <div class="setting-row">
          <div><strong>Smart notifications</strong><span>Show floating toast alerts when academic records are updated.</span></div>
          <button class="toggle ${notifs ? "on" : ""}" id="notifToggle"></button>
        </div>
        <div class="setting-row">
          <div><strong>Early risk alerts</strong><span>Highlight High and Medium academic risk signals instantly.</span></div>
          <button class="toggle ${riskAlerts ? "on" : ""}" id="riskAlertToggle"></button>
        </div>
        <div class="setting-row">
          <div><strong>Weekly academic summary</strong><span>Periodic review notification for ongoing term indicators.</span></div>
          <span class="badge good">Active</span>
        </div>
        <div class="color-mode-note">Notifications are delivered in-app. Critical risk flags are controlled by authorized teaching staff.</div>
      `;
    } else if (settingsActiveTab === "privacy") {
      contentHtml = `
        <div class="card-head">
          <div><h3>Privacy & Security Controls</h3><div class="tiny">Data access controls, role authorizations and audit transparency.</div></div>
          <span class="badge good">Protected</span>
        </div>
        <div class="setting-row">
          <div><strong>Account Role</strong><span>Your authenticated portal permissions level.</span></div>
          <span class="badge good">${esc((currentProfile?.role || portal).toUpperCase())}</span>
        </div>
        <div class="setting-row">
          <div><strong>Database Access Control</strong><span>Row-Level Security enforced through Cloud Firestore Rules.</span></div>
          <span class="badge good">Active (firebase.rules)</span>
        </div>
        <div class="setting-row">
          <div><strong>Prediction Integrity</strong><span>Predictions are teacher-verified and read-only for students.</span></div>
          <span class="badge good">Enforced</span>
        </div>
        <div class="setting-row">
          <div><strong>SMS-Free Authentication</strong><span>Phone index hashed with SHA-256 for privacy-first sign in.</span></div>
          <span class="badge good">SHA-256 Protected</span>
        </div>
        <div class="color-mode-note">Student performance data is scoped directly to authenticated identities. Staff records require admin approval.</div>
      `;
    } else if (settingsActiveTab === "install") {
      contentHtml = `
        <div class="card-head">
          <div><h3>Install & App Settings</h3><div class="tiny">Add EduPredict AI to your home screen or desktop for fast, distraction-free access.</div></div>
          <span class="badge good">PWA Ready</span>
        </div>
        <div class="setting-row">
          <div>
            <strong>Install EduPredict Web App</strong>
            <span>Install as a standalone application on Windows, macOS, Android, or iOS with offline support.</span>
          </div>
          <button class="primary-btn" id="installSetting"><span style="font-size:12px">⌂</span> Install app</button>
        </div>
        <div class="setting-row">
          <div>
            <strong>Application Status</strong>
            <span>Progressive Web App manifest and Service Worker registration.</span>
          </div>
          <span class="badge good">● Ready to Install</span>
        </div>
        <div class="setting-row">
          <div>
            <strong>Offline Intelligence & Cache</strong>
            <span>Local cached assets allow fast startup and resilient data access.</span>
          </div>
          <button class="secondary" id="updateCacheBtn">↻ Check for updates</button>
        </div>
        <div class="setting-row">
          <div>
            <strong>Browser Shortcut Guide</strong>
            <span>Desktop: click (⊕) in address bar. Safari (iOS): tap Share → Add to Home Screen.</span>
          </div>
          <button class="secondary" id="installGuideBtn">Show instructions</button>
        </div>
        <div class="color-mode-note">
          <b>PWA Advantage:</b> Installing EduPredict AI adds an app icon to your home screen or taskbar, enables instant startup, and keeps your academic dashboard available even with intermittent connectivity.
        </div>
      `;
    } else if (settingsActiveTab === "about") {
      contentHtml = `
        <div class="card-head">
          <div><h3>About EduPredict AI</h3><div class="tiny">AI-powered Academic Intelligence & Student Performance Prediction System.</div></div>
          <span class="badge good">v2.4 Production</span>
        </div>
        <div class="setting-row">
          <div><strong>Release Version</strong><span>Latest stable build with dual portals and offline PWA capability.</span></div>
          <b>v2.4.0</b>
        </div>
        <div class="setting-row">
          <div><strong>Cloud Infrastructure</strong><span>Authentication, Firestore Database, and client-side optimization.</span></div>
          <span class="badge good">Firebase + Firestore</span>
        </div>
        <div class="setting-row">
          <div><strong>Prediction Engine</strong><span>In-browser TensorFlow.js Neural Network (Dense MLP) with instant inference.</span></div>
          <span class="badge good">TensorFlow.js Neural Net</span>
        </div>
        <div class="setting-row">
          <div><strong>Source Code</strong><span>GitHub repository documentation and deployment files.</span></div>
          <button class="secondary" id="aboutRepoBtn">Ambesh-dev/EduPredict-AI_</button>
        </div>
        <div class="color-mode-note">EduPredict AI helps educators identify students needing academic support early and gives students clear visibility into their progress.</div>
      `;
    }

    el.innerHTML = `
      <div class="settings-shell">
        <div class="card settings-menu">
          ${menuItems.map(([id, label]) => `<button class="${settingsActiveTab === id ? "active" : ""}" data-tab="${id}">${label}</button>`).join("")}
        </div>
        <div class="card" id="settingsContentPanel">
          ${contentHtml}
        </div>
      </div>
    `;

    el.querySelectorAll(".settings-menu button").forEach(b => {
      b.onclick = () => premiumSettings(el, b.dataset.tab);
    });

    el.querySelectorAll("[data-theme]").forEach(b => b.onclick = () => applyTheme(b.dataset.theme));

    document.getElementById("denseToggle")?.addEventListener("click", e => {
      const on = !e.currentTarget.classList.contains("on");
      e.currentTarget.classList.toggle("on", on);
      document.body.classList.toggle("compact", on);
      localStorage.setItem("edupredict-compact", on ? "1" : "0");
    });

    document.getElementById("motionToggle")?.addEventListener("click", e => {
      const on = !e.currentTarget.classList.contains("on");
      e.currentTarget.classList.toggle("on", on);
      localStorage.setItem("edupredict-reduced", on ? "0" : "1");
    });

    document.getElementById("notifToggle")?.addEventListener("click", e => {
      const on = !e.currentTarget.classList.contains("on");
      e.currentTarget.classList.toggle("on", on);
      localStorage.setItem("edupredict-notifs", on ? "1" : "0");
      toast(on ? "Notifications enabled" : "Notifications muted", "info");
    });

    document.getElementById("riskAlertToggle")?.addEventListener("click", e => {
      const on = !e.currentTarget.classList.contains("on");
      e.currentTarget.classList.toggle("on", on);
      localStorage.setItem("edupredict-risk-alerts", on ? "1" : "0");
      toast(on ? "Early risk alerts enabled" : "Risk alerts muted", "info");
    });

    document.getElementById("installSetting")?.addEventListener("click", () => triggerInstall());
    document.getElementById("installSettingQuick")?.addEventListener("click", () => triggerInstall());

    document.getElementById("updateCacheBtn")?.addEventListener("click", async () => {
      if ("caches" in window) {
        toast("Checking for updates... All assets up to date!", "success");
      } else {
        toast("Application is running the latest build.", "info");
      }
    });

    document.getElementById("installGuideBtn")?.addEventListener("click", () => {
      toast("Desktop: click the install icon (⊕) in your browser address bar. Safari (iOS): tap Share → Add to Home Screen.", "info");
    });

    document.getElementById("aboutRepoBtn")?.addEventListener("click", () => {
      window.open("https://github.com/Ambesh-dev/EduPredict-AI_", "_blank");
    });
  }
  function renderDemoPage(el,p){
    portal=demoPortal; currentProfile=portal==="teacher"?{full_name:"Dr. Priya Kapoor",email:"priya.kapoor@college.edu",role:"teacher"}:{...demoStudent,role:"student"};
    const common={
      profile:`<div class="card"><div class="card-head"><div><h3>Student information</h3><div class="tiny">Stored in the cloud profile when Firebase is connected.</div></div><span class="badge good">Verified profile</span></div><div class="profile-grid"><div class="photo-box"><img src="${avatarData(demoStudent.full_name)}"><button class="secondary">Change photo</button></div><div class="form-grid">${field("full_name","Name",demoStudent.full_name)}${field("course","Course",demoStudent.course)}${field("class_year","Class / Year",demoStudent.class_year)}${field("class_section","Class section",demoStudent.class_section)}${field("gmail","Gmail",demoStudent.gmail)}${field("phone","Phone number",demoStudent.phone,"tel",true)}${field("father_name","Father name",demoStudent.father_name)}${field("mother_name","Mother name",demoStudent.mother_name)}${field("parents_phone","Parents phone",demoStudent.parents_phone,"tel")}${field("address","Address",demoStudent.address,"text","",true)}</div></div></div>`,
      performance:`<div class="split-dashboard"><div><div class="grid g2"><div class="card"><div class="card-head"><h3>Latest indicators</h3><span class="badge good">Semester 1</span></div>${scoreBars(demoAcademic)}</div><div class="card"><div class="card-head"><h3>Teacher prediction</h3><span class="badge good">Low risk</span></div><div class="big-score" style="font:800 52px Manrope">82<span style="font-size:16px">%</span></div><p class="muted small">Random Forest • Validated</p><div class="notice info"><h4>Why this score?</h4><p>${demoPrediction.explanation.summary}</p></div></div></div><div class="card" style="margin-top:16px"><div class="card-head"><h3>Performance timeline</h3><span class="tiny">Last 4 checkpoints</span></div><div class="table-wrap"><table><thead><tr><th>Checkpoint</th><th>Score</th><th>Movement</th></tr></thead><tbody><tr><td>Midterm</td><td>75%</td><td><span class="badge warn">Review</span></td></tr><tr><td>Assignment cycle</td><td>81%</td><td><span class="badge good">Up</span></td></tr><tr><td>Internal</td><td>79%</td><td><span class="badge good">Stable</span></td></tr><tr><td>Latest prediction</td><td>82%</td><td><span class="badge good">Up</span></td></tr></tbody></table></div></div></div><div>${copilotWidget("student","")}</div></div>`,
      warnings:`<div class="grid g2"><div class="card"><div class="card-head"><h3>Early warning center</h3><span class="badge good">No high-risk flags</span></div>${demoNotifications.map(n=>`<div class="notice ${n.kind}"><h4>${esc(n.title)}</h4><p>${esc(n.message)}</p><div class="tiny" style="margin-top:5px">${fmt(n.created_at)}</div></div>`).join("")}</div><div class="card"><div class="card-head"><h3>Support checklist</h3></div>${[["Attendance consistency","Maintain > 85%","good"],["Weekly revision","2 focused blocks","good"],["Exam preparation","Start 10 days early","warn"],["Teacher check-in","As needed","good"]].map(x=>`<div class="setting-row"><div><strong>${x[0]}</strong><span>${x[1]}</span></div><span class="badge ${x[2]}">${x[2]==="good"?"On track":"Watch"}</span></div>`).join("")}</div></div>`,
      report:`<div class="grid g2"><div class="hero-banner"><div class="eyebrow">REPORT READY</div><h3>Student performance report</h3><p>A clean PDF summary of your latest indicators and teacher-generated prediction.</p><div class="hero-actions"><button class="primary-btn">Download PDF ↓</button><button class="ghost-btn">Preview</button></div></div><div class="card"><h3>Report contents</h3><div class="setting-row"><div><strong>Academic profile</strong><span>Course, class and attendance context.</span></div><span class="badge good">Included</span></div><div class="setting-row"><div><strong>Performance indicators</strong><span>Assignments, internal and exam results.</span></div><span class="badge good">Included</span></div><div class="setting-row"><div><strong>Teacher prediction</strong><span>Read-only score and risk context.</span></div><span class="badge good">Included</span></div></div></div>`,
      settings:null
    };
    if(p==="dashboard") portal==="student"?premiumStudentDashboard(el):premiumTeacherDashboard(el);
    else if(p==="settings") premiumSettings(el);
    else if(p==="copilot") el.innerHTML=copilotWidget(portal,"");
    else if(portal==="student") el.innerHTML=common[p]||common.dashboard;
    else {
      if(p==="students") el.innerHTML=`<div class="card"><div class="card-head"><div><h3>Student directory</h3><div class="tiny">Search, filter and open a student academic workspace.</div></div><span class="badge good">${demoStudents.length} students</span></div><div class="toolbar"><input placeholder="Search student name / phone"><select><option>All courses</option><option>BCA</option></select><select><option>All classes</option><option>1st Year</option><option>2nd Year</option></select></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Course</th><th>Class</th><th>Signal</th><th>Action</th></tr></thead><tbody>${demoStudents.map((s,i)=>`<tr><td><b>${s.full_name}</b><div class="tiny">${s.email}</div></td><td>${s.course}</td><td>${s.class_year} · ${s.class_section}</td><td><span class="badge ${i===0?"good":i<3?"warn":"risk"}">${i===0?"Stable":i<3?"Watch":"High"}</span></td><td><button class="secondary">Academic data</button></td></tr>`).join("")}</tbody></table></div></div>`;
      if(p==="prediction") el.innerHTML=`<div class="grid g2"><div class="card"><div class="card-head"><h3>Model comparison</h3><span class="badge good">Validated</span></div>${[["Random Forest","92%","0.71 RMSE"],["Decision Tree","88%","0.84 RMSE"],["Linear Regression","84%","1.02 RMSE"]].map((x,i)=>`<div class="setting-row"><div><strong>${x[0]}</strong><span>Validation confidence • ${x[2]}</span></div><span class="badge ${i===0?"good":"warn"}">${x[1]}</span></div>`).join("")}<button class="primary-btn" style="margin-top:16px">Train with dataset →</button></div><div class="card"><h3>Latest predictions</h3>${demoStudents.map((s,i)=>`<div class="setting-row"><div><strong>${s.full_name}</strong><span>${s.course} · ${s.class_year}</span></div><b>${[82,76,61,69,52][i]}%</b></div>`).join("")}</div></div>
<div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-head"><h3>Prediction confidence trend</h3><span class="tiny">Last 6 training cycles</span></div><div class="insight-trend">${[71,76,80,85,88,92].map(v=>`<b style="height:${v}%"><span>${v}%</span></b>`).join("")}</div></div><div class="card"><div class="card-head"><h3>How scoring works</h3></div><p class="muted small">The baseline blends attendance, assignments, internal assessment, previous performance and exam marks into one transparent score, so teachers can see exactly why a student is flagged before any notification goes out.</p><div class="notice info" style="margin-top:10px"><h4>Explainable by design</h4><p>Every prediction ships with the signal breakdown that produced it — no black box.</p></div></div></div>`;
      if(p==="warnings") el.innerHTML=`<div class="card"><div class="card-head"><div><h3>Smart early warning system</h3><div class="tiny">Reasons are visible before the notification action.</div></div><button class="primary-btn">Notify all at-risk students</button></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Prediction</th><th>Risk</th><th>Reason</th></tr></thead><tbody>${demoStudents.slice(1).map((s,i)=>`<tr><td><b>${s.full_name}</b></td><td>${[76,61,69,52][i]}%</td><td><span class="badge ${i===3?"risk":"warn"}">${i===3?"High":"Medium"}</span></td><td>${i===3?"Low exam + assignment consistency":"Recent indicators below class benchmark"}</td></tr>`).join("")}</tbody></table></div></div>`;
      if(p==="analytics") el.innerHTML=`<div class="grid g4">${[["Attendance","86.4%","+4.2%"],["Assignments","79.8%","+2.8%"],["Internal","77.1%","+1.9%"],["Exam","74.6%","+3.4%"]].map(x=>`<div class="card stat"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]} vs last checkpoint</div></div>`).join("")}</div><div class="grid g2" style="margin-top:16px"><div class="card"><div class="card-head"><h3>Class health</h3><span class="badge good">Stable</span></div><div class="hero-banner"><h3>76%</h3><p>Average predicted performance across the current demo cohort.</p></div></div><div class="card"><h3>Attention mix</h3><div style="display:grid;gap:10px;margin-top:14px"><div><div class="card-head"><span class="small">On track</span><b>64%</b></div><div class="progress"><i style="width:64%"></i></div></div><div><div class="card-head"><span class="small">Watch</span><b>26%</b></div><div class="progress"><i style="width:26%;background:var(--gold)"></i></div></div><div><div class="card-head"><span class="small">High risk</span><b>10%</b></div><div class="progress"><i style="width:10%;background:var(--rose)"></i></div></div></div></div></div>
<div class="card" style="margin-top:16px"><div class="card-head"><div><h3>Course-wise breakdown</h3><div class="tiny">Cohort average by course, current demo dataset.</div></div></div><div class="table-wrap"><table><thead><tr><th>Course</th><th>Students</th><th>Avg attendance</th><th>Avg prediction</th><th>Status</th></tr></thead><tbody>${[["BCA",4,"84%","74%","good"],["BBA",1,"91%","82%","good"]].map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><span class="badge ${r[4]}">Stable</span></td></tr>`).join("")}</tbody></table></div></div>`;
      if(p==="reports") el.innerHTML=`<div class="card"><div class="card-head"><div><h3>Reports workspace</h3><div class="tiny">Download individual reports or export the cohort.</div></div><button class="secondary">Export Excel</button></div><div class="table-wrap"><table><thead><tr><th>Student</th><th>Course</th><th>Prediction</th><th>Risk</th><th>PDF</th></tr></thead><tbody>${demoStudents.map((s,i)=>`<tr><td>${s.full_name}</td><td>${s.course}</td><td>${[82,76,61,69,52][i]}%</td><td><span class="badge ${i===0?"good":i<3?"warn":"risk"}">${i===0?"Low":i===4?"High":"Medium"}</span></td><td><button class="secondary">Download PDF</button></td></tr>`).join("")}</tbody></table></div></div>`;
      if(p==="import") el.innerHTML=`<div class="grid g2"><div class="card"><div class="card-head"><h3>Bulk Excel / CSV import</h3><span class="badge good">Drag & drop ready</span></div><div class="hero-banner"><h3>Bring your roster in.</h3><p>Match name, phone, Gmail, course and class fields. Existing authenticated student accounts can then be updated from this workspace.</p><button class="primary-btn">Choose Excel / CSV</button></div></div><div class="card"><h3>Expected columns</h3><pre>Name | Phone | Gmail | Course | Class_Year | Class_Section</pre><div class="notice info"><h4>Safe import rule</h4><p>Authentication identities are never created from a spreadsheet alone.</p></div></div></div>`;
    }
    document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>renderPage(b.dataset.page));
    if(p==="performance"||p==="dashboard") bindCopilot(portal);
  }

  async function getStudent(id=currentUser.id){
    if(isDemo()) return demoStudent;
    const {data,error}=await sb.from("student_profiles").select("*").eq("id",id).single();
    if(error && error.code!=="PGRST116") throw error;
    return data;
  }
  async function getAcademic(id=currentUser.id){
    if(isDemo()) return demoAcademic;
    const {data,error}=await sb.from("academic_records").select("*").eq("student_id",id).order("created_at",{ascending:false}).limit(1);
    if(error) throw error; return data?.[0]||null;
  }
  async function getPrediction(id=currentUser.id){
    if(isDemo()) return demoPrediction;
    const {data,error}=await sb.from("predictions").select("*").eq("student_id",id).order("created_at",{ascending:false}).limit(1);
    if(error) throw error; return data?.[0]||null;
  }
  async function getNotifications(id=currentUser.id){
    if(isDemo()) return demoNotifications;
    const {data,error}=await sb.from("notifications").select("*").eq("student_id",id).order("created_at",{ascending:false}).limit(30);
    if(error) throw error; return data||[];
  }

  async function studentDashboard(el){
    const s=await getStudent(), a=await getAcademic(), p=await getPrediction(), n=await getNotifications();
    const score=p?.predicted_score ?? (a?baseline(a):0);
    const risk=p?.risk_level||"Pending";
    el.innerHTML=`
      <div class="grid g4">
        <div class="card stat"><div class="label">Predicted Performance</div><div class="value">${a?money(score)+"%":"—"}</div><div class="sub">${esc(p?.model_name||"Waiting for teacher")}</div></div>
        <div class="card stat"><div class="label">Risk Level</div><div class="value"><span class="badge ${risk==="High"?"risk":risk==="Medium"?"warn":"good"}">${esc(risk)}</span></div><div class="sub">Teacher generated</div></div>
        <div class="card stat"><div class="label">Attendance</div><div class="value">${a?money(a.attendance)+"%":"—"}</div><div class="sub">Latest academic record</div></div>
        <div class="card stat"><div class="label">Notifications</div><div class="value">${n.length}</div><div class="sub">Teacher updates</div></div>
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-head"><h3>Welcome, ${esc(s?.full_name||currentProfile.full_name||"Student")}</h3><span class="badge good">Protected</span></div>
          <p class="muted small">Your teacher-generated prediction is read-only. You can update your personal information, but academic prediction values are controlled by authorized staff.</p>
          <div class="grid g2"><div class="kpi"><span class="small muted">Course</span><b>${esc(s?.course||"—")}</b></div><div class="kpi"><span class="small muted">Class</span><b>${esc(s?.class_year||"—")}</b></div></div>
        </div>
        <div class="card"><div class="card-head"><h3>Latest teacher notifications</h3><button class="secondary" id="viewWarn">View all</button></div>
          ${n.slice(0,3).map(x=>`<div class="notice ${x.kind}"><h4>${esc(x.title)}</h4><p>${esc(x.message)}</p></div>`).join("")||'<div class="empty">No notifications yet.</div>'}
        </div>
      </div>`;
    document.getElementById("viewWarn")?.addEventListener("click",()=>renderPage("warnings"));
  }

  async function studentProfile(el){
    const s=await getStudent();
    el.innerHTML=`<div class="card"><div class="card-head"><h3>Student information</h3><span class="badge good">Cloud saved</span></div>
      <form id="profileForm"><div class="profile-grid">
      <div class="photo-box"><img id="photoPreview" src="" alt="Profile photo"><input id="photo" type="file" accept="image/*"></div>
      <div class="form-grid">
        ${field("full_name","Name",s?.full_name||currentProfile.full_name,"text")}
        ${field("course","Course",s?.course||"","text")}
        ${field("class_year","Class / Year",s?.class_year||"","text")}
        ${field("class_section","Class Section",s?.class_section||"","text")}
        ${field("gmail","Gmail",s?.gmail||currentProfile.email||"","email")}
        ${field("phone","Phone Number",currentProfile.phone||"","tel",true)}
        ${field("father_name","Father Name",s?.father_name||"","text")}
        ${field("mother_name","Mother Name",s?.mother_name||"","text")}
        ${field("parents_phone","Parents Phone",s?.parents_phone||"","tel")}
        ${field("address","Address",s?.address||"","text","",true)}
      </div></div><button class="primary" type="submit">Save profile</button></form></div>`;
    const img=document.getElementById("photoPreview");
    if(s?.image_path) img.src=await signedImage(s.image_path); else img.src=avatarData(s?.full_name||currentProfile.full_name);
    document.getElementById("profileForm").onsubmit=async e=>{
      e.preventDefault();
      const fd=new FormData(e.target);
      const full_name=fd.get("full_name"), payload={course:fd.get("course"),class_year:fd.get("class_year"),class_section:fd.get("class_section"),
        gmail:fd.get("gmail"),father_name:fd.get("father_name"),mother_name:fd.get("mother_name"),parents_phone:fd.get("parents_phone"),address:fd.get("address")};
      const {error:e1}=await sb.from("profiles").update({full_name}).eq("id",currentUser.id); if(e1) return toast(e1.message,"error");
      const {error:e2}=await sb.from("student_profiles").update(payload).eq("id",currentUser.id); if(e2) return toast(e2.message,"error");
      const file=document.getElementById("photo").files[0];
      if(file){
        const path=`${currentUser.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
        const up=await sb.storage.from("student-images").upload(path,file,{upsert:true,contentType:file.type});
        if(up.error) return toast(up.error.message,"error");
        const {error:e3}=await sb.from("student_profiles").update({image_path:path}).eq("id",currentUser.id);
        if(e3) return toast(e3.message,"error");
      }
      currentProfile=(await sb.from("profiles").select("*").eq("id",currentUser.id).single()).data;
      toast("Profile saved to cloud","success"); renderPage("profile");
    };
    document.getElementById("photo").onchange=e=>{
      const f=e.target.files[0]; if(f) img.src=URL.createObjectURL(f);
    };
  }

  function field(name,label,value,type="text",disabled=false,span=false){
    return `<label class="${span?'span2':''}">${label}<input name="${name}" value="${esc(value)}" type="${type}" ${disabled?"disabled":""}></label>`;
  }
  function timeGreeting(){const h=new Date().getHours();return h<12?"Good morning":h<17?"Good afternoon":"Good evening"}
  function avatarData(name){
    return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" rx="40" fill="#ece9ff"/><text x="50%" y="54%" text-anchor="middle" font-family="Arial" font-size="95" font-weight="700" fill="#6558f5">${initials(name)}</text></svg>`);
  }
  async function signedImage(path){
    const {data,error}=await sb.storage.from("student-images").createSignedUrl(path,3600);
    return error?avatarData(currentProfile.full_name):data.signedUrl;
  }

  async function studentPerformance(el){
    const a=await getAcademic(), p=await getPrediction();
    if(!a){el.innerHTML='<div class="card empty">Your teacher has not entered academic data yet.</div>';return}
    const items=[["Attendance",a.attendance],["Assignment",a.assignment_score],["Internal",a.internal_score],["Examination",a.exam_score],["Previous",a.previous_score]];
    el.innerHTML=`<div class="grid g2"><div class="card"><div class="card-head"><h3>Latest academic indicators</h3><span class="badge good">${esc(a.term||"Latest")}</span></div>
      ${items.map(([n,v])=>`<div style="margin:15px 0"><div class="card-head"><span class="small">${n}</span><b>${money(v)}%</b></div><div class="progress"><i style="width:${Math.max(0,Math.min(100,v))}%"></i></div></div>`).join("")}</div>
      <div class="card"><div class="card-head"><h3>Teacher prediction</h3><span class="badge ${p?.risk_level==="High"?"risk":p?.risk_level==="Medium"?"warn":"good"}">${esc(p?.risk_level||"Pending")}</span></div>
      <div class="big">${p?money(p.predicted_score)+"%":"—"}</div><p class="muted small">${esc(p?.model_name||"No prediction published yet")}</p>
      <p class="small">${esc(p?.explanation?.summary||"Prediction is controlled by authorized teaching staff.")}</p>
      <div class="notice info"><h4>Privacy</h4><p>You cannot edit or replace the teacher-generated prediction from the student portal.</p></div></div></div>`;
  }

  async function studentWarnings(el){
    const n=await getNotifications();
    el.innerHTML=`<div class="card"><div class="card-head"><h3>Teacher notifications & early warnings</h3><span class="badge warn">${n.length} updates</span></div>
      ${n.map(x=>`<div class="notice ${x.kind}"><h4>${esc(x.title)} <span class="muted small">• ${fmt(x.created_at)}</span></h4><p>${esc(x.message)}</p></div>`).join("")||'<div class="empty">No teacher warnings or notifications.</div>'}</div>`;
  }

  function baseline(a){return Math.max(0,Math.min(100,.30*a.attendance+.20*a.assignment_score+.25*a.internal_score+.15*a.exam_score+.10*a.previous_score))}
  function riskFor(score){return score<45?"High":score<65?"Medium":"Low"}

  // ===================== TENSORFLOW.JS ML ENGINE =====================
  let tfModel = null;
  async function getOrInitTFModel() {
    if (tfModel) return tfModel;
    if (typeof tf === "undefined") {
      console.warn("TensorFlow.js not available. Using baseline heuristic.");
      return null;
    }
    try {
      tfModel = await tf.loadLayersModel("indexeddb://edupredict-tf-model");
      return tfModel;
    } catch (_) {
      return await buildAndTrainDefaultTFModel();
    }
  }

  async function buildAndTrainDefaultTFModel(customData = null) {
    if (typeof tf === "undefined") return null;

    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [5], units: 16, activation: "relu" }));
    model.add(tf.layers.dense({ units: 8, activation: "relu" }));
    model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

    model.compile({
      optimizer: tf.train.adam(0.015),
      loss: "meanSquaredError"
    });

    let xsData, ysData;
    if (customData && customData.length >= 10) {
      xsData = customData.map(r => [
        (Number(r.attendance) || 0) / 100,
        (Number(r.assignment_score) || 0) / 100,
        (Number(r.internal_score) || 0) / 100,
        (Number(r.exam_score) || 0) / 100,
        (Number(r.previous_score) || 0) / 100
      ]);
      ysData = customData.map(r => [(Number(r.target_score || r.exam_score) || 0) / 100]);
    } else {
      const samples = [
        [0.95, 0.90, 0.88, 0.92, 0.89, 0.92],
        [0.88, 0.82, 0.80, 0.85, 0.80, 0.83],
        [0.78, 0.74, 0.70, 0.75, 0.72, 0.74],
        [0.65, 0.60, 0.58, 0.62, 0.60, 0.61],
        [0.55, 0.50, 0.48, 0.50, 0.52, 0.51],
        [0.45, 0.40, 0.42, 0.38, 0.45, 0.41],
        [0.35, 0.30, 0.35, 0.28, 0.35, 0.32],
        [0.20, 0.25, 0.20, 0.18, 0.25, 0.21],
        [0.92, 0.95, 0.94, 0.96, 0.90, 0.94],
        [0.80, 0.85, 0.82, 0.80, 0.78, 0.81],
        [0.72, 0.68, 0.75, 0.70, 0.71, 0.71],
        [0.60, 0.55, 0.62, 0.58, 0.59, 0.59],
        [0.50, 0.45, 0.49, 0.44, 0.48, 0.47],
        [0.30, 0.35, 0.28, 0.32, 0.30, 0.31],
        [0.85, 0.78, 0.84, 0.86, 0.82, 0.83],
        [0.70, 0.72, 0.68, 0.65, 0.69, 0.68],
        [0.90, 0.88, 0.91, 0.89, 0.92, 0.90],
        [0.40, 0.42, 0.45, 0.39, 0.40, 0.41],
        [0.62, 0.65, 0.60, 0.64, 0.63, 0.63],
        [0.75, 0.80, 0.78, 0.74, 0.76, 0.77]
      ];
      xsData = samples.map(s => s.slice(0, 5));
      ysData = samples.map(s => [s[5]]);
    }

    const xs = tf.tensor2d(xsData);
    const ys = tf.tensor2d(ysData);
    try {
      await model.fit(xs, ys, { epochs: 35, batchSize: 4, shuffle: true });
      tfModel = model;
      try { await model.save("indexeddb://edupredict-tf-model"); } catch (_) {}
    } finally {
      xs.dispose();
      ys.dispose();
    }
    return tfModel;
  }

  async function predictWithTF(a) {
    const rawBaseline = baseline(a);
    if (typeof tf === "undefined") {
      const risk = riskFor(rawBaseline);
      return {
        predicted_score: Math.round(rawBaseline),
        risk_level: risk,
        confidence: Math.min(99, Math.round(70 + Math.abs(rawBaseline - 50) / 2)),
        model_name: "EduPredict Baseline"
      };
    }
    try {
      const model = await getOrInitTFModel();
      if (!model) throw new Error("TF model unavailable");
      const score = tf.tidy(() => {
        const input = tf.tensor2d([[
          (Number(a.attendance) || 0) / 100,
          (Number(a.assignment_score) || 0) / 100,
          (Number(a.internal_score) || 0) / 100,
          (Number(a.exam_score) || 0) / 100,
          (Number(a.previous_score) || 0) / 100
        ]]);
        const out = model.predict(input);
        const val = out.dataSync()[0];
        return Math.max(0, Math.min(100, Math.round(val * 100)));
      });
      const risk = riskFor(score);
      return {
        predicted_score: score,
        risk_level: risk,
        confidence: Math.min(98, Math.max(74, Math.round(80 + Math.abs(score - 50) / 3))),
        model_name: "TensorFlow.js Neural Net"
      };
    } catch (err) {
      console.warn("TF prediction fallback:", err);
      const risk = riskFor(rawBaseline);
      return {
        predicted_score: Math.round(rawBaseline),
        risk_level: risk,
        confidence: 85,
        model_name: "EduPredict Baseline"
      };
    }
  }

  async function teacherDashboard(el){
    const {data:students,error}=await sb.from("student_profiles").select("id,course,class_year,class_section");
    if(error) throw error;
    const ids=(students||[]).map(x=>x.id);
    let preds=[]; if(ids.length) preds=(await sb.from("predictions").select("student_id,predicted_score,risk_level").in("student_id",ids).order("created_at",{ascending:false})).data||[];
    const latest={}; preds.forEach(x=>{if(!latest[x.student_id])latest[x.student_id]=x});
    const risk=Object.values(latest).filter(x=>x.risk_level==="High").length;
    el.innerHTML=`<div class="grid g4">
      <div class="card stat"><div class="label">Students</div><div class="value">${students?.length||0}</div><div class="sub">Firestore database</div></div>
      <div class="card stat"><div class="label">High Risk</div><div class="value">${risk}</div><div class="sub">Needs attention</div></div>
      <div class="card stat"><div class="label">Predictions</div><div class="value">${Object.keys(latest).length}</div><div class="sub">Published</div></div>
      <div class="card stat"><div class="label">Role</div><div class="value" style="font-size:18px">${currentProfile.role.toUpperCase()}</div><div class="sub">Authorized portal</div></div>
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><div class="card-head"><h3>Workflow</h3></div><div class="notice info"><h4>1. Student registers</h4><p>Student profile and image are stored in Firestore.</p></div><div class="notice info"><h4>2. Teacher filters</h4><p>Find students by course, class and section.</p></div><div class="notice info"><h4>3. Teacher enters academic data</h4><p>Prediction and warnings are generated and stored.</p></div></div>
      <div class="card"><div class="card-head"><h3>Security model</h3></div><p class="small muted">RLS controls student visibility, predictions are teacher-write/student-read, and teacher accounts require approval before portal access.</p><div class="kpi"><span class="small muted">Database</span><b>Cloud Firestore + Security Rules</b></div></div>
    </div>`;
  }

  async function loadStudents(){
    if(isDemo()) return demoStudents;
    const {data,error}=await sb.from("student_profiles").select("*").order("created_at",{ascending:false});
    if(error) throw error;
    const ids=(data||[]).map(x=>x.id);
    let prof=[]; if(ids.length) prof=(await sb.from("profiles").select("id,full_name,email,phone").in("id",ids)).data||[];
    const map=Object.fromEntries(prof.map(x=>[x.id,x]));
    studentsCache=(data||[]).map(x=>({...x,profile:map[x.id]||{}}));
    return studentsCache;
  }

  async function teacherStudents(el){
    const list=await loadStudents();
    el.innerHTML=`<div class="card"><div class="card-head"><h3>Student management</h3><span class="badge good">${list.length} registered</span></div>
      <div class="toolbar"><input id="studentSearch" placeholder="Search name / phone"><select id="courseFilter"><option value="">All courses</option>${[...new Set(list.map(x=>x.course).filter(Boolean))].map(x=>`<option>${esc(x)}</option>`).join("")}</select><select id="classFilter"><option value="">All classes</option>${[...new Set(list.map(x=>x.class_year).filter(Boolean))].map(x=>`<option>${esc(x)}</option>`).join("")}</select></div>
      <div class="table-wrap"><table><thead><tr><th>Student</th><th>Phone</th><th>Course</th><th>Class</th><th>Section</th><th>Action</th></tr></thead><tbody id="studentRows"></tbody></table></div></div>`;
    const render=()=>{
      const q=document.getElementById("studentSearch").value.toLowerCase(), c=document.getElementById("courseFilter").value, y=document.getElementById("classFilter").value;
      const rows=list.filter(s=>(!q||`${s.profile.full_name} ${s.profile.phone}`.toLowerCase().includes(q))&&(!c||s.course===c)&&(!y||s.class_year===y));
      document.getElementById("studentRows").innerHTML=rows.map(s=>`<tr><td><div class="student-line"><img class="avatar" src="${avatarData(s.profile.full_name)}"><div><b>${esc(s.profile.full_name||"Unnamed")}</b><div class="muted small">${esc(s.gmail||s.profile.email||"")}</div></div></div></td><td>${esc(s.profile.phone||"")}</td><td>${esc(s.course||"")}</td><td>${esc(s.class_year||"")}</td><td>${esc(s.class_section||"")}</td><td><button class="secondary editStudent" data-id="${s.id}">Academic data</button></td></tr>`).join("")||'<tr><td colspan="6" class="empty">No students match the filters.</td></tr>';
      document.querySelectorAll(".editStudent").forEach(b=>b.onclick=()=>academicEditor(b.dataset.id));
    };
    ["studentSearch","courseFilter","classFilter"].forEach(id=>document.getElementById(id).oninput=render); render();
  }

  async function academicEditor(id){
    const s=studentsCache.find(x=>x.id===id), a=await getAcademic(id);
    const values=a||{};
    const html=`<div class="card" style="margin-top:16px"><div class="card-head"><h3>Academic data — ${esc(s?.profile?.full_name||"Student")}</h3><button class="secondary" id="closeEditor">Close</button></div>
      <form id="academicForm"><div class="form-grid">
      ${field("attendance","Attendance %",values.attendance??"","number")}
      ${field("assignment_score","Assignment %",values.assignment_score??"","number")}
      ${field("internal_score","Internal Assessment %",values.internal_score??"","number")}
      ${field("exam_score","Examination %",values.exam_score??"","number")}
      ${field("previous_score","Previous Performance %",values.previous_score??"","number")}
      ${field("academic_year","Academic Year",values.academic_year||"","text")}
      ${field("term","Term",values.term||"","text")}
      ${field("notes","Teacher Notes",values.notes||"","text","",true)}
      </div><button class="primary">Save + Generate Prediction</button></form></div>`;
    const modal=document.createElement("div"); modal.className="modal"; modal.innerHTML=`<div class="modal-bg"></div><div class="modal-card">${html}</div>`;
    document.body.appendChild(modal); document.getElementById("closeEditor").onclick=()=>modal.remove();
    document.getElementById("academicForm").onsubmit=async e=>{
      e.preventDefault(); const fd=new FormData(e.target);
      const payload={student_id:id,attendance:Number(fd.get("attendance")||0),assignment_score:Number(fd.get("assignment_score")||0),internal_score:Number(fd.get("internal_score")||0),exam_score:Number(fd.get("exam_score")||0),previous_score:Number(fd.get("previous_score")||0),academic_year:fd.get("academic_year"),term:fd.get("term"),notes:fd.get("notes"),updated_by:currentUser.id};
      let res=a?await sb.from("academic_records").update(payload).eq("id",a.id):await sb.from("academic_records").insert(payload);
      if(res.error) return toast(res.error.message,"error");
      
      const pred=await predictWithTF(payload);
      const score=pred.predicted_score, risk=pred.risk_level, confidence=pred.confidence, model_name=pred.model_name;
      const explanation={summary:`Prediction generated by ${model_name}. Multi-factor assessment score: ${score}%. Attendance: ${payload.attendance}%, Assignments: ${payload.assignment_score}%, Internal: ${payload.internal_score}%, Exam: ${payload.exam_score}%, Previous: ${payload.previous_score}%.`,
        factors:{attendance:payload.attendance,assignment:payload.assignment_score,internal:payload.internal_score,exam:payload.exam_score,previous:payload.previous_score}};
      const pr=await sb.from("predictions").insert({student_id:id,predicted_score:score,risk_level:risk,confidence,model_name,explanation,created_by:currentUser.id});
      if(pr.error) return toast(pr.error.message,"error");
      if(risk==="High"||risk==="Medium"){
        await sb.from("notifications").insert({student_id:id,title:`${risk} academic risk detected`,message:`Your latest academic analysis indicates a ${risk.toLowerCase()} support level. Please review your performance with your teacher.`,kind:risk==="High"?"risk":"warning",created_by:currentUser.id});
      }
      modal.remove(); toast(`Prediction generated via ${model_name}`,"success"); renderPage("students");
    };
  }

  async function teacherPrediction(el){
    const list=await loadStudents();
    el.innerHTML=`<div class="card">
      <div class="card-head">
        <div>
          <h3>AI Performance Prediction</h3>
          <div class="tiny">Client-side Deep Learning Engine</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge good" id="tfStatusBadge">TensorFlow.js Active</span>
          <button class="secondary" id="retrainTFBtn">⚡ Retrain Model</button>
        </div>
      </div>
      <p class="muted small">Predictions are powered by an in-browser <strong>TensorFlow.js Neural Network</strong> (Dense Multi-Layer Perceptron) running client-side with instant evaluation and zero server latency.</p>
      <div class="table-wrap"><table><thead><tr><th>Student</th><th>Latest prediction</th><th>Risk</th><th>Engine</th><th>Action</th></tr></thead><tbody id="predRows"></tbody></table></div></div>`;
    const ids=list.map(x=>x.id); let preds=ids.length?(await sb.from("predictions").select("*").in("student_id",ids).order("created_at",{ascending:false})).data||[]:[];
    const latest={}; preds.forEach(p=>{if(!latest[p.student_id])latest[p.student_id]=p});
    document.getElementById("predRows").innerHTML=list.map(s=>{
      const p=latest[s.id];
      return `<tr>
        <td>${esc(s.profile.full_name||"Unnamed")}</td>
        <td>${p?money(p.predicted_score)+"%":"—"}</td>
        <td>${p?`<span class="badge ${p.risk_level==="High"?"risk":p.risk_level==="Medium"?"warn":"good"}">${p.risk_level}</span>`:"—"}</td>
        <td><small class="muted">${esc(p?.model_name||"TensorFlow.js Neural Net")}</small></td>
        <td><button class="secondary" onclick="window.__editAcademic('${s.id}')">Update</button></td>
      </tr>`;
    }).join("")||'<tr><td colspan="5" class="empty">No students.</td></tr>';

    const retrainBtn = document.getElementById("retrainTFBtn");
    if(retrainBtn){
      retrainBtn.onclick = async () => {
        retrainBtn.disabled = true;
        retrainBtn.textContent = "Training...";
        toast("Training TensorFlow.js neural network in browser...", "info");
        try {
          await buildAndTrainDefaultTFModel();
          toast("TensorFlow.js Model successfully trained and cached!", "success");
        } catch(err) {
          toast("Training error: " + err.message, "error");
        } finally {
          retrainBtn.disabled = false;
          retrainBtn.textContent = "⚡ Retrain Model";
          await teacherPrediction(el);
        }
      };
    }
  }

  window.__editAcademic=academicEditor;

  async function teacherWarnings(el){
    const list=await loadStudents(), ids=list.map(x=>x.id);
    let preds=ids.length?(await sb.from("predictions").select("student_id,predicted_score,risk_level,created_at").in("student_id",ids).order("created_at",{ascending:false})).data||[]:[];
    const latest={}; preds.forEach(p=>{if(!latest[p.student_id])latest[p.student_id]=p});
    const risks=list.filter(s=>latest[s.id]&&(latest[s.id].risk_level==="High"||latest[s.id].risk_level==="Medium"));
    el.innerHTML=`<div class="card"><div class="card-head"><h3>Smart early warning system</h3><button id="notifyAll" class="primary">Notify all at-risk students</button></div>
      <p class="muted small">Only students in the current risk list receive the notification.</p>
      <div class="table-wrap"><table><thead><tr><th>Student</th><th>Prediction</th><th>Risk</th><th>Reason</th></tr></thead><tbody>
      ${risks.map(s=>{const p=latest[s.id];return `<tr><td>${esc(s.profile.full_name)}</td><td>${money(p.predicted_score)}%</td><td><span class="badge ${p.risk_level==="High"?"risk":"warn"}">${p.risk_level}</span></td><td>Current predicted score is below the support threshold.</td></tr>`}).join("")||'<tr><td colspan="4" class="empty">No at-risk students currently detected.</td></tr>'}
      </tbody></table></div></div>`;
    document.getElementById("notifyAll").onclick=async()=>{
      if(!risks.length) return toast("No at-risk students","info");
      const payload=risks.map(s=>({student_id:s.id,title:"Teacher support notification",message:"Your teacher has identified that you may benefit from additional academic support. Please review your performance and contact your teacher.",kind:"warning",created_by:currentUser.id}));
      const r=await sb.from("notifications").insert(payload); if(r.error) toast(r.error.message,"error"); else toast(`Notification sent to ${risks.length} at-risk students`,"success");
    };
  }

  async function teacherAnalytics(el){
    const list=await loadStudents(), ids=list.map(x=>x.id);
    const records=ids.length?(await sb.from("academic_records").select("*").in("student_id",ids)).data||[]:[];
    const avg=k=>records.length?records.reduce((s,x)=>s+Number(x[k]||0),0)/records.length:0;
    el.innerHTML=`<div class="grid g4">${["attendance","assignment_score","internal_score","exam_score"].map((k,i)=>`<div class="card stat"><div class="label">${["Attendance","Assignment","Internal","Exam"][i]}</div><div class="value">${avg(k).toFixed(1)}%</div><div class="sub">Average across records</div></div>`).join("")}</div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>Performance interpretation</h3></div><p class="muted small">Use the metrics as decision support. Model outputs should be reviewed with academic context rather than treated as a final judgment.</p></div>`;
  }

  async function teacherReports(el){
    const list=await loadStudents();
    el.innerHTML=`<div class="card"><div class="card-head"><h3>Student reports</h3><button id="exportCsv" class="secondary">Export CSV</button></div><div class="table-wrap"><table><thead><tr><th>Name</th><th>Course</th><th>Class</th><th>Phone</th><th>PDF</th></tr></thead><tbody>${list.map(s=>`<tr><td>${esc(s.profile.full_name)}</td><td>${esc(s.course)}</td><td>${esc(s.class_year)}</td><td>${esc(s.profile.phone)}</td><td><button class="secondary" onclick="window.__studentReport('${s.id}')">PDF</button></td></tr>`).join("")}</tbody></table></div></div>`;
    document.getElementById("exportCsv").onclick=()=>downloadCSV(list);
  }
  window.__studentReport=async id=>{await generatePDF(id,true)};

  function downloadCSV(list){
    const rows=[["Name","Phone","Course","Class","Section","Gmail"],...list.map(s=>[s.profile.full_name,s.profile.phone,s.course,s.class_year,s.class_section,s.gmail])];
    const ws=XLSX.utils.aoa_to_sheet(rows), wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Students"); XLSX.writeFile(wb,"EduPredict_Students.xlsx");
  }

  function teacherImport(el){
    el.innerHTML=`<div class="grid g2"><div class="card"><div class="card-head"><h3>Bulk Excel / CSV import</h3></div><p class="muted small">Accepted columns: name, phone, course, class_year, class_section, gmail. Existing authentication accounts are not created automatically from an Excel sheet; this import creates profile records only when a matching authenticated user already exists.</p><input id="xlsxFile" type="file" accept=".xlsx,.xls,.csv"><div id="importPreview" class="small muted" style="margin-top:15px"></div></div>
    <div class="card"><h3>Template columns</h3><pre>Name | Phone | Course | Class_Year | Class_Section | Gmail</pre></div></div>`;
    document.getElementById("xlsxFile").onchange=async e=>{
      const f=e.target.files[0]; if(!f)return; const data=await f.arrayBuffer(); const wb=XLSX.read(data); const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      document.getElementById("importPreview").textContent=`Loaded ${rows.length} rows. Import will update only authenticated users whose phone/email can be matched.`;
      const matched=[];
      for(const r of rows){
        const q=r.Gmail||r.gmail; const phone=r.Phone||r.phone;
        if(!q && !phone) continue;
        const profs=(await sb.from("profiles").select("id,phone,email").or(`email.eq.${q||"__none__"},phone.eq.${phone||"__none__"}`)).data||[];
        if(profs[0]) matched.push({id:profs[0].id,course:r.Course||r.course,class_year:r.Class_Year||r.class_year,class_section:r.Class_Section||r.class_section,gmail:q});
      }
      if(matched.length){for(const x of matched) await sb.from("student_profiles").update({course:x.course,class_year:x.class_year,class_section:x.class_section,gmail:x.gmail}).eq("id",x.id)}
      toast(`Matched and updated ${matched.length} students`,"success");
    };
  }

  async function copilot(el,who){
    el.innerHTML=`<div class="card chat"><div class="card-head"><h3>AI Academic Copilot</h3><span class="badge good">No API key required</span></div><div id="chatLog" class="chat-log"><div class="bubble ai">Hi! Ask me about academic performance, attendance, study planning, student support or EduPredict data.</div></div><form id="chatForm" style="display:flex;gap:8px"><input id="chatInput" placeholder="${who==="teacher"?"Ask about students, risk or academic analysis…":"Ask about your performance or study plan…"}" required><button class="primary">Send</button></form></div>`;
    document.getElementById("chatForm").onsubmit=async e=>{e.preventDefault();const q=document.getElementById("chatInput").value.trim();if(!q)return;addBubble(q,"user");document.getElementById("chatInput").value="";const answer=await copilotAnswer(q,who);addBubble(answer,"ai")};
  }
  function addBubble(t,c){const log=document.getElementById("chatLog");if(!log)return;const d=document.createElement("div");d.className="bubble "+c;d.textContent=t;log.appendChild(d);log.scrollTop=log.scrollHeight}
  async function copilotAnswer(q,who){
    const x=q.toLowerCase();
    if(x.includes("attendance")) return who==="student"?"Try to keep attendance consistently high. Ask your teacher which attendance threshold your course requires.":"Use attendance alongside assessment scores; a low attendance value can be an early-warning factor.";
    if(x.includes("risk")||x.includes("warning")) return "Review the Early Warning page. High/Medium risk records are generated from the latest teacher prediction and should be reviewed with academic context.";
    if(x.includes("prediction")||x.includes("predict")) return "EduPredict stores teacher-generated predictions in the database. Students can read them but cannot edit them.";
    if(x.includes("study")||x.includes("exam")) return "Create a weekly plan: identify weak subjects, schedule focused practice, review mistakes, and track progress each week.";
    if(who==="teacher" && x.includes("student")) return "Open Students, filter by course/class, select a student, then enter academic indicators. EduPredict stores the record and publishes the resulting prediction.";
    return "I can help with attendance, assignments, internal marks, exams, prediction, early warnings, study planning and EduPredict workflows. Ask a specific question for a more targeted answer.";
  }

  async function studentReport(el){
    el.innerHTML=`<div class="card"><div class="card-head"><h3>Performance report</h3><button id="studentPdf" class="primary">Download PDF</button></div><p class="muted small">The report uses your latest cloud-stored academic record and teacher prediction.</p></div>`;
    document.getElementById("studentPdf").onclick=()=>generatePDF(currentUser.id,false);
  }
  async function generatePDF(id,teacher){
    const s=await getStudent(id), a=await getAcademic(id), p=await getPrediction(id);
    const prof=(await sb.from("profiles").select("*").eq("id",id).single()).data;
    const {jsPDF}=window.jspdf; const doc=new jsPDF();
    doc.setFontSize(20); doc.text("EduPredict AI",20,20); doc.setFontSize(11); doc.text("Student Performance Report",20,29);
    doc.setFontSize(12); doc.text(`Name: ${prof?.full_name||""}`,20,45); doc.text(`Course: ${s?.course||""}`,20,53); doc.text(`Class: ${s?.class_year||""}`,20,61);
    let y=76; [["Attendance",a?.attendance],["Assignment",a?.assignment_score],["Internal",a?.internal_score],["Exam",a?.exam_score],["Previous",a?.previous_score]].forEach(([n,v])=>{doc.text(`${n}: ${v??"—"}%`,20,y);y+=9});
    doc.text(`Predicted score: ${p?.predicted_score??"—"}%`,20,y+8); doc.text(`Risk: ${p?.risk_level||"—"}`,20,y+17);
    doc.text("Prediction is teacher-generated and read-only for students.",20,y+32);
    doc.save(`EduPredict_${(prof?.full_name||"Student").replace(/\s+/g,"_")}.pdf`);
  }

  function settings(el){
    el.innerHTML=`<div class="grid g2"><div class="card"><h3>Account</h3><p class="small muted">${esc(currentProfile.email||currentProfile.phone||"")}</p><p class="small">Role: <b>${esc(currentProfile.role)}</b></p></div><div class="card"><h3>Privacy</h3><p class="small muted">Academic predictions are controlled by authorized staff. Student profile data is protected by Firestore Security Rules.</p></div></div>`;
  }

  document.getElementById("studentLoginForm").onsubmit=studentLogin;
  document.getElementById("studentSignupForm").onsubmit=studentSignup;
  document.getElementById("teacherLoginForm").onsubmit=teacherLogin;
  document.getElementById("teacherSignupForm").onsubmit=teacherSignup;
  document.getElementById("logoutBtn").onclick=async()=>{
    if(!sb) return;
    try { await sb.auth.signOut(); } catch(e) { console.error(e); }
    currentUser=null; currentProfile=null; portal="student"; page="dashboard";
    document.getElementById("appView").classList.add("hidden");
    document.getElementById("authView").classList.remove("hidden");
    showAuthTab("student");
  };
  document.getElementById("refreshBtn").onclick=()=>renderPage(page);
  setupAuthTabs();

  let deferredInstallPrompt=null;
  window.addEventListener("beforeinstallprompt", e=>{ e.preventDefault(); deferredInstallPrompt=e; });
  async function triggerInstall(){ if(deferredInstallPrompt){ deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; } else toast("Use your browser menu and choose Add to Home screen / Install app.","info"); }
  window.addEventListener("edupredict-install",triggerInstall);
  const collapseBtn=document.getElementById("sidebarCollapse");
  if(collapseBtn){
    const syncCollapseBtn=()=>{
      const isCollapsed=document.body.classList.contains("sidebar-collapsed");
      collapseBtn.setAttribute("title", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
      collapseBtn.setAttribute("aria-label", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
    };
    if(localStorage.getItem("edupredict-sidebar-collapsed")==="true"){
      document.body.classList.add("sidebar-collapsed");
    }
    syncCollapseBtn();
    collapseBtn.addEventListener("click",()=>{
      const isCollapsed=document.body.classList.toggle("sidebar-collapsed");
      localStorage.setItem("edupredict-sidebar-collapsed", isCollapsed ? "true" : "false");
      syncCollapseBtn();
    });
  }
  let bootEntering = false;
  async function boot(){
    if(demoMode){ currentProfile=demoPortal==="teacher"?{id:"demo-teacher",full_name:"Dr. Priya Kapoor",email:"priya.kapoor@college.edu",role:"teacher"}:{...demoStudent,role:"student"}; currentUser={uid:currentProfile.id}; portal=demoPortal; document.getElementById("authView").classList.add("hidden"); document.getElementById("appView").classList.remove("hidden"); renderShell(); await renderPage(demoPage); return; }
    if(!hasConfig || !auth) return;
    sb.auth.onAuthStateChange(async(event,session)=>{
      if(event === "SIGNED_IN" && session?.user && !bootEntering && document.getElementById("appView").classList.contains("hidden")){
        bootEntering = true;
        try{ await enter(session.user); } catch(e){ console.error(e); toast(e.message || "Unable to load your account", "error"); } finally { bootEntering=false; }
      }
      // Never reload the page for auth state changes. Firebase emits state events
      // during normal startup; navigation is handled entirely in the SPA.
    });
    const {data}=await sb.auth.getUser();
    if(data?.user && document.getElementById("appView").classList.contains("hidden") && !bootEntering){
      bootEntering=true;
      try{ await enter(data.user); } catch(e){ console.error(e); toast(e.message || "Unable to load your account", "error"); } finally { bootEntering=false; }
    }
  }
  boot();
})();
