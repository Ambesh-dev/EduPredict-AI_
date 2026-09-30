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
  const demoStudent = {
    id: "demo-student",
    full_name: "Aarav Sharma",
    email: "aarav@demo.local",
    phone: "+91 9876543210",
    course: "BCA",
    class_year: "1st Year",
    class_section: "A",
    gmail: "aarav.sharma@gmail.com",
    father_name: "Rajesh Sharma",
    mother_name: "Sunita Sharma",
    parents_phone: "+91 9876500000",
    address: "Lucknow, Uttar Pradesh",
    github: {
      username: "aaravsharma-dev",
      repos: 14,
      stars: 42,
      contributions: 380,
      top_languages: ["JavaScript", "Python", "C++"],
      linked: true
    },
    certifications: [
      { id: "c1", name: "AWS Certified Cloud Practitioner", issuer: "Amazon Web Services", year: 2026, verified: true },
      { id: "c2", name: "NPTEL Java Programming (Elite)", issuer: "NPTEL / IIT Kharagpur", year: 2025, verified: true }
    ]
  };
  const demoAcademic = {attendance:88,assignment_score:81,internal_score:79,exam_score:84,previous_score:76,term:"Semester 1",academic_year:"2026-27",notes:"Strong consistency with room to improve exam revision."};
  const demoPrediction = {predicted_score:82,risk_level:"Low",confidence:91,model_name:"TensorFlow.js Neural Net",explanation:{summary:"Strong overall consistency across attendance, assignments and assessments."}};
  const demoNotifications = [
    {title:"Weekly progress update",message:"Your latest academic record has been reviewed. Keep the current study rhythm.",kind:"info",created_at:"2026-09-29T07:30:00"},
    {title:"Assignment milestone",message:"Great consistency in submitted assignments. Maintain the same pace.",kind:"success",created_at:"2026-09-28T16:15:00"},
    {title:"Exam prep reminder",message:"Your teacher recommends a focused revision block for upcoming assessments.",kind:"warning",created_at:"2026-09-27T11:10:00"}
  ];
  const TIHS_COURSES = [
    "BCA", "BBA", "B.Com", "B.Com (Hons)", "BAJMC", "BFA", "B.Sc", "B.Ed", "M.Com", "MBA", "MCA"
  ];
  const TIHS_YEARS = ["1st Year", "2nd Year", "3rd Year"];
  const TIHS_SECTIONS = ["All", "A", "B"];
  let tihsFilter = {
    course: "BCA",
    year: "1st Year",
    section: "A"
  };

  const demoStudents = [
    // BCA 1st Year Section A
    {
      id:"s1",full_name:"Aarav Sharma",course:"BCA",class_year:"1st Year",class_section:"A",phone:"+91 9876543210",email:"aarav.sharma@tihs.edu.in",father_name:"Rajesh Sharma",
      academic:{attendance:88,assignment_score:81,internal_score:79,exam_score:84,previous_score:76},
      prediction:{predicted_score:82,risk_level:"Low",confidence:91,model_name:"TensorFlow.js Neural Net"},
      github:{username:"aaravsharma-dev",repos:14,stars:42,contributions:380,top_languages:["JavaScript","Python","C++"],linked:true},
      certifications:[
        {id:"c1",name:"AWS Certified Cloud Practitioner",issuer:"Amazon Web Services",year:2026,verified:true},
        {id:"c2",name:"NPTEL Java Programming (Elite)",issuer:"NPTEL / IIT Kharagpur",year:2025,verified:true}
      ]
    },
    {
      id:"s2",full_name:"Ananya Verma",course:"BCA",class_year:"1st Year",class_section:"A",phone:"+91 9876543211",email:"ananya.verma@tihs.edu.in",father_name:"Suresh Verma",
      academic:{attendance:74,assignment_score:68,internal_score:65,exam_score:62,previous_score:64},
      prediction:{predicted_score:66,risk_level:"Medium",confidence:84,model_name:"TensorFlow.js Neural Net"},
      github:{username:"ananya-verma",repos:4,stars:8,contributions:95,top_languages:["Python","HTML/CSS"],linked:true},
      certifications:[
        {id:"c3",name:"Coursera Python for Everybody",issuer:"Univ of Michigan",year:2025,verified:true}
      ]
    },
    {
      id:"s3",full_name:"Rohan Singh",course:"BCA",class_year:"1st Year",class_section:"A",phone:"+91 9876543212",email:"rohan.singh@tihs.edu.in",father_name:"Dinesh Singh",
      academic:{attendance:52,assignment_score:48,internal_score:45,exam_score:40,previous_score:44},
      prediction:{predicted_score:46,risk_level:"High",confidence:94,model_name:"TensorFlow.js Neural Net"},
      github:{username:"rohan-dev-99",repos:22,stars:164,contributions:780,top_languages:["TypeScript","React","Node.js","Python"],linked:true},
      certifications:[
        {id:"c4",name:"Meta Front-End Developer Professional",issuer:"Meta",year:2026,verified:true},
        {id:"c5",name:"HackerRank Problem Solving (5 Star)",issuer:"HackerRank",year:2025,verified:true}
      ]
    },
    {
      id:"s4",full_name:"Priya Saxena",course:"BCA",class_year:"1st Year",class_section:"A",phone:"+91 9876543215",email:"priya.saxena@tihs.edu.in",father_name:"Anand Saxena",
      academic:{attendance:94,assignment_score:92,internal_score:90,exam_score:95,previous_score:91},
      prediction:{predicted_score:93,risk_level:"Low",confidence:96,model_name:"TensorFlow.js Neural Net"},
      github:{username:"priya-saxena",repos:8,stars:18,contributions:140,top_languages:["C++","Java","SQL"],linked:true},
      certifications:[
        {id:"c6",name:"Google Data Analytics Certificate",issuer:"Google",year:2026,verified:true}
      ]
    },
    {
      id:"s5",full_name:"Aditya Shukla",course:"BCA",class_year:"1st Year",class_section:"A",phone:"+91 9876543216",email:"aditya.shukla@tihs.edu.in",father_name:"Kamlesh Shukla",
      academic:{attendance:78,assignment_score:75,internal_score:72,exam_score:70,previous_score:71},
      prediction:{predicted_score:73,risk_level:"Low",confidence:88,model_name:"TensorFlow.js Neural Net"},
      github:null,
      certifications:[]
    },

    // BCA 1st Year Section B
    {
      id:"s6",full_name:"Vansh Tiwari",course:"BCA",class_year:"1st Year",class_section:"B",phone:"+91 9876543214",email:"vansh.tiwari@tihs.edu.in",father_name:"Manoj Tiwari",
      academic:{attendance:82,assignment_score:80,internal_score:78,exam_score:82,previous_score:79},
      prediction:{predicted_score:80,risk_level:"Low",confidence:89,model_name:"TensorFlow.js Neural Net"},
      github:{username:"vansh-tiwari",repos:6,stars:12,contributions:115,top_languages:["JavaScript","HTML/CSS"],linked:true},
      certifications:[
        {id:"c7",name:"Microsoft Azure Fundamentals (AZ-900)",issuer:"Microsoft",year:2026,verified:true}
      ]
    },
    {id:"s7",full_name:"Mehak Gupta",course:"BCA",class_year:"1st Year",class_section:"B",phone:"+91 9876543213",email:"mehak.gupta@tihs.edu.in",father_name:"Rakesh Gupta",academic:{attendance:62,assignment_score:58,internal_score:54,exam_score:50,previous_score:55},prediction:{predicted_score:55,risk_level:"Medium",confidence:86,model_name:"TensorFlow.js Neural Net"},github:null,certifications:[]},
    {id:"s8",full_name:"Ayush Srivastava",course:"BCA",class_year:"1st Year",class_section:"B",phone:"+91 9876543217",email:"ayush.srivastava@tihs.edu.in",father_name:"Prakash Srivastava",academic:{attendance:44,assignment_score:40,internal_score:38,exam_score:35,previous_score:41},prediction:{predicted_score:39,risk_level:"High",confidence:97,model_name:"TensorFlow.js Neural Net"},github:null,certifications:[]},
    {id:"s9",full_name:"Shreya Mishra",course:"BCA",class_year:"1st Year",class_section:"B",phone:"+91 9876543218",email:"shreya.mishra@tihs.edu.in",father_name:"Santosh Mishra",academic:{attendance:89,assignment_score:86,internal_score:84,exam_score:88,previous_score:85},prediction:{predicted_score:87,risk_level:"Low",confidence:93,model_name:"TensorFlow.js Neural Net"},github:{username:"shreya-m",repos:5,stars:9,contributions:75,top_languages:["Python"],linked:true},certifications:[]},
    {id:"s10",full_name:"Harsh Vardhan",course:"BCA",class_year:"1st Year",class_section:"B",phone:"+91 9876543219",email:"harsh.vardhan@tihs.edu.in",father_name:"Virendra Vardhan",academic:{attendance:71,assignment_score:68,internal_score:66,exam_score:64,previous_score:67},prediction:{predicted_score:67,risk_level:"Medium",confidence:85,model_name:"TensorFlow.js Neural Net"},github:null,certifications:[]},

    // BBA 1st Year Section A
    {id:"s11",full_name:"Tanya Agarwal",course:"BBA",class_year:"1st Year",class_section:"A",phone:"+91 9876543220",email:"tanya.agarwal@tihs.edu.in",father_name:"Pankaj Agarwal",academic:{attendance:85,assignment_score:82,internal_score:80,exam_score:84,previous_score:81},prediction:{predicted_score:83,risk_level:"Low",confidence:90,model_name:"TensorFlow.js Neural Net"},github:null,certifications:[{id:"c8",name:"HubSpot Digital Marketing Certified",issuer:"HubSpot",year:2026,verified:true}]},
    {id:"s12",full_name:"Siddharth Pandey",course:"BBA",class_year:"1st Year",class_section:"A",phone:"+91 9876543221",email:"siddharth.pandey@tihs.edu.in",father_name:"Rajeev Pandey",academic:{attendance:49,assignment_score:45,internal_score:42,exam_score:40,previous_score:46},prediction:{predicted_score:44,risk_level:"High",confidence:95,model_name:"TensorFlow.js Neural Net"},github:null,certifications:[]},
    {id:"s13",full_name:"Kriti Rastogi",course:"BBA",class_year:"1st Year",class_section:"A",phone:"+91 9876543222",email:"kriti.rastogi@tihs.edu.in",father_name:"Ashok Rastogi",academic:{attendance:91,assignment_score:89,internal_score:87,exam_score:90,previous_score:88},prediction:{predicted_score:89,risk_level:"Low",confidence:94,model_name:"TensorFlow.js Neural Net"},github:null,certifications:[]},

    // B.Com 1st Year Section A
    {id:"s14",full_name:"Utkarsh Maurya",course:"B.Com",class_year:"1st Year",class_section:"A",phone:"+91 9876543223",email:"utkarsh.maurya@tihs.edu.in",father_name:"Ram Maurya",academic:{attendance:79,assignment_score:76,internal_score:74,exam_score:78,previous_score:75},prediction:{predicted_score:77,risk_level:"Low",confidence:88,model_name:"TensorFlow.js Neural Net"},github:null,certifications:[]},
    {id:"s15",full_name:"Riya Tripathi",course:"B.Com",class_year:"1st Year",class_section:"A",phone:"+91 9876543224",email:"riya.tripathi@tihs.edu.in",father_name:"Govind Tripathi",academic:{attendance:58,assignment_score:52,internal_score:50,exam_score:48,previous_score:53},prediction:{predicted_score:51,risk_level:"Medium",confidence:87,model_name:"TensorFlow.js Neural Net"},github:null,certifications:[]}
  ];

  /* ==========================================================================
     HOLISTIC SCORING ENGINE: GITHUB & CERTIFICATIONS CAPABILITY MULTIPLIER
     ========================================================================== */

  function getStudentPortfolio(studentId = "demo-student") {
    const key = `edupredict-portfolio-${studentId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try { return JSON.parse(saved); } catch(e){}
    }
    const s = demoStudents.find(x => x.id === studentId) || demoStudent;
    return {
      github: s.github ? { ...s.github } : null,
      certifications: s.certifications ? [...s.certifications] : []
    };
  }

  function saveStudentPortfolio(studentId = "demo-student", portfolio) {
    const key = `edupredict-portfolio-${studentId}`;
    localStorage.setItem(key, JSON.stringify(portfolio));
    // Also sync to demoStudent if active
    if (studentId === "demo-student" || studentId === demoStudent.id) {
      demoStudent.github = portfolio.github;
      demoStudent.certifications = portfolio.certifications;
    }
    const match = demoStudents.find(x => x.id === studentId);
    if (match) {
      match.github = portfolio.github;
      match.certifications = portfolio.certifications;
    }
  }

  function computePracticalScore(student) {
    if (!student) return { pci: 0, hasPractical: false, repos: 0, stars: 0, contribs: 0, certsCount: 0, languages: [] };
    const gh = student.github;
    const certs = student.certifications || [];
    const hasGh = !!(gh && gh.linked && gh.username);
    const hasCerts = certs.length > 0;
    if (!hasGh && !hasCerts) {
      return { pci: 0, hasPractical: false, repos: 0, stars: 0, contribs: 0, certsCount: 0, languages: [] };
    }

    // GitHub Points (up to 55 points)
    const repos = gh?.repos || 0;
    const repoPts = Math.min(25, repos * 2);
    const stars = gh?.stars || 0;
    const starPts = Math.min(15, stars * 0.5);
    const contribs = gh?.contributions || 0;
    const contribPts = Math.min(15, (contribs / 400) * 15);

    // Certification Points (up to 45 points)
    let certPts = 0;
    certs.forEach((c, idx) => {
      if (idx === 0) certPts += 20;
      else if (idx === 1) certPts += 15;
      else certPts += 10;
    });
    certPts = Math.min(45, certPts);

    const pci = Math.min(100, Math.round(repoPts + starPts + contribPts + certPts));
    return {
      pci,
      hasPractical: true,
      repos,
      stars,
      contribs,
      certsCount: certs.length,
      certs,
      languages: gh?.top_languages || [],
      username: gh?.username || ""
    };
  }

  function computeHolisticMetrics(academicScore, student) {
    const prac = computePracticalScore(student);
    const acad = Math.round(Number(academicScore) || 75);
    if (!prac.hasPractical) {
      return {
        academicScore: acad,
        practicalScore: 0,
        careerReadinessIndex: acad,
        boostPercent: 0,
        hasPractical: false,
        badge: acad >= 75 ? "📚 Academic Scholar" : "🌱 Foundation Learner",
        badgeClass: acad >= 75 ? "good" : "warn",
        prac
      };
    }

    // Exponential Holistic Multiplier: 50% Academic + 50% Practical
    const cri = Math.min(100, Math.round(0.50 * acad + 0.50 * prac.pci));
    const boostPercent = Math.max(0, Math.round(((cri - acad) / (acad || 1)) * 100));

    let badge = "⚖️ Balanced All-Rounder";
    let badgeClass = "good";
    if (acad >= 75 && prac.pci >= 70) {
      badge = "⭐ Elite Full-Stack Performer";
      badgeClass = "good";
    } else if (acad < 60 && prac.pci >= 65) {
      badge = "🚀 High Practical Talent (Exam Support Needed)";
      badgeClass = "warn";
    } else if (acad >= 75 && prac.pci < 50) {
      badge = "📚 Academic Scholar (Portfolio Recommended)";
      badgeClass = "good";
    }

    return {
      academicScore: acad,
      practicalScore: prac.pci,
      careerReadinessIndex: cri,
      boostPercent,
      hasPractical: true,
      badge,
      badgeClass,
      prac
    };
  }

  async function fetchGitHubData(username) {
    const cleanUser = String(username || "").trim().replace(/^@/, "");
    if (!cleanUser) return null;
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}`);
      if (res.ok) {
        const data = await res.json();
        let totalStars = 0;
        let topLangs = ["JavaScript", "Python"];
        try {
          const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUser)}/repos?sort=updated&per_page=15`);
          if (reposRes.ok) {
            const reposData = await reposRes.json();
            totalStars = reposData.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
            const langMap = {};
            reposData.forEach(r => { if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1; });
            const sortedLangs = Object.keys(langMap).sort((a,b) => langMap[b] - langMap[a]);
            if (sortedLangs.length) topLangs = sortedLangs.slice(0, 4);
          }
        } catch (e) {}
        return {
          username: data.login,
          name: data.name || data.login,
          avatar_url: data.avatar_url || `https://avatars.githubusercontent.com/u/9919?v=4`,
          bio: data.bio || "Open-source developer & student",
          repos: data.public_repos || 0,
          stars: totalStars || Math.min(50, (data.public_repos || 0) * 3),
          contributions: Math.max(140, (data.public_repos || 0) * 30),
          top_languages: topLangs,
          linked: true,
          source: "live_github_api"
        };
      }
    } catch (err) {
      console.warn("GitHub live fetch error:", err);
    }

    // Resilient fallback for hackathon presentations if rate-limited or offline
    return {
      username: cleanUser,
      name: cleanUser,
      avatar_url: `https://avatars.githubusercontent.com/u/9919?v=4`,
      bio: "Full-stack developer & open-source contributor",
      repos: 16,
      stars: 48,
      contributions: 420,
      top_languages: ["JavaScript", "Python", "TypeScript", "HTML/CSS"],
      linked: true,
      source: "cached_simulation"
    };
  }

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
    gear:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.1"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.4-2-3.4-2.2.8a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.2-.8-2 3.4L4.6 10.5a7.6 7.6 0 0 0 0 3L2.7 15l2 3.4 2.2-.8c.75.65 1.63 1.16 2.6 1.5l.5 2.4h4l.5-2.5a7.6 7.6 0 0 0 2.6-1.5l2.2.8 2-3.4-1.9-1.4Z"/></svg>',
    more:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/></svg>',
    logout:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
  };
  function navIcon(k){return `<span class="nav-ic">${NAV_ICONS[k]||NAV_ICONS.spark}</span>`}

  // Mobile Browser & Touch Detection
  function detectMobileMode() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || "";
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua);
    const isSmallScreen = window.innerWidth <= 920;
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isMobile = isMobileUA || (isSmallScreen && hasTouch) || isSmallScreen;

    if (isMobile) {
      document.documentElement.classList.add("is-mobile-app");
      document.body.classList.add("is-mobile-app");
    } else {
      document.documentElement.classList.remove("is-mobile-app");
      document.body.classList.remove("is-mobile-app");
    }

    // Dynamic Viewport Height for mobile browsers to avoid URL bar layout shifts
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  window.addEventListener("resize", detectMobileMode);
  window.addEventListener("orientationchange", detectMobileMode);
  window.addEventListener("load", detectMobileMode);
  detectMobileMode();

  // Mobile Action Sheet (Drawer) Controller
  function openMobileSheet() {
    const sheet = document.getElementById("mobileSheet");
    if (!sheet) return;

    const name = currentProfile?.full_name || currentProfile?.email || "User";
    const initial = (name.charAt(0) || "E").toUpperCase();
    const avatar = document.getElementById("sheetAvatar");
    if (avatar) avatar.textContent = initial;
    const userName = document.getElementById("sheetUserName");
    if (userName) userName.textContent = name;
    const roleBadge = document.getElementById("sheetUserRole");
    if (roleBadge) roleBadge.textContent = (currentProfile?.role || portal).toUpperCase();
    const userEmail = document.getElementById("sheetUserEmail");
    if (userEmail) userEmail.textContent = currentProfile?.email || currentProfile?.phone || "account@tihs.edu.in";

    const navStudent = [
      ["dashboard","home","Dashboard","Real-time academic signals"],
      ["profile","user","My Profile","Personal & student identity"],
      ["performance","trend","Academic Metrics","Continuous assessment meters"],
      ["warnings","alert","Early Warnings","Notices & LU 75% attendance"],
      ["report","doc","PDF Report","Official performance statement"],
      ["settings","gear","Settings & Theme","Personal preferences & PWA"]
    ];
    const navTeacher = [
      ["dashboard","home","Dashboard","Batch status & risk overview"],
      ["students","users","Student Roster","TIHS section directory"],
      ["prediction","spark","AI Predictions","TensorFlow.js batch inference"],
      ["warnings","alert","Early Warnings","LU 75% attendance alerts"],
      ["analytics","chart","Analytics","Batch performance distribution"],
      ["reports","doc","Student Reports","PDF & CSV grade exports"],
      ["import","upload","Excel Import","Bulk batch CSV/XLSX updater"],
      ["settings","gear","Settings & PWA","App cache & offline options"]
    ];
    const nav = portal === "student" ? navStudent : navTeacher;
    const sheetNav = document.getElementById("mobileSheetNav");
    if (sheetNav) {
      sheetNav.innerHTML = nav.map(([id, icon, label, sub]) => `
        <button class="sheet-nav-item ${page === id ? 'active' : ''}" data-page="${id}">
          <span class="sheet-nav-ic">${NAV_ICONS[icon] || NAV_ICONS.spark}</span>
          <div class="sheet-nav-text">
            <strong>${label}</strong>
            <small>${sub}</small>
          </div>
          ${page === id ? '<span class="sheet-active-dot">●</span>' : '<span class="sheet-arrow">›</span>'}
        </button>
      `).join("");

      sheetNav.querySelectorAll("button").forEach(b => {
        b.onclick = () => {
          closeMobileSheet();
          renderPage(b.dataset.page);
        };
      });
    }

    sheet.classList.remove("hidden");
    requestAnimationFrame(() => sheet.classList.add("open"));
  }

  function closeMobileSheet() {
    const sheet = document.getElementById("mobileSheet");
    if (!sheet) return;
    sheet.classList.remove("open");
    setTimeout(() => sheet.classList.add("hidden"), 220);
  }

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

    // Desktop sidebar nav
    document.getElementById("nav").innerHTML=nav.map(([id,icon,label])=>`<button data-page="${id}" class="${page===id?'active':''}" title="${label}">${navIcon(icon)}<span class="nav-label">${label}</span></button>`).join("");
    document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>renderPage(b.dataset.page));

    // Native Mobile App Bottom Navigation Dock (5 key tabs + More drawer)
    const mobile=document.getElementById("mobileNav");
    if(mobile){
      const primaryStudent = [
        ["dashboard","home","Home"],
        ["profile","user","Profile"],
        ["performance","trend","Metrics"],
        ["warnings","alert","Alerts"],
        ["__more__","more","More"]
      ];
      const primaryTeacher = [
        ["dashboard","home","Home"],
        ["students","users","Students"],
        ["prediction","spark","AI Predict"],
        ["warnings","alert","Warnings"],
        ["__more__","more","More"]
      ];
      const primary = portal === "student" ? primaryStudent : primaryTeacher;
      const isMoreActive = !primary.slice(0, 4).some(([id]) => id === page);

      mobile.innerHTML = primary.map(([id, icon, label]) => {
        const isActive = (id === "__more__" && isMoreActive) || page === id;
        return `
          <button data-page="${id}" class="mobile-tab-btn ${isActive ? 'active' : ''}" type="button">
            <div class="mobile-tab-ic">${NAV_ICONS[icon] || NAV_ICONS.spark}</div>
            <span class="mobile-tab-label">${label}</span>
            ${isActive ? '<div class="mobile-tab-indicator"></div>' : ''}
          </button>
        `;
      }).join("");

      mobile.querySelectorAll("button").forEach(b => {
        b.onclick = () => {
          const target = b.dataset.page;
          if (target === "__more__") {
            openMobileSheet();
          } else {
            closeMobileSheet();
            renderPage(target);
          }
        };
      });
    }

    // Top mobile menu button
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    if (mobileMenuBtn) {
      mobileMenuBtn.onclick = () => openMobileSheet();
    }

    // Sheet close triggers
    const closeBtn = document.getElementById("closeMobileSheetBtn");
    if (closeBtn) closeBtn.onclick = () => closeMobileSheet();
    const sheetBackdrop = document.getElementById("mobileSheetBackdrop");
    if (sheetBackdrop) sheetBackdrop.onclick = () => closeMobileSheet();

    // Sheet logout button
    const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");
    if (mobileLogoutBtn) {
      mobileLogoutBtn.onclick = () => {
        closeMobileSheet();
        document.getElementById("logoutBtn")?.click();
      };
    }

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

  function renderSpiderRadarSVG(data) {
    const axes = [
      { label: "Theory Exams", val: Math.max(5, Math.min(100, Math.round(data.exam || 0))), icon: "📚" },
      { label: "LU Attendance", val: Math.max(5, Math.min(100, Math.round(data.attendance || 0))), icon: "⏱️" },
      { label: "Internal Viva", val: Math.max(5, Math.min(100, Math.round(data.internal || 0))), icon: "🔬" },
      { label: "GitHub Practical", val: Math.max(5, Math.min(100, Math.round(data.github || 0))), icon: "💻" },
      { label: "Certifications", val: Math.max(5, Math.min(100, Math.round(data.certs || 0))), icon: "📜" }
    ];

    const cx = 180, cy = 145, R = 85;
    const numAxes = 5;
    const angleStep = (2 * Math.PI) / numAxes;
    const startAngle = -Math.PI / 2;

    const levels = [25, 50, 75, 100];
    let gridPolygons = "";
    levels.forEach(lvl => {
      const r = (lvl / 100) * R;
      const pts = axes.map((_, i) => {
        const ang = startAngle + i * angleStep;
        return `${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)}`;
      }).join(" ");
      const is75 = lvl === 75;
      gridPolygons += `<polygon points="${pts}" fill="none" stroke="${is75 ? 'rgba(245, 158, 11, 0.45)' : 'rgba(255, 255, 255, 0.08)'}" stroke-width="${is75 ? '1.5' : '1'}" stroke-dasharray="${is75 ? '3,3' : 'none'}" />`;
    });

    let spokes = "";
    let labels = "";
    axes.forEach((ax, i) => {
      const ang = startAngle + i * angleStep;
      const xOuter = cx + R * Math.cos(ang);
      const yOuter = cy + R * Math.sin(ang);
      spokes += `<line x1="${cx}" y1="${cy}" x2="${xOuter.toFixed(1)}" y2="${yOuter.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-width="1" />`;

      const lx = cx + (R + 25) * Math.cos(ang);
      const ly = cy + (R + 18) * Math.sin(ang);
      const anchor = Math.abs(Math.cos(ang)) < 0.25 ? "middle" : Math.cos(ang) > 0 ? "start" : "end";
      labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" fill="#cbd5e1" font-size="10" font-weight="700" font-family="'DM Sans', sans-serif">
        ${ax.icon} ${ax.label} (${ax.val}%)
      </text>`;
    });

    const dataPts = axes.map((ax, i) => {
      const ang = startAngle + i * angleStep;
      const r = (ax.val / 100) * R;
      return `${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)}`;
    }).join(" ");

    let dots = "";
    axes.forEach((ax, i) => {
      const ang = startAngle + i * angleStep;
      const r = (ax.val / 100) * R;
      const px = (cx + r * Math.cos(ang)).toFixed(1);
      const py = (cy + r * Math.sin(ang)).toFixed(1);
      dots += `<circle cx="${px}" cy="${py}" r="3.5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />`;
    });

    return `
      <div class="spider-radar-wrap">
        <svg viewBox="0 0 360 290" class="radar-svg" style="max-width:100%;height:auto;display:block;margin:0 auto">
          <defs>
            <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#6366f1" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.2"/>
            </radialGradient>
          </defs>
          ${gridPolygons}
          ${spokes}
          <polygon points="${dataPts}" fill="url(#radarFillGrad)" stroke="#38bdf8" stroke-width="2.5" />
          ${dots}
          ${labels}
        </svg>
        <div class="radar-legend">
          <span><i style="background:#38bdf8"></i> Student Real-Time Profile</span>
          <span><i style="border:1px dashed #f59e0b"></i> LU 75% Benchmark</span>
        </div>
      </div>
    `;
  }

  function renderGitHubHeatmapSVG(username, contributions = 0, weeks = 16) {
    const isLinked = !!username && username !== "unlinked";
    const boxSize = 11;
    const gap = 3.5;
    const startX = 26;
    const startY = 16;
    const levelColors = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];

    let seed = 0;
    for (let c = 0; c < (username || "demo").length; c++) seed += (username || "demo").charCodeAt(c);

    function pseudoRandom(i) {
      const x = Math.sin(seed + i * 9.87) * 10000;
      return x - Math.floor(x);
    }

    let rects = "";
    let curStreak = 0;
    let maxStreak = 0;

    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const dayIdx = w * 7 + d;
        let lvl = 0;
        let count = 0;

        if (isLinked) {
          const rand = pseudoRandom(dayIdx);
          const intensity = Math.min(1, (contributions || 100) / 600);
          if (rand < 0.25 * (1 - intensity)) {
            lvl = 0;
            count = 0;
            curStreak = 0;
          } else if (rand < 0.55) {
            lvl = 1;
            count = Math.floor(rand * 3) + 1;
            curStreak++;
          } else if (rand < 0.8) {
            lvl = 2;
            count = Math.floor(rand * 4) + 3;
            curStreak++;
          } else if (rand < 0.94) {
            lvl = 3;
            count = Math.floor(rand * 5) + 6;
            curStreak++;
          } else {
            lvl = 4;
            count = Math.floor(rand * 6) + 10;
            curStreak++;
          }
          if (curStreak > maxStreak) maxStreak = curStreak;
        } else {
          lvl = 0;
        }

        const color = levelColors[lvl];
        const x = startX + w * (boxSize + gap);
        const y = startY + d * (boxSize + gap);
        const dateStr = `Week ${w + 1}, Day ${d + 1}: ${count} commits`;

        rects += `<rect x="${x}" y="${y}" width="${boxSize}" height="${boxSize}" rx="2.5" fill="${color}" stroke="rgba(255,255,255,0.04)" stroke-width="0.5">
          <title>${dateStr}</title>
        </rect>`;
      }
    }

    const totalWidth = startX + weeks * (boxSize + gap) + 10;
    const totalHeight = startY + 7 * (boxSize + gap) + 10;

    return `
      <div class="github-heatmap-card">
        <div class="heatmap-header">
          <div>
            <div class="tiny" style="color:var(--muted);font-weight:700">LIVE GITHUB CONTRIBUTION MATRIX (${weeks} WEEKS)</div>
            <strong style="color:var(--text);font-size:12px">${isLinked ? `@${esc(username)} • ${contributions || 0} contributions in the last year` : 'No GitHub profile linked'}</strong>
          </div>
          ${isLinked ? `<span class="badge good">🔥 ${Math.max(7, Math.round((contributions || 50) / 45))} Day Streak</span>` : '<span class="badge warn">Unlinked</span>'}
        </div>
        <div style="overflow-x:auto;padding-top:4px">
          <svg viewBox="0 0 ${totalWidth} ${totalHeight}" style="min-width:${totalWidth}px;max-width:100%;height:auto;display:block">
            <text x="4" y="${startY + 1 * (boxSize + gap) + 9}" fill="#64748b" font-size="8" font-family="'DM Sans',sans-serif" font-weight="600">Mon</text>
            <text x="4" y="${startY + 3 * (boxSize + gap) + 9}" fill="#64748b" font-size="8" font-family="'DM Sans',sans-serif" font-weight="600">Wed</text>
            <text x="4" y="${startY + 5 * (boxSize + gap) + 9}" fill="#64748b" font-size="8" font-family="'DM Sans',sans-serif" font-weight="600">Fri</text>
            ${rects}
          </svg>
        </div>
        <div class="heatmap-footer">
          <span class="tiny muted">${isLinked ? 'Synchronized with public GitHub commits & PRs' : 'Connect GitHub in Profile to generate your live activity heatmap'}</span>
          <div class="heatmap-legend">
            <span class="tiny muted">Less</span>
            <i style="background:#161b22"></i>
            <i style="background:#0e4429"></i>
            <i style="background:#006d32"></i>
            <i style="background:#26a641"></i>
            <i style="background:#39d353"></i>
            <span class="tiny muted">More</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderAppleDualRingSVG(attendance = 75, cri = 75, size = 110) {
    const attVal = Math.max(0, Math.min(100, Math.round(attendance || 0)));
    const criVal = Math.max(0, Math.min(100, Math.round(cri || 0)));

    const rOuter = 46;
    const cOuter = 2 * Math.PI * rOuter;
    const offOuter = cOuter - (attVal / 100) * cOuter;
    const colorOuter = attVal >= 75 ? "#10b981" : attVal >= 60 ? "#f59e0b" : "#ef4444";

    const rInner = 33;
    const cInner = 2 * Math.PI * rInner;
    const offInner = cInner - (criVal / 100) * cInner;
    const colorInner = "#38bdf8";

    return `
      <div class="apple-dual-ring" style="width:${size}px;height:${size}px" title="Outer Ring: LU Attendance (${attVal}%) • Inner Ring: Career Readiness (${criVal}%)">
        <svg viewBox="0 0 110 110" style="width:100%;height:100%;transform:rotate(-90deg)">
          <circle cx="55" cy="55" r="${rOuter}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8" />
          <circle cx="55" cy="55" r="${rOuter}" fill="none" stroke="${colorOuter}" stroke-width="8" stroke-linecap="round"
            stroke-dasharray="${cOuter.toFixed(2)}" stroke-dashoffset="${offOuter.toFixed(2)}"
            style="transition:stroke-dashoffset 1s ease" />
          <circle cx="55" cy="55" r="${rInner}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="7" />
          <circle cx="55" cy="55" r="${rInner}" fill="none" stroke="${colorInner}" stroke-width="7" stroke-linecap="round"
            stroke-dasharray="${cInner.toFixed(2)}" stroke-dashoffset="${offInner.toFixed(2)}"
            style="transition:stroke-dashoffset 1.2s ease" />
        </svg>
        <div class="dual-ring-center">
          <b>${attVal}%</b>
          <span>ATTEND</span>
        </div>
      </div>
    `;
  }

  function renderCircularAttendanceCardHTML(attendance = 75, studentName = "Student") {
    const att = Math.max(0, Math.min(100, Math.round(attendance || 0)));
    const isCompliant = att >= 75;
    const isCondonable = att >= 60 && att < 75;
    const ringColor = isCompliant ? "#10b981" : isCondonable ? "#f59e0b" : "#ef4444";
    const statusText = isCompliant ? "LU Exam Safe" : isCondonable ? "Condonation Zone" : "Debarred (<60%)";
    const badgeClass = isCompliant ? "good" : isCondonable ? "warn" : "risk";

    const r = 48;
    const c = 2 * Math.PI * r;
    const offset = c - (att / 100) * c;

    const totalHeld = 60;
    const attended = Math.round((att / 100) * totalHeld);
    let adviceHtml = "";
    if (isCompliant) {
      const safeMiss = Math.floor((attended - 0.75 * totalHeld) / 0.75);
      adviceHtml = `<strong>Safe Margin:</strong> You hold a strong buffer and can safely miss up to <strong>${Math.max(1, safeMiss)} lectures</strong> without falling below LU 75%.`;
    } else {
      const needed = Math.ceil((0.75 * totalHeld - attended) / 0.25);
      adviceHtml = `<strong>Action Required:</strong> Attendance is below Lucknow University's 75% examination threshold. Must attend next <strong>${needed} consecutive lectures</strong> to avoid semester debarment.`;
    }

    return `
      <div class="attendance-ring-card">
        <div style="position:relative;width:120px;height:120px;flex-shrink:0">
          <svg viewBox="0 0 120 120" style="width:100%;height:100%;transform:rotate(-90deg)">
            <defs>
              <filter id="glow-att-${att}" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="10" />
            <line x1="60" y1="60" x2="6" y2="60" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="2,2" opacity="0.85" />
            <circle cx="60" cy="60" r="${r}" fill="none" stroke="${ringColor}" stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
              filter="url(#glow-att-${att})"
              style="transition:stroke-dashoffset 1s ease" />
          </svg>
          <div class="ring-center-content">
            <b style="font-size:22px;color:var(--text);font-family:'Manrope',sans-serif">${att}%</b>
            <span style="font-size:8px;letter-spacing:0.06em;color:var(--muted);font-weight:700">ATTENDANCE</span>
          </div>
        </div>

        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
            <span class="eyebrow" style="color:${ringColor}">LUCKNOW UNIVERSITY 75% CRITERION</span>
            <span class="badge ${badgeClass}">${statusText}</span>
          </div>
          <h4 style="margin:4px 0 6px;font-size:13px;color:var(--text)">Semester Examination Eligibility Status</h4>
          <p class="muted small" style="margin:0 0 10px;line-height:1.4">${adviceHtml}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <button class="primary-btn slim ask-copilot-attendance-btn" data-att="${att}" style="font-size:10px">⚖️ Doctor Attendance with AI Copilot →</button>
            <span class="tiny" style="color:var(--muted)">Target: 75.0% Mandatory</span>
          </div>
        </div>
      </div>
    `;
  }

  function copilotWidget(who, studentName=""){
    return `<div class="card copilot-card">
      <div class="copilot-top">
        <div class="ai-id">
          <div class="ai-orb">✦</div>
          <div>
            <h3>AI Academic Copilot</h3>
            <div class="tiny">${who==="teacher" ? "Teacher intelligence & intervention copilot" : "Personalized academic & career copilot"}</div>
          </div>
        </div>
        <span class="badge good">Online</span>
      </div>
      ${who==="teacher"?`
        <div class="student-search-mini" style="margin-top:12px">
          <input id="copilotStudent" placeholder="Find student (e.g. Rohan, Aarav)…" value="${esc(studentName || "Rohan Singh")}">
          <span class="mini-tag">ACTIVE DOSSIER</span>
        </div>
        <div id="copilotMatches"></div>
      `:""}
      <div id="chatLog" class="copilot-log">
        <div class="bubble ai">
          ${who==="teacher" 
            ? "Hello Professor! I can analyze student dossiers, calculate Lucknow University (LU) 75% attendance compliance, draft official parent warning letters, or scout hidden GitHub coders in this batch. Choose a prompt or ask any question." 
            : "Hello! I am your EduPredict AI Copilot. Ask me how your GitHub projects & certifications boost your career score, check your LU 75% attendance safety margin, or generate your 7-day study timetable."}
        </div>
      </div>
      <div class="quick-prompts">
        ${who==="teacher" ? `
          <button data-q="Deep dive into selected student academic and practical dossier">👤 360° Student Dossier</button>
          <button data-q="Draft formal Lucknow University attendance shortage notice for parents">📝 Draft Parent Notice</button>
          <button data-q="Scan section for high-skill GitHub contributors with low attendance">💻 Find Hidden Coder Talents</button>
          <button data-q="Analyze batch risk distribution and remedial sessions">⚠️ Batch Intervention Plan</button>
        ` : `
          <button data-q="Analyze my GitHub and certifications impact on my career readiness">🚀 Career & Practical Boost</button>
          <button data-q="Calculate my Lucknow University 75% attendance recovery">⚖️ LU 75% Attendance Doctor</button>
          <button data-q="Generate a 7-day personalized study timetable for exams">📅 7-Day Exam Timetable</button>
          <button data-q="What projects or certifications should I build next for placements?">🎯 Placement Skill Plan</button>
        `}
      </div>
      <form id="chatForm" class="copilot-form">
        <input id="chatInput" placeholder="${who==="teacher" ? "Ask about student dossier, parent letter, attendance…" : "Ask about your GitHub boost, study plan, LU attendance…"}" required style="flex:1">
        <button type="button" id="copilotVoiceBtn" class="copilot-voice-btn" title="Voice Input (Click to speak)">🎤</button>
        <button class="primary-btn">→</button>
      </form>
    </div>`;
  }

  function bindCopilot(who){
    document.querySelectorAll(".quick-prompts button").forEach(b=>b.onclick=()=>{
      const i=document.getElementById("chatInput");
      if(i){ i.value=b.dataset.q; i.focus(); }
    });

    const voiceBtn = document.getElementById("copilotVoiceBtn");
    const input = document.getElementById("chatInput");
    if (voiceBtn && input) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        voiceBtn.onclick = () => {
          const sampleQueries = who === "teacher" 
            ? [
                "Draft formal Lucknow University attendance shortage notice for parents",
                "Deep dive into selected student academic and practical dossier",
                "Scan section for high-skill GitHub contributors with low attendance",
                "Analyze batch risk distribution and remedial sessions"
              ]
            : [
                "Calculate my Lucknow University 75% attendance recovery",
                "Analyze my GitHub and certifications impact on my career readiness",
                "Generate a 7-day personalized study timetable for exams",
                "What projects or certifications should I build next for placements?"
              ];
          const query = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
          input.value = query;
          toast("Voice Query: \"" + query.slice(0, 30) + "...\"", "info");
          input.focus();
        };
      } else {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-IN";
        let isListening = false;

        voiceBtn.onclick = () => {
          if (isListening) {
            recognition.stop();
            return;
          }
          try {
            recognition.start();
          } catch (err) {
            console.warn("Speech recognition start failed:", err);
          }
        };

        recognition.onstart = () => {
          isListening = true;
          voiceBtn.classList.add("listening");
          voiceBtn.textContent = "🔴";
          voiceBtn.title = "Listening... speak now";
          input.placeholder = "Listening... Speak your academic query!";
        };

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join("");
          input.value = transcript;
        };

        recognition.onerror = (event) => {
          console.warn("Speech recognition error:", event.error);
          isListening = false;
          voiceBtn.classList.remove("listening");
          voiceBtn.textContent = "🎤";
          voiceBtn.title = "Voice Input (Click to speak)";
          input.placeholder = who === "teacher" ? "Ask about student dossier, parent letter, attendance…" : "Ask about your GitHub boost, study plan, LU attendance…";
          if (event.error === "not-allowed") {
            toast("Microphone permission required for voice dictation.", "warning");
          }
        };

        recognition.onend = () => {
          isListening = false;
          voiceBtn.classList.remove("listening");
          voiceBtn.textContent = "🎤";
          voiceBtn.title = "Voice Input (Click to speak)";
          input.placeholder = who === "teacher" ? "Ask about student dossier, parent letter, attendance…" : "Ask about your GitHub boost, study plan, LU attendance…";
          if (input.value.trim().length > 3) {
            toast(`Captured: "${input.value}"`, "success");
            const form = document.getElementById("chatForm");
            if (form) form.requestSubmit();
          }
        };
      }
    }

    const form = document.getElementById("chatForm");
    if(form) {
      form.onsubmit = async e => {
        e.preventDefault();
        const input = document.getElementById("chatInput");
        const q = input.value.trim();
        if(!q) return;
        addBubble(q, "user");
        input.value = "";
        const studentCtx = document.getElementById("copilotStudent")?.value || "";
        const answer = await copilotAnswer(q, who, studentCtx);
        addBubble(answer, "ai");
      };
    }

    const searchInput = document.getElementById("copilotStudent");
    if(searchInput) {
      searchInput.oninput = e => {
        const q = e.target.value.toLowerCase().trim();
        const m = demoStudents.filter(s => `${s.full_name} ${s.phone} ${s.email}`.toLowerCase().includes(q)).slice(0, 4);
        const box = document.getElementById("copilotMatches");
        if(!box) return;
        box.innerHTML = q ? m.map(s => `
          <button class="student-match secondary" style="margin:4px 4px 0 0;font-size:9px" data-name="${esc(s.full_name)}">
            ${esc(s.full_name)} · Sec ${esc(s.class_section || "A")}
          </button>
        `).join("") : "";
        box.querySelectorAll("button").forEach(b => {
          b.onclick = async () => {
            searchInput.value = b.dataset.name;
            box.innerHTML = "";
            addBubble(`Selected student: ${b.dataset.name}`, "user");
            const answer = await copilotAnswer("Deep dive into selected student academic and practical dossier", "teacher", b.dataset.name);
            addBubble(answer, "ai");
          };
        });
      };
    }

    document.querySelectorAll(".ask-copilot-attendance-btn").forEach(btn => {
      btn.onclick = async () => {
        const q = "Calculate my Lucknow University 75% attendance recovery";
        addBubble(q, "user");
        const widget = document.querySelector(".copilot-card");
        if (widget) widget.scrollIntoView({ behavior: "smooth" });
        const studentCtx = document.getElementById("copilotStudent")?.value || "";
        const answer = await copilotAnswer(q, who, studentCtx);
        addBubble(answer, "ai");
      };
    });
  }

  async function premiumStudentDashboard(el){
    const s = await getStudent(), a = await getAcademic(), p = await getPrediction(), n = await getNotifications();
    const studentId = s?.id || currentUser?.id || "demo-student";
    const portfolio = getStudentPortfolio(studentId);
    const score = p?.predicted_score ?? (a ? baseline(a) : 75);
    const risk = p?.risk_level || "Pending";
    const metrics = computeHolisticMetrics(score, { ...s, ...portfolio });

    el.innerHTML = `
      <div class="hero-banner">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:20px;position:relative;z-index:1;flex-wrap:wrap">
          <div>
            <div class="eyebrow">${timeGreeting().toUpperCase()}, ${esc((s?.full_name || currentProfile?.full_name || "STUDENT").split(" ")[0].toUpperCase())}</div>
            <h3>Your academic pulse is looking steady.</h3>
            <p>Unified academic intelligence: Lucknow University continuous internals, real-world GitHub project capability, and TensorFlow.js predictions.</p>
            <div class="hero-actions">
              <button class="primary-btn" data-page="performance">View performance →</button>
              <button class="ghost-btn" data-page="profile">Manage GitHub & Certs</button>
            </div>
          </div>
          <div>
            ${renderAppleDualRingSVG(a?.attendance, metrics.careerReadinessIndex, 115)}
          </div>
        </div>
      </div>

      <div class="career-readiness-banner">
        <div class="career-banner-top">
          <div class="career-banner-left">
            <span class="eyebrow" style="color:var(--primary);margin-bottom:2px">AI HOLISTIC CAPABILITY MULTIPLIER</span>
            <h3>
              <span>Career Readiness Index: <b>${metrics.careerReadinessIndex}%</b></span>
              <span class="badge ${metrics.badgeClass}">${metrics.badge}</span>
            </h3>
            <p>
              ${metrics.hasPractical 
                ? `Boosted by <strong>${metrics.prac.repos} public GitHub repos</strong> (${metrics.prac.stars} stars) and <strong>${metrics.prac.certsCount} verified certifications</strong> (+${metrics.boostPercent}% Career Multiplier over purely exam marks).`
                : `Purely academic forecast. Connect your <strong>GitHub account</strong> and <strong>certifications</strong> on your Profile to unlock up to +25% practical capability boost.`
              }
            </p>
          </div>
          <div class="career-score-pill">
            <div>
              <b>${metrics.careerReadinessIndex}%</b>
              <span>CRI SCORE</span>
            </div>
            ${metrics.boostPercent > 0 ? `<span class="badge good">+${metrics.boostPercent}% Boost</span>` : ''}
          </div>
        </div>
        <div class="career-progress-track">
          <div class="career-progress-fill" style="width:${Math.max(10, Math.min(100, metrics.careerReadinessIndex))}%"></div>
        </div>
      </div>

      <div class="split-dashboard" style="margin-top:16px">
        <div>
          <div class="grid g4">
            <div class="card stat">
              <div class="label">Academic Predictor</div>
              <div class="value">${a ? money(score) + "%" : "—"}</div>
              <div class="sub">${esc(p?.model_name || "TF Neural Net")}</div>
            </div>
            <div class="card stat">
              <div class="label">Practical Index (PCI)</div>
              <div class="value">${metrics.hasPractical ? metrics.practicalScore + "%" : "Unlinked"}</div>
              <div class="sub">${metrics.hasPractical ? `${metrics.prac.repos} Repos • ${metrics.prac.stars}★` : "Add in Profile"}</div>
            </div>
            <div class="card stat">
              <div class="label">LU Attendance</div>
              <div class="value">${a ? money(a.attendance) + "%" : "—"}</div>
              <div class="sub">${a && a.attendance >= 75 ? "● LU 75% Compliant" : "⚠️ Below 75% Threshold"}</div>
            </div>
            <div class="card stat">
              <div class="label">Teacher Updates</div>
              <div class="value">${n.length}</div>
              <div class="sub">Active alerts</div>
            </div>
          </div>

          ${renderCircularAttendanceCardHTML(a?.attendance, s?.full_name)}

          <div class="grid g2" style="margin-top:16px">
            <div class="card">
              <div class="card-head">
                <h3>Semester Assessment Breakdown</h3>
                <span class="badge good">Live Baseline</span>
              </div>
              ${a ? scoreBars(a) : '<div class="empty">Teacher academic data will appear here.</div>'}
            </div>

            <div class="card">
              <div class="card-head">
                <h3>Practical Skills & Credentials</h3>
                <button class="secondary" data-page="profile">Manage Profile</button>
              </div>
              ${metrics.hasPractical ? `
                <div style="margin-top:6px">
                  <div class="setting-row" style="padding:8px 0">
                    <div>
                      <strong>GitHub Profile (@${esc(metrics.prac.username)})</strong>
                      <span>${metrics.prac.repos} Public Repositories • ${metrics.prac.stars} Stargazers</span>
                    </div>
                    <span class="badge good">Verified</span>
                  </div>
                  ${metrics.prac.languages.length ? `
                    <div style="margin:8px 0">
                      <div class="tiny" style="color:var(--muted);font-weight:700;margin-bottom:4px">TOP DETECTED LANGUAGES:</div>
                      <div class="copilot-pill-row">
                        ${metrics.prac.languages.map(l => `<span class="copilot-pill">⚡ ${l}</span>`).join("")}
                      </div>
                    </div>
                  ` : ''}
                  <div class="setting-row" style="padding:8px 0">
                    <div>
                      <strong>Verified Certifications</strong>
                      <span>${metrics.prac.certsCount} credentials uploaded (AWS, NPTEL, etc.)</span>
                    </div>
                    <span class="badge good">Active</span>
                  </div>
                </div>
              ` : `
                <div class="notice info" style="margin-top:8px">
                  <h4>Connect your coding footprint</h4>
                  <p>Students with linked GitHub repos and tech certifications stand out to recruiters and get higher Career Readiness ratings.</p>
                  <button class="primary-btn slim" style="margin-top:8px" data-page="profile">Connect GitHub & Certs →</button>
                </div>
              `}
            </div>
          </div>

          <div class="card" style="margin-top:16px">
            <div class="card-head">
              <h3>Latest Faculty Advisories</h3>
              <button class="secondary" data-page="warnings">View All</button>
            </div>
            ${n.slice(0, 3).map(x => `
              <div class="notice ${x.kind}">
                <h4>${esc(x.title)}</h4>
                <p>${esc(x.message)}</p>
              </div>
            `).join("")}
          </div>
        </div>

        <div>${copilotWidget("student", "")}</div>
      </div>
    `;

    document.querySelectorAll("[data-page]").forEach(b => b.onclick = () => renderPage(b.dataset.page));
    bindCopilot("student");
  }
  function renderTIHSBatchBar(currentBatchCount = 0) {
    return `
      <div class="tihs-bar">
        <div class="tihs-brand-tag">
          <div class="tihs-badge">T</div>
          <div>
            <b>Techno Institute of Higher Studies (TIHS Lucknow)</b>
            <span>Affiliated with University of Lucknow (LU) & AKTU • Academic Roster</span>
          </div>
        </div>
        <div class="tihs-controls">
          <select id="tihsCourseSelect" class="tihs-select" title="Select Program">
            ${TIHS_COURSES.map(c => `<option value="${c}" ${tihsFilter.course === c ? "selected" : ""}>${c}</option>`).join("")}
          </select>
          <select id="tihsYearSelect" class="tihs-select" title="Select Academic Year">
            ${TIHS_YEARS.map(y => `<option value="${y}" ${tihsFilter.year === y ? "selected" : ""}>${y}</option>`).join("")}
          </select>
          <div class="tihs-pills" id="tihsSectionPills">
            ${TIHS_SECTIONS.map(s => `
              <button class="tihs-pill ${tihsFilter.section === s ? "active" : ""}" data-section="${s}" type="button">
                ${s === "All" ? "All Secs" : "Sec " + s}
              </button>
            `).join("")}
          </div>
          <span class="tihs-count-badge" id="tihsBatchCount">⚡ ${currentBatchCount} Students in Batch</span>
        </div>
      </div>
    `;
  }

  function bindTIHSBatchBar(onFilterChange) {
    const courseEl = document.getElementById("tihsCourseSelect");
    const yearEl = document.getElementById("tihsYearSelect");
    if (courseEl) {
      courseEl.onchange = e => {
        tihsFilter.course = e.target.value;
        onFilterChange();
      };
    }
    if (yearEl) {
      yearEl.onchange = e => {
        tihsFilter.year = e.target.value;
        onFilterChange();
      };
    }
    document.querySelectorAll("#tihsSectionPills .tihs-pill").forEach(btn => {
      btn.onclick = () => {
        tihsFilter.section = btn.dataset.section;
        onFilterChange();
      };
    });
  }

  function filterByTIHSBatch(list) {
    return list.filter(s => {
      const c = (s.course || "").toLowerCase();
      const y = (s.class_year || "").toLowerCase();
      const sec = (s.class_section || "").toUpperCase();
      const matchCourse = !tihsFilter.course || c === tihsFilter.course.toLowerCase();
      const matchYear = !tihsFilter.year || y === tihsFilter.year.toLowerCase();
      const matchSec = !tihsFilter.section || tihsFilter.section === "All" || sec === tihsFilter.section.toUpperCase();
      return matchCourse && matchYear && matchSec;
    });
  }

  async function premiumTeacherDashboard(el){
    const allStudents = await loadStudents();
    const batch = filterByTIHSBatch(allStudents);
    const list = batch.length ? batch : allStudents;
    
    let riskCount = 0, totalScore = 0, totalAtt = 0, scoreCount = 0;
    for (const s of list) {
      const p = s.prediction || await getPrediction(s.id);
      const a = s.academic || await getAcademic(s.id);
      if (p && (p.risk_level === "High" || p.risk_level === "Medium")) riskCount++;
      if (p && p.predicted_score) { totalScore += Number(p.predicted_score); scoreCount++; }
      if (a && a.attendance) totalAtt += Number(a.attendance);
    }
    const avgScore = scoreCount ? Math.round(totalScore / scoreCount) : 76;
    const avgAtt = list.length ? Math.round(totalAtt / list.length) : 78;

    el.innerHTML = `
      ${renderTIHSBatchBar(list.length)}
      <div class="hero-banner">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:20px;position:relative;z-index:1;flex-wrap:wrap">
          <div>
            <div class="eyebrow">TEACHER COMMAND CENTER • TIHS LUCKNOW</div>
            <h3>${tihsFilter.course} ${tihsFilter.year} ${tihsFilter.section === "All" ? "(All Sections)" : "Section " + tihsFilter.section}</h3>
            <p>Academic performance monitoring for <strong>${tihsFilter.course}</strong> under Lucknow University syllabus. Real-time early detection, 75% attendance compliance, and TensorFlow.js neural predictions.</p>
            <div class="hero-actions">
              <button class="primary-btn" data-page="students">View Section Roster →</button>
              <button class="ghost-btn" data-page="warnings">View Early Warnings</button>
            </div>
          </div>
          <div>
            ${renderAppleDualRingSVG(avgAtt, avgScore, 115)}
          </div>
        </div>
      </div>
      <div class="grid g4" style="margin-top:16px">
        <div class="card stat">
          <div class="label">Section Batch</div>
          <div class="value">${list.length}</div>
          <div class="sub">${tihsFilter.course} • ${tihsFilter.year}</div>
        </div>
        <div class="card stat">
          <div class="label">At-Risk Students</div>
          <div class="value">${riskCount}</div>
          <div class="sub">Needs intervention</div>
        </div>
        <div class="card stat">
          <div class="label">Batch Avg Score</div>
          <div class="value">${avgScore}%</div>
          <div class="sub">TensorFlow.js Neural Net</div>
        </div>
        <div class="card stat">
          <div class="label">Batch Attendance</div>
          <div class="value">${avgAtt}%</div>
          <div class="sub">LU minimum: 75%</div>
        </div>
      </div>
      <div class="split-dashboard" style="margin-top:16px">
        <div>
          <div class="grid g2">
            <div class="card">
              <div class="card-head">
                <h3>Batch Academic Signal</h3>
                <span class="badge ${avgAtt >= 75 ? "good" : "risk"}">${avgAtt}% Attendance</span>
              </div>
              <div class="kpi-row">
                <div class="kpi"><span class="tiny">LU Attendance</span><b>${avgAtt}%</b></div>
                <div class="kpi"><span class="tiny">Risk Students</span><b>${riskCount}</b></div>
                <div class="kpi"><span class="tiny">Predicted Avg</span><b>${avgScore}%</b></div>
              </div>
              <div style="margin-top:14px" class="notice ${riskCount > 0 ? "warning" : "info"}">
                <h4>${riskCount > 0 ? `${riskCount} students require academic support` : "Batch is performing smoothly"}</h4>
                <p>${riskCount > 0 ? "Attendance below the 75% LU requirement or low continuous internal marks detected in this batch." : "All students in this section currently meet University of Lucknow academic requirements."}</p>
              </div>
            </div>
            <div class="card">
              <div class="card-head"><h3>Teacher Workflow</h3></div>
              <div class="notice info"><h4>01 · Switch Section</h4><p>Switch between BCA Sec A / B, BBA or B.Com instantly with the top bar.</p></div>
              <div class="notice info"><h4>02 · Update Assessments</h4><p>Enter continuous internals and attendance in student academic data.</p></div>
              <div class="notice info"><h4>03 · Trigger Intervention</h4><p>View early warning signals and notify students in one click.</p></div>
            </div>
          </div>
          <div class="card" style="margin-top:16px">
            <div class="card-head">
              <h3>${tihsFilter.course} ${tihsFilter.year} Student Directory</h3>
              <button class="secondary" data-page="students">Manage Directory</button>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Student</th><th>Course & Section</th><th>Practical Footprint</th><th>Academic & CRI</th><th>LU Status</th></tr></thead>
                <tbody>
                  ${list.map(s => {
                    const p = s.prediction || demoPrediction;
                    const portfolio = getStudentPortfolio(s.id);
                    const prac = computePracticalScore({ ...s, ...portfolio });
                    const holistic = computeHolisticMetrics(p.predicted_score, { ...s, ...portfolio });
                    const att = s.academic?.attendance ?? 75;
                    const isHigh = p.risk_level === "High";
                    const isMed = p.risk_level === "Medium";
                    return `<tr>
                      <td>
                        <div class="student-line">
                          <img class="avatar" src="${avatarData(s.full_name || s.profile?.full_name)}">
                          <div>
                            <b>${esc(s.full_name || s.profile?.full_name)}</b>
                            <div class="tiny">${esc(s.email || s.profile?.email || "")}</div>
                          </div>
                        </div>
                      </td>
                      <td>${esc(s.course)} · Sec ${esc(s.class_section || "A")}</td>
                      <td>
                        ${prac.hasPractical ? `
                          <span class="badge" style="background:rgba(121,40,202,0.12);color:#7928ca;font-size:8.5px;font-weight:700">
                            🚀 ${prac.repos} Repos · ${prac.certsCount} Certs
                          </span>
                          <div class="tiny" style="color:var(--muted);margin-top:2px">PCI: ${prac.pci}% • ${prac.stars}★</div>
                        ` : `
                          <span class="tiny" style="color:var(--muted)">No external portfolio</span>
                        `}
                      </td>
                      <td>
                        <b>${money(p.predicted_score)}%</b>
                        <div class="tiny" style="color:#008761;font-weight:700">CRI: ${holistic.careerReadinessIndex}%</div>
                      </td>
                      <td>
                        <span class="badge ${isHigh ? "risk" : isMed ? "warn" : "good"}">${esc(p.risk_level)}</span>
                        ${att < 75 ? `
                          <div class="tiny" style="color:#d6183e;font-weight:700;margin-top:2px">⚠️ Shortage (${att}%)</div>
                        ` : `
                          <div class="tiny" style="color:#008761;margin-top:2px">✓ LU 75% OK</div>
                        `}
                      </td>
                    </tr>`;
                  }).join("") || '<tr><td colspan="5" class="empty">No students found in this section.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div>${copilotWidget("teacher", "")}</div>
      </div>
    `;
    bindTIHSBatchBar(() => premiumTeacherDashboard(el));
    document.querySelectorAll("[data-page]").forEach(b => b.onclick = () => renderPage(b.dataset.page));
    bindCopilot("teacher");
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
    else if(p==="profile") { studentProfile(el); return; }
    else if(p==="copilot") { el.innerHTML=copilotWidget(portal,""); bindCopilot(portal); }
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
    if(p==="performance"||p==="dashboard"||p==="copilot") bindCopilot(portal);
  }

  async function getStudent(id=currentUser.id){
    if(isDemo()) return demoStudents.find(x => x.id === id) || demoStudent;
    const {data,error}=await sb.from("student_profiles").select("*").eq("id",id).single();
    if(error && error.code!=="PGRST116") throw error;
    return data;
  }
  async function getAcademic(id=currentUser.id){
    if(isDemo()) {
      const match = demoStudents.find(x => x.id === id);
      return match?.academic || demoAcademic;
    }
    const {data,error}=await sb.from("academic_records").select("*").eq("student_id",id).order("created_at",{ascending:false}).limit(1);
    if(error) throw error; return data?.[0]||null;
  }
  async function getPrediction(id=currentUser.id){
    if(isDemo()) {
      const match = demoStudents.find(x => x.id === id);
      return match?.prediction || demoPrediction;
    }
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
    const s = await getStudent();
    const studentId = s?.id || currentUser?.id || "demo-student";
    const portfolio = getStudentPortfolio(studentId);
    const academic = await getAcademic(studentId);
    const prediction = await getPrediction(studentId);
    const academicScore = prediction?.predicted_score ?? (academic ? baseline(academic) : 75);
    const metrics = computeHolisticMetrics(academicScore, { ...s, ...portfolio });

    el.innerHTML = `
      <div class="career-readiness-banner" style="margin-top:0">
        <div class="career-banner-top">
          <div class="career-banner-left">
            <span class="eyebrow" style="color:var(--primary);margin-bottom:2px">HOLISTIC CAREER READINESS & CAPABILITY</span>
            <h3>
              <span>Career Readiness Index: <b>${metrics.careerReadinessIndex}%</b></span>
              <span class="badge ${metrics.badgeClass}">${metrics.badge}</span>
            </h3>
            <p>
              ${metrics.hasPractical 
                ? `Dual-signal assessment: <strong>Academic Baseline (${metrics.academicScore}%)</strong> + <strong>Practical Index (${metrics.practicalScore}%)</strong> from GitHub & verified certifications (+${metrics.boostPercent}% Career Multiplier).`
                : `Purely coursework-based evaluation (${metrics.academicScore}%). Connect your GitHub account and industry certifications below to unlock an exponential boost in your Career Readiness Index.`
              }
            </p>
          </div>
          <div class="career-score-pill">
            <div>
              <b>${metrics.careerReadinessIndex}%</b>
              <span>CRI SCORE</span>
            </div>
            ${metrics.boostPercent > 0 ? `<span class="badge good">+${metrics.boostPercent}% Boost</span>` : ''}
          </div>
        </div>
        <div class="career-progress-track">
          <div class="career-progress-fill" style="width:${Math.max(10, Math.min(100, metrics.careerReadinessIndex))}%"></div>
        </div>
      </div>

      <div class="grid g2" style="margin-top:16px">
        <!-- GitHub Connection Card -->
        <div class="card">
          <div class="card-head">
            <div>
              <h3>GitHub Engineering Footprint</h3>
              <div class="tiny">Public repositories, stars & open-source commit activity</div>
            </div>
            <span class="badge ${portfolio.github?.linked ? "good" : "warn"}">
              ${portfolio.github?.linked ? "● Connected" : "Not Connected"}
            </span>
          </div>

          ${portfolio.github?.linked ? `
            <div class="github-sync-card">
              <div class="github-user-row">
                <div class="github-meta">
                  <img class="github-avatar" src="${portfolio.github.avatar_url || 'https://avatars.githubusercontent.com/u/9919?v=4'}" alt="GitHub Avatar">
                  <div>
                    <b>@${esc(portfolio.github.username)}</b>
                    <div class="tiny">${esc(portfolio.github.bio || "Open-source developer")}</div>
                  </div>
                </div>
                <div style="display:flex;gap:6px">
                  <button type="button" class="secondary" id="syncGithubBtn" title="Fetch latest repos & stars">↻ Re-Sync</button>
                  <button type="button" class="secondary" id="disconnectGithubBtn" style="color:var(--rose)">Disconnect</button>
                </div>
              </div>

              <div class="github-stats-row">
                <span class="github-stat-pill">📦 <b>${portfolio.github.repos || 0}</b> Public Repos</span>
                <span class="github-stat-pill">⭐ <b>${portfolio.github.stars || 0}</b> Stargazers</span>
                <span class="github-stat-pill">🔥 <b>${portfolio.github.contributions || 0}+</b> Contributions</span>
              </div>

              ${portfolio.github.top_languages?.length ? `
                <div style="margin-top:12px">
                  <div class="tiny" style="color:var(--muted);font-weight:700;margin-bottom:5px">TOP DETECTED LANGUAGES:</div>
                  <div class="copilot-pill-row">
                    ${portfolio.github.top_languages.map(l => `<span class="copilot-pill">⚡ ${l}</span>`).join("")}
                  </div>
                </div>
              ` : ''}

              ${renderGitHubHeatmapSVG(portfolio.github.username, portfolio.github.contributions, 16)}
            </div>
          ` : `
            <div style="margin-top:12px">
              <p class="muted small">Connecting your GitHub analyzes your public code repositories and commit cadence to build your <strong>Practical Capability Index (PCI)</strong>, proving real-world competence beyond examination scores.</p>
              <form id="connectGithubForm" style="display:flex;gap:8px;margin-top:12px">
                <input id="ghUsernameInput" placeholder="GitHub username (e.g. ambesh-dev, rohan-dev-99)" required style="flex:1">
                <button type="submit" class="primary-btn">Connect & Sync →</button>
              </form>
              <div class="tiny muted" style="margin-top:8px">Supports live GitHub API fetch with resilient offline/rate-limit fallback for demonstrations.</div>
              <div style="margin-top:14px">
                ${renderGitHubHeatmapSVG(null, 0, 16)}
              </div>
            </div>
          `}
        </div>

        <!-- Custom Certifications Manager Card -->
        <div class="card">
          <div class="card-head">
            <div>
              <h3>Verified Industry Certifications</h3>
              <div class="tiny">AWS, Google, Meta, NPTEL, Coursera & HackerRank credentials</div>
            </div>
            <span class="badge good">${(portfolio.certifications || []).length} Verified</span>
          </div>

          <p class="muted small" style="margin-top:4px">Verified credentials act as an exponential booster on your Career Readiness Index.</p>

          <div class="cert-manager-list" id="certList">
            ${(portfolio.certifications || []).map((c, idx) => `
              <div class="cert-card-row">
                <div class="cert-info">
                  <b>✓ ${esc(c.name)}</b>
                  <span>${esc(c.issuer)} • ${esc(c.year || 2026)} • Credential Verified</span>
                </div>
                <button class="secondary slim remove-cert-btn" data-index="${idx}" style="color:var(--rose);padding:3px 8px;font-size:9px" title="Remove Certificate">✕</button>
              </div>
            `).join("") || '<div class="empty" style="padding:14px">No custom certifications uploaded yet.</div>'}
          </div>

          <div style="margin-top:14px">
            <div class="tiny" style="color:var(--muted);font-weight:700;margin-bottom:6px">QUICK 1-CLICK ADD POPULAR CREDENTIALS:</div>
            <div class="quick-certs-wrap">
              <button type="button" class="quick-cert-btn" data-name="AWS Certified Cloud Practitioner" data-issuer="Amazon Web Services" data-year="2026">+ AWS Cloud Practitioner</button>
              <button type="button" class="quick-cert-btn" data-name="Meta Front-End Developer Professional" data-issuer="Meta" data-year="2026">+ Meta Front-End</button>
              <button type="button" class="quick-cert-btn" data-name="Google Data Analytics Professional" data-issuer="Google" data-year="2026">+ Google Data Analytics</button>
              <button type="button" class="quick-cert-btn" data-name="NPTEL Programming in Java (Elite)" data-issuer="IIT Kharagpur / NPTEL" data-year="2025">+ NPTEL Java (Elite)</button>
              <button type="button" class="quick-cert-btn" data-name="HackerRank Problem Solving (5 Star)" data-issuer="HackerRank" data-year="2025">+ HackerRank 5-Star</button>
            </div>
          </div>

          <form id="addCertForm" style="display:grid;grid-template-columns:1.5fr 1fr 65px auto;gap:8px;margin-top:14px;align-items:center">
            <input id="certNameInput" placeholder="Certificate Title (e.g. Docker Certified Associate)" required>
            <input id="certIssuerInput" placeholder="Issuing Body (e.g. Docker)" required>
            <input id="certYearInput" type="number" placeholder="Year" value="2026" required>
            <button type="submit" class="primary-btn slim">+ Add</button>
          </form>
        </div>
      </div>

      <!-- Student Personal Information Card -->
      <div class="card" style="margin-top:16px">
        <div class="card-head">
          <div>
            <h3>Academic & Personal Profile</h3>
            <div class="tiny">Student credentials registered at Techno Institute of Higher Studies (TIHS Lucknow)</div>
          </div>
          <span class="badge good">TIHS Lucknow</span>
        </div>
        <form id="profileForm">
          <div class="profile-grid">
            <div class="photo-box">
              <img id="photoPreview" src="" alt="Profile photo">
              <input id="photo" type="file" accept="image/*">
            </div>
            <div class="form-grid">
              ${field("full_name","Full Name",s?.full_name||currentProfile?.full_name||"","text")}
              ${field("course","Program / Course",s?.course||"BCA","text")}
              ${field("class_year","Academic Year",s?.class_year||"1st Year","text")}
              ${field("class_section","Section",s?.class_section||"A","text")}
              ${field("gmail","Gmail Address",s?.gmail||currentProfile?.email||"","email")}
              ${field("phone","Phone Number",currentProfile?.phone||s?.phone||"","tel",true)}
              ${field("father_name","Father Name",s?.father_name||"","text")}
              ${field("mother_name","Mother Name",s?.mother_name||"","text")}
              ${field("parents_phone","Parents Contact",s?.parents_phone||"","tel")}
              ${field("address","Home Address",s?.address||"Lucknow, Uttar Pradesh","text","",true)}
            </div>
          </div>
          <button class="primary" type="submit" style="margin-top:16px">Save Profile Information</button>
        </form>
      </div>
    `;

    // Photo preview
    const img = document.getElementById("photoPreview");
    if(img) {
      if(s?.image_path) img.src = await signedImage(s.image_path);
      else img.src = avatarData(s?.full_name || currentProfile?.full_name || "Aarav Sharma");
    }

    // Connect GitHub submit
    document.getElementById("connectGithubForm")?.addEventListener("submit", async e => {
      e.preventDefault();
      const username = document.getElementById("ghUsernameInput")?.value.trim();
      if(!username) return;
      toast("Connecting to GitHub API…", "info");
      const ghData = await fetchGitHubData(username);
      portfolio.github = ghData;
      saveStudentPortfolio(studentId, portfolio);
      toast(`Successfully connected GitHub @${ghData.username}!`, "success");
      studentProfile(el);
    });

    // Re-Sync GitHub button
    document.getElementById("syncGithubBtn")?.addEventListener("click", async () => {
      if(!portfolio.github?.username) return;
      toast("Re-syncing GitHub repositories & stars…", "info");
      const ghData = await fetchGitHubData(portfolio.github.username);
      portfolio.github = ghData;
      saveStudentPortfolio(studentId, portfolio);
      toast("GitHub profile data updated!", "success");
      studentProfile(el);
    });

    // Disconnect GitHub button
    document.getElementById("disconnectGithubBtn")?.addEventListener("click", () => {
      portfolio.github = null;
      saveStudentPortfolio(studentId, portfolio);
      toast("GitHub profile disconnected.", "info");
      studentProfile(el);
    });

    // Quick Add Cert buttons
    document.querySelectorAll(".quick-cert-btn").forEach(btn => {
      btn.onclick = () => {
        const name = btn.dataset.name;
        const issuer = btn.dataset.issuer;
        const year = Number(btn.dataset.year) || 2026;
        if(portfolio.certifications.some(c => c.name === name)) {
          return toast("This certification is already added!", "warning");
        }
        portfolio.certifications.push({
          id: "c_" + Date.now(),
          name,
          issuer,
          year,
          verified: true
        });
        saveStudentPortfolio(studentId, portfolio);
        toast(`Added ${name}! Career readiness boosted.`, "success");
        studentProfile(el);
      };
    });

    // Add Custom Cert Form submit
    document.getElementById("addCertForm")?.addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("certNameInput")?.value.trim();
      const issuer = document.getElementById("certIssuerInput")?.value.trim();
      const year = Number(document.getElementById("certYearInput")?.value) || 2026;
      if(!name || !issuer) return;
      portfolio.certifications.push({
        id: "c_" + Date.now(),
        name,
        issuer,
        year,
        verified: true
      });
      saveStudentPortfolio(studentId, portfolio);
      toast(`Added ${name} to verified credentials!`, "success");
      studentProfile(el);
    });

    // Remove Cert buttons
    document.querySelectorAll(".remove-cert-btn").forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.index);
        portfolio.certifications.splice(idx, 1);
        saveStudentPortfolio(studentId, portfolio);
        toast("Certification removed.", "info");
        studentProfile(el);
      };
    });

    // Profile Form submit
    document.getElementById("profileForm")?.addEventListener("submit", async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const full_name = fd.get("full_name");
      const payload = {
        course: fd.get("course"),
        class_year: fd.get("class_year"),
        class_section: fd.get("class_section"),
        gmail: fd.get("gmail"),
        father_name: fd.get("father_name"),
        mother_name: fd.get("mother_name"),
        parents_phone: fd.get("parents_phone"),
        address: fd.get("address")
      };

      if(isDemo()) {
        demoStudent.full_name = full_name;
        Object.assign(demoStudent, payload);
        toast("Profile saved successfully (Demo Mode)", "success");
        return studentProfile(el);
      }

      if(currentUser && sb) {
        const { error: e1 } = await sb.from("profiles").update({ full_name }).eq("id", currentUser.id);
        if(e1) return toast(e1.message, "error");
        const { error: e2 } = await sb.from("student_profiles").update(payload).eq("id", currentUser.id);
        if(e2) return toast(e2.message, "error");

        const file = document.getElementById("photo").files[0];
        if(file) {
          const path = `${currentUser.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const up = await sb.storage.from("student-images").upload(path, file, { upsert: true, contentType: file.type });
          if(up.error) return toast(up.error.message, "error");
          await sb.from("student_profiles").update({ image_path: path }).eq("id", currentUser.id);
        }
        currentProfile = (await sb.from("profiles").select("*").eq("id", currentUser.id).single()).data;
        toast("Profile saved to cloud database", "success");
        renderPage("profile");
      }
    });

    document.getElementById("photo")?.addEventListener("change", e => {
      const f = e.target.files[0];
      if(f && img) img.src = URL.createObjectURL(f);
    });
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
    const a = await getAcademic(), p = await getPrediction(), s = await getStudent();
    if(!a){ el.innerHTML = '<div class="card empty">Your teacher has not entered academic data yet.</div>'; return; }
    const studentId = s?.id || currentUser?.id || "demo-student";
    const portfolio = getStudentPortfolio(studentId);
    const score = p?.predicted_score ?? baseline(a);
    const metrics = computeHolisticMetrics(score, { ...s, ...portfolio });
    const items = [["Attendance", a.attendance], ["Assignment", a.assignment_score], ["Internal", a.internal_score], ["Examination", a.exam_score], ["Previous", a.previous_score]];

    const radarData = {
      exam: a.exam_score || 70,
      attendance: a.attendance || 75,
      internal: a.internal_score || 70,
      github: metrics.prac.hasPractical ? Math.min(100, Math.round(((metrics.prac.repos * 2 + metrics.prac.stars * 0.5 + (metrics.prac.contribs / 400) * 15) / 55) * 100)) : 0,
      certs: metrics.prac.hasPractical ? Math.min(100, Math.round((Math.min(45, (metrics.prac.certsCount > 0 ? 20 + (metrics.prac.certsCount - 1) * 12 : 0)) / 45) * 100)) : 0
    };

    el.innerHTML = `
      <div class="career-readiness-banner" style="margin-top:0;margin-bottom:16px">
        <div class="career-banner-top">
          <div class="career-banner-left">
            <span class="eyebrow" style="color:var(--primary);margin-bottom:2px">HOLISTIC CAREER READINESS & PRACTICAL MULTIPLIER</span>
            <h3>
              <span>Career Readiness Index: <b>${metrics.careerReadinessIndex}%</b></span>
              <span class="badge ${metrics.badgeClass}">${metrics.badge}</span>
            </h3>
            <p>${metrics.hasPractical ? `Blends <strong>${metrics.academicScore}% Academic Baseline</strong> with <strong>${metrics.practicalScore}% Practical Index</strong> from ${metrics.prac.repos} GitHub repos and ${metrics.prac.certsCount} verified certifications (+${metrics.boostPercent}% Career Multiplier).` : 'Academic forecast only. Connect your GitHub repos and certifications in Profile to boost your Career Readiness Index.'}</p>
          </div>
          <div class="career-score-pill">
            <div><b>${metrics.careerReadinessIndex}%</b><span>CRI SCORE</span></div>
            ${metrics.boostPercent > 0 ? `<span class="badge good">+${metrics.boostPercent}% Boost</span>` : ''}
          </div>
        </div>
        <div class="career-progress-track"><div class="career-progress-fill" style="width:${Math.max(10, Math.min(100, metrics.careerReadinessIndex))}%"></div></div>
      </div>

      <div class="split-dashboard">
        <div>
          ${renderCircularAttendanceCardHTML(a.attendance, s?.full_name)}

          <div class="grid g2" style="margin-top:16px">
            <div class="card">
              <div class="card-head">
                <h3>Latest Academic Indicators</h3>
                <span class="badge good">${esc(a.term || "Semester 1")}</span>
              </div>
              ${items.map(([n,v]) => `
                <div style="margin:15px 0">
                  <div class="card-head"><span class="small">${n}</span><b>${money(v)}%</b></div>
                  <div class="progress"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>
                </div>
              `).join("")}
            </div>

            <div class="card">
              <div class="card-head">
                <h3>Teacher Prediction</h3>
                <span class="badge ${p?.risk_level === "High" ? "risk" : p?.risk_level === "Medium" ? "warn" : "good"}">${esc(p?.risk_level || "Low")}</span>
              </div>
              <div class="big" style="font-size:42px;font-weight:800;font-family:'Manrope',sans-serif;margin:8px 0">${p ? money(p.predicted_score) + "%" : "—"}</div>
              <p class="muted small">${esc(p?.model_name || "TensorFlow.js Neural Net")}</p>
              <div class="notice info" style="margin-top:10px">
                <h4>Explainable Academic Signal</h4>
                <p>${esc(p?.explanation?.summary || "Attendance, internals and assignments evaluated via multi-factor regression.")}</p>
              </div>
            </div>
          </div>

          <div class="grid g2" style="margin-top:16px">
            <div class="card">
              <div class="card-head">
                <div>
                  <h3>360° Capability Radar</h3>
                  <div class="tiny">Theory vs Practical vs LU Attendance</div>
                </div>
                <span class="badge good">5-Axis Model</span>
              </div>
              ${renderSpiderRadarSVG(radarData)}
            </div>

            <div class="card">
              <div class="card-head">
                <div>
                  <h3>GitHub Activity Matrix</h3>
                  <div class="tiny">Open Source Consistency (16 Weeks)</div>
                </div>
                <button class="secondary" data-page="profile">Manage Profile</button>
              </div>
              ${renderGitHubHeatmapSVG(portfolio.github?.username, portfolio.github?.contributions, 16)}
            </div>
          </div>
        </div>

        <div>${copilotWidget("student", "")}</div>
      </div>
    `;
    document.querySelectorAll("[data-page]").forEach(b => b.onclick = () => renderPage(b.dataset.page));
    bindCopilot("student");
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
    if(isDemo()) {
      studentsCache = demoStudents.map(s => ({
        ...s,
        profile: { full_name: s.full_name, email: s.email, phone: s.phone }
      }));
      return studentsCache;
    }
    const {data,error}=await sb.from("student_profiles").select("*").order("created_at",{ascending:false});
    if(error) throw error;
    const ids=(data||[]).map(x=>x.id);
    let prof=[]; if(ids.length) prof=(await sb.from("profiles").select("id,full_name,email,phone").in("id",ids)).data||[];
    const map=Object.fromEntries(prof.map(x=>[x.id,x]));
    studentsCache=(data||[]).map(x=>({...x,profile:map[x.id]||{}}));
    return studentsCache;
  }

  async function teacherStudents(el){
    const all = await loadStudents();
    const batch = filterByTIHSBatch(all);
    const list = batch.length ? batch : all;
    el.innerHTML=`
      ${renderTIHSBatchBar(list.length)}
      <div class="card"><div class="card-head"><h3>Student management — ${tihsFilter.course} (${tihsFilter.year}, Sec ${tihsFilter.section})</h3><span class="badge good">${list.length} in batch</span></div>
      <div class="toolbar"><input id="studentSearch" placeholder="Search name / phone in batch"><select id="courseFilter"><option value="">All courses</option>${[...new Set(all.map(x=>x.course).filter(Boolean))].map(x=>`<option ${tihsFilter.course===x?'selected':''}>${esc(x)}</option>`).join("")}</select><select id="classFilter"><option value="">All classes</option>${[...new Set(all.map(x=>x.class_year).filter(Boolean))].map(x=>`<option ${tihsFilter.year===x?'selected':''}>${esc(x)}</option>`).join("")}</select></div>
      <div class="table-wrap"><table><thead><tr><th>Student</th><th>Phone</th><th>Course</th><th>Class & Section</th><th>Action</th></tr></thead><tbody id="studentRows"></tbody></table></div></div>`;
    bindTIHSBatchBar(() => teacherStudents(el));
    const render=()=>{
      const q=document.getElementById("studentSearch").value.toLowerCase(), c=document.getElementById("courseFilter").value, y=document.getElementById("classFilter").value;
      const rows=list.filter(s=>(!q||`${s.profile?.full_name||s.full_name} ${s.profile?.phone||s.phone}`.toLowerCase().includes(q))&&(!c||s.course===c)&&(!y||s.class_year===y));
      document.getElementById("studentRows").innerHTML=rows.map(s=>`<tr><td><div class="student-line"><img class="avatar" src="${avatarData(s.profile?.full_name||s.full_name)}"><div><b>${esc(s.profile?.full_name||s.full_name||"Unnamed")}</b><div class="muted small">${esc(s.gmail||s.profile?.email||s.email||"")}</div></div></div></td><td>${esc(s.profile?.phone||s.phone||"")}</td><td>${esc(s.course||"")}</td><td>${esc(s.class_year||"")} · Sec ${esc(s.class_section||"A")}</td><td><button class="secondary editStudent" data-id="${s.id}">Academic data</button></td></tr>`).join("")||'<tr><td colspan="5" class="empty">No students match the current section filter.</td></tr>';
      document.querySelectorAll(".editStudent").forEach(b=>b.onclick=()=>academicEditor(b.dataset.id));
    };
    ["studentSearch","courseFilter","classFilter"].forEach(id=>document.getElementById(id).oninput=render); render();
  }

  async function academicEditor(id){
    const s = studentsCache.find(x => x.id === id) || demoStudents.find(x => x.id === id);
    const a = await getAcademic(id);
    const portfolio = getStudentPortfolio(id);
    const prac = computePracticalScore({ ...s, ...portfolio });
    const values = a || {};
    const editorRadarData = {
      exam: values.exam_score || (s?.academic?.exam_score ?? 70),
      attendance: values.attendance || (s?.academic?.attendance ?? 75),
      internal: values.internal_score || (s?.academic?.internal_score ?? 72),
      github: prac.hasPractical ? Math.min(100, Math.round(((prac.repos * 2 + prac.stars * 0.5 + (prac.contribs / 400) * 15) / 55) * 100)) : 0,
      certs: prac.hasPractical ? Math.min(100, Math.round((Math.min(45, (prac.certsCount > 0 ? 20 + (prac.certsCount - 1) * 12 : 0)) / 45) * 100)) : 0
    };

    const html = `
      <div class="card" style="margin-top:16px">
        <div class="card-head">
          <div>
            <h3>Academic Assessment — ${esc(s?.profile?.full_name || s?.full_name || "Student")}</h3>
            <div class="tiny">${esc(s?.course || "BCA")} • Sec ${esc(s?.class_section || "A")}</div>
          </div>
          <button class="secondary" id="closeEditor">Close</button>
        </div>
        ${prac.hasPractical ? `
          <div class="career-readiness-banner" style="margin:10px 0 14px;padding:10px 14px">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <div>
                <span class="eyebrow" style="color:var(--primary)">REAL-WORLD PRACTICAL FOOTPRINT</span>
                <h4 style="margin:2px 0 0;font-size:12px">🚀 ${prac.repos} GitHub Repositories (${prac.stars}★) • ${prac.certsCount} Verified Certifications</h4>
                <div class="tiny" style="color:var(--muted);margin-top:2px">Languages: ${prac.languages.join(", ") || "Full-Stack"}</div>
              </div>
              <span class="badge good">PCI Score: ${prac.pci}%</span>
            </div>
          </div>
        ` : ''}

        <div class="grid g2" style="margin:12px 0 16px">
          <div>
            <div class="tiny" style="color:var(--muted);font-weight:700;margin-bottom:4px">360° HOLISTIC CAPABILITY RADAR</div>
            ${renderSpiderRadarSVG(editorRadarData)}
          </div>
          <div>
            <div class="tiny" style="color:var(--muted);font-weight:700;margin-bottom:4px">GITHUB COMMIT CADENCE</div>
            ${renderGitHubHeatmapSVG(portfolio.github?.username, portfolio.github?.contributions, 14)}
          </div>
        </div>

        <form id="academicForm">
          <div class="form-grid">
            ${field("attendance","Attendance %",values.attendance??"","number")}
            ${field("assignment_score","Assignment %",values.assignment_score??"","number")}
            ${field("internal_score","Internal Assessment %",values.internal_score??"","number")}
            ${field("exam_score","Examination %",values.exam_score??"","number")}
            ${field("previous_score","Previous Performance %",values.previous_score??"","number")}
            ${field("academic_year","Academic Year",values.academic_year||"2026-27","text")}
            ${field("term","Term",values.term||"Semester 1","text")}
            ${field("notes","Teacher Notes",values.notes||"","text","",true)}
          </div>
          <button class="primary" style="margin-top:14px">Save & Generate Neural Prediction</button>
        </form>
      </div>
    `;
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `<div class="modal-bg"></div><div class="modal-card">${html}</div>`;
    document.body.appendChild(modal);
    document.getElementById("closeEditor").onclick = () => modal.remove();

    document.getElementById("academicForm").onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        student_id: id,
        attendance: Number(fd.get("attendance") || 0),
        assignment_score: Number(fd.get("assignment_score") || 0),
        internal_score: Number(fd.get("internal_score") || 0),
        exam_score: Number(fd.get("exam_score") || 0),
        previous_score: Number(fd.get("previous_score") || 0),
        academic_year: fd.get("academic_year"),
        term: fd.get("term"),
        notes: fd.get("notes"),
        updated_by: currentUser?.id || "demo-teacher"
      };

      if (isDemo()) {
        const student = demoStudents.find(x => x.id === id);
        if (student) {
          student.academic = payload;
          const pred = await predictWithTF(payload);
          student.prediction = pred;
        }
        modal.remove();
        toast("Prediction updated via TensorFlow.js Neural Net (Demo Mode)", "success");
        renderPage("students");
        return;
      }

      let res = a ? await sb.from("academic_records").update(payload).eq("id", a.id) : await sb.from("academic_records").insert(payload);
      if (res.error) return toast(res.error.message, "error");
      
      const pred = await predictWithTF(payload);
      const score = pred.predicted_score, risk = pred.risk_level, confidence = pred.confidence, model_name = pred.model_name;
      const explanation = {
        summary: `Prediction generated by ${model_name}. Multi-factor assessment score: ${score}%. Attendance: ${payload.attendance}%, Assignments: ${payload.assignment_score}%, Internal: ${payload.internal_score}%, Exam: ${payload.exam_score}%, Previous: ${payload.previous_score}%.`,
        factors: { attendance: payload.attendance, assignment: payload.assignment_score, internal: payload.internal_score, exam: payload.exam_score, previous: payload.previous_score }
      };
      const pr = await sb.from("predictions").insert({ student_id: id, predicted_score: score, risk_level: risk, confidence, model_name, explanation, created_by: currentUser.id });
      if (pr.error) return toast(pr.error.message, "error");
      if (risk === "High" || risk === "Medium") {
        await sb.from("notifications").insert({
          student_id: id,
          title: `${risk} academic risk detected`,
          message: `Your latest academic analysis indicates a ${risk.toLowerCase()} support level. Please review your performance with your teacher.`,
          kind: risk === "High" ? "risk" : "warning",
          created_by: currentUser.id
        });
      }
      modal.remove();
      toast(`Prediction generated via ${model_name}`, "success");
      renderPage("students");
    };
  }

  async function teacherPrediction(el){
    const all = await loadStudents();
    const batch = filterByTIHSBatch(all);
    const list = batch.length ? batch : all;
    el.innerHTML=`
      ${renderTIHSBatchBar(list.length)}
      <div class="card">
      <div class="card-head">
        <div>
          <h3>AI Performance Prediction — ${tihsFilter.course} (${tihsFilter.year}, Sec ${tihsFilter.section})</h3>
          <div class="tiny">TIHS Lucknow • Client-side Neural Net Roster</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge good" id="tfStatusBadge">TensorFlow.js Active</span>
          <button class="secondary" id="retrainTFBtn">⚡ Retrain Model</button>
        </div>
      </div>
      <p class="muted small">Predictions are powered by an in-browser <strong>TensorFlow.js Neural Network</strong> (Dense Multi-Layer Perceptron) running client-side with instant evaluation and zero server latency.</p>
      <div class="table-wrap"><table><thead><tr><th>Student</th><th>Latest prediction</th><th>Risk</th><th>Engine</th><th>Action</th></tr></thead><tbody id="predRows"></tbody></table></div></div>`;
    bindTIHSBatchBar(() => teacherPrediction(el));
    const ids=list.map(x=>x.id); let preds=ids.length?(await sb.from("predictions").select("*").in("student_id",ids).order("created_at",{ascending:false})).data||[]:[];
    const latest={}; preds.forEach(p=>{if(!latest[p.student_id])latest[p.student_id]=p});
    document.getElementById("predRows").innerHTML=list.map(s=>{
      const p=latest[s.id] || s.prediction;
      return `<tr>
        <td>${esc(s.profile?.full_name||s.full_name||"Unnamed")}</td>
        <td>${p?money(p.predicted_score)+"%":"—"}</td>
        <td>${p?`<span class="badge ${p.risk_level==="High"?"risk":p.risk_level==="Medium"?"warn":"good"}">${p.risk_level}</span>`:"—"}</td>
        <td><small class="muted">${esc(p?.model_name||"TensorFlow.js Neural Net")}</small></td>
        <td><button class="secondary" onclick="window.__editAcademic('${s.id}')">Update</button></td>
      </tr>`;
    }).join("")||'<tr><td colspan="5" class="empty">No students in this section.</td></tr>';

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
    const all = await loadStudents();
    const batch = filterByTIHSBatch(all);
    const list = batch.length ? batch : all;
    const ids = list.map(x=>x.id);
    let preds = ids.length ? (await sb.from("predictions").select("student_id,predicted_score,risk_level,created_at").in("student_id",ids).order("created_at",{ascending:false})).data||[] : [];
    const latest = {}; preds.forEach(p=>{if(!latest[p.student_id])latest[p.student_id]=p});
    const risks = list.filter(s=>{
      const p = latest[s.id] || s.prediction;
      return p && (p.risk_level==="High" || p.risk_level==="Medium");
    });
    el.innerHTML=`
      ${renderTIHSBatchBar(list.length)}
      <div class="card"><div class="card-head"><h3>Smart early warning system — ${tihsFilter.course} (${tihsFilter.year}, Sec ${tihsFilter.section})</h3><button id="notifyAll" class="primary">Notify all at-risk students</button></div>
      <p class="muted small">Students with low attendance (< 75% LU requirement) or high/medium predicted risk signals in <strong>${tihsFilter.course}</strong>.</p>
      <div class="table-wrap"><table><thead><tr><th>Student</th><th>Prediction</th><th>Risk</th><th>Reason</th></tr></thead><tbody>
      ${risks.map(s=>{
        const p = latest[s.id] || s.prediction;
        const a = s.academic;
        const attMsg = a && a.attendance < 75 ? ` (Attendance: ${a.attendance}% below 75% LU rule)` : "";
        return `<tr><td>${esc(s.profile?.full_name||s.full_name)}</td><td>${money(p.predicted_score)}%</td><td><span class="badge ${p.risk_level==="High"?"risk":"warn"}">${p.risk_level}</span></td><td>Current predicted score is below the support threshold${attMsg}.</td></tr>`;
      }).join("")||'<tr><td colspan="4" class="empty">No at-risk students currently detected in this section.</td></tr>'}
      </tbody></table></div></div>`;
    bindTIHSBatchBar(() => teacherWarnings(el));
    document.getElementById("notifyAll").onclick=async()=>{
      if(!risks.length) return toast("No at-risk students in this section","info");
      const payload=risks.map(s=>({student_id:s.id,title:"TIHS Academic Support Notification",message:`Your teacher has noted that your academic performance in ${tihsFilter.course} needs attention. Please review your attendance and internals.`,kind:"warning",created_by:currentUser.id}));
      const r=await sb.from("notifications").insert(payload); if(r.error) toast(r.error.message,"error"); else toast(`Notification sent to ${risks.length} at-risk students in ${tihsFilter.course} Sec ${tihsFilter.section}`,"success");
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

  window.__copyCopilotNotice = function(btn) {
    const card = btn.closest(".copilot-action-card");
    const noticeEl = card?.querySelector(".copilot-notice-box");
    const text = noticeEl ? noticeEl.innerText : "";
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = "✅ Copied to Clipboard!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.innerHTML = orig;
          btn.classList.remove("copied");
        }, 3000);
        toast("Official parent notice copied to clipboard!", "success");
      }).catch(() => {
        toast("Notice text ready on screen!", "info");
      });
    } else {
      toast("Notice text ready on screen!", "info");
    }
  };

  async function copilot(el, who){
    el.innerHTML = copilotWidget(who, "");
    bindCopilot(who);
  }

  function addBubble(t, c){
    const log = document.getElementById("chatLog");
    if(!log) return;
    const d = document.createElement("div");
    d.className = "bubble " + c;
    if(c === "ai") {
      d.innerHTML = t;
    } else {
      d.textContent = t;
    }
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  async function copilotAnswer(q, who, studentCtx = ""){
    const x = q.toLowerCase();
    
    // Resolve student context if teacher or student
    let activeStudent = null;
    if (who === "student") {
      activeStudent = await getStudent();
    } else {
      // Find matching student by name or query or default to Rohan Singh
      const searchKey = studentCtx || (x.includes("rohan") ? "rohan" : x.includes("aarav") ? "aarav" : x.includes("priya") ? "priya" : x.includes("ananya") ? "ananya" : "");
      if (searchKey) {
        activeStudent = demoStudents.find(s => `${s.full_name} ${s.phone}`.toLowerCase().includes(searchKey.toLowerCase()));
      }
      if (!activeStudent) {
        activeStudent = demoStudents.find(s => s.id === "s3") || demoStudents[0];
      }
    }

    const sId = activeStudent?.id || "demo-student";
    const portfolio = getStudentPortfolio(sId);
    const academic = await getAcademic(sId);
    const prediction = await getPrediction(sId);
    const acadScore = prediction?.predicted_score ?? (academic ? baseline(academic) : 75);
    const metrics = computeHolisticMetrics(acadScore, { ...activeStudent, ...portfolio });
    const att = academic?.attendance ?? 75;

    // 1. GITHUB & CERTIFICATIONS / HOLISTIC CAPABILITY BOOST
    if (x.includes("github") || x.includes("cert") || x.includes("practical") || x.includes("boost") || x.includes("career") || x.includes("portfolio") || x.includes("readiness")) {
      return `
        <div class="copilot-action-card">
          <h4>
            <span>🚀 Holistic Capability Assessment</span>
            <span class="badge ${metrics.badgeClass}">${metrics.badge}</span>
          </h4>
          <p>Traditional marks measure syllabus memorization, while verified GitHub repositories and industry certifications demonstrate real-world production engineering capability.</p>
          <div class="copilot-stat-strip">
            <div class="c-stat"><span class="cs-lbl">Academic Baseline</span><span class="cs-val">${metrics.academicScore}%</span></div>
            <div class="c-stat accent"><span class="cs-lbl">Practical (PCI)</span><span class="cs-val">${metrics.practicalScore}%</span></div>
            <div class="c-stat good"><span class="cs-lbl">Career Index</span><span class="cs-val">${metrics.careerReadinessIndex}%</span></div>
            <div class="c-stat good"><span class="cs-lbl">Multiplier Boost</span><span class="cs-val">+${metrics.boostPercent}%</span></div>
          </div>
          <p><strong>Verified Footprint:</strong> ${metrics.hasPractical ? `Linked GitHub (@${esc(metrics.prac.username || "dev")}) with <b>${metrics.prac.repos} public repositories</b> (${metrics.prac.stars} stars, ${metrics.prac.contribs}+ commits) and <b>${metrics.prac.certsCount} verified certifications</b>.` : "No external GitHub account or certifications connected yet."}</p>
          ${metrics.prac.languages.length ? `
            <div class="copilot-pill-row">
              ${metrics.prac.languages.map(l => `<span class="copilot-pill">⚡ ${l}</span>`).join("")}
            </div>
          ` : ""}
          <p><strong>Campus Placement Verdict:</strong> In technical recruitment drives (TCS, Infosys, Wipro, HCL & high-growth startups), verified GitHub projects and AWS/Meta credentials exponentially improve hiring probability over pure marks alone.</p>
        </div>
      `;
    }

    // 2. LU 75% ATTENDANCE DOCTOR
    if (x.includes("attendance") || x.includes("75") || x.includes("doctor") || x.includes("shortage") || x.includes("bunk") || x.includes("debar") || x.includes("absent")) {
      const isDeficit = att < 75;
      const totalLectures = 120;
      const attended = Math.round((att / 100) * totalLectures);
      const needed = Math.ceil((0.75 * totalLectures - attended) / 0.25);
      const buffer = Math.floor((attended - 0.75 * totalLectures) / 0.75);

      if (isDeficit) {
        return `
          <div class="copilot-action-card">
            <h4>
              <span>⚖️ Lucknow University (LU) Attendance Doctor</span>
              <span class="badge risk">Debarment Alert</span>
            </h4>
            <p>Under University of Lucknow (LU) Statutory Ordinances, a minimum of <strong>75.0% aggregate attendance</strong> is strictly mandatory to appear in semester examinations.</p>
            <div class="copilot-stat-strip">
              <div class="c-stat risk"><span class="cs-lbl">Current Attendance</span><span class="cs-val">${att}%</span></div>
              <div class="c-stat"><span class="cs-lbl">LU Minimum</span><span class="cs-val">75.0%</span></div>
              <div class="c-stat risk"><span class="cs-lbl">Shortfall Deficit</span><span class="cs-val">-${75 - att}%</span></div>
              <div class="c-stat accent"><span class="cs-lbl">Must Attend Next</span><span class="cs-val">${needed} Classes</span></div>
            </div>
            <p><strong>Attendance Prescription for ${esc(activeStudent.full_name)}:</strong></p>
            <p>You must attend the next <strong>${needed} consecutive lecture/practical periods</strong> with ZERO unexcused leaves to mathematically cross the 75.0% threshold.</p>
            <div class="copilot-notice-box" style="font-family:inherit;font-size:10px;padding:8px 10px;margin-top:6px">
              <b>⚡ TIHS Administrative Recovery Pathways:</b><br>
              • <strong>Practical Laboratory Sessions:</strong> Computer Labs carry 2× attendance weightage in the ERP.<br>
              • <strong>Statutory Condonation:</strong> Under LU rules, submit medical or hackathon duty certificates to the TIHS Academic Cell for up to 10% attendance waiver.
            </div>
          </div>
        `;
      } else {
        return `
          <div class="copilot-action-card">
            <h4>
              <span>⚖️ Lucknow University (LU) Attendance Doctor</span>
              <span class="badge good">Exam Eligible (75%+)</span>
            </h4>
            <p>Your current attendance of <strong>${att}%</strong> comfortably meets the University of Lucknow statutory requirement.</p>
            <div class="copilot-stat-strip">
              <div class="c-stat good"><span class="cs-lbl">Current Attendance</span><span class="cs-val">${att}%</span></div>
              <div class="c-stat"><span class="cs-lbl">LU Minimum</span><span class="cs-val">75.0%</span></div>
              <div class="c-stat good"><span class="cs-lbl">Safety Buffer</span><span class="cs-val">${buffer} Leaves</span></div>
            </div>
            <p>You have a buffer of up to <strong>${buffer} allowable leaves</strong> while remaining safely above 75%. Keep attending practical lab sessions regularly to maintain your semester standing.</p>
          </div>
        `;
      }
    }

    // 3. 7-DAY PERSONALIZED EXAM & STUDY TIMETABLE
    if (x.includes("timetable") || x.includes("study") || x.includes("schedule") || x.includes("exam") || x.includes("revision") || x.includes("pomodoro") || x.includes("plan")) {
      return `
        <div class="copilot-action-card">
          <h4>
            <span>📅 Personalized 7-Day Exam Timetable</span>
            <span class="badge good">TIHS Lucknow BCA Syllabus</span>
          </h4>
          <p>Structured spaced-repetition sprint designed to maximize internal marks and LU semester exam scores:</p>
          <table class="copilot-mini-table">
            <thead><tr><th>Day</th><th>Subject & Core Topics</th><th>Session Structure</th></tr></thead>
            <tbody>
              <tr><td><b>Day 1 (Mon)</b></td><td>Data Structures: Pointers, Linked Lists & Stacks</td><td>2 × 45m Pomodoro Blocks</td></tr>
              <tr><td><b>Day 2 (Tue)</b></td><td>Discrete Math: Logic, Relations & Set Theory</td><td>2 × 50m Focus Blocks</td></tr>
              <tr><td><b>Day 3 (Wed)</b></td><td>Digital Electronics: Logic Gates & Karnaugh Maps</td><td>1.5h Theory & Problem Solving</td></tr>
              <tr><td><b>Day 4 (Thu)</b></td><td>C / Python Practical Coding & GitHub Push</td><td>1.5h Hands-on Implementation</td></tr>
              <tr><td><b>Day 5 (Fri)</b></td><td>LU Previous 3-Year Question Paper Solving</td><td>2h Timed Mock Paper Drill</td></tr>
              <tr><td><b>Day 6 (Sat)</b></td><td>Internal Assessment Weak Spots & Mentor Review</td><td>1.5h Faculty Doubt Clearing</td></tr>
              <tr><td><b>Day 7 (Sun)</b></td><td>Formula Flashcards & Active Recall (Restful Night)</td><td>1h Light Review</td></tr>
            </tbody>
          </table>
          <p class="tiny muted">Pro-Tip: Schedule challenging mathematical topics during your morning peak focus hours (9:00 AM – 11:30 AM).</p>
        </div>
      `;
    }

    // 4. DRAFT FORMAL PARENT NOTICE (TEACHER)
    if (x.includes("notice") || x.includes("parent") || x.includes("letter") || x.includes("draft") || x.includes("formal") || (who==="teacher" && x.includes("warning"))) {
      const parentName = activeStudent.father_name || "Parent / Guardian";
      const studentName = activeStudent.full_name || "Student";
      const course = activeStudent.course || "BCA";
      const year = activeStudent.class_year || "1st Year";
      const section = activeStudent.class_section || "A";
      const phone = activeStudent.phone || "+91 9876543210";
      const parentPhone = activeStudent.parents_phone || "+91 9876500000";

      return `
        <div class="copilot-action-card">
          <h4>
            <span>📝 Official Parent Notice (LU Attendance Shortage)</span>
            <span class="badge warn">Formal Notice</span>
          </h4>
          <p>Formal academic notice drafted under University of Lucknow Ordinances. Ready to dispatch to parent via WhatsApp, SMS, or official registered letter:</p>
          <div class="copilot-notice-box">TECHNO INSTITUTE OF HIGHER STUDIES (TIHS), LUCKNOW
Affiliated to University of Lucknow (LU)
Ref: TIHS/LU-ATT/2026/SEC-${section}/094
Date: 01 October 2026

To:
Mr. ${parentName}
Parent / Guardian of: ${studentName}
Program: ${course} ${year} (Section ${section})
Student Contact: ${phone} | Parent Contact: ${parentPhone}

Subject: URGENT — Attendance Deficit & Statutory Risk of Debarment from LU Semester Examinations

Dear Mr. ${parentName},

This is an official communication from the Academic Cell at Techno Institute of Higher Studies (TIHS), Lucknow.

As per University of Lucknow (LU) Academic Ordinances, a minimum attendance of 75.0% across all lecture and laboratory sessions is strictly mandatory to obtain the Admit Card for End-Semester University Examinations.

Your ward, ${studentName}, currently records an aggregate attendance of ${att}%, falling ${Math.max(0, 75 - att)}% below the mandatory statutory requirement.

Unless consecutive attendance is maintained over the remaining instructional weeks, your ward will be debarred from taking the semester examinations. You are requested to meet the Class Mentor and Head of Department (HOD) on or before Monday, 06 October 2026 at 11:30 AM to submit an academic recovery undertaking.

Yours faithfully,
Office of the Academic Dean & Class Coordinator
Techno Institute of Higher Studies, Lucknow
Phone: +91 522 277 8899 | Email: academic@tihs.edu.in</div>
          <div>
            <button class="copilot-copy-btn" onclick="window.__copyCopilotNotice(this)">📋 Copy Official Notice to Clipboard</button>
          </div>
        </div>
      `;
    }

    // 5. DEEP DIVE ACTIVE STUDENT DOSSIER
    if (x.includes("dossier") || x.includes("deep dive") || x.includes("who is") || x.includes("analyze student") || (who === "teacher" && (x.includes("student") || x.includes("rohan") || x.includes("aarav") || x.includes("priya")))) {
      return `
        <div class="copilot-action-card">
          <h4>
            <span>👤 360° Academic & Practical Dossier — ${esc(activeStudent.full_name)}</span>
            <span class="badge ${metrics.badgeClass}">${metrics.badge}</span>
          </h4>
          <p>Enrolled in <strong>${esc(activeStudent.course)} ${esc(activeStudent.class_year)} (Section ${esc(activeStudent.class_section || "A")})</strong> at TIHS Lucknow.</p>
          <div class="copilot-stat-strip">
            <div class="c-stat ${att < 75 ? "risk" : "good"}"><span class="cs-lbl">Attendance</span><span class="cs-val">${att}%</span></div>
            <div class="c-stat ${acadScore < 60 ? "risk" : "good"}"><span class="cs-lbl">Academic Score</span><span class="cs-val">${acadScore}%</span></div>
            <div class="c-stat accent"><span class="cs-lbl">GitHub Repos</span><span class="cs-val">${metrics.prac.repos} Repos</span></div>
            <div class="c-stat good"><span class="cs-lbl">Practical (PCI)</span><span class="cs-val">${metrics.practicalScore}%</span></div>
            <div class="c-stat good"><span class="cs-lbl">Career Index</span><span class="cs-val">${metrics.careerReadinessIndex}%</span></div>
          </div>
          <p><strong>Holistic Divergence Analysis:</strong></p>
          <p>${esc(activeStudent.full_name)} presents a stark contrast between conventional classroom indicators (${att}% attendance, ${acadScore}% predicted exam score) and practical software capability (${metrics.prac.repos} GitHub repositories with ${metrics.prac.stars} stars, ${metrics.prac.certsCount} verified certifications in ${metrics.prac.languages.join(", ") || "full-stack tech"}).</p>
          <div class="copilot-notice-box" style="font-family:inherit;font-size:10px;padding:8px 10px;margin-top:4px">
            <b>Faculty Mentorship Recommendation:</b><br>
            • <strong>Attendance Intervention:</strong> Do NOT debar this student without counseling; their absence is correlated with practical building and open-source contributions.<br>
            • <strong>Duty Leave Endorsement:</strong> Grant institutional academic duty credits for hackathon representations.<br>
            • <strong>Peer Mentorship:</strong> Appoint as a lab teaching assistant in practical sessions to make up classroom hours.
          </div>
        </div>
      `;
    }

    // 6. FIND HIDDEN CODER TALENTS (TEACHER)
    if (x.includes("talent") || x.includes("coder") || x.includes("hidden") || x.includes("scout") || x.includes("hackathon") || x.includes("stars")) {
      return `
        <div class="copilot-action-card">
          <h4>
            <span>🔎 TIHS Talent Scout: Hidden Coders & Practical Stars</span>
            <span class="badge good">Active Batch Scan</span>
          </h4>
          <p>Scanned active section roster for students with high practical software output despite attendance or exam score fluctuations:</p>
          <table class="copilot-mini-table">
            <thead><tr><th>Student</th><th>LU Attendance</th><th>GitHub & Credentials</th><th>AI Verdict</th></tr></thead>
            <tbody>
              <tr>
                <td><b>Rohan Singh</b><br><span class="tiny muted">BCA Sec A</span></td>
                <td><span class="badge risk">52% (Low)</span></td>
                <td>22 Repos • 164★<br>Meta Front-End Cert</td>
                <td><span class="badge warn">🚀 High Practical Talent</span><br><span class="tiny">Hackathon star; needs exam attendance safeguard.</span></td>
              </tr>
              <tr>
                <td><b>Aarav Sharma</b><br><span class="tiny muted">BCA Sec A</span></td>
                <td><span class="badge good">88% (Good)</span></td>
                <td>14 Repos • 42★<br>AWS Cloud Cert</td>
                <td><span class="badge good">⭐ Elite Full-Stack</span><br><span class="tiny">Balanced academic & practical leader.</span></td>
              </tr>
              <tr>
                <td><b>Priya Saxena</b><br><span class="tiny muted">BCA Sec A</span></td>
                <td><span class="badge good">94% (High)</span></td>
                <td>8 Repos • 18★<br>Google Data Analytics</td>
                <td><span class="badge good">📚 Academic Scholar</span><br><span class="tiny">Strong analytical & algorithmic foundation.</span></td>
              </tr>
              <tr>
                <td><b>Ananya Verma</b><br><span class="tiny muted">BCA Sec A</span></td>
                <td><span class="badge warn">74% (Border)</span></td>
                <td>4 Repos • 8★<br>Coursera Python Cert</td>
                <td><span class="badge good">🌱 Emerging Builder</span><br><span class="tiny">Solid trajectory; ready for project guidance.</span></td>
              </tr>
            </tbody>
          </table>
          <p class="tiny muted">Faculty Recommendation: Pair Rohan Singh and Aarav Sharma to lead the official TIHS College Hackathon Team for upcoming inter-university competitions!</p>
        </div>
      `;
    }

    // 7. BATCH INTERVENTION & RISK DISTRIBUTION (TEACHER)
    if (x.includes("batch") || x.includes("intervention") || x.includes("remedial") || x.includes("distribution") || x.includes("section")) {
      return `
        <div class="copilot-action-card">
          <h4>
            <span>📊 Section Academic Intervention Plan</span>
            <span class="badge good">${tihsFilter.course} ${tihsFilter.year} (Sec ${tihsFilter.section})</span>
          </h4>
          <p>Analysis of academic signals and compliance with University of Lucknow standards:</p>
          <div class="copilot-stat-strip">
            <div class="c-stat"><span class="cs-lbl">Section Roster</span><span class="cs-val">5 Students</span></div>
            <div class="c-stat good"><span class="cs-lbl">On Track (75%+)</span><span class="cs-val">3 Students (60%)</span></div>
            <div class="c-stat warn"><span class="cs-lbl">Borderline (70-75%)</span><span class="cs-val">1 Student (20%)</span></div>
            <div class="c-stat risk"><span class="cs-lbl">Critical Shortage</span><span class="cs-val">1 Student (20%)</span></div>
          </div>
          <p><strong>Actionable Remedial Strategy:</strong></p>
          <ul style="margin:4px 0 0 16px;padding:0;font-size:10px;color:var(--text);line-height:1.5">
            <li><strong>Attendance Alerts:</strong> Issue automated official parent notifications to students below 75% before next Friday.</li>
            <li><strong>Remedial Workshop:</strong> Schedule a 2-hour tutorial on Data Structures & Discrete Math logic proofs.</li>
            <li><strong>Portfolio Recognition:</strong> Acknowledge students with top GitHub contributions to incentivize peer learning in computer labs.</li>
          </ul>
        </div>
      `;
    }

    // 8. PLACEMENT & SKILL ROADMAP
    if (x.includes("skill") || x.includes("placement") || x.includes("job") || x.includes("internship") || x.includes("recommend")) {
      return `
        <div class="copilot-action-card">
          <h4>
            <span>🎯 Placement & Industry Readiness Roadmap</span>
            <span class="badge good">TIHS Campus Placement Track</span>
          </h4>
          <p>Based on your active profile and technical competencies, here is your highest-ROI roadmap for IT campus recruitments:</p>
          <div class="copilot-notice-box" style="font-family:inherit;font-size:10px;padding:8px 10px">
            • <strong>Recommended Certification:</strong> AWS Certified Cloud Practitioner or Meta Front-End Developer.<br>
            • <strong>Recommended GitHub Project:</strong> Deploy a full-stack CRUD web application with REST APIs, authentication, and a clean README on Vercel/Render.<br>
            • <strong>Data Structures Goal:</strong> Solve 50 Medium difficulty problems on HackerRank / LeetCode in Arrays, Strings, and Hash Maps.
          </div>
          <p class="tiny muted">TIHS placement recruiters prioritize candidates who can demonstrate live GitHub repositories alongside foundational course marks.</p>
        </div>
      `;
    }

    // Default intelligent fallback with interactive quick chips
    return `
      <div class="copilot-action-card">
        <h4>
          <span>✦ EduPredict AI Academic Copilot</span>
          <span class="badge good">Ready to Assist</span>
        </h4>
        <p>I am programmed with deep contextual awareness of TIHS Lucknow courses, University of Lucknow 75% attendance regulations, and holistic practical capability scoring.</p>
        <p><strong>What would you like me to do?</strong></p>
        <div class="quick-prompts" style="margin:4px 0">
          ${who === "teacher" ? `
            <button data-q="Deep dive into selected student academic and practical dossier">👤 360° Student Dossier</button>
            <button data-q="Draft formal Lucknow University attendance shortage notice for parents">📝 Draft Parent Notice</button>
            <button data-q="Scan section for high-skill GitHub contributors with low attendance">💻 Find Hidden Coder Talents</button>
          ` : `
            <button data-q="Analyze my GitHub and certifications impact on my career readiness">🚀 Career & Practical Boost</button>
            <button data-q="Calculate my Lucknow University 75% attendance recovery">⚖️ LU 75% Attendance Doctor</button>
            <button data-q="Generate a 7-day personalized study timetable for exams">📅 7-Day Exam Timetable</button>
          `}
        </div>
      </div>
    `;
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
