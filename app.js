// ─── Firebase config ────────────────────────────
  const firebaseConfig = {
    apiKey: "AIzaSyD8KGZ43JjT5DagFVTEEVdnf7agqBLjQ6E",
    authDomain: "flow-app-99150.firebaseapp.com",
    databaseURL: "https://flow-app-99150-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "flow-app-99150",
    storageBucket: "flow-app-99150.firebasestorage.app",
    messagingSenderId: "257985954717",
    appId: "1:257985954717:web:22a139d447c166b984e574"
  };
  firebase.initializeApp(firebaseConfig);
  const fbdb = firebase.database();
  const APP_VERSION = '2.3';
  function applyTheme(){
    let t = localStorage.getItem('flow_theme');
    if(!t) t = window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme',t);
  }
  if(window.matchMedia) window.matchMedia('(prefers-color-scheme: light)').addEventListener('change',()=>{ if(!localStorage.getItem('flow_theme')) applyTheme(); });
  applyTheme();
  // ═══════════════════════════════════════════════
  //  FLOW — Project Management App
  // ═══════════════════════════════════════════════

  // ─── Default data ───────────────────────────────
  const SEED = {
    users: [
      { id:'u1', username:'Sacha',  password:'sha256:8e2ff622e0da75207ff78f74a625b54e76bf2187d069964ee73af155b43bda03', role:'admin',
        firstName:'Sacha', lastName:'', email:'sacha@flow.app', photo:null,
        projectId:null, createdAt:'2024-01-01' },
      { id:'u2', username:'Alexis', password:'sha256:9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0', role:'controller',
        firstName:'Alexis', lastName:'', email:'alexis@flow.app', photo:null,
        projectId:null, createdAt:'2024-01-01' },
      { id:'u_teste1', username:'teste1', password:'sha256:15bf532d22345576b4a51b96da4754c039ef3458494066d76828e893d69ebd1e', role:'client',
        firstName:'Teste', lastName:'Un', email:'teste1@flow.app', photo:null,
        projectId:null, createdAt:'2024-01-01', hasDiscussion:true }
    ],
    projects:[
      { id:'proj1', name:'Site Vitrine Demo', clientId:null,
        websiteUrl:'https://example.com', status:'in_progress',
        createdAt:'2024-02-01',
        timeline:[
          {id:'tl1',label:'Prise de contact',   status:'done',    date:'15 Jan 2024', note:'Premier échange établi.'},
          {id:'tl2',label:'Cahier des charges',  status:'done',    date:'20 Jan 2024', note:'Besoins validés.'},
          {id:'tl3',label:'Maquette validée',    status:'done',    date:'01 Fév 2024', note:'Design approuvé par le client.'},
          {id:'tl4',label:'Développement',       status:'current', date:null,          note:'En cours — 60 %'},
          {id:'tl5',label:'Tests & Recette',     status:'pending', date:null,          note:''},
          {id:'tl6',label:'Mise en ligne',       status:'pending', date:null,          note:''}
        ]
      }
    ],
    documents:[
      { id:'doc1', name:'Brief créatif', projectId:'proj1', clientId:null,
        sentBy:'u1', sentAt:'2024-01-16',
        status:'pending',
        fields:[
          {id:'f1', label:'Décrivez votre activité en quelques lignes',   type:'textarea', value:''},
          {id:'f2', label:'Couleurs ou univers graphique souhaités',       type:'text',     value:''},
          {id:'f3', label:'Sites web de référence (URLs)',                 type:'text',     value:''},
          {id:'f4', label:'Budget estimé (â‚¬)',                            type:'text',     value:''}
        ],
        filledAt:null
      }
    ]
  };

  // ─── Storage ────────────────────────────────────
  function loadLocalDB(){
    try{ const s=localStorage.getItem('flow_v3'); if(s) return JSON.parse(s); }catch(_){}
    return null;
  }
  function saveLocalDB(){ localStorage.setItem('flow_v3',JSON.stringify(db)); }
  let _saveTimer = null;
  let _refreshTimer = null;
  let _lastSavedJSON = null;
  function saveDB(){
    normalizeDB();
    saveLocalDB();
    const nextJSON = JSON.stringify(db);
    if(nextJSON === _lastSavedJSON){ setSyncState('ok'); return; }
    setSyncState('syncing');
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(()=>{
      const payload = JSON.parse(nextJSON);
      fbdb.ref('flow').set(payload)
        .then(()=>{ _lastSavedJSON = nextJSON; setSyncState('ok'); })
        .catch(()=>setSyncState('error'));
    }, 650);
  }

  let db = loadLocalDB() || JSON.parse(JSON.stringify(SEED));
  function normalizeDB(){
    if(!db || typeof db !== 'object') db = JSON.parse(JSON.stringify(SEED));
    if(!Array.isArray(db.users)) db.users = [];
    if(!Array.isArray(db.projects)) db.projects = [];
    if(!Array.isArray(db.documents)) db.documents = [];
    if(!Array.isArray(db.activityLog)) db.activityLog = [];
    if(!Array.isArray(db.finance)) db.finance = [];
    if(!db.financeGoal || typeof db.financeGoal !== 'object') db.financeGoal = {monthly:0, annual:0};
    if(!Array.isArray(db.pendingUsers)) db.pendingUsers = [];
    if(!Array.isArray(db.blockedAccounts)) db.blockedAccounts = [];
    if(!Array.isArray(db.docTemplates)) db.docTemplates = [];
    if(!db.aiConfig || typeof db.aiConfig !== 'object') db.aiConfig = { geminiKey:'', claudeKey:'' };
    if(!Array.isArray(db.aiRequests)) db.aiRequests = [];
    if(!db.users.find(u=>u.id==='u_teste1')){
      db.users.push({ id:'u_teste1', username:'teste1', password:'sha256:15bf532d22345576b4a51b96da4754c039ef3458494066d76828e893d69ebd1e', role:'client',
        firstName:'Teste', lastName:'Un', email:'teste1@flow.app', photo:null,
        projectId:null, createdAt:'2024-01-01', hasDiscussion:true });
    }
    db.users.forEach(u=>{ if(u.hasDiscussion===undefined) u.hasDiscussion=false; });
    db.projects.forEach(p=>{
      if(!p.priority) p.priority='normal';
      if(!Array.isArray(p.internalTasks)) p.internalTasks=[];
      if(p.pinned===undefined) p.pinned=false;
      if(!Array.isArray(p.timeline)) p.timeline=[];
      if(!Array.isArray(p.tags)) p.tags=[];
      if(!Array.isArray(p.faq)) p.faq=[];
    });
    db.documents.forEach(d=>{ if(!Array.isArray(d.fields)) d.fields=[]; });
  }
  normalizeDB();
  let me = null;
  let activeTab = 'home';
  let modalStack = [];
  let notifBadge = 0;
  let prevFilledDocIds = new Set();

  // F1 — Idle auto-logout
  let lastActivity = Date.now();
  function resetIdleTimer(){ lastActivity = Date.now(); }

  // ─── Toast ──────────────────────────────────────
  function toast(msg, type='info', duration=3200){
    const container = document.getElementById('toast-container');
    if(!container) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    const icon = {success:'✅',error:'âŒ',info:'ℹï¸'}[type]||'ℹï¸';
    el.innerHTML = '<span>'+icon+'</span><span>'+esc(msg)+'</span>';
    container.appendChild(el);
    setTimeout(()=>{ el.classList.add('hide'); setTimeout(()=>el.remove(), 280); }, duration);
  }

  // ─── Sync dot ───────────────────────────────────
  function setSyncState(state){
    const dot = document.getElementById('sync-dot');
    if(!dot) return;
    dot.className = '';
    if(state==='syncing') dot.classList.add('syncing');
    else if(state==='error') dot.classList.add('error');
  }

  function updateNotifBadge(){
    const badge = document.getElementById('notif-badge');
    if(badge){ badge.textContent=notifBadge>9?'9+':notifBadge; badge.style.display=notifBadge>0?'inline-flex':'none'; }
    const mobBadge = document.getElementById('mob-notif-badge');
    if(mobBadge){ mobBadge.textContent=notifBadge>9?'9+':notifBadge; mobBadge.style.display=notifBadge>0?'inline':'none'; }
  }

  function requestNotifPermission(){
    if('Notification' in window && Notification.permission==='default'){
      Notification.requestPermission();
    }
  }
  function sendBrowserNotif(title, body){
    if('Notification' in window && Notification.permission==='granted'){
      new Notification(title, { body, icon: '' });
    }
  }

  // ─── "Quoi de neuf ?" version modal ─────────────
  function showWhatsNew(){
    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
        <div>
          <h2 style="font-size:1.1rem;font-weight:700;">Quoi de neuf ? ✨</h2>
          <div style="font-size:.75rem;color:var(--ink-4);margin-top:3px;">Flow v${APP_VERSION}</div>
        </div>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:10px;margin-bottom:24px;">
        ${[
          ['⏱ï¸','Déconnexion automatique après 30 min d\'inactivité'],
          ['ðŸ”’','Blocage après 5 tentatives de connexion échouées'],
          ['ðŸ“¡','Bannière hors-ligne en cas de perte de connexion'],
          ['âŒ¨ï¸','Raccourcis clavier (Esc, N)'],
          ['ðŸ“Š','Graphique de répartition des projets'],
          ['📅','Calendrier des échéances — 30 prochains jours'],
          ['ðŸŽ¯','Compte Ã  rebours de livraison côté client'],
          ['📝','Notes par étape dans l\'éditeur de timeline'],
          ['ðŸ“‹','Duplication de projet'],
          ['ðŸ—‚ï¸','Modèles de timeline prédéfinis'],
          ['ðŸŽ¨','Couleur personnalisée par projet'],
          ['ðŸ’¬','Message d\'accueil client par projet'],
          ['ðŸ—„ï¸','Archivage de projet (au lieu de suppression)'],
          ['🏷ï¸','Tags sur les projets'],
          ['✅','Commentaire admin lors de la validation d\'un document'],
          ['âš ï¸','Indicateur de relance (doc en attente > 7 jours)'],
          ['ðŸ‘¤','Profil enrichi client (téléphone, secteur)']
        ].map(([icon,text])=>`
          <li style="display:flex;align-items:flex-start;gap:12px;padding:10px 14px;background:rgba(255,255,255,.04);border-radius:12px;border:1px solid rgba(255,255,255,.07);">
            <span style="font-size:1.1rem;flex-shrink:0;">${icon}</span>
            <span style="font-size:.875rem;color:var(--ink-2);">${text}</span>
          </li>`).join('')}
      </ul>
      <button onclick="closeModal()" class="btn btn-primary" style="width:100%;justify-content:center;">Super, c'est noté !</button>`,
    ()=>{ localStorage.setItem('flow_seen_version', APP_VERSION); });
  }

  function checkVersion(){
    if(localStorage.getItem('flow_seen_version') !== APP_VERSION){
      showWhatsNew();
    }
  }

  // ─── Helpers ────────────────────────────────────
  const uid = ()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const esc = s=>(s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const roleLabel = r=>({admin:'Admin',controller:'Contrôleur',client:'Client'}[r]||r);
  const roleBadge = r=>`<span class="badge badge-${r==='controller'?'controller':r}">${roleLabel(r)}</span>`;
  const initials = u=>(((u.firstName||u.username||'?')[0])+(u.lastName?u.lastName[0]:'')).toUpperCase();
  const avatar = u => u.photo
    ? `<img src="${esc(u.photo)}" class="avatar" style="width:36px;height:36px;" />`
    : `<div class="avatar" style="width:36px;height:36px;background:${avatarColor(u)}">${initials(u)}</div>`;
  const avatarLg = u => u.photo
    ? `<img src="${esc(u.photo)}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;" />`
    : `<div class="avatar" style="width:72px;height:72px;font-size:1.4rem;background:${avatarColor(u)}">${initials(u)}</div>`;
  const avatarColors=['linear-gradient(135deg,#d97757,#c25a3a)','linear-gradient(135deg,#9bb8d8,#6f8db0)','linear-gradient(135deg,#a8c4a9,#10b981)','linear-gradient(135deg,#e88aa6,#ec4899)','linear-gradient(135deg,#9bb8d8,#3b82f6)'];
  function avatarColor(u){ let h=0; for(let c of (u.id||'x')) h=(h*31+c.charCodeAt(0))&0xffff; return avatarColors[h%avatarColors.length]; }

  function logActivity(type, description){
    if(!db.activityLog) db.activityLog = [];
    db.activityLog.unshift({
      id: uid(),
      actor: me ? me.username : 'système',
      type,
      description,
      at: new Date().toISOString()
    });
    if(db.activityLog.length > 100) db.activityLog = db.activityLog.slice(0, 100);
  }

  function canCreateRole(creatorRole, targetRole){
    if(creatorRole==='admin') return true;
    if(creatorRole==='controller') return targetRole==='client';
    return false;
  }

  function getUserProject(userId){
    return db.projects.find(p=>p.clientId===userId&&!p.archived)||null;
  }
  function getUserProjects(userId){
    return db.projects.filter(p=>p.clientId===userId&&!p.archived);
  }
  function getProjectDocs(projectId){
    return db.documents.filter(d=>d.projectId===projectId);
  }

  // ─── Auth & crypto ──────────────────────────────
  async function hashPwd(pwd){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd));
    return 'sha256:'+Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function migratePasswords(){
    let changed = false;
    for(const u of db.users){
      if(u.password && !u.password.startsWith('sha256:')){
        u.password = await hashPwd(u.password); changed = true;
      }
    }
    if(changed) saveDB();
  }
  async function loginAsync(username, password){
    const u = db.users.find(u=>u.username.toLowerCase()===username.toLowerCase());
    if(!u) return false;
    let ok = false;
    if(u.password && u.password.startsWith('sha256:')){
      ok = (await hashPwd(password)) === u.password;
    } else { ok = u.password === password; }
    if(!ok) return false;
    me = u; sessionStorage.setItem('flow_uid', u.id);
    logActivity('login', 'Connexion de ' + u.username);
    return true;
  }

  // ─── Firebase boot ──────────────────────────────

  // Command palette
  function openCmdPalette(){
    const pal = document.getElementById('cmd-palette');
    if(!pal) return;
    pal.classList.add('open');
    const inp = document.getElementById('cmd-input');
    if(!inp) return;
    inp.value=''; inp.focus();
    renderCmdResults('');
    inp.oninput = ()=>renderCmdResults(inp.value);
    inp.onkeydown = (e)=>{
      const items = document.querySelectorAll('#cmd-results .cmd-item');
      const active = document.querySelector('#cmd-results .cmd-item.cmd-active');
      const idx = Array.from(items).indexOf(active);
      if(e.key==='ArrowDown'){ e.preventDefault(); const next=items[Math.min(idx+1,items.length-1)]; if(next){if(active)active.classList.remove('cmd-active');next.classList.add('cmd-active');next.scrollIntoView({block:'nearest'});} }
      if(e.key==='ArrowUp'){ e.preventDefault(); const prev=items[Math.max(idx-1,0)]; if(prev){if(active)active.classList.remove('cmd-active');prev.classList.add('cmd-active');prev.scrollIntoView({block:'nearest'});} }
      if(e.key==='Enter'){ const cur=document.querySelector('#cmd-results .cmd-item.cmd-active'); if(cur) cur.click(); }
    };
  }
  function closeCmdPalette(){
    const pal = document.getElementById('cmd-palette');
    if(pal) pal.classList.remove('open');
  }
  function renderCmdResults(q){
    const res = document.getElementById('cmd-results');
    if(!res) return;
    q = (q||'').toLowerCase().trim();
    const items = [];
    // Navigation tabs
    const tabs = [{id:'home',label:'Accueil'},{id:'users',label:'Utilisateurs'},{id:'documents',label:'Suivi & Docs'},{id:'finance',label:'Finance'},{id:'requests',label:'Demandes'},{id:'history',label:'Historique'},{id:'profile',label:'Mon Profil'}];
    tabs.forEach(t=>{ if(!q||t.label.toLowerCase().includes(q)) items.push({icon:'ðŸ§­',label:t.label,sub:'Navigation',action:()=>{activeTab=t.id;closeCmdPalette();refreshAdminTab();}}); });
    // Clients/users
    db.users.filter(u=>!q||(u.username+' '+(u.firstName||'')+' '+(u.lastName||'')).toLowerCase().includes(q)).slice(0,5).forEach(u=>{
      items.push({icon:'ðŸ‘¤',label:u.username+(u.firstName?` (${u.firstName} ${u.lastName||''})`.trim():''),sub:'Utilisateur · '+u.role,action:()=>{ activeTab='users'; closeCmdPalette(); refreshAdminTab(); }});
    });
    // Projects
    db.projects.filter(p=>!p.archived&&(!q||p.name.toLowerCase().includes(q))).slice(0,5).forEach(p=>{
      items.push({icon:'📁',label:p.name,sub:'Projet · '+(p.status==='done'?'Terminé':p.status==='in_progress'?'En cours':'En attente'),action:()=>{ activeTab='documents'; closeCmdPalette(); refreshAdminTab(); }});
    });
    // Finance entries
    (db.finance||[]).filter(e=>!q||(e.label||'').toLowerCase().includes(q)||(db.projects.find(p=>p.id===e.projectId)?.name||'').toLowerCase().includes(q)).slice(0,4).forEach(e=>{
      const pname = db.projects.find(p=>p.id===e.projectId)?.name||e.label||'—';
      items.push({icon:'ðŸ’°',label:pname+' — '+(e.amount||0)+'â‚¬',sub:'Finance · '+(e.date||''),action:()=>{ activeTab='finance'; closeCmdPalette(); refreshAdminTab(); }});
    });
    // Actions
    if(!q||'nouveau projet'.includes(q)) items.push({icon:'➕',label:'Nouveau projet',sub:'Action',action:()=>{ closeCmdPalette(); activeTab='home'; refreshAdminTab(); setTimeout(openCreateProjectModal,100); }});
    if(!q||'ajouter entrée finance'.includes(q)) items.push({icon:'ðŸ’¶',label:'Ajouter entrée finance',sub:'Action',action:()=>{ closeCmdPalette(); activeTab='finance'; refreshAdminTab(); setTimeout(openAddRevenueModal,100); }});
    if(!q||'déconnexion'.includes(q)) items.push({icon:'🔐',label:'Se déconnecter',sub:'Action',action:()=>{ closeCmdPalette(); logout(); }});

    if(items.length===0){
      res.innerHTML='<div style="padding:14px 16px;color:var(--ink-4);font-size:.85rem;">Aucun résultat pour "'+q+'"</div>';
      return;
    }
    res.innerHTML = items.slice(0,12).map((it,i)=>`
      <div class="cmd-item${i===0?' cmd-active':''}" style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:9px;cursor:pointer;transition:background .12s;">
        <span style="font-size:1.1rem;flex-shrink:0;">${it.icon}</span>
        <div style="flex:1;min-width:0;"><div style="font-size:.875rem;font-weight:500;color:var(--ink);">${it.label}</div><div style="font-size:.72rem;color:var(--ink-4);">${it.sub}</div></div>
      </div>`).join('');
    res.querySelectorAll('.cmd-item').forEach((el,i)=>{
      el.addEventListener('click',()=>items[i].action());
      el.addEventListener('mouseenter',()=>{ res.querySelectorAll('.cmd-item').forEach(x=>x.classList.remove('cmd-active')); el.classList.add('cmd-active'); });
    });
  }

  function bootApp(){
    // F1 — Idle timer setup
    ['mousemove','keydown','click','touchstart'].forEach(ev=>document.addEventListener(ev,resetIdleTimer,{passive:true}));
    setInterval(()=>{ if(me && Date.now()-lastActivity > 30*60*1000){ toast('Déconnexion automatique (inactivité).','info',4000); logout(); } }, 60000);

    // F4 — Keyboard shortcuts
    document.addEventListener('keydown', e=>{

      if(e.key==='Escape'){ closeModal(); closeCmdPalette(); }
      if((e.key==='k'||e.key==='K')&&(e.ctrlKey||e.metaKey)&&me){ e.preventDefault(); openCmdPalette(); }
      const tag = document.activeElement?.tagName;
      if(e.key==='n' && tag!=='INPUT' && tag!=='TEXTAREA' && tag!=='SELECT' && !e.ctrlKey && !e.metaKey){
        if(canManageProjects(me)){
          if(activeTab==='home') openCreateProjectModal();
          else if(activeTab==='users') openCreateUserModal();
        }
      }
    });

    setSyncState('syncing');
    fbdb.ref('flow').once('value')
      .then(snap=>{
        const remote = snap.val();
        if(remote && remote.users){ db = remote; normalizeDB(); _lastSavedJSON = JSON.stringify(db); saveLocalDB(); }
        else { fbdb.ref('flow').set(db); }
        setSyncState('ok');
        startRealtimeSync();
        migratePasswords().then(()=>{
          checkSession();
          render();
          if(me && (me.role==='admin'||me.role==='controller')) requestNotifPermission();
          checkVersion();
        });
      })
      .catch(()=>{
        setSyncState('error');
        toast('Firebase hors ligne — mode local activé','error');
        migratePasswords().then(()=>{
          checkSession();
          render();
          if(me && (me.role==='admin'||me.role==='controller')) requestNotifPermission();
          checkVersion();
        });
      });
  }
  function startRealtimeSync(){
    prevFilledDocIds = new Set(db.documents.filter(d=>d.status==='filled').map(d=>d.id));

    // F3 — Offline banner
    fbdb.ref('.info/connected').on('value', snap=>{
      let banner = document.getElementById('offline-banner');
      if(snap.val()===false){
        if(!banner){
          banner = document.createElement('div');
          banner.id='offline-banner';
          banner.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9000;background:rgba(200,70,70,.92);color:#fff;text-align:center;padding:8px 16px;font-size:.85rem;font-weight:500;letter-spacing:.01em;';
          banner.textContent='âš ï¸ Connexion perdue — modifications en attente de synchronisation';
          document.body.prepend(banner);
        }
      } else {
        if(banner) banner.remove();
      }
    });

    fbdb.ref('flow').on('value', snap=>{
      const remote = snap.val();
      if(!remote || !remote.users) return;
      db = remote; normalizeDB(); _lastSavedJSON = JSON.stringify(db); saveLocalDB();
      if(me && me.role !== 'client'){
        const nowFilled = db.documents.filter(d=>d.status==='filled');
        nowFilled.forEach(d=>{
          if(!prevFilledDocIds.has(d.id)){
            const client = db.users.find(u=>u.id===d.clientId);
            toast(`ðŸ“‹ ${client?client.username:'Client'} a rempli "${esc(d.name)}"`, 'info', 5000);
            sendBrowserNotif('Flow — Nouveau document', `${client?client.username:'Client'} a rempli "${d.name}"`);
            notifBadge++; updateNotifBadge();
          }
        });
        prevFilledDocIds = new Set(nowFilled.map(d=>d.id));
      }
      if(me){ me = db.users.find(u=>u.id===me.id)||me; clearTimeout(_refreshTimer); _refreshTimer=setTimeout(()=>{ if(me.role==='client') refreshClientTab(); else refreshAdminTab(); },180); }
    });
  }

  function logout(){
    me = null;
    sessionStorage.removeItem('flow_uid');
    activeTab = 'home';
    render();
  }
  function checkSession(){
    const id = sessionStorage.getItem('flow_uid');
    if(id){ me = db.users.find(u=>u.id===id)||null; }
  }

  // ─── Router / Top-level render ──────────────────
  function renderErrorBox(err){
    console.error(err);
    return `<div class="glass-card" style="padding:28px;max-width:620px;margin:40px auto;">
      <h1 style="font-size:1.35rem;margin-bottom:8px;color:var(--coral-soft);">Une erreur est survenue</h1>
      <p style="color:var(--ink-3);font-size:.9rem;margin-bottom:16px;">Flow a protégé l'affichage au lieu de laisser une page blanche.</p>
      <button class="btn btn-primary" onclick="location.reload()">Recharger</button>
    </div>`;
  }

  function render(){
    const app = document.getElementById('app');
    try{
      normalizeDB();
      if(!me){ app.innerHTML = renderLogin(); wireLogin(); return; }
      if(me.role==='client'){ app.innerHTML = renderClientShell(); wireClient(); }
      else { app.innerHTML = renderAdminShell(); wireAdmin(); }
    }catch(err){ app.innerHTML = renderErrorBox(err); }
  }

  // ════════════════════════════════════════════════
  //  LOGIN
  // ════════════════════════════════════════════════
  function renderLogin(errMsg=''){
    return `
    <div id="login-page">
      <div class="login-card fade-up">
        <div style="text-align:center;margin-bottom:32px;">
          <div class="logo" style="font-size:2rem;margin-bottom:6px;">flow</div>
          <p style="color:rgba(244,238,229,.45);font-size:.875rem;">Plateforme de gestion de projet</p>
        </div>
        ${errMsg?`<div style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:.85rem;color:#e08680;">${errMsg}</div>`:''}
        <div style="margin-bottom:14px;">
          <label class="label">Identifiant</label>
          <input id="li-user" class="glass-input" placeholder="Votre nom d'utilisateur" autocomplete="username" />
        </div>
        <div style="margin-bottom:22px;">
          <label class="label">Mot de passe</label>
          <input id="li-pass" class="glass-input" type="password" placeholder="••••••••" autocomplete="current-password" />
        </div>
        <button id="li-btn" class="btn btn-primary" style="width:100%;justify-content:center;">Se connecter</button>
        <div style="display:flex;align-items:center;gap:12px;margin-top:18px;">
          <div style="flex:1;height:1px;background:var(--glass-edge);"></div>
          <span style="font-size:.78rem;color:var(--ink-4);">ou</span>
          <div style="flex:1;height:1px;background:var(--glass-edge);"></div>
        </div>
        <button id="li-register" class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:12px;">Créer un compte</button>
      </div>
    </div>`;
  }

  function openRegisterModal(){
    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
        <h2 style="font-size:1.1rem;font-weight:700;">Créer un compte</h2>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <p style="font-size:.82rem;color:var(--ink-3);margin-bottom:18px;">Votre demande sera examinée par un administrateur avant activation.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div><label class="label">Prénom</label><input id="reg-fn" class="glass-input" placeholder="Prénom" /></div>
        <div><label class="label">Nom</label><input id="reg-ln" class="glass-input" placeholder="Nom" /></div>
      </div>
      <div style="margin-bottom:14px;"><label class="label">Nom d'utilisateur *</label><input id="reg-un" class="glass-input" placeholder="Ex : jean.dupont" /></div>
      <div style="margin-bottom:14px;"><label class="label">Email</label><input id="reg-em" class="glass-input" type="email" placeholder="votre@email.com" /></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
        <div><label class="label">Mot de passe *</label><input id="reg-pw" class="glass-input" type="password" placeholder="••••••••" /></div>
        <div><label class="label">Confirmer *</label><input id="reg-pw2" class="glass-input" type="password" placeholder="••••••••" /></div>
      </div>
      <div id="reg-msg" style="display:none;margin-bottom:14px;padding:10px 14px;border-radius:8px;font-size:.85rem;"></div>
      <div style="display:flex;gap:10px;">
        <button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Annuler</button>
        <button id="reg-submit" class="btn btn-primary" style="flex:1;justify-content:center;">Envoyer la demande</button>
      </div>`,
    ()=>{
      document.getElementById('reg-submit').addEventListener('click', async ()=>{
        const fn  = document.getElementById('reg-fn').value.trim();
        const ln  = document.getElementById('reg-ln').value.trim();
        const un  = document.getElementById('reg-un').value.trim();
        const em  = document.getElementById('reg-em').value.trim();
        const pw  = document.getElementById('reg-pw').value;
        const pw2 = document.getElementById('reg-pw2').value;
        const msg = document.getElementById('reg-msg');

        if(!un || !pw){ showMsg(msg,'Le pseudo et le mot de passe sont requis.','error'); return; }
        if(pw !== pw2){ showMsg(msg,'Les mots de passe ne correspondent pas.','error'); return; }
        if(pw.length < 6){ showMsg(msg,'Le mot de passe doit faire au moins 6 caractères.','error'); return; }

        // Check blocked
        const blocked = (db.blockedAccounts||[]).some(b=>
          b.username.toLowerCase()===un.toLowerCase() ||
          (em && b.email && b.email.toLowerCase()===em.toLowerCase())
        );
        if(blocked){ showMsg(msg,'Ce compte a été bloqué. Contactez un administrateur.','error'); return; }

        // Check duplicate
        if(db.users.some(u=>u.username.toLowerCase()===un.toLowerCase())){
          showMsg(msg,'Ce nom d\'utilisateur est déjÃ  utilisé.','error'); return;
        }
        if((db.pendingUsers||[]).some(u=>u.username.toLowerCase()===un.toLowerCase())){
          showMsg(msg,'Une demande avec ce pseudo est déjÃ  en attente.','error'); return;
        }

        const btn = document.getElementById('reg-submit');
        btn.disabled = true; btn.textContent = '…';
        const hashed = await hashPwd(pw);
        if(!db.pendingUsers) db.pendingUsers = [];
        db.pendingUsers.push({
          id: uid(),
          username: un,
          firstName: fn,
          lastName: ln,
          email: em,
          password: hashed,
          requestedAt: new Date().toISOString()
        });
        saveDB();
        showMsg(msg,'Demande envoyée ! Un administrateur examinera votre compte.','success');
        btn.textContent = 'Demande envoyée ✓';
        setTimeout(closeModal, 2200);
      });
    });
  }

  function wireLogin(){
    const regBtn = document.getElementById('li-register');
    if(regBtn) regBtn.addEventListener('click', openRegisterModal);
    const doLogin = async ()=>{
      const u = document.getElementById('li-user').value.trim();
      const p = document.getElementById('li-pass').value;
      if(!u||!p) return;
      const btn = document.getElementById('li-btn');
      btn.disabled = true; btn.textContent = '…';

      // F2 — Login attempt limit
      const attempts = parseInt(localStorage.getItem('flow_attempts')||'0');
      const lockUntil = parseInt(localStorage.getItem('flow_lock')||'0');
      if(Date.now() < lockUntil){
        const remaining = Math.ceil((lockUntil-Date.now())/60000);
        document.getElementById('app').innerHTML = renderLogin(`Trop de tentatives. Réessayez dans ${remaining} min.`);
        wireLogin(); return;
      }

      const known = db.users.some(x=>x.username.toLowerCase()===u.toLowerCase());
      if(!known){
        const newAttempts = attempts+1;
        localStorage.setItem('flow_attempts', newAttempts);
        if(newAttempts>=5){ localStorage.setItem('flow_lock', Date.now()+5*60*1000); }
        document.getElementById('app').innerHTML = renderLogin('Accès refusé : Ceci est un site privé.');
        wireLogin(); return;
      }
      const ok = await loginAsync(u,p);
      if(!ok){
        const newAttempts = attempts+1;
        localStorage.setItem('flow_attempts', newAttempts);
        if(newAttempts>=5){ localStorage.setItem('flow_lock', Date.now()+5*60*1000); }
        document.getElementById('app').innerHTML = renderLogin('Mot de passe incorrect. Veuillez réessayer.');
        wireLogin(); return;
      }
      localStorage.removeItem('flow_attempts'); localStorage.removeItem('flow_lock');
      render();
    };
    document.getElementById('li-btn').addEventListener('click',doLogin);
    document.getElementById('li-pass').addEventListener('keydown',e=>{ if(e.key==='Enter') doLogin(); });
    document.getElementById('li-user').addEventListener('keydown',e=>{ if(e.key==='Enter') document.getElementById('li-pass').focus(); });
  }

  // ════════════════════════════════════════════════
  //  ADMIN / CONTROLLER SHELL
  // ════════════════════════════════════════════════
  const adminTabs = [
    { id:'home',           icon:iconHome(),      label:'Accueil'           },
    { id:'users',          icon:iconUsers(),     label:'Utilisateurs'      },
    { id:'documents',      icon:iconDocs(),      label:'Suivi & Docs'      },
    { id:'finance',        icon:iconFinance(),   label:'Finance'           },
    { id:'requests',       icon:iconRequests(),  label:'Demandes'          },
    { id:'history',        icon:iconHistory(),   label:'Historique'        },
    { id:'ai-automation',  icon:iconAI(),        label:'Automatisation IA', beta:true },
    { id:'ai-visual',      icon:iconEye(),       label:'Visuel',            beta:true },
    { id:'profile',        icon:iconProfile(),   label:'Profil'            }
  ];
  function canManageProjects(user=me){ return !!user && (user.role==='admin'||user.role==='controller'); }
  function canAccessFinance(user=me){ return !!user && (user.role==='admin'||user.role==='controller'); }
  function canReviewRequests(user=me){ return !!user && (user.role==='admin'||user.role==='controller'); }
  function canViewHistory(user=me){ return !!user && user.role==='admin'; }
  function canAccessAI(user=me){ return !!user && (user.role==='admin'||user.role==='controller'); }
  function getAdminVisibleTabs(){
    return adminTabs.filter(t=>
      (t.id!=='history'||canViewHistory()) &&
      (t.id!=='finance'||canAccessFinance()) &&
      (t.id!=='requests'||canReviewRequests()) &&
      (t.id!=='ai-automation'||canAccessAI()) &&
      (t.id!=='ai-visual'||canAccessAI())
    );
  }
  function getClientVisibleTabs(){
    const base = [
      { id:'home',      icon:iconHome(),    label:'Accueil'   },
      { id:'documents', icon:iconDocs(),    label:'Documents' },
      { id:'profile',   icon:iconProfile(), label:'Profil'    }
    ];
    if(me && me.hasDiscussion) base.splice(1,0,{ id:'discussion', icon:iconChat(), label:'Discussion', beta:true });
    return base;
  }

  function renderAdminShell(){
    return `
    <div id="sidebar" class="glass-dark">
      <div class="logo-wrap" style="margin-bottom:28px;padding:0 4px;">
        <div style="display:flex;align-items:baseline;gap:0;">
          <button onclick="showWhatsNew()" class="logo" style="background:none;border:none;cursor:pointer;padding:0;font-family:'Instrument Serif',serif;font-size:1.7rem;font-weight:400;letter-spacing:-.025em;color:var(--ink);">flow</button>
          <span style="font-size:.6rem;color:var(--ink-4);margin-left:6px;position:relative;top:-4px;">v${APP_VERSION}</span>
        </div>
        <p style="font-size:.72rem;color:rgba(244,238,229,.35);margin-top:2px;">Espace ${roleLabel(me.role)}</p>
      </div>
      ${(()=>{
        const pendingCount = (db.pendingUsers||[]).length;
        const myProject = getUserProject(me.id);
        const aiPendingCount = (db.aiRequests||[]).filter(r=>r.status==='pending_admin').length;
        return getAdminVisibleTabs().map(t=>`
        <button class="nav-item ${activeTab===t.id?'active':''}" data-tab="${t.id}" style="position:relative;">
          ${t.icon} <span>${t.label}</span>${t.beta?` <span style="font-size:.55rem;background:rgba(155,184,216,.15);color:var(--sky);border:1px solid rgba(155,184,216,.25);border-radius:999px;padding:1px 5px;letter-spacing:.06em;text-transform:uppercase;margin-left:4px;">BÊTA</span>`:''}
          ${t.id==='documents'?`<span id="notif-badge" style="display:${notifBadge>0?'inline-flex':'none'};align-items:center;justify-content:center;position:absolute;top:6px;right:8px;background:rgba(220,80,80,.9);border-radius:999px;font-size:.62rem;padding:1px 5px;color:#fff;min-width:16px;">${notifBadge>9?'9+':notifBadge}</span>`:''}
          ${t.id==='requests'&&pendingCount>0?`<span style="display:inline-flex;align-items:center;justify-content:center;position:absolute;top:6px;right:8px;background:rgba(155,184,216,.9);border-radius:999px;font-size:.62rem;padding:1px 5px;color:#0a0604;min-width:16px;">${pendingCount}</span>`:''}
          ${t.id==='ai-automation'&&aiPendingCount>0?`<span style="display:inline-flex;align-items:center;justify-content:center;position:absolute;top:6px;right:8px;background:rgba(217,119,87,.9);border-radius:999px;font-size:.62rem;padding:1px 5px;color:#fff;min-width:16px;">${aiPendingCount}</span>`:''}
        </button>`).join('') +
        (myProject ? `
        <div style="height:1px;background:rgba(255,255,255,.07);margin:10px 4px;"></div>
        <div style="font-size:.65rem;color:var(--ink-4);padding:0 12px 4px;letter-spacing:.06em;text-transform:uppercase;">Mon projet</div>
        <button class="nav-item ${activeTab==='myproject'?'active':''}" data-tab="myproject" style="position:relative;">
          ${iconProject()} <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px;">${esc(myProject.name)}</span>
        </button>` : '');
      })()}
      <div style="flex:1;"></div>
      <div style="padding:12px 8px 0;border-top:1px solid rgba(255,255,255,.07);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          ${avatar(me)}
          <div style="min-width:0;flex:1;">
            <div style="font-size:.85rem;font-weight:600;color:#f4eee5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(me.username)}</div>
            ${roleBadge(me.role)}
          </div>
        </div>
        <button id="btn-logout" class="btn btn-ghost" style="width:100%;justify-content:center;font-size:.8rem;">
          ${iconLogout()} Déconnexion
        </button>
      </div>
    </div>
    <div id="main"><div id="tab-content">${renderAdminTab()}</div></div>`;
  }

  function renderAdminTab(){
    if(activeTab==='home')           return renderAdminHome();
    if(activeTab==='users')          return renderAdminUsers();
    if(activeTab==='documents')      return renderAdminDocuments();
    if(activeTab==='history')        return renderAdminHistory();
    if(activeTab==='finance')        return renderAdminFinance();
    if(activeTab==='requests')       return renderAdminRequests();
    if(activeTab==='ai-automation')  return renderAdminAIAutomation();
    if(activeTab==='ai-visual')      return renderAdminAIVisual();
    if(activeTab==='myproject')      return renderAdminMyProject();
    if(activeTab==='profile')        return renderAdminProfile();
    return '';
  }

  function wireAdmin(){
    document.querySelectorAll('[data-tab]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        activeTab=btn.dataset.tab;
        if(activeTab==='documents'){ notifBadge=0; updateNotifBadge(); }
        refreshAdminTab();
      });
    });
    document.getElementById('btn-logout').addEventListener('click',logout);
    wireAdminTabContent();
  }

  function refreshAdminTab(){
    try{
      normalizeDB();
      document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===activeTab));
      const c=document.getElementById('tab-content');
      c.innerHTML=renderAdminTab();
      c.classList.remove('fade-up'); void c.offsetWidth; c.classList.add('fade-up');
      wireAdminTabContent();
    }catch(err){ const c=document.getElementById('tab-content'); if(c) c.innerHTML=renderErrorBox(err); }
  }

  function wireAdminTabContent(){
    if(activeTab==='home')          wireAdminHome();
    if(activeTab==='users')         wireAdminUsers();
    if(activeTab==='documents')     wireAdminDocuments();
    if(activeTab==='history')       wireAdminHistory();
    if(activeTab==='finance')       wireAdminFinance();
    if(activeTab==='requests')      wireAdminRequests();
    if(activeTab==='ai-automation') wireAdminAIAutomation();
    if(activeTab==='ai-visual')     wireAdminAIVisual();
    if(activeTab==='myproject'){ document.querySelectorAll('.btn-download-delivery').forEach(btn=>{ btn.addEventListener('click',()=>downloadDelivery(btn.dataset.pid)); }); }
    if(activeTab==='profile')       wireAdminProfile();
    renderMobileTabbar('admin');
  }

  function renderMobileTabbar(shell){
    const bar = document.getElementById('mobile-tabbar');
    if(!bar) return;
    const tabs = shell==='admin' ? getAdminVisibleTabs().concat(getUserProject(me?.id)?[{id:'myproject',icon:iconProject(),label:'Mon projet'}]:[]) : getClientVisibleTabs();
    const hasNewVersion = localStorage.getItem('flow_seen_version') !== APP_VERSION;
    bar.innerHTML = tabs.map((t,idx)=>`
      <button class="mob-tab ${activeTab===t.id?'active':''}" data-mob-tab="${t.id}">
        ${t.icon}<span>${t.label}</span>
        ${t.id==='documents'&&shell==='admin'?`<span id="mob-notif-badge" class="mob-tab-badge" style="display:${notifBadge>0?'inline':'none'};">${notifBadge>9?'9+':notifBadge}</span>`:''}
        ${idx===0&&hasNewVersion?`<span class="mob-new-dot" id="mob-version-dot"></span>`:''}
      </button>`).join('');
    bar.querySelectorAll('[data-mob-tab]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        activeTab=btn.dataset.mobTab;
        if(activeTab==='documents'){ notifBadge=0; updateNotifBadge(); }
        if(shell==='admin') refreshAdminTab(); else refreshClientTab();
      });
    });
  }

  // ─── Tab: Admin Home ────────────────────────────
  function renderAdminHome(){
    const today = new Date(); today.setHours(0,0,0,0);

    // F6 — Upcoming deadlines (30 days)
    const nowMs = Date.now();
    const in30 = new Date(); in30.setDate(in30.getDate()+30);
    const upcomingProjects = db.projects
      .filter(p=>!p.archived && p.dueDate && p.status!=='done')
      .map(p=>({...p, dueMs:new Date(p.dueDate).getTime()}))
      .filter(p=>p.dueMs >= nowMs && p.dueMs <= in30.getTime())
      .sort((a,b)=>a.dueMs-b.dueMs);

    // F13 — Archived projects section
    const archivedProjects = db.projects.filter(p=>p.archived);

    const clients = db.users.filter(u=>u.role==='client'||u.role==='controller');
    const PRIO_ORDER = {urgent:0,normal:1,low:2};
    const pending = clients.filter(u=>{ const p=getUserProject(u.id); return p && p.status!=='done'; })
      .sort((a,b)=>{ const pa=getUserProject(a.id); const pb=getUserProject(b.id); return (pb?.pinned?1:0)-(pa?.pinned?1:0) || (PRIO_ORDER[pa?.priority||'normal']||1)-(PRIO_ORDER[pb?.priority||'normal']||1); });
    const done    = clients.filter(u=>{ const p=getUserProject(u.id); return p && p.status==='done'; });

    const clientsWithProject = clients.filter(u=>getUserProject(u.id));
    const projetsEnCours = db.projects.filter(p=>p.status==='in_progress').length;
    const docsEnAttente = db.documents.filter(d=>d.status==='pending'||d.status==='filled').length;
    const projectsWithTl = db.projects.filter(p=>p.timeline&&p.timeline.length>0);
    const avgCompletion = projectsWithTl.length===0 ? 0 :
      Math.round(projectsWithTl.reduce((sum,p)=>{ const d=p.timeline.filter(s=>s.status==='done').length; return sum+(d/p.timeline.length*100); },0)/projectsWithTl.length);
    const overdueCount = db.projects.filter(p=>p.dueDate && p.status!=='done' && new Date(p.dueDate)<today).length;

    const kpiCards = [
      { label:'Clients actifs',   value:clientsWithProject.length, color:'var(--coral)',  icon:'ðŸ‘¥', sub:`sur ${clients.length} total` },
      { label:'Projets en cours', value:projetsEnCours,            color:'var(--sky)',    icon:'⚙ï¸', sub:`${db.projects.filter(p=>p.status==='done').length} terminé(s)` },
      { label:'Docs en attente',  value:docsEnAttente,             color:'var(--peach)',  icon:'ðŸ“‹', sub:`${db.documents.filter(d=>d.status==='reviewed').length} validé(s)` },
      { label:'Complétion moy.',  value:avgCompletion+'%',         color:'var(--sage)',   icon:'ðŸ“Š', sub:`sur ${projectsWithTl.length} projet(s)` }
    ];

    const recentDocs = [...db.documents].sort((a,b)=>((b.filledAt||b.sentAt||'').localeCompare(a.filledAt||a.sentAt||''))).slice(0,5);

    return `<div class="fade-up">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:12px;">
        <h1 style="font-size:1.4rem;font-weight:700;">Tableau de bord</h1>
        <div style="display:flex;gap:8px;">
          <button id="btn-view-toggle" class="btn btn-ghost btn-sm" title="Vue Kanban">${window._adminView==='kanban'?'â˜° Liste':'⬛ Kanban'}</button>
          ${canManageProjects(me)?`<button id="btn-new-project" class="btn btn-primary">${iconPlus()} Nouveau projet</button>`:''}
        </div>
      </div>
      <p style="color:rgba(244,238,229,.45);font-size:.875rem;margin-bottom:28px;">Bonjour ${esc(me.username)}, bienvenue sur Flow.</p>

      <div class="kpi-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:${overdueCount>0?'14':'32'}px;">
        ${kpiCards.map(s=>`
          <div class="glass-card stat-card" style="border-color:rgba(255,255,255,.08);position:relative;overflow:hidden;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
              <span style="font-size:1.6rem;">${s.icon}</span>
            </div>
            <div style="font-size:2rem;font-weight:700;color:${s.color};line-height:1;">${s.value}</div>
            <div style="font-size:.82rem;font-weight:600;color:var(--ink-2);margin-top:5px;">${s.label}</div>
            <div style="font-size:.72rem;color:var(--ink-4);margin-top:2px;">${s.sub}</div>
          </div>`).join('')}
      </div>
      ${overdueCount>0?`
      <div style="background:rgba(220,80,80,.1);border:1px solid rgba(220,80,80,.25);border-radius:14px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:1.4rem;">âš ï¸</span>
        <div><div style="font-size:.9rem;font-weight:600;color:#f08a8a;">${overdueCount} projet(s) en retard</div><div style="font-size:.75rem;color:rgba(244,238,229,.5);">Date de livraison dépassée</div></div>
      </div>`:''}

      ${(()=>{
        // F5 — Project status chart
        const statuses = [
          {label:'En cours',  count:db.projects.filter(p=>!p.archived&&p.status==='in_progress').length, color:'#d97757'},
          {label:'Terminés',  count:db.projects.filter(p=>!p.archived&&p.status==='done').length,        color:'#93b594'},
          {label:'En attente',count:db.projects.filter(p=>!p.archived&&p.status==='pending').length,     color:'#9bb8d8'},
        ];
        const maxCount = Math.max(...statuses.map(s=>s.count), 1);
        return `<div class="glass-card" style="padding:20px;margin-bottom:24px;">
          <h2 style="font-size:1rem;font-weight:600;margin-bottom:16px;color:var(--coral-soft);">Répartition des projets</h2>
          ${statuses.map(s=>`
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
              <span style="font-size:.82rem;width:80px;color:var(--ink-2);">${s.label}</span>
              <div style="flex:1;height:10px;background:rgba(255,255,255,.06);border-radius:6px;overflow:hidden;">
                <div style="height:100%;width:${Math.round(s.count/maxCount*100)}%;background:${s.color};border-radius:6px;transition:width .4s;"></div>
              </div>
              <span style="font-size:.85rem;font-weight:600;color:${s.color};min-width:20px;text-align:right;">${s.count}</span>
            </div>`).join('')}
        </div>`;
      })()}

      ${window._adminView==='kanban' ? (()=>{
        const allProjects = db.projects.filter(p=>!p.archived);
        const cols = [
          {id:'pending',    label:'En attente',  color:'var(--sky)',   ps: allProjects.filter(p=>p.status==='pending')},
          {id:'in_progress',label:'En cours',    color:'var(--coral)', ps: allProjects.filter(p=>p.status==='in_progress')},
          {id:'done',       label:'Terminé',     color:'var(--sage)',  ps: allProjects.filter(p=>p.status==='done')},
        ];
        return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;" id="kanban-board">
          ${cols.map(col=>`
            <div class="glass-card" style="padding:16px;" data-status="${col.id}">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <h2 style="font-size:.9rem;font-weight:600;color:${col.color};">${col.label}</h2>
                <span style="font-size:.75rem;color:var(--ink-4);background:rgba(255,255,255,.07);padding:2px 8px;border-radius:999px;">${col.ps.length}</span>
              </div>
              <div class="kanban-col" data-status="${col.id}" style="min-height:80px;">
                ${col.ps.map(p=>{
                  const client = db.users.find(u=>u.id===p.clientId);
                  const done2 = p.timeline.filter(s=>s.status==='done').length;
                  const pct = p.timeline.length>0?Math.round(done2/p.timeline.length*100):0;
                  return `<div class="kanban-card glass-card" draggable="true" data-pid="${p.id}" style="padding:12px;margin-bottom:8px;cursor:grab;user-select:none;">
                    <div style="font-size:.85rem;font-weight:600;margin-bottom:4px;">${esc(p.name)}</div>
                    ${client?`<div style="font-size:.72rem;color:var(--ink-4);margin-bottom:6px;">ðŸ‘¤ ${esc(client.username)}</div>`:''}
                    <div style="height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:var(--coral);border-radius:2px;"></div></div>
                    <div style="font-size:.68rem;color:var(--ink-4);margin-top:4px;">${pct}% complété</div>
                  </div>`;
                }).join('')}
              </div>
            </div>`).join('')}
        </div>`;
      })() : `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
        <div class="glass-card" style="padding:20px;">
          <h2 style="font-size:1rem;font-weight:600;margin-bottom:16px;color:#9bb8d8;">Projets en cours</h2>
          ${pending.length===0
            ? `<div class="empty-state" style="padding:20px;">Aucun projet en cours</div>`
            : pending.map(u=>{ const p=getUserProject(u.id); return renderClientRow(u,p); }).join('')}
        </div>
        <div class="glass-card" style="padding:20px;">
          <h2 style="font-size:1rem;font-weight:600;margin-bottom:16px;color:#93b594;">Projets terminés</h2>
          ${done.length===0
            ? `<div class="empty-state" style="padding:20px;">Aucun projet terminé</div>`
            : done.map(u=>{ const p=getUserProject(u.id); return renderClientRow(u,p); }).join('')}
        </div>
      </div>`}

      <div class="glass-card" style="padding:20px;margin-bottom:24px;">
        <h2 style="font-size:1rem;font-weight:600;margin-bottom:14px;color:#9bb8d8;">Ã‰chéances — 30 prochains jours</h2>
        ${upcomingProjects.length===0
          ? '<div style="color:rgba(244,238,229,.35);font-size:.85rem;">Aucune échéance Ã  venir.</div>'
          : upcomingProjects.map(p=>{
              const diffDays = Math.ceil((p.dueMs-nowMs)/(1000*60*60*24));
              const client = db.users.find(u=>u.id===p.clientId);
              const urgColor = diffDays<=3?'#f08a8a':diffDays<=7?'var(--peach)':'var(--sage)';
              return `<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06);">
                <span style="font-size:1rem;">📅</span>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:.875rem;font-weight:500;">${esc(p.name)}</div>
                  <div style="font-size:.72rem;color:rgba(244,238,229,.4);">${client?esc(client.username):'Sans client'}</div>
                </div>
                <span style="font-size:.8rem;font-weight:600;color:${urgColor};">J-${diffDays}</span>
              </div>`;
            }).join('')}
      </div>

      <div class="glass-card" style="padding:20px;">
        <h2 style="font-size:1rem;font-weight:600;margin-bottom:16px;color:var(--coral-soft);">Activité récente</h2>
        ${recentDocs.length===0
          ? `<div class="empty-state" style="padding:12px;">Aucune activité.</div>`
          : recentDocs.map(d=>{
              const client = db.users.find(u=>u.id===d.clientId)||null;
              const statusColor = {pending:'rgba(217,119,87,.8)',filled:'rgba(147,181,148,.8)',reviewed:'rgba(155,184,216,.8)'}[d.status]||'#888';
              const statusLabel = {pending:'En attente',filled:'Rempli',reviewed:'Validé'}[d.status]||d.status;
              return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);">
                <span style="font-size:1.2rem;">📄</span>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:.875rem;font-weight:500;">${esc(d.name)}</div>
                  <div style="font-size:.75rem;color:rgba(244,238,229,.4);">${client?esc(client.username):'—'} · ${esc(d.filledAt||d.sentAt||'—')}</div>
                </div>
                <span style="font-size:.75rem;font-weight:600;color:${statusColor};">${statusLabel}</span>
              </div>`;
            }).join('')}
      </div>

      ${(()=>{
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month+1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const monthName = now.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
        const projectsByDay = {};
        db.projects.filter(p=>!p.archived&&p.dueDate).forEach(p=>{
          const d = new Date(p.dueDate);
          if(d.getFullYear()===year && d.getMonth()===month){
            const day = d.getDate();
            if(!projectsByDay[day]) projectsByDay[day]=[];
            projectsByDay[day].push(p);
          }
        });
        const hasDates = Object.keys(projectsByDay).length>0;
        if(!hasDates) return '';
        const startOffset = (firstDay+6)%7;
        let cells = '';
        for(let i=0;i<startOffset;i++) cells+=`<div></div>`;
        for(let d=1;d<=daysInMonth;d++){
          const isToday = d===now.getDate();
          const projs = projectsByDay[d]||[];
          cells+=`<div style="min-height:44px;padding:4px;border-radius:8px;background:${isToday?'rgba(217,119,87,.12)':projs.length?'rgba(155,184,216,.07)':'transparent'};border:1px solid ${isToday?'rgba(217,119,87,.3)':projs.length?'rgba(155,184,216,.2)':'transparent'};">
            <div style="font-size:.72rem;font-weight:${isToday?'700':'400'};color:${isToday?'var(--coral)':'var(--ink-3)'};">${d}</div>
            ${projs.map(p=>`<div style="font-size:.62rem;background:rgba(217,119,87,.2);color:var(--coral-soft);padding:1px 4px;border-radius:3px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(p.name)}">${esc(p.name)}</div>`).join('')}
          </div>`;
        }
        return `<div class="glass-card" style="padding:20px;margin-bottom:24px;">
          <h2 style="font-size:1rem;font-weight:600;margin-bottom:14px;color:var(--plum);">📅 Calendrier — ${monthName}</h2>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px;">
            ${['L','M','M','J','V','S','D'].map(d=>`<div style="font-size:.7rem;color:var(--ink-4);text-align:center;font-weight:600;">${d}</div>`).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">${cells}</div>
        </div>`;
      })()}

      ${archivedProjects.length>0?`
      <div class="glass-card" style="padding:20px;margin-top:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          <h2 style="font-size:1rem;font-weight:600;color:rgba(244,238,229,.4);">ðŸ—„ï¸ Archives (${archivedProjects.length})</h2>
          <span style="color:rgba(244,238,229,.3);font-size:.8rem;">Cliquer pour afficher â–¾</span>
        </div>
        <div style="display:none;margin-top:12px;">
          ${archivedProjects.map(p=>`
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);">
              <span style="font-size:.875rem;flex:1;color:rgba(244,238,229,.5);">${esc(p.name)}</span>
              <button class="btn btn-ghost btn-sm btn-unarchive" data-pid="${p.id}">â†©ï¸ Restaurer</button>
              <button class="btn btn-danger btn-sm btn-del-archived" data-pid="${p.id}">ðŸ—‘</button>
            </div>`).join('')}
        </div>
      </div>`:''}
    </div>`;
  }

  function renderClientRow(u, project){
    const tl = project&&project.timeline ? project.timeline : [];
    const doneCnt = tl.filter(s=>s.status==='done').length;
    const pct = tl.length>0 ? Math.round(doneCnt/tl.length*100) : 0;
    let dueBadge = '';
    if(project&&project.dueDate){
      const today=new Date(); today.setHours(0,0,0,0);
      const due=new Date(project.dueDate);
      const diffDays=Math.ceil((due-today)/(1000*60*60*24));
      if(diffDays<0) dueBadge=`<span style="font-size:.7rem;background:rgba(220,80,80,.18);border:1px solid rgba(220,80,80,.3);color:#f08a8a;padding:2px 8px;border-radius:8px;">En retard</span>`;
      else if(diffDays<=7) dueBadge=`<span style="font-size:.7rem;background:rgba(240,169,136,.18);border:1px solid rgba(240,169,136,.3);color:var(--peach);padding:2px 8px;border-radius:8px;">J-${diffDays}</span>`;
    }
    const prioBadge = {urgent:`<span class="role-chip prio-urgent" style="font-size:.68rem;padding:2px 8px;">🔴 Urgent</span>`,normal:'',low:`<span class="role-chip prio-low" style="font-size:.68rem;padding:2px 8px;">⚪ Basse</span>`}[project?.priority||'normal']||'';
    const colorStyle = project&&project.color ? `border-left:3px solid ${project.color};padding-left:14px;` : '';
    return `<div class="glass-card" style="padding:14px;margin-bottom:10px;${colorStyle}">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:${tl.length>0?'10':'0'}px;">
        ${avatar(u)}
        <div style="flex:1;min-width:0;">
          <div style="font-size:.875rem;font-weight:600;">${project?.pinned?'ðŸ“Œ ':''}${esc(u.username)}</div>
          <div style="font-size:.78rem;color:rgba(244,238,229,.45);">${project?esc(project.name):'Aucun projet'}</div>
          ${project&&project.tags&&project.tags.length?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;">${project.tags.map(tag=>`<span style="font-size:.68rem;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:var(--ink-3);">${esc(tag)}</span>`).join('')}</div>`:''}
          ${prioBadge}
        </div>
        ${dueBadge}
        ${project&&project.websiteUrl?`<a href="${esc(project.websiteUrl)}" target="_blank" class="btn btn-ghost btn-sm">ðŸ”— Site</a>`:''}
      </div>
      ${tl.length>0?`
        <div style="display:flex;align-items:center;gap:8px;">
          ${svgProgressCircle(pct,'#d97757',52)}
        </div>`:''}
    </div>`;
  }

  function wireAdminHome(){
    const btnViewToggle = document.getElementById('btn-view-toggle');
    if(btnViewToggle) btnViewToggle.addEventListener('click',()=>{
      window._adminView = window._adminView==='kanban' ? 'list' : 'kanban';
      refreshAdminTab();
    });
    // Kanban drag & drop
    document.querySelectorAll('.kanban-card').forEach(card=>{
      card.addEventListener('dragstart',e=>{ e.dataTransfer.setData('pid',card.dataset.pid); card.style.opacity='.4'; });
      card.addEventListener('dragend',()=>{ card.style.opacity=''; });
    });
    document.querySelectorAll('.kanban-col').forEach(col=>{
      col.addEventListener('dragover',e=>{ e.preventDefault(); col.style.background='rgba(255,255,255,.05)'; });
      col.addEventListener('dragleave',()=>{ col.style.background=''; });
      col.addEventListener('drop',e=>{
        e.preventDefault(); col.style.background='';
        const pid = e.dataTransfer.getData('pid');
        const p = db.projects.find(x=>x.id===pid);
        if(!p) return;
        const newStatus = col.dataset.status;
        p.status = newStatus;
        if(newStatus==='done') launchConfetti();
        logActivity('project_status','Projet "'+p.name+'" â†’ '+newStatus);
        saveDB(); toast('Statut mis Ã  jour.','success'); refreshAdminTab();
      });
    });

    const btnNew = document.getElementById('btn-new-project');
    if(btnNew) btnNew.addEventListener('click',openCreateProjectModal);

    // F13 — Unarchive / delete archived
    document.querySelectorAll('.btn-unarchive').forEach(b=>{
      b.addEventListener('click',()=>{
        const p=db.projects.find(x=>x.id===b.dataset.pid);
        if(!p) return;
        p.archived=false;
        logActivity('project_unarchived','Projet restauré : '+p.name);
        saveDB(); toast('Projet restauré !','success'); refreshAdminTab();
      });
    });
    document.querySelectorAll('.btn-del-archived').forEach(b=>{
      b.addEventListener('click',()=>{
        const p=db.projects.find(x=>x.id===b.dataset.pid);
        if(!p) return;
        if(!confirm('Supprimer définitivement "'+p.name+'" ?')) return;
        logActivity('project_deleted','Projet archivé supprimé : '+p.name);
        db.projects=db.projects.filter(x=>x.id!==b.dataset.pid);
        db.documents=db.documents.filter(d=>d.projectId!==b.dataset.pid);
        saveDB(); toast('Projet supprimé.','info'); refreshAdminTab();
      });
    });
  }

  function openCreateProjectModal(){
    const clients = db.users.filter(u=>u.role==='client'||u.role==='controller');
    const defaultSteps = ['Prise de contact','Cahier des charges','Maquette validée','Développement','Tests & Recette','Mise en ligne'];
    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
        <h2 style="font-size:1.1rem;font-weight:700;">Nouveau projet</h2>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <div style="margin-bottom:14px;"><label class="label">Nom du projet *</label><input id="np-name" class="glass-input" placeholder="Ex : Site Vitrine Dupont" /></div>
      <div style="margin-bottom:14px;">
        <label class="label">Utilisateur associé</label>
        <select id="np-client" class="glass-input">
          <option value="">— Aucun pour l'instant —</option>
          ${clients.map(c=>`<option value="${c.id}">${esc(c.username)} (${c.role==='controller'?'Contrôleur':'Client'})</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div>
          <label class="label">Priorité</label>
          <select id="np-priority" class="glass-input">
            <option value="urgent">🔴 Urgent</option>
            <option value="normal" selected>🔵 Normal</option>
            <option value="low">⚪ Basse</option>
          </select>
        </div>
        <div>
          <label class="label">Date de livraison</label>
          <input id="np-due" class="glass-input" type="date" />
        </div>
      </div>
      <button id="np-toggle-adv" class="btn btn-ghost btn-sm" style="margin-bottom:14px;width:100%;justify-content:center;">⚙ï¸ Options avancées</button>
      <div id="np-advanced" style="display:none;">
        <div style="margin-bottom:14px;"><label class="label">Description</label><textarea id="np-desc" class="glass-input" placeholder="Décrivez brièvement le projet…"></textarea></div>
        <div style="margin-bottom:14px;"><label class="label">URL du site</label><input id="np-url" class="glass-input" placeholder="https://..." /></div>
        <div style="margin-bottom:14px;">
          <label class="label">Tags (séparés par des virgules)</label>
          <input id="np-tags" class="glass-input" placeholder="Ex : urgent, VIP, e-commerce" />
        </div>
        <div style="margin-bottom:14px;">
          <label class="label">Couleur du projet</label>
          <div id="np-colors" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
            ${['#d97757','#93b594','#9bb8d8','#c4a3d4','#f0c080','#e07080','#70b8b8','#b0b0b0'].map(c=>`
              <div class="color-dot" data-color="${c}" style="background:${c};" title="${c}"></div>`).join('')}
          </div>
          <input type="hidden" id="np-color" value="" />
        </div>
        <div style="margin-bottom:14px;">
          <label class="label">Modèle de timeline</label>
          <select id="np-template" class="glass-input">
            <option value="">— Personnalisé (par défaut) —</option>
            <option value="vitrine">ðŸŒ Site vitrine</option>
            <option value="app">📱 Application mobile</option>
            <option value="branding">ðŸŽ¨ Identité visuelle</option>
            <option value="empty">📄 Vide (aucune étape)</option>
          </select>
        </div>
        <div style="margin-bottom:8px;"><label class="label">Ã‰tapes de la timeline</label></div>
        <div id="np-steps">
          ${defaultSteps.map(s=>`<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;"><input class="glass-input np-step-label" value="${s}" style="flex:1;" /><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">ðŸ—‘</button></div>`).join('')}
        </div>
        <button id="np-add-step" class="btn btn-ghost btn-sm" style="margin-bottom:16px;">+ Ã‰tape</button>
      </div>
      <div id="np-msg" style="display:none;margin-bottom:14px;padding:10px 14px;border-radius:8px;font-size:.85rem;"></div>
      <div style="display:flex;gap:10px;">
        <button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Annuler</button>
        <button id="np-save" class="btn btn-primary" style="flex:1;justify-content:center;">Créer</button>
      </div>`,
    ()=>{
      // Toggle advanced section
      const advBtn = document.getElementById('np-toggle-adv');
      const advSection = document.getElementById('np-advanced');
      if(advBtn && advSection) advBtn.addEventListener('click',()=>{
        const open = advSection.style.display==='block';
        advSection.style.display = open ? 'none' : 'block';
        advBtn.textContent = open ? '⚙ï¸ Options avancées' : '🔼 Masquer les options';
      });

      // F10 — Template selector
      const tplSelect = document.getElementById('np-template');
      const NP_TEMPLATES = {
        vitrine: ['Prise de contact','Cahier des charges','Maquette validée','Développement','Tests & Recette','Mise en ligne'],
        app: ['Discovery','Wireframes','Design UI','Dev Frontend','Dev Backend','QA','Déploiement'],
        branding: ['Brief créatif','Exploration','Maquettes','Validation','Livrables finaux'],
        empty: []
      };
      if(tplSelect) tplSelect.addEventListener('change',()=>{
        const steps = NP_TEMPLATES[tplSelect.value];
        if(steps===undefined) return;
        document.getElementById('np-steps').innerHTML = steps.map(s=>`
          <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
            <input class="glass-input np-step-label" value="${s}" style="flex:1;" />
            <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">ðŸ—‘</button>
          </div>`).join('');
      });

      // F11 — Color picker dots
      document.querySelectorAll('#np-colors .color-dot').forEach(dot=>{
        dot.addEventListener('click',()=>{
          document.querySelectorAll('#np-colors .color-dot').forEach(d=>d.classList.remove('selected'));
          dot.classList.add('selected');
          document.getElementById('np-color').value = dot.dataset.color;
        });
      });

      document.getElementById('np-add-step').addEventListener('click',()=>{
        const container = document.getElementById('np-steps');
        const row = document.createElement('div');
        row.style.cssText='display:flex;gap:8px;margin-bottom:8px;align-items:center;';
        row.innerHTML=`<input class="glass-input np-step-label" placeholder="Nouvelle étape" style="flex:1;" /><button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">ðŸ—‘</button>`;
        container.appendChild(row);
      });
      document.getElementById('np-save').addEventListener('click',()=>{
        const name=document.getElementById('np-name').value.trim();
        const clientId=document.getElementById('np-client').value||null;
        const desc=document.getElementById('np-desc').value.trim();
        const url=document.getElementById('np-url').value.trim();
        const due=document.getElementById('np-due').value||null;
        const color=document.getElementById('np-color').value||'';
        const tags=document.getElementById('np-tags')?.value.split(',').map(t=>t.trim()).filter(Boolean)||[];
        const msg=document.getElementById('np-msg');
        if(!name){ showMsg(msg,'Le nom du projet est requis.','error'); return; }
        const steps=[];
        document.querySelectorAll('#np-steps .np-step-label').forEach(inp=>{ const label=inp.value.trim(); if(label) steps.push({id:uid(),label,status:'pending',date:null,note:''}); });
        if(steps.length===0){ showMsg(msg,'Ajoutez au moins une étape.','error'); return; }
        if(clientId) db.projects.forEach(p=>{ if(p.clientId===clientId) p.clientId=null; });
        const priority = document.getElementById('np-priority')?.value||'normal';
        db.projects.push({id:uid(),name,clientId,description:desc||'',websiteUrl:url||'',dueDate:due||'',status:'in_progress',color,tags,createdAt:new Date().toISOString().slice(0,10),timeline:steps,priority,pinned:false,internalTasks:[]});
        logActivity('project_created', 'Projet créé : ' + name);
        saveDB(); toast('Projet créé !','success'); closeModal(); refreshAdminTab();
      });
    });
  }

  // ─── Tab: Admin Users ───────────────────────────
  function renderAdminUsers(){
    const isAdmin = me.role==='admin';
    const users = db.users;
    return `<div class="fade-up">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 style="font-size:1.4rem;font-weight:700;">Utilisateurs</h1>
          <p style="color:rgba(244,238,229,.45);font-size:.875rem;">${users.length} compte${users.length>1?'s':''} enregistré${users.length>1?'s':''}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${isAdmin||me.role==='controller'
            ? `<button id="btn-export-csv" class="btn btn-ghost btn-sm">ðŸ“Š Exporter CSV</button>
               <button id="btn-new-user" class="btn btn-primary">${iconPlus()} Nouveau compte</button>`
            : ''}
        </div>
      </div>

      <div style="margin-bottom:10px;">
        <input id="user-search" class="glass-input" placeholder="🔍 Rechercher un utilisateur…" style="max-width:360px;" />
      </div>
      <div id="role-filters" style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        <button class="role-chip active" data-role="">Tous</button>
        <button class="role-chip" data-role="admin">Admin</button>
        <button class="role-chip" data-role="controller">Contrôleur</button>
        <button class="role-chip" data-role="client">Client</button>
      </div>

      <div id="users-list" style="display:flex;flex-direction:column;gap:10px;">
        ${users.map(u=>`<div class="user-card-wrap" data-uid="${u.id}">${renderUserCard(u,isAdmin)}</div>`).join('')}
      </div>
    </div>`;
  }

  function renderUserCard(u, canEdit){
    const project = getUserProject(u.id);
    return `<div class="glass-card" style="padding:16px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
      ${avatar(u)}
      <div style="flex:1;min-width:160px;">
        <div style="font-size:.95rem;font-weight:600;">${esc(u.firstName||'')} ${esc(u.lastName||'')} <span style="color:rgba(244,238,229,.5);font-weight:400;">@${esc(u.username)}</span></div>
        <div style="font-size:.78rem;color:rgba(244,238,229,.4);margin-top:2px;">${esc(u.email||'—')}</div>
        ${u.phone?`<div style="font-size:.75rem;color:rgba(244,238,229,.35);margin-top:1px;">📞 ${esc(u.phone)}</div>`:''}
        ${u.sector?`<div style="font-size:.75rem;color:rgba(244,238,229,.35);margin-top:1px;">🏢 ${esc(u.sector)}</div>`:''}
        ${u.internalNotes&&canEdit?`<div style="font-size:.72rem;color:rgba(240,169,136,.6);margin-top:3px;font-style:italic;">ðŸ”’ ${esc(u.internalNotes)}</div>`:''}
      </div>
      ${roleBadge(u.role)}
      ${project?`<span style="font-size:.78rem;color:rgba(244,238,229,.45);">📁 ${esc(project.name)}</span>`:'<span style="font-size:.78rem;color:rgba(244,238,229,.3);">Aucun projet</span>'}
      ${canEdit&&u.id!==me.id
        ? `<button class="btn btn-ghost btn-sm btn-edit-user" data-uid="${u.id}">✏ï¸ Modifier</button>
           <button class="btn btn-danger btn-sm btn-del-user" data-uid="${u.id}">ðŸ—‘</button>`
        : u.id===me.id ? `<span style="font-size:.75rem;color:rgba(244,238,229,.35);">Vous</span>` : ''}
    </div>`;
  }

  function exportUsersCSV(){
    const rows = [['ID','Username','Prénom','Nom','Email','Rôle','Projet','Créé le']];
    db.users.forEach(u=>{
      const p = getUserProject(u.id);
      rows.push([u.id, u.username, u.firstName||'', u.lastName||'', u.email||'', u.role, p?p.name:'', u.createdAt||'']);
    });
    const csv = rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob(['ï»¿'+csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='flow_users.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('CSV exporté !','success');
  }

  function wireAdminUsers(){
    const btnNew = document.getElementById('btn-new-user');
    if(btnNew) btnNew.addEventListener('click',()=>openCreateUserModal());
    const btnCSV = document.getElementById('btn-export-csv');
    if(btnCSV) btnCSV.addEventListener('click',exportUsersCSV);
    document.querySelectorAll('.btn-edit-user').forEach(b=>{
      b.addEventListener('click',()=>openEditUserModal(b.dataset.uid));
    });
    document.querySelectorAll('.btn-del-user').forEach(b=>{
      b.addEventListener('click',()=>confirmDeleteUser(b.dataset.uid));
    });

    let activeRoleFilter = '';
    function applyUserFilters(){
      const q = (document.getElementById('user-search')?.value||'').toLowerCase();
      document.querySelectorAll('#users-list .user-card-wrap').forEach(wrap=>{
        const uid = wrap.dataset.uid;
        const u = db.users.find(x=>x.id===uid);
        if(!u){ wrap.style.display='none'; return; }
        const hay = `${u.username} ${u.firstName||''} ${u.lastName||''} ${u.email||''} ${u.role}`.toLowerCase();
        const matchText = hay.includes(q);
        const matchRole = activeRoleFilter==='' || u.role===activeRoleFilter;
        wrap.style.display = (matchText && matchRole) ? '' : 'none';
      });
    }

    const searchInput = document.getElementById('user-search');
    if(searchInput) searchInput.addEventListener('input', applyUserFilters);

    document.querySelectorAll('.role-chip').forEach(chip=>{
      chip.addEventListener('click',()=>{
        document.querySelectorAll('.role-chip').forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        activeRoleFilter = chip.dataset.role;
        applyUserFilters();
      });
    });
  }

  // ─── Tab: Admin Documents & Timeline ────────────
  function renderAdminDocuments(){
    const clients = db.users.filter(u=>u.role==='client'||u.role==='controller');
    const isAdmin = me.role==='admin';
    return `<div class="fade-up">
      <h1 style="font-size:1.4rem;font-weight:700;margin-bottom:6px;">Suivi & Documents</h1>
      <p style="color:rgba(244,238,229,.45);font-size:.875rem;margin-bottom:16px;">
        ${isAdmin?'Gérez les frises et envoyez des documents aux clients.':'Consultez les frises et documents (lecture seule).'}
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;align-items:center;">
        <input id="doc-search" class="glass-input" placeholder="🔍 Chercher un client ou projet…" style="max-width:300px;" />
        <select id="doc-filter-status" class="glass-input" style="width:150px;">
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="filled">Remplis</option>
          <option value="reviewed">Validés</option>
          <option value="nodoc">Sans document</option>
        </select>
        <select id="doc-filter-prio" class="glass-input" style="width:140px;">
          <option value="">Toutes priorités</option>
          <option value="urgent">🔴 Urgent</option>
          <option value="normal">🔵 Normal</option>
          <option value="low">⚪ Basse</option>
        </select>
      </div>
      ${clients.length===0
        ? `<div class="glass-card" style="padding:40px;text-align:center;color:rgba(244,238,229,.4);">Aucun client enregistré.</div>`
        : clients.map(u=>{
            const projs = getUserProjects(u.id);
            if(projs.length===0) return `<div class="client-doc-panel-wrap" data-uid="${u.id}">${renderClientDocPanel(u,isAdmin,null)}</div>`;
            return projs.map((proj,idx)=>`<div class="client-doc-panel-wrap" data-uid="${u.id}">${renderClientDocPanel(u,isAdmin,proj,idx===0)}</div>`).join('');
          }).join('')}
    </div>`;
  }

  function renderClientDocPanel(u, canEdit, project, showUserHeader=true){
    if(project===undefined) project = getUserProject(u.id);
    const docs = project ? getProjectDocs(project.id) : [];
    const colorStyle = project&&project.color ? `border-left:3px solid ${project.color};padding-left:14px;` : '';
    return `<div class="glass-card" style="padding:20px;margin-bottom:16px;${colorStyle}">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
        ${avatar(u)}
        <div style="flex:1;">
          <div style="font-weight:600;">${esc(u.username)}</div>
          <div style="font-size:.78rem;color:rgba(244,238,229,.4);">${project?esc(project.name):'Aucun projet'}</div>
          ${project&&project.description?`<div style="font-size:.8rem;color:var(--ink-3);margin-top:2px;">${esc(project.description)}</div>`:''}
          ${project&&project.tags&&project.tags.length?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;">${project.tags.map(tag=>`<span style="font-size:.68rem;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:var(--ink-3);">${esc(tag)}</span>`).join('')}</div>`:''}
        </div>
        ${canEdit&&project?`
          <button class="btn btn-ghost btn-sm btn-edit-timeline" data-pid="${project.id}" data-uid="${u.id}">⏱ Timeline</button>
          <button class="btn btn-primary btn-sm btn-send-doc" data-uid="${u.id}" data-pid="${project.id}">+ Document</button>
          <div class="kebab-wrap">
            <button class="btn btn-ghost btn-sm kebab-btn" data-pid="${project.id}" title="Plus d'actions">â‹®</button>
            <div class="kebab-menu" id="kebab-${project.id}">
              <button class="kebab-item btn-pin-project" data-pid="${project.id}">${project.pinned?'ðŸ“Œ Désépingler':'📍 Ã‰pingler'}</button>
              <button class="kebab-item btn-report" data-uid="${u.id}">📄 Rapport PDF</button>
              <button class="kebab-item btn-dup-project" data-pid="${project.id}">ðŸ“‹ Dupliquer</button>
              <button class="kebab-item btn-deliver-files" data-pid="${project.id}">${project.deliverable?'📦 Remplacer la livraison':'📦 Livrer les fichiers'}</button>
              <div class="kebab-divider"></div>
              <button class="kebab-item btn-archive-project" data-pid="${project.id}">ðŸ—„ï¸ Archiver</button>
              <button class="kebab-item kebab-danger btn-del-project" data-pid="${project.id}">ðŸ—‘ Supprimer</button>
            </div>
          </div>
        `:''}
      </div>
      ${project?`
        <div style="margin-bottom:12px;">
          ${renderMiniTimeline(project.timeline)}
        </div>
        ${(()=>{
          const tasks = project.internalTasks||[];
          const tasksDoneCount = tasks.filter(t=>t.done).length;
          return canEdit&&tasks.length>0?`
            <div style="margin:10px 0 0;padding:10px 14px;background:rgba(255,255,255,.02);border-radius:10px;border:1px solid rgba(255,255,255,.06);">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <span style="font-size:.78rem;font-weight:600;color:var(--ink-3);">✅ TÃ‚CHES INTERNES (${tasksDoneCount}/${tasks.length})</span>
                <button class="btn btn-ghost btn-sm btn-manage-tasks" data-pid="${project.id}">Gérer</button>
              </div>
              ${tasks.map(t=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
                <div style="width:14px;height:14px;border-radius:3px;border:1.5px solid ${t.done?'var(--sage)':'rgba(255,255,255,.2)'};background:${t.done?'rgba(147,181,148,.2)':'transparent'};display:flex;align-items:center;justify-content:center;font-size:.6rem;color:var(--sage);flex-shrink:0;">${t.done?'✓':''}</div>
                <span style="font-size:.78rem;color:${t.done?'var(--ink-4)':'var(--ink-2)'};text-decoration:${t.done?'line-through':'none'};">${esc(t.label)}</span>
              </div>`).join('')}
            </div>`:canEdit&&tasks.length===0?`<button class="btn btn-ghost btn-sm btn-manage-tasks" data-pid="${project.id}" style="margin-top:8px;font-size:.75rem;">+ Tâches internes</button>`:'';
        })()}
        <div class="divider"></div>
        <div style="font-size:.8rem;font-weight:600;color:rgba(244,238,229,.5);margin-bottom:8px;">DOCUMENTS (${docs.length})</div>
        ${docs.length===0
          ? `<div style="font-size:.82rem;color:rgba(244,238,229,.35);padding:8px 0;">Aucun document envoyé.</div>`
          : docs.map(d=>renderDocRow(d,canEdit)).join('')}
      `:`<div style="font-size:.82rem;color:rgba(244,238,229,.35);padding:8px 0;">Aucun projet associé.</div>`}
    </div>`;
  }

  function renderMiniTimeline(tl){
    return `<div style="display:flex;gap:0;align-items:center;overflow-x:auto;padding-bottom:6px;">
      ${tl.map((s,i)=>{
        const dotColor = s.status==='done'?'#93b594':s.status==='current'?'#d97757':'rgba(255,255,255,.2)';
        const textColor= s.status==='done'?'rgba(244,238,229,.7)':s.status==='current'?'#d97757':'rgba(244,238,229,.35)';
        return `
          ${i>0?`<div style="flex:1;min-width:16px;height:1px;background:rgba(255,255,255,.1);"></div>`:''}
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:64px;max-width:80px;">
            <div style="width:22px;height:22px;border-radius:50%;background:${dotColor}33;border:2px solid ${dotColor};display:flex;align-items:center;justify-content:center;font-size:.65rem;"${s.note?` title="${esc(s.note)}"`:''}>
              ${s.status==='done'?'✓':s.status==='current'?'â–¶':'â—‹'}
            </div>
            <div style="font-size:.65rem;text-align:center;color:${textColor};line-height:1.2;">${esc(s.label)}</div>
            ${s.dueDate?`<div style="font-size:.63rem;text-align:center;color:var(--ink-4);line-height:1.2;">${esc(new Date(s.dueDate).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}))}</div>`:''}
          </div>`;
      }).join('')}
    </div>`;
  }

  function renderDocRow(doc, canEdit){
    const statusColor = {pending:'rgba(217,119,87,.8)',filled:'rgba(147,181,148,.8)',reviewed:'rgba(155,184,216,.8)'}[doc.status]||'#888';
    const statusLabel = {pending:'En attente',filled:'Rempli',reviewed:'Validé'}[doc.status]||doc.status;
    // F16 — relance indicator
    const daysPending = doc.sentAt ? Math.floor((Date.now()-new Date(doc.sentAt))/(1000*60*60*24)) : 0;
    const relance = doc.status==='pending' && daysPending>=7;
    return `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:1.1rem;">📄</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.85rem;font-weight:500;">${esc(doc.name)}</div>
          <div style="font-size:.75rem;color:rgba(244,238,229,.4);">Envoyé le ${esc(doc.sentAt||'—')}</div>
          ${doc.adminComment&&doc.status==='reviewed'?`<div style="font-size:.75rem;color:var(--sky);font-style:italic;margin-top:4px;">ðŸ’¬ "${esc(doc.adminComment)}"</div>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${relance?`<span style="font-size:.68rem;color:var(--peach);border:1px solid rgba(240,169,136,.4);padding:2px 8px;border-radius:8px;background:rgba(240,169,136,.12);font-weight:600;">âš ï¸ Relance — ${daysPending}j</span>`:''}
          ${doc.status==='pending'&&daysPending>=14?`<span style="font-size:.68rem;color:#f08a8a;border:1px solid rgba(220,80,80,.3);padding:2px 8px;border-radius:8px;background:rgba(220,80,80,.1);font-weight:600;">🚨 ${daysPending}j sans réponse</span>`:''}
          <span style="font-size:.75rem;color:${statusColor};font-weight:600;">${statusLabel}</span>
          ${canEdit?`<button class="btn btn-ghost btn-sm btn-view-doc" data-did="${doc.id}">ðŸ‘ Voir</button>`:''}
          ${canEdit?`<button class="btn btn-danger btn-sm btn-del-doc" data-did="${doc.id}" title="Supprimer">ðŸ—‘</button>`:''}
        </div>
      </div>
    </div>`;
  }

  function wireAdminDocuments(){
    // Kebab menu toggle
    document.querySelectorAll('.kebab-btn').forEach(btn=>{
      btn.addEventListener('click',(e)=>{
        e.stopPropagation();
        const pid = btn.dataset.pid;
        const menu = document.getElementById('kebab-'+pid);
        if(!menu) return;
        const isOpen = menu.classList.contains('open');
        document.querySelectorAll('.kebab-menu.open').forEach(m=>m.classList.remove('open'));
        if(!isOpen) menu.classList.add('open');
      });
    });
    if(!window._kebabCloseWired){
      window._kebabCloseWired = true;
      document.addEventListener('click',()=>document.querySelectorAll('.kebab-menu.open').forEach(m=>m.classList.remove('open')));
    }

    document.querySelectorAll('.btn-pin-project').forEach(b=>{
      b.addEventListener('click',()=>{
        const p=db.projects.find(x=>x.id===b.dataset.pid);
        if(!p) return;
        p.pinned=!p.pinned;
        saveDB(); toast(p.pinned?'Projet épinglé ðŸ“Œ':'Projet désépinglé.','info'); refreshAdminTab();
      });
    });
    document.querySelectorAll('.btn-manage-tasks').forEach(b=>{
      b.addEventListener('click',()=>openManageTasksModal(b.dataset.pid));
    });
    document.querySelectorAll('.btn-edit-timeline').forEach(b=>{
      b.addEventListener('click',()=>openEditTimelineModal(b.dataset.pid,b.dataset.uid));
    });
    document.querySelectorAll('.btn-send-doc').forEach(b=>{
      b.addEventListener('click',()=>openSendDocModal(b.dataset.uid,b.dataset.pid));
    });
    document.querySelectorAll('.btn-view-doc').forEach(b=>{
      b.addEventListener('click',()=>openViewDocModal(b.dataset.did,true));
    });
    document.querySelectorAll('.btn-del-project').forEach(b=>{
      b.addEventListener('click',()=>confirmDeleteProject(b.dataset.pid));
    });
    document.querySelectorAll('.btn-report').forEach(b=>{
      b.addEventListener('click',()=>generateClientReport(b.dataset.uid));
    });

    document.querySelectorAll('.btn-del-doc').forEach(b=>{
      b.addEventListener('click',()=>{
        const doc=db.documents.find(d=>d.id===b.dataset.did);
        if(!doc) return;
        showModal(`
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
            <h2 style="font-size:1.05rem;font-weight:700;">ðŸ—‘ Supprimer le document</h2>
            <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
          </div>
          <p style="color:var(--ink-2);font-size:.9rem;margin-bottom:20px;">Supprimer <strong>${esc(doc.name)}</strong> ? Cette action est irréversible.</p>
          <div style="display:flex;gap:10px;">
            <button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Annuler</button>
            <button id="confirm-del-doc" class="btn btn-danger" style="flex:1;justify-content:center;">Supprimer</button>
          </div>`,
        ()=>{
          document.getElementById('confirm-del-doc').addEventListener('click',()=>{
            db.documents=db.documents.filter(d=>d.id!==doc.id);
            logActivity('doc_deleted','Document supprimé : '+doc.name);
            saveDB(); toast('Document supprimé.','info'); closeModal(); refreshAdminTab();
          });
        });
      });
    });

    // F9 — Duplicate project
    document.querySelectorAll('.btn-dup-project').forEach(b=>{
      b.addEventListener('click',()=>{
        const p=db.projects.find(x=>x.id===b.dataset.pid);
        if(!p) return;
        const newP=JSON.parse(JSON.stringify(p));
        newP.id=uid();
        newP.name=p.name+' (copie)';
        newP.clientId=null;
        newP.status='pending';
        newP.createdAt=new Date().toISOString().slice(0,10);
        newP.timeline=newP.timeline.map(s=>({...s,id:uid(),status:'pending',dueDate:'',note:''}));
        db.projects.push(newP);
        logActivity('project_duplicated','Projet dupliqué : '+newP.name);
        saveDB(); toast('Projet dupliqué !','success'); refreshAdminTab();
      });
    });

    // F13 — Archive project
    document.querySelectorAll('.btn-archive-project').forEach(b=>{
      b.addEventListener('click',()=>{
        const p=db.projects.find(x=>x.id===b.dataset.pid);
        if(!p) return;
        p.archived=true;
        logActivity('project_archived','Projet archivé : '+p.name);
        saveDB(); toast('Projet archivé.','info'); refreshAdminTab();
      });
    });
    document.querySelectorAll('.btn-deliver-files').forEach(b=>{
      b.addEventListener('click',()=>openDeliverFilesModal(b.dataset.pid));
    });
    function applyDocFilters(){
      const q = (document.getElementById('doc-search')?.value||'').toLowerCase();
      const statusF = document.getElementById('doc-filter-status')?.value||'';
      const prioF   = document.getElementById('doc-filter-prio')?.value||'';
      document.querySelectorAll('.client-doc-panel-wrap').forEach(wrap=>{
        const uid = wrap.dataset.uid;
        const u = db.users.find(x=>x.id===uid);
        if(!u){ wrap.style.display='none'; return; }
        const project = getUserProject(u.id);
        const hay = `${u.username} ${u.firstName||''} ${u.lastName||''} ${project?project.name:''}`.toLowerCase();
        const matchQ = !q || hay.includes(q);
        let matchStatus = true;
        if(statusF && project){
          const docs = getProjectDocs(project.id);
          if(statusF==='nodoc') matchStatus = docs.length===0;
          else matchStatus = docs.some(d=>d.status===statusF);
        } else if(statusF) { matchStatus = false; }
        let matchPrio = !prioF || (project&&(project.priority||'normal')===prioF);
        wrap.style.display = (matchQ&&matchStatus&&matchPrio) ? '' : 'none';
      });
    }
    document.getElementById('doc-search')?.addEventListener('input', applyDocFilters);
    document.getElementById('doc-filter-status')?.addEventListener('change', applyDocFilters);
    document.getElementById('doc-filter-prio')?.addEventListener('change', applyDocFilters);
  }

  // ─── Tab: Admin Profile ─────────────────────────
  function renderAdminProfile(){
    return `<div class="fade-up">
      <h1 style="font-size:1.4rem;font-weight:700;margin-bottom:24px;">Mon Profil</h1>
      <div class="profile-grid">
        <!-- Colonne gauche : avatar + thème -->
        <div>
          <div class="glass-card" style="padding:28px;text-align:center;margin-bottom:16px;">
            <div style="display:flex;justify-content:center;margin-bottom:14px;">${avatarLg(me)}</div>
            <div style="font-size:1.2rem;font-weight:700;margin-bottom:4px;">${esc(me.firstName||'')} ${esc(me.lastName||'')}</div>
            <div style="color:rgba(244,238,229,.5);font-size:.9rem;margin-bottom:10px;">@${esc(me.username)}</div>
            ${roleBadge(me.role)}
            ${me.email?`<div style="font-size:.78rem;color:var(--ink-4);margin-top:10px;">âœ‰ï¸ ${esc(me.email)}</div>`:''}
          </div>
          <div class="glass-card" style="padding:18px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <div style="font-size:.9rem;font-weight:600;">Thème</div>
                <div style="font-size:.72rem;color:var(--ink-4);">Clair ou sombre</div>
              </div>
              <button id="btn-toggle-theme" class="btn btn-ghost btn-sm">
                ${localStorage.getItem('flow_theme')==='light' ? 'â˜€ï¸ Clair' : 'ðŸŒ™ Sombre'}
              </button>
            </div>
          </div>
        </div>
        <!-- Colonne droite : formulaire -->
        <div class="glass-card" style="padding:28px;">
          <h2 style="font-size:1rem;font-weight:600;margin-bottom:20px;">Modifier mes informations</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div><label class="label">Prénom</label><input id="p-fn" class="glass-input" value="${esc(me.firstName||'')}" /></div>
            <div><label class="label">Nom</label><input id="p-ln" class="glass-input" value="${esc(me.lastName||'')}" /></div>
          </div>
          <div style="margin-bottom:14px;"><label class="label">Pseudo</label><input id="p-un" class="glass-input" value="${esc(me.username)}" /></div>
          <div style="margin-bottom:14px;"><label class="label">Email</label><input id="p-em" class="glass-input" type="email" value="${esc(me.email||'')}" /></div>
          <div style="margin-bottom:14px;"><label class="label">Photo de profil (URL)</label><input id="p-ph" class="glass-input" placeholder="https://..." value="${esc(me.photo||'')}" /></div>
          <div class="divider"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
            <div><label class="label">Nouveau mot de passe</label><input id="p-np" class="glass-input" type="password" placeholder="Laisser vide…" /></div>
            <div><label class="label">Confirmer</label><input id="p-cp" class="glass-input" type="password" placeholder="••••••••" /></div>
          </div>
          <div id="p-msg" style="display:none;margin-bottom:14px;padding:10px 14px;border-radius:8px;font-size:.85rem;"></div>
          <button id="p-save" class="btn btn-primary" style="width:100%;justify-content:center;">Enregistrer</button>
          <div class="divider"></div>
          <div style="margin-top:4px;">
            <div style="font-size:.9rem;font-weight:600;margin-bottom:6px;">Sauvegarde & Restauration</div>
            <div style="font-size:.75rem;color:var(--ink-4);margin-bottom:12px;">Exporte toute la base de données Flow en JSON.</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <button id="btn-export-json" class="btn btn-ghost" style="flex:1;justify-content:center;min-width:140px;">â¬‡ï¸ Exporter JSON</button>
              <label id="btn-import-json-label" class="btn btn-ghost" style="flex:1;justify-content:center;min-width:140px;cursor:pointer;">â¬†ï¸ Importer JSON<input type="file" id="btn-import-json" accept=".json" style="display:none;" /></label>
            </div>
            <div id="import-msg" style="display:none;margin-top:10px;padding:10px 14px;border-radius:8px;font-size:.85rem;"></div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function wireAdminProfile(){
    const btnTheme = document.getElementById('btn-toggle-theme');
    if(btnTheme) btnTheme.addEventListener('click',()=>{
      const current = localStorage.getItem('flow_theme')||'dark';
      const next = current==='dark'?'light':'dark';
      localStorage.setItem('flow_theme', next);
      applyTheme();
      refreshAdminTab();
    });
    document.getElementById('p-save').addEventListener('click',()=>{
      const fn=document.getElementById('p-fn').value.trim();
      const ln=document.getElementById('p-ln').value.trim();
      const un=document.getElementById('p-un').value.trim();
      const em=document.getElementById('p-em').value.trim();
      const np=document.getElementById('p-np').value;
      const cp=document.getElementById('p-cp').value;
      const ph=document.getElementById('p-ph').value.trim();
      const msg=document.getElementById('p-msg');

      if(!un){ showMsg(msg,'Le pseudo est requis.','error'); return; }
      if(db.users.some(u=>u.username.toLowerCase()===un.toLowerCase()&&u.id!==me.id)){
        showMsg(msg,'Ce pseudo est déjÃ  utilisé.','error'); return;
      }
      if(np && np!==cp){ showMsg(msg,'Les mots de passe ne correspondent pas.','error'); return; }

      const u = db.users.find(u=>u.id===me.id);
      u.firstName=fn; u.lastName=ln; u.username=un; u.email=em; u.photo=ph||null;
      const applyProfileSave=()=>{ me=u; saveDB(); toast('Profil mis Ã  jour !','success'); showMsg(msg,'Profil mis Ã  jour avec succès !','success'); document.getElementById('app').innerHTML=renderAdminShell(); wireAdmin(); };
      if(np){ hashPwd(np).then(h=>{ u.password=h; applyProfileSave(); }); } else { applyProfileSave(); }
    });
  }

  function showMsg(el, text, type){
    el.style.display='block';
    el.textContent=text;
    el.style.background=type==='success'?'rgba(147,181,148,.15)':'rgba(239,68,68,.15)';
    el.style.border=`1px solid ${type==='success'?'rgba(147,181,148,.3)':'rgba(239,68,68,.3)'}`;
    el.style.color=type==='success'?'#93b594':'#e08680';
  }

  // ════════════════════════════════════════════════
  //  CLIENT SHELL
  // ════════════════════════════════════════════════
  const clientTabs = [
    { id:'home',      icon:iconHome(),    label:'Accueil'   },
    { id:'documents', icon:iconDocs(),    label:'Documents' },
    { id:'profile',   icon:iconProfile(), label:'Profil'    }
  ];
  // clientTabs kept for legacy compatibility; use getClientVisibleTabs() for rendering

  function renderClientShell(){
    const project = getUserProject(me.id);
    return `
    <div id="sidebar" class="glass-dark">
      <div class="logo-wrap" style="margin-bottom:28px;padding:0 4px;">
        <div style="display:flex;align-items:baseline;gap:0;">
          <button onclick="showWhatsNew()" class="logo" style="background:none;border:none;cursor:pointer;padding:0;font-family:'Instrument Serif',serif;font-size:1.7rem;font-weight:400;letter-spacing:-.025em;color:var(--ink);">flow</button>
          <span style="font-size:.6rem;color:var(--ink-4);margin-left:6px;position:relative;top:-4px;">v${APP_VERSION}</span>
        </div>
        <p style="font-size:.72rem;color:rgba(244,238,229,.35);margin-top:2px;">Espace Client</p>
      </div>
      ${getClientVisibleTabs().map(t=>`
        <button class="nav-item ${activeTab===t.id?'active':''}" data-tab="${t.id}">
          ${t.icon} <span>${t.label}</span>${t.beta?` <span style="font-size:.55rem;background:rgba(155,184,216,.15);color:var(--sky);border:1px solid rgba(155,184,216,.25);border-radius:999px;padding:1px 5px;letter-spacing:.06em;text-transform:uppercase;margin-left:4px;">TEST</span>`:''}
        </button>`).join('')}
      <div style="flex:1;"></div>
      <div style="padding:12px 8px 0;border-top:1px solid rgba(255,255,255,.07);">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          ${avatar(me)}
          <div style="min-width:0;flex:1;">
            <div style="font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(me.username)}</div>
            ${roleBadge(me.role)}
          </div>
        </div>
        <button id="btn-logout" class="btn btn-ghost" style="width:100%;justify-content:center;font-size:.8rem;">
          ${iconLogout()} Déconnexion
        </button>
      </div>
    </div>
    <div id="main"><div id="tab-content">${renderClientTab()}</div></div>`;
  }

  function renderClientTab(){
    if(activeTab==='home')       return renderClientHome();
    if(activeTab==='documents')  return renderClientDocuments();
    if(activeTab==='discussion') return renderClientDiscussion();
    if(activeTab==='profile')    return renderClientProfile();
    return '';
  }

  function wireClient(){
    document.querySelectorAll('[data-tab]').forEach(btn=>{
      btn.addEventListener('click',()=>{ activeTab=btn.dataset.tab; refreshClientTab(); });
    });
    document.getElementById('btn-logout').addEventListener('click',logout);
    wireClientTabContent();
  }

  function refreshClientTab(){
    try{
      normalizeDB();
      document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===activeTab));
      const c=document.getElementById('tab-content');
      c.innerHTML=renderClientTab();
      c.classList.remove('fade-up'); void c.offsetWidth; c.classList.add('fade-up');
      wireClientTabContent();
    }catch(err){ const c=document.getElementById('tab-content'); if(c) c.innerHTML=renderErrorBox(err); }
  }

  function wireClientTabContent(){
    if(activeTab==='home')       wireClientHome();
    if(activeTab==='documents')  wireClientDocuments();
    if(activeTab==='discussion') wireClientDiscussion();
    if(activeTab==='profile')    wireClientProfile();
    renderMobileTabbar('client');
  }

  // ─── Client: Home ───────────────────────────────
  function renderClientHome(){
    const projects = getUserProjects(me.id);
    const project = projects[0]||null;

    // F7 — Countdown
    const ctrDue = project && project.dueDate && project.status!=='done' ? (()=>{
      const diff = Math.ceil((new Date(project.dueDate)-new Date())/(1000*60*60*24));
      if(diff < 0) return `<div style="background:rgba(220,80,80,.12);border:1px solid rgba(220,80,80,.25);border-radius:14px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:12px;"><span style="font-size:1.4rem;">⏰</span><div><div style="font-size:.9rem;font-weight:600;color:#f08a8a;">Livraison dépassée de ${Math.abs(diff)} jour(s)</div><div style="font-size:.75rem;color:rgba(244,238,229,.5);">Contactez votre chargé de projet</div></div></div>`;
      if(diff<=30) return `<div style="background:rgba(155,184,216,.08);border:1px solid rgba(155,184,216,.2);border-radius:14px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:12px;"><span style="font-size:1.4rem;">ðŸŽ¯</span><div><div style="font-size:.9rem;font-weight:600;color:var(--sky);">Livraison dans ${diff} jour(s)</div><div style="font-size:.75rem;color:rgba(244,238,229,.5);">${new Date(project.dueDate).toLocaleDateString('fr-FR')}</div></div></div>`;
      return '';
    })() : '';

    // F12 — Welcome message
    const welcomeBanner = project && project.welcomeMessage ? `<div style="background:rgba(155,184,216,.08);border:1px solid rgba(155,184,216,.18);border-radius:14px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:.78rem;font-weight:600;color:var(--sky);letter-spacing:.05em;margin-bottom:6px;">MESSAGE DE VOTRE Ã‰QUIPE</div>
      <div style="font-size:.9rem;color:var(--ink-2);line-height:1.5;">${esc(project.welcomeMessage)}</div>
    </div>` : '';

    return `<div class="fade-up">
      <h1 style="font-size:1.4rem;font-weight:700;margin-bottom:4px;">Bonjour, ${esc(me.firstName||me.username)} ðŸ‘‹</h1>
      <p style="color:rgba(244,238,229,.45);font-size:.875rem;margin-bottom:28px;">Voici l'avancement de votre projet.</p>
      ${welcomeBanner}
      ${ctrDue}
      ${projects.length===0 ? renderNoProject() : projects.length===1 ? renderProjectCard(projects[0]) : `<div>${projects.map(p=>`<div style="margin-bottom:16px;"><div style="font-size:.78rem;color:var(--ink-4);font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px;">Projet ${projects.indexOf(p)+1} / ${projects.length}</div>${renderProjectCard(p)}</div>`).join('')}</div>`}
      ${project&&project.faq&&project.faq.length>0?`
      <div class="glass-card" style="padding:20px;margin-top:16px;">
        <h2 style="font-size:.95rem;font-weight:600;margin-bottom:14px;color:var(--sky);">❓ Questions fréquentes</h2>
        ${project.faq.map((f,i)=>`
          <div style="margin-bottom:12px;padding:12px;background:rgba(255,255,255,.03);border-radius:10px;border:1px solid rgba(255,255,255,.07);">
            <div style="font-size:.875rem;font-weight:600;color:var(--ink-2);margin-bottom:6px;">Q : ${esc(f.q)}</div>
            <div style="font-size:.85rem;color:var(--ink-3);line-height:1.5;">â†³ ${esc(f.a||'—')}</div>
          </div>`).join('')}
      </div>`:''}
    </div>`;
  }

  function renderProjectCard(p){
    const done  = p.timeline.filter(s=>s.status==='done').length;
    const total = p.timeline.length;
    const pct   = Math.round((done/total)*100);
    let dueLine = '';
    if(p.dueDate){
      const d=new Date(p.dueDate);
      const fmt=d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});
      dueLine=`<div style="font-size:.8rem;color:var(--ink-3);margin-top:6px;">📅 Livraison prévue : ${fmt}</div>`;
    }
    return `
      <div class="glass-card" style="padding:24px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 style="font-size:1.1rem;font-weight:600;">${esc(p.name)}</h2>
            <div style="font-size:.8rem;color:rgba(244,238,229,.45);margin-top:2px;">${pct}% complété</div>
            ${p.description?`<div style="font-size:.8rem;color:var(--ink-3);margin-top:4px;">${esc(p.description)}</div>`:''}
          </div>
          ${p.websiteUrl?`<a href="${esc(p.websiteUrl)}" target="_blank" class="btn btn-primary btn-sm">ðŸ”— Voir mon site</a>`:''}
        </div>
        <div style="height:6px;background:rgba(255,255,255,.08);border-radius:4px;margin-bottom:${p.dueDate?'8':'28'}px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#d97757,#93b594);border-radius:4px;transition:width .5s;"></div>
        </div>
        ${dueLine}
        ${dueLine?'<div style="margin-bottom:20px;"></div>':''}
        ${p.deliverable?`
        <div style="background:rgba(147,181,148,.10);border:1px solid rgba(147,181,148,.28);border-radius:14px;padding:16px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <span style="font-size:1.6rem;">📦</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:.9rem;font-weight:600;color:#b6d1b7;">Fichiers livrés — ${esc(p.deliverable.name)}</div>
            <div style="font-size:.75rem;color:var(--ink-4);margin-top:2px;">Livré le ${new Date(p.deliverable.deliveredAt).toLocaleDateString('fr-FR')} · ${(p.deliverable.size/1024/1024).toFixed(2)} Mo</div>
          </div>
          <button class="btn btn-success btn-sm btn-download-delivery" data-pid="${p.id}">â¬‡ï¸ Télécharger</button>
        </div>`:''}
        ${renderFullTimeline(p.timeline)}
      </div>`;
  }

  function renderFullTimeline(tl){
    return `<div>
      ${tl.map((s,i)=>`
        <div class="tl-step ${s.status}">
          <div class="tl-line-wrap">
            <div class="tl-dot">${s.status==='done'?'✓':s.status==='current'?'â–¶':'â—‹'}</div>
            ${i<tl.length-1?`<div class="tl-connector"></div>`:''}
          </div>
          <div style="padding-top:4px;flex:1;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div style="font-size:.9rem;font-weight:${s.status==='pending'?'400':'600'};color:${s.status==='done'?'#f4eee5':s.status==='current'?'#d97757':'rgba(244,238,229,.4)'};">
                ${esc(s.label)}
              </div>
              ${s.dueDate?`<div style="font-size:.75rem;color:rgba(244,238,229,.4);white-space:nowrap;">📅 ${esc(new Date(s.dueDate).toLocaleDateString('fr-FR'))}</div>`:''}
            </div>
            ${s.date?`<div style="font-size:.75rem;color:rgba(244,238,229,.4);margin-top:2px;">📅 ${esc(s.date)}</div>`:''}
            ${s.note?`<div style="font-size:.75rem;color:var(--ink-4);font-style:italic;margin-top:3px;">${esc(s.note)}</div>`:''}
          </div>
        </div>`).join('')}
    </div>`;
  }

  function renderNoProject(){
    return `<div class="glass-card" style="padding:48px;text-align:center;">
      <div style="font-size:3rem;margin-bottom:12px;">ðŸ“‹</div>
      <div style="font-size:1rem;font-weight:600;color:rgba(244,238,229,.7);margin-bottom:6px;">Aucun projet associé</div>
      <div style="font-size:.85rem;color:rgba(244,238,229,.4);">Votre gestionnaire de projet vous assignera bientôt un projet.</div>
    </div>`;
  }

  function wireClientHome(){
    document.querySelectorAll('.btn-download-delivery').forEach(btn=>{
      btn.addEventListener('click',()=>downloadDelivery(btn.dataset.pid));
    });
  }

  // ─── Client: Documents ──────────────────────────
  function renderClientDocuments(){
    const project = getUserProject(me.id);
    const docs = project ? getProjectDocs(project.id) : [];
    return `<div class="fade-up">
      <h1 style="font-size:1.4rem;font-weight:700;margin-bottom:6px;">Mes Documents</h1>
      <p style="color:rgba(244,238,229,.45);font-size:.875rem;margin-bottom:24px;">Remplissez les formulaires envoyés par votre gestionnaire.</p>
      ${docs.length===0
        ? `<div class="glass-card" style="padding:48px;text-align:center;">
             <div style="font-size:3rem;margin-bottom:12px;">ðŸ“­</div>
             <div style="color:rgba(244,238,229,.4);">Aucun document Ã  remplir pour le moment.</div>
           </div>`
        : docs.map(d=>renderClientDocCard(d)).join('')}
    </div>`;
  }

  function renderClientDocCard(doc){
    const statusColor = {pending:'#d97757',filled:'#93b594',reviewed:'#c5d6ea'}[doc.status];
    const statusLabel = {pending:'À remplir',filled:'Rempli ✓',reviewed:'Validé ✓'}[doc.status];
    return `<div class="glass-card" style="padding:20px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:${doc.adminComment&&doc.status==='reviewed'?'8':'0'}px;flex-wrap:wrap;">
        <span style="font-size:1.5rem;">📄</span>
        <div style="flex:1;">
          <div style="font-weight:600;">${esc(doc.name)}</div>
          <div style="font-size:.75rem;color:rgba(244,238,229,.4);">Envoyé le ${esc(doc.sentAt||'—')}</div>
        </div>
        <span style="font-size:.8rem;color:${statusColor};font-weight:600;">${statusLabel}</span>
        ${doc.status!=='reviewed'?`<button class="btn btn-primary btn-sm btn-fill-doc" data-did="${doc.id}">✏ï¸ ${doc.status==='pending'?'Remplir':'Modifier'}</button>`:''}
      </div>
      ${doc.adminComment&&doc.status==='reviewed'?`<div style="font-size:.75rem;color:var(--sky);font-style:italic;margin-top:4px;">ðŸ’¬ "${esc(doc.adminComment)}"</div>`:''}
    </div>`;
  }

  function wireClientDocuments(){
    document.querySelectorAll('.btn-fill-doc').forEach(b=>{
      b.addEventListener('click',()=>openFillDocModal(b.dataset.did));
    });
  }

  // ─── Client: Profile ────────────────────────────
  function renderClientProfile(){
    const project = getUserProject(me.id);
    return `<div class="fade-up">
      <h1 style="font-size:1.4rem;font-weight:700;margin-bottom:24px;">Mon Profil</h1>
      <div class="profile-grid">
        <!-- Colonne gauche : avatar -->
        <div>
          <div class="glass-card" style="padding:28px;text-align:center;">
            <div style="display:flex;justify-content:center;margin-bottom:14px;">${avatarLg(me)}</div>
            <div style="font-size:1.2rem;font-weight:700;margin-bottom:4px;">${esc(me.firstName||'')} ${esc(me.lastName||'')}</div>
            <div style="color:rgba(244,238,229,.5);font-size:.9rem;margin-bottom:10px;">@${esc(me.username)}</div>
            ${roleBadge('client')}
            ${project?`<div style="font-size:.78rem;color:var(--ink-4);margin-top:12px;">📁 ${esc(project.name)}</div>`:''}
            ${me.email?`<div style="font-size:.78rem;color:var(--ink-4);margin-top:6px;">âœ‰ï¸ ${esc(me.email)}</div>`:''}
          </div>
        </div>
        <!-- Colonne droite : formulaire -->
        <div class="glass-card" style="padding:28px;">
          <h2 style="font-size:1rem;font-weight:600;margin-bottom:20px;">Modifier mes informations</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div><label class="label">Prénom</label><input id="cp-fn" class="glass-input" value="${esc(me.firstName||'')}" /></div>
            <div><label class="label">Nom</label><input id="cp-ln" class="glass-input" value="${esc(me.lastName||'')}" /></div>
          </div>
          <div style="margin-bottom:14px;"><label class="label">Pseudo</label><input id="cp-un" class="glass-input" value="${esc(me.username)}" /></div>
          <div style="margin-bottom:14px;"><label class="label">Photo de profil (URL)</label><input id="cp-ph" class="glass-input" placeholder="https://..." value="${esc(me.photo||'')}" /></div>
          <div class="divider"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
            <div><label class="label">Nouveau mot de passe</label><input id="cp-np" class="glass-input" type="password" placeholder="Laisser vide…" /></div>
            <div><label class="label">Confirmer</label><input id="cp-cp" class="glass-input" type="password" placeholder="••••••••" /></div>
          </div>
          <div id="cp-msg" style="display:none;margin-bottom:14px;padding:10px 14px;border-radius:8px;font-size:.85rem;"></div>
          <button id="cp-save" class="btn btn-primary" style="width:100%;justify-content:center;">Enregistrer</button>
        </div>
      </div>
    </div>`;
  }

  function wireClientProfile(){
    document.getElementById('cp-save').addEventListener('click',()=>{
      const fn=document.getElementById('cp-fn').value.trim();
      const ln=document.getElementById('cp-ln').value.trim();
      const un=document.getElementById('cp-un').value.trim();
      const ph=document.getElementById('cp-ph').value.trim();
      const np=document.getElementById('cp-np').value;
      const cp=document.getElementById('cp-cp').value;
      const msg=document.getElementById('cp-msg');

      if(!un){ showMsg(msg,'Le pseudo est requis.','error'); return; }
      if(db.users.some(u=>u.username.toLowerCase()===un.toLowerCase()&&u.id!==me.id)){
        showMsg(msg,'Ce pseudo est déjÃ  utilisé.','error'); return;
      }
      if(np&&np!==cp){ showMsg(msg,'Les mots de passe ne correspondent pas.','error'); return; }

      const u=db.users.find(u=>u.id===me.id);
      u.firstName=fn; u.lastName=ln; u.username=un; u.photo=ph||null;
      const applyClientProfileSave=()=>{ me=u; saveDB(); toast('Profil mis Ã  jour !','success'); showMsg(msg,'Profil mis Ã  jour !','success'); document.getElementById('app').innerHTML=renderClientShell(); wireClient(); };
      if(np){ hashPwd(np).then(h=>{ u.password=h; applyClientProfileSave(); }); } else { applyClientProfileSave(); }
    });
  }

  // ════════════════════════════════════════════════
  //  MODALS
  // ════════════════════════════════════════════════
  function showModal(html, onWire){
    let ov = document.getElementById('modal-overlay');
    if(!ov){ ov=document.createElement('div'); ov.id='modal-overlay'; document.body.appendChild(ov); }
    ov.innerHTML=`<div class="modal-box fade-up">${html}</div>`;
    ov.style.display='flex';
    ov.addEventListener('click',e=>{ if(e.target===ov) closeModal(); });
    if(onWire) onWire();
  }

  function closeModal(){
    const ov=document.getElementById('modal-overlay');
    if(ov){ ov.style.display='none'; ov.innerHTML=''; }
  }

  // ── Create User Modal ──────────────────────────
  function openCreateUserModal(){
    const canRoles = me.role==='admin'
      ? [{v:'client',l:'Client'},{v:'controller',l:'Contrôleur'},{v:'admin',l:'Admin'}]
      : [{v:'client',l:'Client'}];

    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
        <h2 style="font-size:1.1rem;font-weight:700;">Nouveau compte</h2>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <div style="margin-bottom:14px;"><label class="label">Prénom</label><input id="nu-fn" class="glass-input" placeholder="Prénom" /></div>
      <div style="margin-bottom:14px;"><label class="label">Nom</label><input id="nu-ln" class="glass-input" placeholder="Nom" /></div>
      <div style="margin-bottom:14px;"><label class="label">Pseudo *</label><input id="nu-un" class="glass-input" placeholder="Pseudo unique" /></div>
      <div style="margin-bottom:14px;"><label class="label">Email</label><input id="nu-em" class="glass-input" type="email" placeholder="email@exemple.com" /></div>
      <div style="margin-bottom:14px;"><label class="label">Téléphone</label><input id="nu-phone" class="glass-input" placeholder="+33 6 00 00 00 00" /></div>
      <div style="margin-bottom:14px;"><label class="label">Secteur d'activité</label><input id="nu-sector" class="glass-input" placeholder="Ex : Restauration, E-commerce…" /></div>
      <div style="margin-bottom:14px;"><label class="label">Mot de passe *</label><input id="nu-pw" class="glass-input" type="password" placeholder="••••••••" /></div>
      <div style="margin-bottom:20px;">
        <label class="label">Rôle</label>
        <select id="nu-role" class="glass-input">
          ${canRoles.map(r=>`<option value="${r.v}">${r.l}</option>`).join('')}
        </select>
      </div>
      <div id="nu-msg" style="display:none;margin-bottom:14px;padding:10px 14px;border-radius:8px;font-size:.85rem;"></div>
      <div style="display:flex;gap:10px;">
        <button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Annuler</button>
        <button id="nu-save" class="btn btn-primary" style="flex:1;justify-content:center;">Créer</button>
      </div>`,
    ()=>{
      document.getElementById('nu-save').addEventListener('click',()=>{
        const fn=document.getElementById('nu-fn').value.trim();
        const ln=document.getElementById('nu-ln').value.trim();
        const un=document.getElementById('nu-un').value.trim();
        const em=document.getElementById('nu-em').value.trim();
        const pw=document.getElementById('nu-pw').value;
        const role=document.getElementById('nu-role').value;
        const msg=document.getElementById('nu-msg');

        const phone=document.getElementById('nu-phone')?.value.trim()||'';
        const sector=document.getElementById('nu-sector')?.value.trim()||'';
        if(!un||!pw){ showMsg(msg,'Pseudo et mot de passe requis.','error'); return; }
        if(!canCreateRole(me.role,role)){ showMsg(msg,'Vous n\'avez pas la permission de créer ce type de compte.','error'); return; }
        if(db.users.some(u=>u.username.toLowerCase()===un.toLowerCase())){ showMsg(msg,'Ce pseudo est déjÃ  utilisé.','error'); return; }

        hashPwd(pw).then(hashedPw=>{
          const newUser = { id:uid(), username:un, password:hashedPw, role, firstName:fn, lastName:ln, email:em, phone, sector, photo:null, projectId:null, createdAt:new Date().toISOString() };
          db.users.push(newUser);
          logActivity('user_created', 'Compte créé : ' + newUser.username);
          saveDB(); toast('Compte créé !','success'); closeModal(); refreshAdminTab();
        });
      });
    });
  }

  // ── Edit User Modal ────────────────────────────
  function openEditUserModal(userId){
    const u = db.users.find(x=>x.id===userId);
    if(!u) return;
    const projects = db.projects;
    const isAdmin = me.role==='admin';

    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
        <h2 style="font-size:1.1rem;font-weight:700;">Modifier @${esc(u.username)}</h2>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <div style="margin-bottom:14px;"><label class="label">Prénom</label><input id="eu-fn" class="glass-input" value="${esc(u.firstName||'')}" /></div>
      <div style="margin-bottom:14px;"><label class="label">Nom</label><input id="eu-ln" class="glass-input" value="${esc(u.lastName||'')}" /></div>
      <div style="margin-bottom:14px;"><label class="label">Pseudo</label><input id="eu-un" class="glass-input" value="${esc(u.username)}" /></div>
      <div style="margin-bottom:14px;"><label class="label">Email</label><input id="eu-em" class="glass-input" value="${esc(u.email||'')}" /></div>
      <div style="margin-bottom:14px;"><label class="label">Téléphone</label><input id="eu-phone" class="glass-input" placeholder="+33 6 00 00 00 00" value="${esc(u.phone||'')}" /></div>
      <div style="margin-bottom:14px;"><label class="label">Secteur d'activité</label><input id="eu-sector" class="glass-input" placeholder="Ex : Restauration, E-commerce…" value="${esc(u.sector||'')}" /></div>
      <div style="margin-bottom:14px;">
        <label class="label">ðŸ”’ Notes internes (invisibles du client)</label>
        <textarea id="eu-notes" class="glass-input" placeholder="Notes privées sur ce client…" style="min-height:60px;">${esc(u.internalNotes||'')}</textarea>
      </div>
      <div style="margin-bottom:14px;"><label class="label">Lien site web</label><input id="eu-url" class="glass-input" placeholder="https://..." value="${esc(projects.find(p=>p.clientId===u.id)?.websiteUrl||'')}" /></div>
      ${isAdmin?`
      <div style="margin-bottom:14px;">
        <label class="label">Rôle</label>
        <select id="eu-role" class="glass-input">
          <option value="client" ${u.role==='client'?'selected':''}>Client</option>
          <option value="controller" ${u.role==='controller'?'selected':''}>Contrôleur</option>
          <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
        </select>
      </div>
      <div style="margin-bottom:14px;">
        <label class="label">Projet associé</label>
        <select id="eu-proj" class="glass-input">
          <option value="">— Aucun —</option>
          ${projects.map(p=>`<option value="${p.id}" ${p.clientId===u.id?'selected':''}>${esc(p.name)}</option>`).join('')}
        </select>
      </div>`:''}
      <div style="margin-bottom:20px;"><label class="label">Nouveau mot de passe (laisser vide)</label><input id="eu-pw" class="glass-input" type="password" /></div>
      <div id="eu-msg" style="display:none;margin-bottom:14px;padding:10px 14px;border-radius:8px;font-size:.85rem;"></div>
      <div style="display:flex;gap:10px;">
        <button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Annuler</button>
        <button id="eu-save" class="btn btn-primary" style="flex:1;justify-content:center;">Enregistrer</button>
      </div>`,
    ()=>{
      document.getElementById('eu-save').addEventListener('click',()=>{
        const fn=document.getElementById('eu-fn').value.trim();
        const ln=document.getElementById('eu-ln').value.trim();
        const un=document.getElementById('eu-un').value.trim();
        const em=document.getElementById('eu-em').value.trim();
        const phone=document.getElementById('eu-phone')?.value.trim()||'';
        const sector=document.getElementById('eu-sector')?.value.trim()||'';
        const pw=document.getElementById('eu-pw').value;
        const url=document.getElementById('eu-url').value.trim();
        const role=isAdmin?document.getElementById('eu-role').value:u.role;
        const projId=isAdmin?document.getElementById('eu-proj').value:'';
        const msg=document.getElementById('eu-msg');

        if(!un){ showMsg(msg,'Le pseudo est requis.','error'); return; }
        if(db.users.some(x=>x.username.toLowerCase()===un.toLowerCase()&&x.id!==u.id)){
          showMsg(msg,'Ce pseudo est déjÃ  utilisé.','error'); return;
        }

        u.firstName=fn; u.lastName=ln; u.username=un; u.email=em; u.role=role; u.phone=phone; u.sector=sector;
        u.internalNotes = document.getElementById('eu-notes')?.value.trim()||'';

        const applyEdit=()=>{
          if(isAdmin){
            db.projects.forEach(p=>{ if(p.clientId===u.id) p.clientId=null; });
            if(projId){
              const proj=db.projects.find(p=>p.id===projId);
              if(proj){ proj.clientId=u.id; if(url) proj.websiteUrl=url; }
            }
          }
          saveDB(); toast('Utilisateur mis Ã  jour !','success'); closeModal(); refreshAdminTab();
        };
        if(pw){ hashPwd(pw).then(h=>{ u.password=h; applyEdit(); }); } else { applyEdit(); }
      });
    });
  }

  // ── Confirm Delete User ────────────────────────
  function confirmDeleteUser(userId){
    const u=db.users.find(x=>x.id===userId);
    if(!u) return;
    showModal(`
      <div style="text-align:center;padding:8px 0;">
        <div style="font-size:2.5rem;margin-bottom:12px;">âš ï¸</div>
        <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:8px;">Supprimer @${esc(u.username)} ?</h2>
        <p style="color:rgba(244,238,229,.5);font-size:.875rem;margin-bottom:24px;">Cette action est irréversible. Toutes les données associées seront supprimées.</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button onclick="closeModal()" class="btn btn-ghost">Annuler</button>
          <button id="del-confirm" class="btn btn-danger">Supprimer</button>
        </div>
      </div>`,
    ()=>{
      document.getElementById('del-confirm').addEventListener('click',()=>{
        logActivity('user_deleted', 'Compte supprimé : ' + u.username);
        db.users=db.users.filter(x=>x.id!==userId);
        db.projects.forEach(p=>{ if(p.clientId===userId) p.clientId=null; });
        saveDB(); closeModal(); refreshAdminTab();
      });
    });
  }

  // ── Confirm Delete Project ─────────────────────
  // ── Deliver Files Modal ───────────────────────
  function openDeliverFilesModal(projectId){
    const p = db.projects.find(x=>x.id===projectId);
    if(!p) return;
    const existing = p.deliverable;
    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
        <h2 style="font-size:1.1rem;font-weight:700;">📦 Livrer les fichiers</h2>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <p style="font-size:.85rem;color:var(--ink-3);margin-bottom:18px;">Projet : <strong>${esc(p.name)}</strong></p>
      ${existing?`<div style="background:rgba(147,181,148,.1);border:1px solid rgba(147,181,148,.25);border-radius:12px;padding:12px 16px;margin-bottom:18px;display:flex;align-items:center;gap:12px;">
        <span>📦</span>
        <div style="flex:1;font-size:.85rem;color:#b6d1b7;">${esc(existing.name)} <span style="color:var(--ink-4);font-size:.75rem;">(${(existing.size/1024/1024).toFixed(2)} Mo — livré le ${new Date(existing.deliveredAt).toLocaleDateString('fr-FR')})</span></div>
        <button id="btn-remove-delivery" class="btn btn-danger btn-sm">✕ Retirer</button>
      </div>`:''}
      <div style="border:2px dashed var(--glass-edge-hi);border-radius:14px;padding:28px;text-align:center;margin-bottom:16px;transition:border-color .2s;" id="drop-zone">
        <div style="font-size:2rem;margin-bottom:8px;">ðŸ“‚</div>
        <div style="font-size:.875rem;color:var(--ink-2);margin-bottom:10px;">Glisser un fichier ici ou</div>
        <label class="btn btn-ghost btn-sm" style="cursor:pointer;">Parcourir<input type="file" id="deliver-file-input" style="display:none;" /></label>
        <div id="deliver-file-info" style="margin-top:12px;font-size:.82rem;color:var(--ink-3);"></div>
      </div>
      <div id="deliver-progress" style="display:none;margin-bottom:14px;">
        <div style="height:6px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden;">
          <div id="deliver-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,var(--coral),var(--sage));border-radius:4px;transition:width .3s;"></div>
        </div>
        <div id="deliver-progress-txt" style="font-size:.75rem;color:var(--ink-4);margin-top:6px;text-align:center;">Lecture en cours…</div>
      </div>
      <div id="deliver-msg" style="display:none;margin-bottom:14px;padding:10px 14px;border-radius:8px;font-size:.85rem;"></div>
      <div style="display:flex;gap:10px;">
        <button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Annuler</button>
        <button id="deliver-save" class="btn btn-primary" style="flex:1;justify-content:center;" disabled>📤 Enregistrer la livraison</button>
      </div>`,
    ()=>{
      let fileData = null;
      const MAX_SIZE = 9 * 1024 * 1024; // 9MB base64 limit (~6.5MB file)
      const input = document.getElementById('deliver-file-input');
      const info  = document.getElementById('deliver-file-info');
      const saveBtn = document.getElementById('deliver-save');
      const msg   = document.getElementById('deliver-msg');

      function handleFile(file){
        if(!file) return;
        if(file.size > MAX_SIZE){
          showMsg(msg, `Fichier trop volumineux (${(file.size/1024/1024).toFixed(1)} Mo). Limite : 6,5 Mo.`, 'error');
          return;
        }
        info.innerHTML = `<span style="color:var(--sage);">✓</span> ${esc(file.name)} — ${(file.size/1024/1024).toFixed(2)} Mo`;
        document.getElementById('deliver-progress').style.display = 'block';
        const reader = new FileReader();
        reader.onprogress = e=>{ if(e.lengthComputable){ const pct=Math.round(e.loaded/e.total*100); document.getElementById('deliver-progress-bar').style.width=pct+'%'; document.getElementById('deliver-progress-txt').textContent=pct+'% lu…'; } };
        reader.onload = e=>{
          fileData = {name:file.name, size:file.size, type:file.type, data:e.target.result, deliveredAt:new Date().toISOString(), deliveredBy:me.username};
          document.getElementById('deliver-progress-bar').style.width='100%';
          document.getElementById('deliver-progress-txt').textContent='Prêt Ã  enregistrer';
          saveBtn.disabled = false;
        };
        reader.onerror = ()=>showMsg(msg,'Erreur de lecture du fichier.','error');
        reader.readAsDataURL(file);
      }

      input.addEventListener('change',()=>handleFile(input.files[0]));

      const dropZone = document.getElementById('drop-zone');
      dropZone.addEventListener('dragover',e=>{ e.preventDefault(); dropZone.style.borderColor='var(--coral)'; });
      dropZone.addEventListener('dragleave',()=>{ dropZone.style.borderColor=''; });
      dropZone.addEventListener('drop',e=>{ e.preventDefault(); dropZone.style.borderColor=''; handleFile(e.dataTransfer.files[0]); });

      document.getElementById('btn-remove-delivery')?.addEventListener('click',()=>{
        if(!confirm('Retirer la livraison existante ?')) return;
        p.deliverable = null;
        logActivity('delivery_removed','Livraison retirée : '+p.name);
        saveDB(); toast('Livraison retirée.','info'); closeModal(); refreshAdminTab();
      });

      saveBtn.addEventListener('click',()=>{
        if(!fileData){ showMsg(msg,'Sélectionnez un fichier.','error'); return; }
        saveBtn.disabled=true; saveBtn.textContent='Enregistrement…';
        p.deliverable = fileData;
        logActivity('delivery_uploaded','Fichiers livrés pour : '+p.name+' ('+fileData.name+')');
        saveDB();
        toast('Fichiers livrés Ã  '+p.name+' !','success');
        closeModal(); refreshAdminTab();
      });
    });
  }

  function downloadDelivery(projectId){
    const p = db.projects.find(x=>x.id===projectId);
    if(!p||!p.deliverable) return;
    const a = document.createElement('a');
    a.href = p.deliverable.data;
    a.download = p.deliverable.name;
    a.click();
    toast('Téléchargement démarré…','success');
  }

  function confirmDeleteProject(projectId){
    const p=db.projects.find(x=>x.id===projectId);
    if(!p) return;
    showModal(`
      <div style="text-align:center;padding:8px 0;">
        <div style="font-size:2.5rem;margin-bottom:12px;">âš ï¸</div>
        <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:8px;">Supprimer le projet ?</h2>
        <p style="font-size:.9rem;color:var(--coral-soft);font-weight:600;margin-bottom:8px;">${esc(p.name)}</p>
        <p style="color:rgba(244,238,229,.5);font-size:.875rem;margin-bottom:24px;">Cette action est irréversible. La timeline et les documents associés seront supprimés.</p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button onclick="closeModal()" class="btn btn-ghost">Annuler</button>
          <button id="del-proj-confirm" class="btn btn-danger">Supprimer le projet</button>
        </div>
      </div>`,
    ()=>{
      document.getElementById('del-proj-confirm').addEventListener('click',()=>{
        logActivity('project_deleted', 'Projet supprimé : ' + p.name);
        db.projects=db.projects.filter(x=>x.id!==projectId);
        db.documents=db.documents.filter(d=>d.projectId!==projectId);
        saveDB(); toast('Projet supprimé.','info'); closeModal(); refreshAdminTab();
      });
    });
  }

  // ── Edit Timeline Modal ────────────────────────
  function openEditTimelineModal(projectId, userId){
    const p=db.projects.find(x=>x.id===projectId);
    if(!p) return;
    const u=db.users.find(x=>x.id===userId);
    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
        <h2 style="font-size:1.1rem;font-weight:700;">Timeline — ${esc(p.name)}</h2>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <div id="tl-steps">
        ${p.timeline.map((s,i)=>`
          <div style="margin-bottom:8px;padding:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;cursor:grab;" draggable="true" data-sid="${s.id}">
            <div style="display:grid;grid-template-columns:auto 1fr auto auto auto;gap:8px;align-items:center;margin-bottom:6px;">
              <span style="color:var(--ink-4);font-size:.85rem;cursor:grab;" title="Glisser pour réordonner">â ¿</span>
              <input class="glass-input tl-label-input" value="${esc(s.label)}" placeholder="Ã‰tape" data-sid="${s.id}" />
              <input type="date" class="glass-input tl-date-input" style="width:130px;" data-sid="${s.id}" value="${s.dueDate||''}" />
              <select class="glass-input tl-status-select" style="width:120px;" data-sid="${s.id}">
                <option value="done"    ${s.status==='done'   ?'selected':''}>✅ Fait</option>
                <option value="current" ${s.status==='current'?'selected':''}>â–¶ï¸ En cours</option>
                <option value="pending" ${s.status==='pending'?'selected':''}>⏳ À faire</option>
              </select>
              <button class="btn btn-danger btn-sm tl-del" data-sid="${s.id}" title="Supprimer">ðŸ—‘</button>
            </div>
            <input class="glass-input tl-note-input" placeholder="Note sur cette étape (optionnel)…" value="${esc(s.note||'')}" data-sid="${s.id}" style="font-size:.8rem;" />
          </div>`).join('')}
      </div>
      <button id="tl-add" class="btn btn-ghost" style="width:100%;justify-content:center;margin:10px 0;">+ Ajouter une étape</button>
      <div style="margin-bottom:14px;">
        <label class="label">Description du projet (optionnel)</label>
        <textarea id="tl-desc" class="glass-input" placeholder="Décrivez brièvement le projet…">${esc(p.description||'')}</textarea>
      </div>
      <div style="margin-bottom:14px;">
        <label class="label">Message d'accueil client (affiché sur son tableau de bord)</label>
        <textarea id="tl-welcome" class="glass-input" placeholder="Ex : Bonjour ! Voici l'avancement de votre projet. N'hésitez pas Ã  remplir les documents ci-dessous." style="min-height:70px;">${esc(p.welcomeMessage||'')}</textarea>
      </div>
      <div style="margin-bottom:14px;">
        <label class="label">Tags (séparés par des virgules)</label>
        <input id="tl-tags" class="glass-input" placeholder="Ex : urgent, VIP, e-commerce" value="${esc((p.tags||[]).join(', '))}" />
      </div>
      <div style="margin-bottom:14px;">
        <label class="label">Couleur du projet</label>
        <div id="tl-colors" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
          ${['#d97757','#93b594','#9bb8d8','#c4a3d4','#f0c080','#e07080','#70b8b8','#b0b0b0'].map(c=>`
            <div class="color-dot${p.color===c?' selected':''}" data-color="${c}" style="background:${c};" title="${c}"></div>`).join('')}
        </div>
        <input type="hidden" id="tl-color" value="${esc(p.color||'')}" />
      </div>
      <div style="margin-bottom:14px;">
        <label class="label">Date de livraison (optionnel)</label>
        <input id="tl-due" class="glass-input" type="date" value="${esc(p.dueDate||'')}" />
      </div>
      <div style="margin-bottom:14px;">
        <label class="label">Statut du projet</label>
        <select id="tl-proj-status" class="glass-input">
          <option value="in_progress" ${p.status==='in_progress'?'selected':''}>En cours</option>
          <option value="done"        ${p.status==='done'?'selected':''}>Terminé</option>
          <option value="pending"     ${p.status==='pending'?'selected':''}>En attente</option>
        </select>
      </div>
      <div style="margin-bottom:14px;">
        <label class="label">Priorité</label>
        <select id="tl-priority" class="glass-input">
          <option value="urgent" ${p.priority==='urgent'?'selected':''}>🔴 Urgent</option>
          <option value="normal"  ${(p.priority||'normal')==='normal'?'selected':''}>🔵 Normal</option>
          <option value="low"     ${p.priority==='low'?'selected':''}>⚪ Basse priorité</option>
        </select>
      </div>
      <div style="margin-bottom:14px;">
        <label class="label">FAQ client (questions / réponses)</label>
        <div id="tl-faq-list">
          ${(p.faq||[]).map((f,i)=>`
            <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:10px;margin-bottom:8px;" data-fidx="${i}">
              <input class="glass-input faq-q" placeholder="Question…" value="${esc(f.q||'')}" style="margin-bottom:6px;font-size:.82rem;" />
              <textarea class="glass-input faq-a" placeholder="Réponse…" style="font-size:.82rem;min-height:50px;">${esc(f.a||'')}</textarea>
              <button class="btn btn-danger btn-sm faq-del" data-fidx="${i}" style="margin-top:6px;">ðŸ—‘ Supprimer</button>
            </div>`).join('')}
        </div>
        <button id="tl-add-faq" class="btn btn-ghost btn-sm" style="margin-top:4px;">+ Ajouter Q&A</button>
      </div>
      <div style="display:flex;gap:10px;">
        <button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Annuler</button>
        <button id="tl-save" class="btn btn-primary" style="flex:1;justify-content:center;">ðŸ’¾ Enregistrer</button>
      </div>
      ${(()=>{
        const projLogs = (db.activityLog||[]).filter(e=>e.projectId===projectId||e.description&&e.description.includes(p.name)).slice(0,8);
        if(!projLogs.length) return '';
        return `<div style="margin-top:20px;border-top:1px solid rgba(255,255,255,.07);padding-top:16px;">
          <div style="font-size:.78rem;font-weight:600;color:var(--ink-4);letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Historique du projet</div>
          ${projLogs.map(e=>`<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);">
            <span style="font-size:.8rem;color:var(--ink-3);flex:1;">${esc(e.description)}</span>
            <span style="font-size:.7rem;color:var(--ink-4);white-space:nowrap;">${e.at?new Date(e.at).toLocaleDateString('fr-FR'):'—'}</span>
          </div>`).join('')}
        </div>`;
      })()}`,
    ()=>{
      document.getElementById('tl-add').addEventListener('click',()=>{
        const container=document.getElementById('tl-steps');
        const newId=uid();
        const div=document.createElement('div');
        div.style.cssText='margin-bottom:8px;padding:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:10px;';
        div.dataset.sid=newId;
        div.innerHTML=`
          <div style="display:grid;grid-template-columns:1fr auto auto auto;gap:8px;align-items:center;margin-bottom:6px;">
            <input class="glass-input tl-label-input" value="" placeholder="Nouvelle étape" data-sid="${newId}" />
            <input type="date" class="glass-input tl-date-input" style="width:130px;" data-sid="${newId}" value="" />
            <select class="glass-input tl-status-select" style="width:120px;" data-sid="${newId}">
              <option value="done">✅ Fait</option>
              <option value="current">â–¶ï¸ En cours</option>
              <option value="pending" selected>⏳ À faire</option>
            </select>
            <button class="btn btn-danger btn-sm tl-del" data-sid="${newId}" title="Supprimer">ðŸ—‘</button>
          </div>
          <input class="glass-input tl-note-input" placeholder="Note sur cette étape (optionnel)…" value="" data-sid="${newId}" style="font-size:.8rem;" />`;
        container.appendChild(div);
        div.querySelector('.tl-del').addEventListener('click',()=>div.remove());
      });

      // Drag & drop reorder steps
      const tlSteps = document.getElementById('tl-steps');
      let dragSrc = null;
      tlSteps.querySelectorAll('[data-sid]').forEach(row=>{
        row.addEventListener('dragstart',e=>{ dragSrc=row; row.style.opacity='.4'; e.dataTransfer.effectAllowed='move'; });
        row.addEventListener('dragend',()=>{ row.style.opacity=''; dragSrc=null; });
        row.addEventListener('dragover',e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; });
        row.addEventListener('drop',e=>{
          e.preventDefault();
          if(dragSrc&&dragSrc!==row){
            const rows=Array.from(tlSteps.querySelectorAll('[data-sid]'));
            const srcIdx=rows.indexOf(dragSrc), tgtIdx=rows.indexOf(row);
            if(srcIdx<tgtIdx) row.after(dragSrc); else row.before(dragSrc);
          }
        });
      });

      document.querySelectorAll('.tl-del').forEach(b=>{
        b.addEventListener('click',()=>b.closest('[data-sid]').remove());
      });

      document.getElementById('tl-add-faq')?.addEventListener('click',()=>{
        const list=document.getElementById('tl-faq-list');
        const idx=list.querySelectorAll('[data-fidx]').length;
        const div=document.createElement('div');
        div.style.cssText='background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:10px;margin-bottom:8px;';
        div.dataset.fidx=idx;
        div.innerHTML=`<input class="glass-input faq-q" placeholder="Question…" style="margin-bottom:6px;font-size:.82rem;" /><textarea class="glass-input faq-a" placeholder="Réponse…" style="font-size:.82rem;min-height:50px;"></textarea><button class="btn btn-danger btn-sm faq-del" data-fidx="${idx}" style="margin-top:6px;">ðŸ—‘ Supprimer</button>`;
        div.querySelector('.faq-del').addEventListener('click',()=>div.remove());
        list.appendChild(div);
      });
      document.querySelectorAll('.faq-del').forEach(b=>b.addEventListener('click',()=>b.closest('[data-fidx]').remove()));

      // F11 — Color picker in edit modal
      document.querySelectorAll('#tl-colors .color-dot').forEach(dot=>{
        dot.addEventListener('click',()=>{
          document.querySelectorAll('#tl-colors .color-dot').forEach(d=>d.classList.remove('selected'));
          dot.classList.add('selected');
          document.getElementById('tl-color').value = dot.dataset.color;
        });
      });

      document.getElementById('tl-save').addEventListener('click',()=>{
        const steps=[];
        document.querySelectorAll('#tl-steps [data-sid]').forEach(row=>{
          const sid=row.dataset.sid;
          const labelEl=row.querySelector('.tl-label-input');
          const statusEl=row.querySelector('.tl-status-select');
          if(!labelEl||!statusEl) return;
          const label=labelEl.value.trim();
          const status=statusEl.value;
          const dueDate=row.querySelector('.tl-date-input')?.value||'';
          const note=row.querySelector('.tl-note-input')?.value||'';
          if(label) steps.push({id:sid,label,status,dueDate,date:null,note});
        });
        p.timeline=steps;
        p.description=document.getElementById('tl-desc').value.trim();
        p.dueDate=document.getElementById('tl-due').value||'';
        p.status=document.getElementById('tl-proj-status').value;
        p.priority=document.getElementById('tl-priority')?.value||'normal';
        p.welcomeMessage=document.getElementById('tl-welcome')?.value.trim()||'';
        p.color=document.getElementById('tl-color')?.value||'';
        p.tags=document.getElementById('tl-tags')?.value.split(',').map(t=>t.trim()).filter(Boolean)||[];
        const faqItems=[];
        document.querySelectorAll('#tl-faq-list [data-fidx]').forEach(row=>{
          const q=row.querySelector('.faq-q')?.value.trim();
          const a=row.querySelector('.faq-a')?.value.trim();
          if(q) faqItems.push({q,a:a||''});
        });
        p.faq=faqItems;
        if(p.status==='done') launchConfetti();
        saveDB(); closeModal(); refreshAdminTab();
      });
    });
  }

  // ── Send Document Modal ────────────────────────
  function openSendDocModal(clientId, projectId){
    if(!projectId){ alert('Associez d\'abord un projet Ã  ce client.'); return; }
    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
        <h2 style="font-size:1.1rem;font-weight:700;">Envoyer un document</h2>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <div style="margin-bottom:14px;"><label class="label">Nom du document</label><input id="sd-name" class="glass-input" placeholder="Ex : Questionnaire Brief Client" /></div>
      ${(db.docTemplates||[]).length>0?`<div style="margin-bottom:14px;"><label class="label">Charger un modèle</label><div style="display:flex;gap:8px;"><select id="sd-tpl" class="glass-input" style="flex:1;"><option value="">— Choisir un modèle —</option>${(db.docTemplates||[]).map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select><button id="sd-load-tpl" class="btn btn-ghost btn-sm">Charger</button></div></div>`:''}
      <div id="sd-fields">
        <div class="label" style="margin-bottom:8px;">Champs du formulaire</div>
        <div id="sd-fields-list">
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input class="glass-input sd-field-label" placeholder="Question ou champ" style="flex:1;" />
            <select class="glass-input sd-field-type" style="width:110px;">
              <option value="text">Texte</option>
              <option value="textarea">Paragraphe</option>
            </select>
            <input type="checkbox" class="sd-field-req" title="Champ requis" style="width:16px;height:16px;accent-color:var(--coral);cursor:pointer;" />
          </div>
        </div>
        <button id="sd-add-field" class="btn btn-ghost btn-sm" style="margin-bottom:16px;">+ Champ</button>
      </div>
      <div id="sd-msg" style="display:none;margin-bottom:14px;padding:10px 14px;border-radius:8px;font-size:.85rem;"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;min-width:100px;">Annuler</button>
        <button id="sd-save-tpl" class="btn btn-ghost btn-sm" style="flex-shrink:0;" title="Sauvegarder comme modèle">ðŸ’¾ Modèle</button>
        <button id="sd-send" class="btn btn-primary" style="flex:1;justify-content:center;min-width:100px;">📤 Envoyer</button>
      </div>`,
    ()=>{
      const tplLoadBtn = document.getElementById('sd-load-tpl');
      if(tplLoadBtn) tplLoadBtn.addEventListener('click',()=>{
        const tplId = document.getElementById('sd-tpl').value;
        const tpl = (db.docTemplates||[]).find(t=>t.id===tplId);
        if(!tpl) return;
        document.getElementById('sd-name').value = tpl.name;
        const list = document.getElementById('sd-fields-list');
        list.innerHTML = tpl.fields.map(f=>`<div style="display:flex;gap:8px;margin-bottom:8px;">
          <input class="glass-input sd-field-label" placeholder="Question ou champ" style="flex:1;" value="${esc(f.label)}" />
          <select class="glass-input sd-field-type" style="width:110px;"><option value="text"${f.type==='text'?' selected':''}>Texte</option><option value="textarea"${f.type==='textarea'?' selected':''}>Paragraphe</option></select>
          <input type="checkbox" class="sd-field-req" title="Champ requis" style="width:16px;height:16px;accent-color:var(--coral);cursor:pointer;"${f.required?' checked':''} />
          <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button></div>`).join('');
        toast('Modèle chargé.','success');
      });

      document.getElementById('sd-save-tpl').addEventListener('click',()=>{
        const name = document.getElementById('sd-name').value.trim();
        if(!name){ toast('Donnez un nom au document d\'abord.','error'); return; }
        const fields = [];
        document.querySelectorAll('#sd-fields-list > div').forEach(row=>{
          const label = row.querySelector('.sd-field-label')?.value.trim();
          const type  = row.querySelector('.sd-field-type')?.value||'text';
          const req   = row.querySelector('.sd-field-req')?.checked||false;
          if(label) fields.push({label,type,required:req});
        });
        if(!db.docTemplates) db.docTemplates=[];
        db.docTemplates.push({id:uid(),name,fields});
        saveDB(); toast('Modèle "'+name+'" sauvegardé !','success');
      });

      document.getElementById('sd-add-field').addEventListener('click',()=>{
        const list=document.getElementById('sd-fields-list');
        const row=document.createElement('div');
        row.style.cssText='display:flex;gap:8px;margin-bottom:8px;';
        row.innerHTML=`
          <input class="glass-input sd-field-label" placeholder="Question ou champ" style="flex:1;" />
          <select class="glass-input sd-field-type" style="width:110px;">
            <option value="text">Texte</option>
            <option value="textarea">Paragraphe</option>
          </select>
          <input type="checkbox" class="sd-field-req" title="Champ requis" style="width:16px;height:16px;accent-color:var(--coral);cursor:pointer;" />
          <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button>`;
        list.appendChild(row);
      });

      document.getElementById('sd-send').addEventListener('click',()=>{
        const name=document.getElementById('sd-name').value.trim();
        const msg=document.getElementById('sd-msg');
        if(!name){ showMsg(msg,'Le nom du document est requis.','error'); return; }

        const fields=[];
        document.querySelectorAll('#sd-fields-list > div').forEach(row=>{
          const label=row.querySelector('.sd-field-label')?.value.trim();
          const type=row.querySelector('.sd-field-type')?.value||'text';
          const required=row.querySelector('.sd-field-req')?.checked||false;
          if(label) fields.push({id:uid(),label,type,required,value:''});
        });
        if(fields.length===0){ showMsg(msg,'Ajoutez au moins un champ.','error'); return; }

        const doc={ id:uid(), name, projectId, clientId,
          sentBy:me.id, sentAt:new Date().toISOString().slice(0,10),
          status:'pending', fields, filledAt:null };
        db.documents.push(doc);
        saveDB(); closeModal(); refreshAdminTab();
      });
    });
  }

  // ── Confirm Validate Document (F15) ───────────
  function confirmValidateDoc(docId){
    const doc=db.documents.find(d=>d.id===docId);
    if(!doc) return;
    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
        <h2 style="font-size:1.1rem;font-weight:700;">✅ Valider le document</h2>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <p style="color:var(--ink-2);font-size:.9rem;margin-bottom:16px;">Valider <strong>${esc(doc.name)}</strong> ?</p>
      <div style="margin-bottom:16px;">
        <label class="label">Commentaire pour le client (optionnel)</label>
        <textarea id="val-comment" class="glass-input" placeholder="Tout est validé, merci !" style="min-height:70px;"></textarea>
      </div>
      <div style="display:flex;gap:10px;">
        <button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Annuler</button>
        <button id="val-confirm" class="btn btn-primary" style="flex:1;justify-content:center;">✅ Valider</button>
      </div>`,
    ()=>{
      document.getElementById('val-confirm').addEventListener('click',()=>{
        doc.status='reviewed';
        doc.adminComment=document.getElementById('val-comment').value.trim()||'';
        doc.reviewedAt=new Date().toISOString().slice(0,10);
        logActivity('doc_validated','Document validé : '+doc.name);
        saveDB(); toast('Document validé !','success'); closeModal(); refreshAdminTab();
      });
    });
  }

  // ── View Document Modal (admin) ────────────────
  function openViewDocModal(docId, canValidate){
    const doc=db.documents.find(d=>d.id===docId);
    if(!doc) return;
    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
        <h2 style="font-size:1.1rem;font-weight:700;">📄 ${esc(doc.name)}</h2>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <div style="font-size:.8rem;color:rgba(244,238,229,.4);margin-bottom:20px;">
        Envoyé le ${esc(doc.sentAt||'—')} · Statut : <strong style="color:#d97757;">${{pending:'En attente',filled:'Rempli',reviewed:'Validé'}[doc.status]||doc.status}</strong>
      </div>
      ${doc.fields.map(f=>`
        <div class="pdf-field">
          <label>${esc(f.label)}</label>
          <div class="glass-input" style="opacity:.7;min-height:${f.type==='textarea'?'60px':'auto'};font-size:.85rem;cursor:default;">
            ${f.value?esc(f.value):'<span style="color:rgba(244,238,229,.3);font-style:italic;">Non rempli</span>'}
          </div>
        </div>`).join('')}
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;flex-wrap:wrap;">
        ${canValidate&&doc.status==='filled'?`<button id="doc-validate" class="btn btn-success">✅ Valider</button>`:''}
        <button id="doc-export-pdf" class="btn btn-ghost">📥 Export PDF</button>
        <button onclick="closeModal()" class="btn btn-ghost">Fermer</button>
      </div>`,
    ()=>{
      const btn=document.getElementById('doc-validate');
      if(btn) btn.addEventListener('click',()=>confirmValidateDoc(docId));
      document.getElementById('doc-export-pdf').addEventListener('click',()=>{
        if(!window.jspdf){ toast('jsPDF non chargé','error'); return; }
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        const statusLabels = {pending:'En attente',filled:'Rempli',reviewed:'Validé'};
        pdf.setFont('helvetica','bold'); pdf.setFontSize(18); pdf.setTextColor(217,119,87);
        pdf.text('Flow — Document', 20, 18);
        pdf.setTextColor(30,20,15); pdf.setFontSize(14);
        pdf.text(doc.name, 20, 28);
        pdf.setFont('helvetica','normal'); pdf.setFontSize(9); pdf.setTextColor(120,100,80);
        pdf.text('Envoyé le: '+(doc.sentAt||'—')+'  |  Statut: '+(statusLabels[doc.status]||doc.status), 20, 36);
        pdf.setDrawColor(217,119,87); pdf.setLineWidth(0.5); pdf.line(20, 40, 190, 40);
        let y = 50;
        doc.fields.forEach(f=>{
          pdf.setFont('helvetica','bold'); pdf.setFontSize(10); pdf.setTextColor(50,35,25);
          const labelLines = pdf.splitTextToSize(f.label, 170);
          pdf.text(labelLines, 20, y); y += labelLines.length*5+3;
          pdf.setFont('helvetica','normal'); pdf.setTextColor(80,60,45);
          const valLines = pdf.splitTextToSize(f.value||'(non rempli)', 165);
          pdf.text(valLines, 25, y); y += valLines.length*5+8;
          if(y>275){ pdf.addPage(); y=20; }
        });
        pdf.save(doc.name.replace(/[^a-z0-9]/gi,'_').toLowerCase()+'.pdf');
        toast('PDF exporté !','success');
      });
    });
  }

  // ── Fill Document Modal (client) ───────────────
  function openFillDocModal(docId){
    const doc=db.documents.find(d=>d.id===docId);
    if(!doc) return;
    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
        <h2 style="font-size:1.1rem;font-weight:700;">✏ï¸ ${esc(doc.name)}</h2>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      ${doc.fields.map(f=>`
        <div class="pdf-field">
          <label>${esc(f.label)}${f.required?`<span style="color:var(--coral);margin-left:2px;">*</span>`:''}</label>
          ${f.type==='textarea'
            ?`<textarea class="glass-input doc-field" data-fid="${f.id}">${esc(f.value)}</textarea>`
            :`<input class="glass-input doc-field" type="text" data-fid="${f.id}" value="${esc(f.value)}" />`}
        </div>`).join('')}
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Annuler</button>
        <button id="fill-submit" class="btn btn-primary" style="flex:1;justify-content:center;">📤 Envoyer Ã  l'admin</button>
      </div>`,
    ()=>{
      document.getElementById('fill-submit').addEventListener('click',()=>{
        let hasError=false;
        document.querySelectorAll('.doc-field').forEach(inp=>{
          const f=doc.fields.find(x=>x.id===inp.dataset.fid);
          if(f&&f.required&&!inp.value.trim()){
            inp.style.borderColor='rgba(220,80,80,.6)';
            hasError=true;
          } else {
            inp.style.borderColor='';
          }
        });
        if(hasError){ toast('Certains champs obligatoires sont vides.','error'); return; }
        document.querySelectorAll('.doc-field').forEach(inp=>{
          const f=doc.fields.find(x=>x.id===inp.dataset.fid);
          if(f) f.value=inp.value;
        });
        doc.status='filled';
        doc.filledAt=new Date().toISOString().slice(0,10);
        saveDB(); closeModal();
        refreshClientTab();
      });
    });
  }

  // ─── Tab: Admin Requests ────────────────────────
  function renderAdminRequests(){
    const pending = db.pendingUsers||[];
    const blocked = db.blockedAccounts||[];
    return `<div class="fade-up">
      <h1 style="font-size:1.4rem;font-weight:700;margin-bottom:6px;">Demandes d'inscription</h1>
      <p style="color:var(--ink-3);font-size:.875rem;margin-bottom:24px;">Acceptez, refusez ou bloquez les demandes de création de compte.</p>

      ${pending.length===0
        ? `<div class="glass-card" style="padding:48px;text-align:center;">
            <div style="font-size:2.5rem;margin-bottom:12px;">✅</div>
            <div style="color:var(--ink-3);font-size:.9rem;">Aucune demande en attente.</div>
           </div>`
        : `<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:32px;">
            ${pending.map(u=>`
              <div class="glass-card" style="padding:18px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
                <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--sky),var(--plum));display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700;color:#fff;flex-shrink:0;">${esc((u.firstName||u.username||'?')[0].toUpperCase())}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:600;font-size:.95rem;">${esc(u.firstName||'')} ${esc(u.lastName||'')} <span style="color:var(--ink-3);font-weight:400;">@${esc(u.username)}</span></div>
                  ${u.email?`<div style="font-size:.78rem;color:var(--ink-4);">âœ‰ï¸ ${esc(u.email)}</div>`:''}
                  <div style="font-size:.72rem;color:var(--ink-4);margin-top:2px;">Demandé le ${u.requestedAt?new Date(u.requestedAt).toLocaleString('fr-FR'):'—'}</div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                  <select class="glass-input req-role-select" data-uid="${u.id}" style="width:130px;padding:7px 10px;font-size:.8rem;">
                    <option value="client">Client</option>
                    <option value="controller">Contrôleur</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button class="btn btn-success btn-sm btn-approve-req" data-uid="${u.id}" title="Approuver">✅ Approuver</button>
                  <button class="btn btn-ghost btn-sm btn-reject-req" data-uid="${u.id}" title="Refuser">âŒ Refuser</button>
                  <button class="btn btn-danger btn-sm btn-block-req" data-uid="${u.id}" title="Bloquer">🚫 Bloquer</button>
                </div>
              </div>`).join('')}
           </div>`}

      ${blocked.length>0?`
      <div class="glass-card" style="padding:20px;">
        <h2 style="font-size:.95rem;font-weight:600;margin-bottom:14px;color:#f08a8a;">🚫 Comptes bloqués (${blocked.length})</h2>
        ${blocked.map(b=>`
          <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--glass-edge);">
            <div style="flex:1;min-width:0;">
              <div style="font-size:.85rem;font-weight:500;">@${esc(b.username)}</div>
              ${b.email?`<div style="font-size:.75rem;color:var(--ink-4);">${esc(b.email)}</div>`:''}
              <div style="font-size:.7rem;color:var(--ink-4);">Bloqué le ${b.blockedAt?new Date(b.blockedAt).toLocaleString('fr-FR'):'—'}</div>
            </div>
            <button class="btn btn-ghost btn-sm btn-unblock-req" data-username="${esc(b.username)}" title="Débloquer">â†© Débloquer</button>
          </div>`).join('')}
      </div>`:''}
    </div>`;
  }

  function wireAdminRequests(){
    document.querySelectorAll('.btn-approve-req').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const req = (db.pendingUsers||[]).find(u=>u.id===btn.dataset.uid);
        if(!req) return;
        const roleEl = document.querySelector(`.req-role-select[data-uid="${req.id}"]`);
        const role = roleEl ? roleEl.value : 'client';
        db.users.push({
          id: req.id,
          username: req.username,
          firstName: req.firstName||'',
          lastName: req.lastName||'',
          email: req.email||'',
          password: req.password,
          photo: null,
          role: role,
          internalNote: ''
        });
        db.pendingUsers = (db.pendingUsers||[]).filter(u=>u.id!==req.id);
        logActivity('user_created','Compte approuvé : @'+req.username+' ('+role+')');
        saveDB(); toast('Compte @'+req.username+' approuvé !','success'); refreshAdminTab();
      });
    });

    document.querySelectorAll('.btn-reject-req').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const req = (db.pendingUsers||[]).find(u=>u.id===btn.dataset.uid);
        if(!req) return;
        if(!confirm('Refuser la demande de @'+req.username+' ?')) return;
        db.pendingUsers = (db.pendingUsers||[]).filter(u=>u.id!==req.id);
        logActivity('request_rejected','Demande refusée : @'+req.username);
        saveDB(); toast('Demande refusée.','info'); refreshAdminTab();
      });
    });

    document.querySelectorAll('.btn-block-req').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const req = (db.pendingUsers||[]).find(u=>u.id===btn.dataset.uid);
        if(!req) return;
        if(!confirm('Bloquer @'+req.username+' ? Aucune future demande ne sera acceptée avec ce pseudo/email.')) return;
        if(!db.blockedAccounts) db.blockedAccounts = [];
        db.blockedAccounts.push({ username: req.username, email: req.email||'', blockedAt: new Date().toISOString(), blockedBy: me.username });
        db.pendingUsers = (db.pendingUsers||[]).filter(u=>u.id!==req.id);
        logActivity('request_blocked','Compte bloqué : @'+req.username);
        saveDB(); toast('Compte bloqué.','info'); refreshAdminTab();
      });
    });

    document.querySelectorAll('.btn-unblock-req').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const uname = btn.dataset.username;
        if(!confirm('Débloquer @'+uname+' ?')) return;
        db.blockedAccounts = (db.blockedAccounts||[]).filter(b=>b.username!==uname);
        logActivity('request_unblocked','Compte débloqué : @'+uname);
        saveDB(); toast('Compte débloqué.','success'); refreshAdminTab();
      });
    });
  }

  // ─── Tab: Mon Projet (admin/controller with project) ───
  function renderAdminMyProject(){
    const project = getUserProject(me.id);
    if(!project) return `<div class="fade-up"><div class="glass-card" style="padding:48px;text-align:center;"><div style="font-size:3rem;margin-bottom:12px;">ðŸ“‹</div><div style="color:var(--ink-3);">Aucun projet associé Ã  votre compte.</div></div></div>`;

    const done  = project.timeline.filter(s=>s.status==='done').length;
    const total = project.timeline.length;
    const pct   = total>0 ? Math.round(done/total*100) : 0;

    const ctrDue = project.dueDate && project.status!=='done' ? (()=>{
      const diff = Math.ceil((new Date(project.dueDate)-new Date())/(1000*60*60*24));
      if(diff<0)   return `<div style="background:rgba(220,80,80,.12);border:1px solid rgba(220,80,80,.25);border-radius:14px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:12px;"><span style="font-size:1.4rem;">⏰</span><div><div style="font-size:.9rem;font-weight:600;color:#f08a8a;">Livraison dépassée de ${Math.abs(diff)} jour(s)</div></div></div>`;
      if(diff<=30) return `<div style="background:rgba(155,184,216,.08);border:1px solid rgba(155,184,216,.2);border-radius:14px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;gap:12px;"><span style="font-size:1.4rem;">ðŸŽ¯</span><div><div style="font-size:.9rem;font-weight:600;color:var(--sky);">Livraison dans ${diff} jour(s)</div><div style="font-size:.75rem;color:var(--ink-4);">${new Date(project.dueDate).toLocaleDateString('fr-FR')}</div></div></div>`;
      return '';
    })() : '';

    const prioBadge = {urgent:`<span style="background:rgba(220,80,80,.15);border:1px solid rgba(220,80,80,.35);color:#f08a8a;padding:3px 10px;border-radius:999px;font-size:.72rem;">🔴 Urgent</span>`,normal:'',low:`<span style="background:var(--glass-bg);border:1px solid var(--glass-edge);color:var(--ink-4);padding:3px 10px;border-radius:999px;font-size:.72rem;">⚪ Basse</span>`}[project.priority||'normal']||'';

    return `<div class="fade-up">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:10px;">
        <div>
          <h1 style="font-size:1.4rem;font-weight:700;margin-bottom:4px;">${esc(project.name)}</h1>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${prioBadge}
            ${project.dueDate?`<span style="font-size:.78rem;color:var(--ink-4);">📅 ${new Date(project.dueDate).toLocaleDateString('fr-FR')}</span>`:''}
            <span style="font-size:.78rem;color:var(--ink-4);">· ${pct}% complété</span>
          </div>
        </div>
        ${project.websiteUrl?`<a href="${esc(project.websiteUrl)}" target="_blank" class="btn btn-primary btn-sm">ðŸ”— Voir le site</a>`:''}
      </div>
      ${project.description?`<p style="color:var(--ink-3);font-size:.875rem;margin-bottom:20px;">${esc(project.description)}</p>`:'<div style="margin-bottom:20px;"></div>'}

      ${ctrDue}

      ${project.welcomeMessage?`<div style="background:rgba(155,184,216,.08);border:1px solid rgba(155,184,216,.18);border-radius:14px;padding:16px 20px;margin-bottom:20px;">
        <div style="font-size:.78rem;font-weight:600;color:var(--sky);letter-spacing:.05em;margin-bottom:6px;">MESSAGE DE L'Ã‰QUIPE</div>
        <div style="font-size:.9rem;color:var(--ink-2);line-height:1.5;">${esc(project.welcomeMessage)}</div>
      </div>`:''}

      <div class="glass-card" style="padding:24px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <h2 style="font-size:.95rem;font-weight:600;color:var(--coral-soft);">Progression</h2>
          <span style="font-size:.85rem;font-weight:700;color:var(--coral);">${pct}%</span>
        </div>
        <div style="height:8px;background:rgba(255,255,255,.08);border-radius:6px;margin-bottom:24px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#d97757,#93b594);border-radius:6px;transition:width .5s;"></div>
        </div>
        ${renderFullTimeline(project.timeline)}
      </div>

      ${project.deliverable?`
      <div style="background:rgba(147,181,148,.10);border:1px solid rgba(147,181,148,.28);border-radius:14px;padding:16px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <span style="font-size:1.6rem;">📦</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.9rem;font-weight:600;color:#b6d1b7;">Fichiers livrés — ${esc(project.deliverable.name)}</div>
          <div style="font-size:.75rem;color:var(--ink-4);margin-top:2px;">Livré le ${new Date(project.deliverable.deliveredAt).toLocaleDateString('fr-FR')} · ${(project.deliverable.size/1024/1024).toFixed(2)} Mo</div>
        </div>
        <button class="btn btn-success btn-sm btn-download-delivery" data-pid="${project.id}">â¬‡ï¸ Télécharger</button>
      </div>`:''}

      ${project.tags&&project.tags.length?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">${project.tags.map(t=>`<span style="font-size:.72rem;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:var(--ink-3);">${esc(t)}</span>`).join('')}</div>`:''}

      ${project.faq&&project.faq.length>0?`
      <div class="glass-card" style="padding:20px;">
        <h2 style="font-size:.95rem;font-weight:600;margin-bottom:14px;color:var(--sky);">❓ Questions fréquentes</h2>
        ${project.faq.map(f=>`
          <div style="margin-bottom:12px;padding:12px;background:rgba(255,255,255,.03);border-radius:10px;border:1px solid rgba(255,255,255,.07);">
            <div style="font-size:.875rem;font-weight:600;color:var(--ink-2);margin-bottom:6px;">Q : ${esc(f.q)}</div>
            <div style="font-size:.85rem;color:var(--ink-3);line-height:1.5;">â†³ ${esc(f.a||'—')}</div>
          </div>`).join('')}
      </div>`:''}
    </div>`;
  }

  // ─── Tab: Admin History ─────────────────────────
  function renderAdminHistory(){
    const logs = db.activityLog || [];
    const icons = {login:'🔐',user_created:'ðŸ‘¤',user_deleted:'ðŸ—‘ï¸',project_created:'📁',project_deleted:'ðŸ—‘ï¸',doc_validated:'✅',report_generated:'📄'};
    return `<div class="fade-up">
      <h1 style="font-size:1.4rem;font-weight:700;margin-bottom:6px;">Historique</h1>
      <p style="color:rgba(244,238,229,.45);font-size:.875rem;margin-bottom:24px;">Les 100 dernières actions enregistrées.</p>
      <div class="glass-card" style="padding:0;overflow:hidden;">
        ${logs.length===0
          ? '<div style="padding:32px;text-align:center;color:rgba(244,238,229,.35);">Aucune activité enregistrée.</div>'
          : logs.slice(0,50).map(e=>`
            <div style="display:flex;align-items:center;gap:14px;padding:12px 20px;border-bottom:1px solid rgba(255,255,255,.06);">
              <span style="font-size:1.2rem;">${icons[e.type]||'📝'}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:.875rem;font-weight:500;">${esc(e.description)}</div>
                <div style="font-size:.72rem;color:rgba(244,238,229,.38);">${esc(e.actor)} · ${e.at?new Date(e.at).toLocaleString('fr-FR'):'—'}</div>
              </div>
            </div>`).join('')}
      </div>
    </div>`;
  }
  function wireAdminHistory(){ /* rien Ã  câbler */ }

  // ─── Generate Client Report (PDF) ───────────────
  function generateClientReport(userId){
    const u = db.users.find(x=>x.id===userId);
    const p = getUserProject(userId);
    if(!u||!p) return;
    if(!window.jspdf){ toast('jsPDF non chargé','error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const tl = p.timeline||[];
    const done = tl.filter(s=>s.status==='done');
    const pct = tl.length>0 ? Math.round(done.length/tl.length*100) : 0;
    const docs = getProjectDocs(p.id);
    const docsPending = docs.filter(d=>d.status==='pending').length;
    const docsFilled = docs.filter(d=>d.status==='filled').length;
    const docsReviewed = docs.filter(d=>d.status==='reviewed').length;

    // Header
    doc.setFillColor(217,119,87);
    doc.rect(0,0,210,28,'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(22);
    doc.setFont('helvetica','bold');
    doc.text('flow', 14, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica','normal');
    doc.text('Rapport de projet', 40, 18);
    doc.text(new Date().toLocaleDateString('fr-FR'), 170, 18);

    // Client & project
    doc.setTextColor(26,19,14);
    doc.setFontSize(16);
    doc.setFont('helvetica','bold');
    doc.text((u.firstName||'')+' '+(u.lastName||u.username), 14, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica','normal');
    doc.setTextColor(100,80,60);
    doc.text('Projet : '+p.name, 14, 52);
    if(p.dueDate) doc.text('Livraison prévue : '+new Date(p.dueDate).toLocaleDateString('fr-FR'), 14, 60);

    // Progress bar
    const y1 = p.dueDate?70:62;
    doc.setTextColor(26,19,14);
    doc.setFontSize(12);
    doc.setFont('helvetica','bold');
    doc.text('Progression globale : '+pct+'%', 14, y1);
    doc.setDrawColor(220,200,180);
    doc.setFillColor(240,230,220);
    doc.roundedRect(14, y1+4, 182, 8, 2, 2, 'F');
    if(pct>0){
      doc.setFillColor(217,119,87);
      doc.roundedRect(14, y1+4, Math.round(182*pct/100), 8, 2, 2, 'F');
    }

    // Timeline
    let y = y1+22;
    doc.setFontSize(12);
    doc.setFont('helvetica','bold');
    doc.setTextColor(26,19,14);
    doc.text('Ã‰tapes du projet', 14, y); y+=8;
    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    tl.forEach(s=>{
      const mark = s.status==='done'?'✓':s.status==='current'?'â–¶':'â—‹';
      const col = s.status==='done'?[80,150,80]:s.status==='current'?[217,119,87]:[150,140,130];
      doc.setTextColor(...col);
      doc.text(mark+' '+s.label+(s.dueDate?' ('+new Date(s.dueDate).toLocaleDateString('fr-FR')+')':''), 18, y);
      y+=7;
      if(y>270){ doc.addPage(); y=20; }
    });

    // Documents
    y+=6;
    doc.setFontSize(12);
    doc.setFont('helvetica','bold');
    doc.setTextColor(26,19,14);
    doc.text('Documents', 14, y); y+=8;
    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    doc.setTextColor(60,60,60);
    doc.text('En attente : '+docsPending, 18, y); y+=7;
    doc.text('Remplis : '+docsFilled, 18, y); y+=7;
    doc.text('Validés : '+docsReviewed, 18, y); y+=12;

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180,160,140);
    doc.text('Généré par Flow — '+new Date().toLocaleString('fr-FR'), 14, 285);

    doc.save('rapport_'+u.username+'_'+p.name.replace(/\s+/g,'_')+'.pdf');
    logActivity('report_generated','Rapport généré pour '+u.username);
    saveDB();
    toast('Rapport PDF généré !','success');
  }

  // ════════════════════════════════════════════════
  //  FINANCE
  // ════════════════════════════════════════════════
  function renderAdminFinance(){
    const entries = db.finance||[];
    const projects = db.projects.filter(p=>!p.archived);

    // KPIs
    const total = entries.reduce((s,e)=>s+Number(e.amount||0),0);
    const avgPerProject = entries.length ? Math.round(total/entries.length) : 0;
    const thisMonth = new Date().toISOString().slice(0,7);
    const monthTotal = entries.filter(e=>e.date&&e.date.slice(0,7)===thisMonth).reduce((s,e)=>s+Number(e.amount||0),0);

    // Finance goals
    const monthGoal = db.financeGoal?.monthly||0;
    const annualGoal = db.financeGoal?.annual||0;
    const monthPct = monthGoal>0?Math.min(100,Math.round(monthTotal/monthGoal*100)):0;
    const annualTotal = entries.reduce((s,e)=>{ return (e.date||'').startsWith(new Date().getFullYear().toString())?s+Number(e.amount||0):s; },0);
    const annualPct = annualGoal>0?Math.min(100,Math.round(annualTotal/annualGoal*100)):0;

    // Revenue by project
    const byProject = {};
    entries.forEach(e=>{
      const proj = db.projects.find(p=>p.id===e.projectId);
      const key = proj ? proj.name : (e.label||'—');
      byProject[key] = (byProject[key]||0)+Number(e.amount||0);
    });
    const projectEntries = Object.entries(byProject).sort((a,b)=>b[1]-a[1]);
    const maxAmt = projectEntries.length ? projectEntries[0][1] : 1;

    // Revenue by month (last 12)
    const monthMap = {};
    entries.forEach(e=>{
      if(!e.date) return;
      const m = e.date.slice(0,7);
      monthMap[m] = (monthMap[m]||0)+Number(e.amount||0);
    });
    const months = Object.keys(monthMap).sort().slice(-12);
    const maxMonth = months.length ? Math.max(...months.map(m=>monthMap[m])) : 1;

    // Pie chart data (by project, conic-gradient)
    let cumulPct = 0;
    const COLORS = ['#d97757','#93b594','#9bb8d8','#c4a3d4','#f0c080','#e07080','#70b8b8','#b0b0b0'];
    const pieSegments = projectEntries.slice(0,8).map((e,i)=>{
      const pct = total>0 ? (e[1]/total*100) : (100/projectEntries.length);
      const start = cumulPct;
      cumulPct += pct;
      return {label:e[0], pct, start, color:COLORS[i%COLORS.length]};
    });
    const pieGradient = total===0 ? 'rgba(255,255,255,.1)' : pieSegments.map(s=>`${s.color} ${s.start.toFixed(1)}% ${(s.start+s.pct).toFixed(1)}%`).join(', ');

    const fmtAmt = n => n.toLocaleString('fr-FR')+'â‚¬';

    return `<div class="fade-up">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:12px;">
        <h1 style="font-size:1.4rem;font-weight:700;">Finance</h1>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button id="btn-export-finance-csv" class="btn btn-ghost btn-sm">ðŸ“Š Exporter CSV</button>
          <button id="btn-gen-devis" class="btn btn-ghost">📄 Devis / Facture</button>
          <button id="btn-add-revenue" class="btn btn-primary">${iconPlus()} Ajouter entrée</button>
        </div>
      </div>
      <p style="color:rgba(244,238,229,.45);font-size:.875rem;margin-bottom:24px;">Revenus par projet · Visible uniquement par admin et contrôleur</p>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:28px;">
        <div class="glass-card stat-card">
          <span style="font-size:1.5rem;">ðŸ’°</span>
          <div style="font-size:1.8rem;font-weight:700;color:var(--sage);margin-top:8px;">${fmtAmt(total)}</div>
          <div style="font-size:.82rem;font-weight:600;color:var(--ink-2);margin-top:4px;">Revenu total</div>
          <div style="font-size:.72rem;color:var(--ink-4);">${entries.length} entrée(s)</div>
        </div>
        <div class="glass-card stat-card">
          <span style="font-size:1.5rem;">📅</span>
          <div style="font-size:1.8rem;font-weight:700;color:var(--sky);margin-top:8px;">${fmtAmt(monthTotal)}</div>
          <div style="font-size:.82rem;font-weight:600;color:var(--ink-2);margin-top:4px;">Ce mois</div>
          <div style="font-size:.72rem;color:var(--ink-4);">${thisMonth}</div>
        </div>
        <div class="glass-card stat-card">
          <span style="font-size:1.5rem;">ðŸ“Š</span>
          <div style="font-size:1.8rem;font-weight:700;color:var(--peach);margin-top:8px;">${fmtAmt(avgPerProject)}</div>
          <div style="font-size:.82rem;font-weight:600;color:var(--ink-2);margin-top:4px;">Moy. par entrée</div>
          <div style="font-size:.72rem;color:var(--ink-4);">${projectEntries.length} projet(s)</div>
        </div>
      </div>

      <!-- Goals -->
      <div class="glass-card" style="padding:20px;margin-bottom:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${(monthGoal>0||annualGoal>0)?'14':'0'}px;">
          <h2 style="font-size:.95rem;font-weight:600;color:var(--peach);">ðŸŽ¯ Objectifs</h2>
          <button id="btn-edit-goals" class="btn btn-ghost btn-sm">Modifier</button>
        </div>
        ${monthGoal<=0&&annualGoal<=0?`<div style="font-size:.82rem;color:var(--ink-4);">Aucun objectif défini. Cliquez sur "Modifier".</div>`:''}
        ${monthGoal>0?`
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:5px;"><span style="color:var(--ink-2);">Ce mois</span><span style="color:var(--peach);font-weight:600;">${fmtAmt(monthTotal)} / ${fmtAmt(monthGoal)} · ${monthPct}%</span></div>
          <div style="height:8px;background:rgba(255,255,255,.06);border-radius:6px;overflow:hidden;"><div style="height:100%;width:${monthPct}%;background:linear-gradient(90deg,var(--peach),var(--coral));border-radius:6px;"></div></div>
        </div>`:''}
        ${annualGoal>0?`
        <div>
          <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:5px;"><span style="color:var(--ink-2);">Cette année</span><span style="color:var(--sage);font-weight:600;">${fmtAmt(annualTotal)} / ${fmtAmt(annualGoal)} · ${annualPct}%</span></div>
          <div style="height:8px;background:rgba(255,255,255,.06);border-radius:6px;overflow:hidden;"><div style="height:100%;width:${annualPct}%;background:linear-gradient(90deg,var(--sage),var(--sky));border-radius:6px;"></div></div>
        </div>`:''}
      </div>

      <!-- Charts -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">

        <!-- Bar chart : revenus par projet -->
        <div class="glass-card" style="padding:20px;">
          <h2 style="font-size:.95rem;font-weight:600;margin-bottom:16px;color:var(--coral-soft);">Revenus par projet</h2>
          ${projectEntries.length===0
            ? '<div style="color:rgba(244,238,229,.35);font-size:.85rem;">Aucune donnée.</div>'
            : projectEntries.slice(0,8).map(([label,amt])=>`
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                <div style="font-size:.78rem;color:var(--ink-2);width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0;" title="${esc(label)}">${esc(label)}</div>
                <div style="flex:1;height:10px;background:rgba(255,255,255,.06);border-radius:6px;overflow:hidden;">
                  <div style="height:100%;width:${Math.round(amt/maxAmt*100)}%;background:linear-gradient(90deg,var(--coral),var(--peach));border-radius:6px;transition:width .4s;"></div>
                </div>
                <div style="font-size:.78rem;font-weight:600;color:var(--coral-soft);flex-shrink:0;">${fmtAmt(amt)}</div>
              </div>`).join('')}
        </div>

        <!-- Pie chart : répartition -->
        <div class="glass-card" style="padding:20px;">
          <h2 style="font-size:.95rem;font-weight:600;margin-bottom:16px;color:var(--sky);">Répartition</h2>
          ${pieSegments.length===0
            ? '<div style="color:rgba(244,238,229,.35);font-size:.85rem;">Aucune donnée.</div>'
            : `<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
                <div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(${pieGradient});flex-shrink:0;"></div>
                <div style="flex:1;min-width:120px;">
                  ${pieSegments.map(s=>`
                    <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px;">
                      <div style="width:10px;height:10px;border-radius:2px;background:${s.color};flex-shrink:0;"></div>
                      <span style="font-size:.75rem;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.label)}</span>
                      <span style="font-size:.72rem;color:var(--ink-4);margin-left:auto;">${s.pct.toFixed(0)}%</span>
                    </div>`).join('')}
                </div>
              </div>`}
        </div>
      </div>

      <!-- Monthly bar chart -->
      ${months.length>0?`
      <div class="glass-card" style="padding:20px;margin-bottom:24px;">
        <h2 style="font-size:.95rem;font-weight:600;margin-bottom:16px;color:var(--sage);">Ã‰volution mensuelle</h2>
        <div style="display:flex;align-items:flex-end;gap:8px;height:80px;overflow-x:auto;padding-bottom:4px;">
          ${months.map(m=>{
            const h = Math.max(4, Math.round(monthMap[m]/maxMonth*72));
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:40px;">
              <div style="font-size:.68rem;color:var(--ink-4);">${fmtAmt(monthMap[m])}</div>
              <div style="width:28px;height:${h}px;background:linear-gradient(180deg,var(--sage),rgba(147,181,148,.4));border-radius:4px 4px 0 0;"></div>
              <div style="font-size:.65rem;color:var(--ink-4);">${m.slice(5)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`:''}

      <!-- Table des entrées -->
      <div class="glass-card" style="padding:20px;">
        <h2 style="font-size:.95rem;font-weight:600;margin-bottom:14px;color:var(--ink-2);">Toutes les entrées</h2>
        ${entries.length===0
          ? '<div style="color:rgba(244,238,229,.35);font-size:.85rem;padding:8px 0;">Aucune entrée. Cliquez sur "+ Ajouter" pour commencer.</div>'
          : `<div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
              <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,.1);">
                  <th style="text-align:left;padding:8px 10px;color:var(--ink-3);font-weight:500;">Projet</th>
                  <th style="text-align:right;padding:8px 10px;color:var(--ink-3);font-weight:500;">Montant</th>
                  <th style="text-align:left;padding:8px 10px;color:var(--ink-3);font-weight:500;">Date</th>
                  <th style="text-align:left;padding:8px 10px;color:var(--ink-3);font-weight:500;">Statut</th>
                  <th style="text-align:left;padding:8px 10px;color:var(--ink-3);font-weight:500;">Note</th>
                  <th style="padding:8px 10px;"></th>
                </tr>
              </thead>
              <tbody>
                ${[...entries].reverse().map(e=>`
                  <tr style="border-bottom:1px solid rgba(255,255,255,.05);">
                    <td style="padding:9px 10px;color:var(--ink-2);">${esc(db.projects.find(p=>p.id===e.projectId)?.name||e.label||'—')}</td>
                    <td style="padding:9px 10px;text-align:right;font-weight:600;color:var(--sage);">${fmtAmt(Number(e.amount||0))}</td>
                    <td style="padding:9px 10px;color:var(--ink-3);">${esc(e.date||'—')}</td>
                    <td style="padding:9px 10px;"><span style="font-size:.72rem;padding:2px 8px;border-radius:999px;${e.paymentStatus==='paid'?'background:rgba(147,181,148,.18);color:#b6d1b7;border:1px solid rgba(147,181,148,.3);':e.paymentStatus==='partial'?'background:rgba(240,169,136,.18);color:var(--peach);border:1px solid rgba(240,169,136,.3);':'background:rgba(155,184,216,.12);color:var(--sky);border:1px solid rgba(155,184,216,.3);'}">${e.paymentStatus==='paid'?'✅ Payé':e.paymentStatus==='partial'?'🔶 Partiel':'⏳ Attente'}</span></td>
                    <td style="padding:9px 10px;color:var(--ink-4);font-size:.8rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(e.note||e.label||'')}</td>
                    <td style="padding:9px 10px;text-align:right;">
                      <button class="btn btn-danger btn-sm btn-del-finance" data-fid="${e.id}">ðŸ—‘</button>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`}
      </div>
    </div>`;
  }

  function wireAdminFinance(){
    document.getElementById('btn-export-finance-csv')?.addEventListener('click',()=>{
      const rows = [['Projet','Montant','Date','Statut paiement','Note','Ajouté par']];
      (db.finance||[]).forEach(e=>{
        const pname = db.projects.find(p=>p.id===e.projectId)?.name||e.label||'—';
        rows.push([pname, e.amount||0, e.date||'', e.paymentStatus||'paid', e.note||e.label||'', e.addedBy||'']);
      });
      const csv = rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
      const blob = new Blob(['ï»¿'+csv],{type:'text/csv;charset=utf-8'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download='flow_finance_'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
      toast('CSV exporté !','success');
    });
    const btnAdd = document.getElementById('btn-add-revenue');
    if(btnAdd) btnAdd.addEventListener('click',()=>openAddRevenueModal());

    document.getElementById('btn-gen-devis')?.addEventListener('click',openDevisModal);

    const btnGoals=document.getElementById('btn-edit-goals');
    if(btnGoals) btnGoals.addEventListener('click',()=>{
      showModal(`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;"><h2 style="font-size:1.1rem;font-weight:700;">ðŸŽ¯ Objectifs financiers</h2><button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
        <div><label class="label">Objectif mensuel (â‚¬)</label><input id="goal-monthly" class="glass-input" type="number" min="0" value="${db.financeGoal?.monthly||0}" /></div>
        <div><label class="label">Objectif annuel (â‚¬)</label><input id="goal-annual" class="glass-input" type="number" min="0" value="${db.financeGoal?.annual||0}" /></div>
      </div>
      <div style="display:flex;gap:10px;"><button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Annuler</button><button id="goal-save" class="btn btn-primary" style="flex:1;justify-content:center;">Enregistrer</button></div>`,
      ()=>{ document.getElementById('goal-save').addEventListener('click',()=>{ if(!db.financeGoal) db.financeGoal={}; db.financeGoal.monthly=parseFloat(document.getElementById('goal-monthly').value)||0; db.financeGoal.annual=parseFloat(document.getElementById('goal-annual').value)||0; saveDB(); toast('Objectifs mis Ã  jour !','success'); closeModal(); refreshAdminTab(); }); });
    });

    document.querySelectorAll('.btn-del-finance').forEach(b=>{
      b.addEventListener('click',()=>{
        const e = (db.finance||[]).find(x=>x.id===b.dataset.fid);
        if(!e) return;
        showModal(`
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
            <h2 style="font-size:1.05rem;font-weight:700;">ðŸ—‘ Supprimer l'entrée</h2>
            <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
          </div>
          <p style="color:var(--ink-2);font-size:.9rem;margin-bottom:20px;">Supprimer <strong>${esc(e.label)}</strong> — <strong>${Number(e.amount).toLocaleString('fr-FR')}â‚¬</strong> ?</p>
          <div style="display:flex;gap:10px;">
            <button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Annuler</button>
            <button id="confirm-del-fin" class="btn btn-danger" style="flex:1;justify-content:center;">Supprimer</button>
          </div>`,
        ()=>{
          document.getElementById('confirm-del-fin').addEventListener('click',()=>{
            db.finance = db.finance.filter(x=>x.id!==e.id);
            saveDB(); toast('Entrée supprimée.','info'); closeModal(); refreshAdminTab();
          });
        });
      });
    });
  }

  function openAddRevenueModal(){
    const projects = db.projects.filter(p=>!p.archived);
    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
        <h2 style="font-size:1.1rem;font-weight:700;">ðŸ’° Nouvelle entrée</h2>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <div style="margin-bottom:14px;">
        <label class="label">Projet</label>
        <select id="fin-proj" class="glass-input">
          <option value="">— Saisie manuelle —</option>
          ${projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:14px;">
        <label class="label">Libellé (si saisie manuelle)</label>
        <input id="fin-label" class="glass-input" placeholder="Ex : Refonte site Dupont" />
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div><label class="label">Montant (â‚¬) *</label><input id="fin-amount" class="glass-input" type="number" min="0" placeholder="2500" /></div>
        <div><label class="label">Date (mois) *</label><input id="fin-date" class="glass-input" type="month" value="${new Date().toISOString().slice(0,7)}" /></div>
      </div>
      <div style="margin-bottom:14px;">
        <label class="label">Note (optionnel)</label>
        <input id="fin-note" class="glass-input" placeholder="Ex : Paiement final, acompte…" />
      </div>
      <div style="margin-bottom:14px;">
        <label class="label">Statut de paiement</label>
        <select id="rev-pstatus" class="glass-input">
          <option value="paid">✅ Payé</option>
          <option value="pending">⏳ En attente</option>
          <option value="partial">🔶 Partiel</option>
        </select>
      </div>
      <div id="fin-msg" style="display:none;margin-bottom:14px;padding:10px 14px;border-radius:8px;font-size:.85rem;"></div>
      <div style="display:flex;gap:10px;">
        <button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Annuler</button>
        <button id="fin-save" class="btn btn-primary" style="flex:1;justify-content:center;">Enregistrer</button>
      </div>`,
    ()=>{
      const projSel = document.getElementById('fin-proj');
      projSel.addEventListener('change',()=>{
        const p = db.projects.find(x=>x.id===projSel.value);
        if(p) document.getElementById('fin-label').value = p.name;
      });
      document.getElementById('fin-save').addEventListener('click',()=>{
        const projId = projSel.value;
        const label = document.getElementById('fin-label').value.trim() || (db.projects.find(x=>x.id===projId)?.name||'');
        const amount = parseFloat(document.getElementById('fin-amount').value);
        const date = document.getElementById('fin-date').value;
        const note = document.getElementById('fin-note').value.trim();
        const msg = document.getElementById('fin-msg');
        if(!label){ showMsg(msg,'Entrez un libellé ou sélectionnez un projet.','error'); return; }
        if(!amount||isNaN(amount)||amount<=0){ showMsg(msg,'Entrez un montant valide.','error'); return; }
        if(!date){ showMsg(msg,'Sélectionnez une date.','error'); return; }
        const pstatus = document.getElementById('rev-pstatus')?.value||'paid';
        if(!db.finance) db.finance=[];
        db.finance.push({id:uid(),projectId:projId||null,label,amount,date,note,paymentStatus:pstatus,addedBy:me.username,addedAt:new Date().toISOString()});
        logActivity('finance_added','Revenu enregistré : '+label+' — '+amount+'â‚¬');
        saveDB(); toast('Entrée ajoutée !','success'); closeModal(); refreshAdminTab();
      });
    });
  }

  // ════════════════════════════════════════════════
  //  HELPERS — SVG PROGRESS, CONFETTI, TASKS, DEVIS
  // ════════════════════════════════════════════════
  function svgProgressCircle(pct, color='#d97757', size=52){
    const r=20; const circ=2*Math.PI*r;
    const dash=Math.round(pct/100*circ);
    return `<svg width="${size}" height="${size}" viewBox="0 0 52 52" style="flex-shrink:0;">
      <circle cx="26" cy="26" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="5"/>
      <circle cx="26" cy="26" r="${r}" fill="none" stroke="${color}" stroke-width="5"
        stroke-dasharray="${dash} ${circ-dash}" stroke-linecap="round"
        transform="rotate(-90 26 26)"/>
      <text x="26" y="30" text-anchor="middle" fill="${color}" font-size="10" font-weight="700" font-family="Geist,sans-serif">${pct}%</text>
    </svg>`;
  }

  function launchConfetti(){
    const cols=['#d97757','#93b594','#9bb8d8','#c4a3d4','#f0c080','#e07080'];
    for(let i=0;i<70;i++){
      const el=document.createElement('div');
      const s=6+Math.random()*6;
      el.style.cssText=`position:fixed;z-index:9999;width:${s}px;height:${s}px;border-radius:${Math.random()>.5?'50%':'2px'};background:${cols[Math.floor(Math.random()*cols.length)]};left:${Math.random()*100}vw;top:-10px;animation:confetti-fall ${1.5+Math.random()*2}s ease-in ${Math.random()*.8}s forwards;pointer-events:none;`;
      document.body.appendChild(el);
      setTimeout(()=>el.remove(),4000);
    }
  }

  function openManageTasksModal(projectId){
    const p = db.projects.find(x=>x.id===projectId);
    if(!p) return;
    if(!p.internalTasks) p.internalTasks=[];
    const renderList=()=>{
      const c=document.getElementById('tasks-list');
      if(!c) return;
      c.innerHTML=p.internalTasks.map((t,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);">
          <input type="checkbox" class="task-ck" data-i="${i}" ${t.done?'checked':''} style="accent-color:var(--sage);width:16px;height:16px;cursor:pointer;" />
          <span style="flex:1;font-size:.875rem;color:${t.done?'var(--ink-4)':'var(--ink)'};text-decoration:${t.done?'line-through':'none'};">${esc(t.label)}</span>
          <button class="btn btn-danger btn-sm task-dl" data-i="${i}">ðŸ—‘</button>
        </div>`).join('');
      c.querySelectorAll('.task-ck').forEach(cb=>cb.addEventListener('change',()=>{ p.internalTasks[cb.dataset.i].done=cb.checked; saveDB(); renderList(); refreshAdminTab(); }));
      c.querySelectorAll('.task-dl').forEach(b=>b.addEventListener('click',()=>{ p.internalTasks.splice(Number(b.dataset.i),1); saveDB(); renderList(); refreshAdminTab(); }));
    };
    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
        <h2 style="font-size:1.05rem;font-weight:700;">✅ Tâches — ${esc(p.name)}</h2>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <div id="tasks-list"></div>
      <div style="display:flex;gap:8px;margin-top:14px;">
        <input id="new-task-inp" class="glass-input" placeholder="Nouvelle tâche…" style="flex:1;" />
        <button id="add-task-btn" class="btn btn-primary btn-sm">Ajouter</button>
      </div>`,
    ()=>{
      renderList();
      const doAdd=()=>{ const v=document.getElementById('new-task-inp')?.value.trim(); if(!v) return; p.internalTasks.push({id:uid(),label:v,done:false}); document.getElementById('new-task-inp').value=''; saveDB(); renderList(); refreshAdminTab(); };
      document.getElementById('add-task-btn')?.addEventListener('click',doAdd);
      document.getElementById('new-task-inp')?.addEventListener('keydown',e=>{ if(e.key==='Enter') doAdd(); });
    });
  }

  function openDevisModal(){
    const clients=db.users.filter(u=>u.role==='client');
    showModal(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;">
        <h2 style="font-size:1.1rem;font-weight:700;">📄 Devis / Facture</h2>
        <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div><label class="label">Client</label><select id="dv-client" class="glass-input"><option value="">— Libre —</option>${clients.map(c=>`<option value="${c.id}">${esc(c.username)}</option>`).join('')}</select></div>
        <div><label class="label">N° document</label><input id="dv-num" class="glass-input" value="${new Date().getFullYear()}-${String(Date.now()).slice(-3)}" /></div>
      </div>
      <div style="margin-bottom:14px;"><label class="label">Objet</label><input id="dv-title" class="glass-input" placeholder="Création site vitrine" /></div>
      <div id="dv-lines">
        <div style="font-size:.78rem;font-weight:600;color:var(--ink-3);margin-bottom:6px;">Lignes</div>
        <div class="dv-line" style="display:grid;grid-template-columns:1fr 60px 90px auto;gap:6px;margin-bottom:6px;">
          <input class="glass-input dv-desc" placeholder="Description" />
          <input class="glass-input dv-qty" type="number" value="1" min="1" />
          <input class="glass-input dv-price" type="number" placeholder="Prix HT â‚¬" />
          <button class="btn btn-danger btn-sm dv-dl">ðŸ—‘</button>
        </div>
      </div>
      <button id="dv-add-line" class="btn btn-ghost btn-sm" style="margin-bottom:16px;">+ Ligne</button>
      <div style="display:flex;gap:10px;">
        <button onclick="closeModal()" class="btn btn-ghost" style="flex:1;justify-content:center;">Annuler</button>
        <button id="dv-gen" class="btn btn-primary" style="flex:1;justify-content:center;">Générer PDF</button>
      </div>`,
    ()=>{
      const addLine=()=>{ const d=document.createElement('div'); d.className='dv-line'; d.style.cssText='display:grid;grid-template-columns:1fr 60px 90px auto;gap:6px;margin-bottom:6px;'; d.innerHTML=`<input class="glass-input dv-desc" placeholder="Description"/><input class="glass-input dv-qty" type="number" value="1" min="1"/><input class="glass-input dv-price" type="number" placeholder="Prix HT â‚¬"/><button class="btn btn-danger btn-sm dv-dl">ðŸ—‘</button>`; d.querySelector('.dv-dl').addEventListener('click',()=>d.remove()); document.getElementById('dv-lines').appendChild(d); };
      document.getElementById('dv-add-line').addEventListener('click',addLine);
      document.querySelectorAll('.dv-dl').forEach(b=>b.addEventListener('click',()=>b.closest('.dv-line').remove()));
      document.getElementById('dv-gen').addEventListener('click',()=>{
        if(!window.jspdf){ toast('jsPDF non chargé','error'); return; }
        const {jsPDF}=window.jspdf;
        const pdf=new jsPDF();
        const cid=document.getElementById('dv-client').value;
        const client=db.users.find(u=>u.id===cid);
        const num=document.getElementById('dv-num').value||'001';
        const title=document.getElementById('dv-title').value||'Devis';
        const lines=[...document.querySelectorAll('.dv-line')].map(l=>({desc:l.querySelector('.dv-desc')?.value||'',qty:parseFloat(l.querySelector('.dv-qty')?.value)||1,price:parseFloat(l.querySelector('.dv-price')?.value)||0})).filter(l=>l.desc);
        const ht=lines.reduce((s,l)=>s+l.qty*l.price,0);
        const tva=ht*0.2; const ttc=ht+tva;
        pdf.setFillColor(217,119,87); pdf.rect(0,0,210,28,'F');
        pdf.setTextColor(255,255,255); pdf.setFontSize(22); pdf.setFont('helvetica','bold'); pdf.text('flow',14,18);
        pdf.setFontSize(11); pdf.setFont('helvetica','normal'); pdf.text('N° '+num,50,18); pdf.text(new Date().toLocaleDateString('fr-FR'),160,18);
        pdf.setTextColor(26,19,14); pdf.setFontSize(13); pdf.setFont('helvetica','bold'); pdf.text('Pour :',14,42);
        pdf.setFont('helvetica','normal'); pdf.setFontSize(11);
        if(client){ pdf.text((client.firstName||'')+' '+(client.lastName||client.username),14,52); if(client.email) pdf.text(client.email,14,60); }
        pdf.setFontSize(14); pdf.setFont('helvetica','bold'); pdf.setTextColor(217,119,87); pdf.text(title,14,72);
        let y=84; pdf.setFillColor(245,238,230); pdf.rect(14,y-6,182,10,'F');
        pdf.setFontSize(10); pdf.setFont('helvetica','bold'); pdf.setTextColor(80,60,40);
        pdf.text('Description',16,y); pdf.text('Qté',128,y); pdf.text('PU HT',148,y); pdf.text('Total HT',172,y); y+=10;
        pdf.setFont('helvetica','normal'); pdf.setTextColor(26,19,14);
        lines.forEach(l=>{ pdf.text(l.desc.slice(0,55),16,y); pdf.text(String(l.qty),128,y); pdf.text(l.price.toLocaleString('fr-FR')+'â‚¬',148,y); pdf.text((l.qty*l.price).toLocaleString('fr-FR')+'â‚¬',172,y); y+=8; if(y>265){pdf.addPage();y=20;} });
        y+=4; pdf.setDrawColor(200,180,160); pdf.line(128,y,196,y); y+=8;
        pdf.text('Total HT',128,y); pdf.text(ht.toLocaleString('fr-FR')+'â‚¬',172,y); y+=8;
        pdf.text('TVA 20%',128,y); pdf.text(tva.toLocaleString('fr-FR')+'â‚¬',172,y); y+=8;
        pdf.setFont('helvetica','bold'); pdf.setTextColor(217,119,87);
        pdf.text('Total TTC',128,y); pdf.text(ttc.toLocaleString('fr-FR')+'â‚¬',172,y);
        pdf.setFontSize(8); pdf.setTextColor(180,160,140); pdf.setFont('helvetica','normal'); pdf.text('Généré par Flow — '+new Date().toLocaleString('fr-FR'),14,285);
        pdf.save('devis_'+num+'_'+(client?.username||'client')+'.pdf');
        toast('Devis généré !','success'); closeModal();
      });
    });
  }

  // ════════════════════════════════════════════════
  //  SVG ICONS
  // ════════════════════════════════════════════════
  function iconHome(){ return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`; }
  function iconUsers(){ return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`; }
  function iconDocs(){ return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`; }
  function iconProfile(){ return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`; }
  function iconLogout(){ return `<svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`; }
  function iconPlus(){ return `<svg style="width:15px;height:15px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`; }
  function iconFinance(){ return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`; }
  function iconRequests(){ return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`; }
  function iconProject(){ return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 12l2 2 4-4"/></svg>`; }
  function iconHistory(){ return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`; }
  function iconAI(){ return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a7 7 0 0 1-7 7H8a7 7 0 0 1-7-7v-1H0a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z"/><circle cx="9" cy="13" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.5" fill="currentColor" stroke="none"/></svg>`; }
  function iconChat(){ return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`; }
  function iconEye(){ return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`; }

  // ════════════════════════════════════════════════
  //  AI AUTOMATION — Admin/Controller
  // ════════════════════════════════════════════════
  function renderAdminAIAutomation(){
    const config = db.aiConfig || { geminiKey:'', claudeKey:'' };
    const pending = (db.aiRequests||[]).filter(r=>r.status==='pending_admin').sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
    const allReqs = (db.aiRequests||[]).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    return `<div class="fade-up">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
        <h1 style="font-size:1.4rem;font-weight:700;">Automatisation IA</h1>
        <span style="background:rgba(155,184,216,.15);color:var(--sky);border:1px solid rgba(155,184,216,.25);border-radius:999px;font-size:.65rem;font-weight:700;letter-spacing:.08em;padding:2px 8px;text-transform:uppercase;">BÊTA</span>
      </div>
      <div class="glass-card" style="padding:22px;margin-bottom:20px;">
        <h2 style="font-size:.95rem;font-weight:700;margin-bottom:4px;">Configuration API</h2>
        <p style="font-size:.8rem;color:var(--ink-3);margin-bottom:18px;">Ces clés sont utilisées pour les opérations de modération Gemini et de génération Claude.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">
          <div>
            <label class="label">Clé API Google AI Studio (Gemini)</label>
            <input id="ai-gemini-key" class="glass-input" type="password" placeholder="AIza..." value="${esc(config.geminiKey||'')}"/>
          </div>
          <div>
            <label class="label">Clé API Claude (Anthropic)</label>
            <input id="ai-claude-key" class="glass-input" type="password" placeholder="sk-ant-..." value="${esc(config.claudeKey||'')}"/>
          </div>
        </div>
        <button id="btn-save-ai-config" class="btn btn-primary">Enregistrer les clés</button>
      </div>
      <div class="glass-card" style="padding:22px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
          <div>
            <h2 style="font-size:.95rem;font-weight:700;">Demandes en attente de validation</h2>
            <p style="font-size:.8rem;color:var(--ink-3);margin-top:3px;">Prompts reformulés par Gemini, à approuver avant envoi à Claude.</p>
          </div>
          ${pending.length>0?`<span style="background:rgba(217,119,87,.9);color:#fff;border-radius:999px;font-size:.7rem;padding:2px 10px;font-weight:700;">${pending.length}</span>`:''}
        </div>
        ${pending.length===0?`<div style="text-align:center;padding:36px 0;color:var(--ink-4);font-size:.875rem;">Aucune demande en attente</div>`:
          pending.map(r=>`
          <div data-req-id="${r.id}" style="border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:18px;margin-bottom:14px;background:rgba(255,255,255,.02);">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <div style="width:32px;height:32px;border-radius:50%;background:rgba(155,184,216,.2);display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:700;color:var(--sky);flex-shrink:0;">${esc((r.clientUsername||'?')[0].toUpperCase())}</div>
              <div>
                <div style="font-size:.875rem;font-weight:600;">${esc(r.clientUsername||'Inconnu')}</div>
                <div style="font-size:.72rem;color:var(--ink-4);">${new Date(r.createdAt).toLocaleString('fr-FR')}</div>
              </div>
            </div>
            <div style="margin-bottom:12px;">
              <div style="font-size:.7rem;font-weight:600;color:var(--ink-4);letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px;">Message original</div>
              <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:10px 12px;font-size:.85rem;color:var(--ink-2);line-height:1.5;">${esc(r.originalMessage)}</div>
              ${r.originalPhoto?`<img src="${r.originalPhoto}" style="max-width:200px;max-height:160px;border-radius:8px;margin-top:8px;object-fit:contain;">`:``}
            </div>
            <div style="margin-bottom:14px;">
              <div style="font-size:.7rem;font-weight:600;color:rgba(155,184,216,.8);letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px;">Prompt reformulé par Gemini (modifiable)</div>
              <textarea id="prompt-edit-${r.id}" class="glass-input" style="min-height:80px;resize:vertical;font-size:.85rem;line-height:1.5;">${esc(r.reformulatedPrompt)}</textarea>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-primary btn-sm btn-ai-accept" data-id="${r.id}" style="flex:1;justify-content:center;">✓ Accepter</button>
              <button class="btn btn-ghost btn-sm btn-ai-modify" data-id="${r.id}" style="flex:1;justify-content:center;">✏ Modifier & Envoyer</button>
              <button class="btn btn-ghost btn-sm btn-ai-reject" data-id="${r.id}" style="flex:1;justify-content:center;color:#f08a8a;border-color:rgba(240,138,138,.25);">✕ Refuser</button>
            </div>
          </div>`).join('')}
      </div>
      <div class="glass-card" style="padding:22px;">
        <h2 style="font-size:.95rem;font-weight:700;margin-bottom:16px;">Historique des demandes</h2>
        ${allReqs.length===0?`<div style="text-align:center;padding:24px 0;color:var(--ink-4);font-size:.875rem;">Aucune demande</div>`:
          `<div style="display:flex;flex-direction:column;gap:8px;">
            ${allReqs.map(r=>{
              const smap={'pending_moderation':'⏳ Modération','moderation_failed':'❌ Non conforme','pending_admin':'🔔 Attente admin','approved':'⏳ En traitement','processing':'⏳ En traitement','completed':'✅ Complété','rejected':'❌ Refusé','error':'⚠ Erreur'};
              return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:8px;">
                <div>
                  <span style="font-size:.825rem;font-weight:600;">${esc(r.clientUsername||'—')}</span>
                  <span style="font-size:.78rem;color:var(--ink-4);margin-left:10px;">${esc(r.originalMessage.substring(0,60))}${r.originalMessage.length>60?'…':''}</span>
                </div>
                <span style="font-size:.75rem;color:var(--ink-3);white-space:nowrap;margin-left:12px;">${smap[r.status]||r.status}</span>
              </div>`;
            }).join('')}
          </div>`}
      </div>
    </div>`;
  }

  function wireAdminAIAutomation(){
    const seenKey = 'flow_ai_automation_seen';
    if(!sessionStorage.getItem(seenKey)){
      sessionStorage.setItem(seenKey,'1');
      showModal(`
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:10px;">
            ${iconAI()}
            <h2 style="font-size:1.1rem;font-weight:700;">Automatisation IA — Bêta</h2>
          </div>
          <button onclick="closeModal()" class="btn btn-ghost btn-sm">✕</button>
        </div>
        <p style="font-size:.875rem;color:var(--ink-2);line-height:1.6;margin-bottom:16px;">Cette section vous permet de piloter un <strong>workflow IA en plusieurs étapes</strong> :</p>
        <ol style="list-style:decimal;padding-left:20px;display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
          <li style="font-size:.85rem;color:var(--ink-2);line-height:1.5;"><strong>Modération automatique</strong> via Gemini — chaque message client est analysé pour vérifier sa conformité éthique et sécuritaire.</li>
          <li style="font-size:.85rem;color:var(--ink-2);line-height:1.5;"><strong>Reformulation intelligente</strong> — Gemini optimise la demande pour maximiser la qualité de la réponse Claude.</li>
          <li style="font-size:.85rem;color:var(--ink-2);line-height:1.5;"><strong>Validation humaine</strong> — vous pouvez accepter, modifier ou refuser chaque prompt avant envoi.</li>
          <li style="font-size:.85rem;color:var(--ink-2);line-height:1.5;"><strong>Génération Claude</strong> — le résultat est affiché dans l'onglet <em>Visuel</em>.</li>
        </ol>
        <div style="background:rgba(217,119,87,.08);border:1px solid rgba(217,119,87,.2);border-radius:10px;padding:12px 14px;margin-bottom:20px;font-size:.82rem;color:var(--ink-2);">
          ⚠ <strong>Note :</strong> L'API Anthropic (Claude) ne supporte pas les appels directs depuis un navigateur (CORS). Pour un déploiement en production, un proxy backend est nécessaire. En test local ou avec un proxy, tout fonctionne normalement.
        </div>
        <button onclick="closeModal()" class="btn btn-primary" style="width:100%;justify-content:center;">Compris, allons-y !</button>
      `);
    }
    const saveBtn = document.getElementById('btn-save-ai-config');
    if(saveBtn) saveBtn.addEventListener('click',()=>{
      const g = document.getElementById('ai-gemini-key').value.trim();
      const c = document.getElementById('ai-claude-key').value.trim();
      if(!db.aiConfig) db.aiConfig={};
      db.aiConfig.geminiKey=g; db.aiConfig.claudeKey=c;
      saveDB(); toast('Clés API enregistrées.','success');
    });
    document.querySelectorAll('.btn-ai-accept').forEach(btn=>{
      btn.addEventListener('click',()=>adminHandleAIRequest(btn.dataset.id,'accept'));
    });
    document.querySelectorAll('.btn-ai-modify').forEach(btn=>{
      btn.addEventListener('click',()=>adminHandleAIRequest(btn.dataset.id,'modify'));
    });
    document.querySelectorAll('.btn-ai-reject').forEach(btn=>{
      btn.addEventListener('click',()=>adminHandleAIRequest(btn.dataset.id,'reject'));
    });
  }

  // ════════════════════════════════════════════════
  //  AI VISUAL — Admin/Controller
  // ════════════════════════════════════════════════
  function renderAdminAIVisual(){
    const completed = (db.aiRequests||[]).filter(r=>r.status==='completed').sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
    return `<div class="fade-up">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
        <h1 style="font-size:1.4rem;font-weight:700;">Visuel</h1>
        <span style="background:rgba(155,184,216,.15);color:var(--sky);border:1px solid rgba(155,184,216,.25);border-radius:999px;font-size:.65rem;font-weight:700;letter-spacing:.08em;padding:2px 8px;text-transform:uppercase;">BÊTA</span>
      </div>
      ${completed.length===0?`
      <div class="glass-card" style="padding:60px;text-align:center;">
        <div style="font-size:2.5rem;margin-bottom:16px;">🎨</div>
        <div style="font-size:.95rem;font-weight:600;margin-bottom:8px;">Aucun visuel généré</div>
        <div style="font-size:.825rem;color:var(--ink-3);">Les sites web créés par Claude s'afficheront ici après approbation d'une demande.</div>
      </div>`:
      completed.map(r=>`
      <div class="glass-card" style="padding:20px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div>
            <div style="font-size:.95rem;font-weight:600;">${esc(r.clientUsername||'Client')}</div>
            <div style="font-size:.75rem;color:var(--ink-4);">${new Date(r.updatedAt||r.createdAt).toLocaleString('fr-FR')}</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-ghost btn-sm btn-toggle-visual" data-id="${r.id}">👁 Afficher</button>
            <button class="btn btn-ghost btn-sm" onclick="downloadVisualHTML('${r.id}')">⬇ HTML</button>
          </div>
        </div>
        <div style="margin-bottom:10px;font-size:.82rem;color:var(--ink-3);background:rgba(255,255,255,.03);border-radius:8px;padding:8px 12px;border:1px solid rgba(255,255,255,.06);">
          <span style="font-size:.7rem;color:var(--ink-4);font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Demande : </span>${esc(r.originalMessage.substring(0,120))}${r.originalMessage.length>120?'…':''}
        </div>
        <div id="visual-preview-${r.id}" style="display:none;border:1px solid rgba(255,255,255,.1);border-radius:12px;overflow:hidden;margin-top:12px;">
          <iframe id="visual-iframe-${r.id}" style="width:100%;height:540px;border:none;background:#fff;" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
        </div>
      </div>`).join('')}
    </div>`;
  }

  function wireAdminAIVisual(){
    document.querySelectorAll('.btn-toggle-visual').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const id = btn.dataset.id;
        const wrap = document.getElementById('visual-preview-'+id);
        const iframe = document.getElementById('visual-iframe-'+id);
        if(!wrap) return;
        if(wrap.style.display==='none'){
          wrap.style.display='block';
          btn.textContent='👁 Masquer';
          const req = (db.aiRequests||[]).find(r=>r.id===id);
          if(req&&req.claudeResponse&&iframe){
            iframe.srcdoc = req.claudeResponse;
          }
        } else { wrap.style.display='none'; btn.textContent='👁 Afficher'; }
      });
    });
  }

  function downloadVisualHTML(reqId){
    const req = (db.aiRequests||[]).find(r=>r.id===reqId);
    if(!req||!req.claudeResponse){ toast('Aucun contenu à télécharger.','error'); return; }
    const blob = new Blob([req.claudeResponse],{type:'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'site_'+reqId+'.html';
    a.click(); URL.revokeObjectURL(a.href);
  }

  // ════════════════════════════════════════════════
  //  DISCUSSION — Client (teste1)
  // ════════════════════════════════════════════════
  function renderClientDiscussion(){
    const reqs = (db.aiRequests||[]).filter(r=>r.clientId===me.id).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
    const statusLabel = {
      'pending_moderation': '⏳ Votre demande est enregistrée — modération en cours...',
      'moderation_failed':  '❌ Demande non conforme aux règles de sécurité.',
      'pending_admin':      '🔔 En attente de validation par l\'équipe.',
      'approved':           '⏳ Validation reçue — traitement IA en cours...',
      'processing':         '⏳ Traitement IA en cours...',
      'completed':          '✅ Votre site a été généré ! Contactez votre équipe pour y accéder.',
      'rejected':           '❌ Votre demande a été refusée par l\'équipe.',
      'error':              '⚠ Une erreur est survenue lors du traitement.'
    };
    return `<div class="fade-up" style="display:flex;flex-direction:column;min-height:calc(100vh - 120px);">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <h1 style="font-size:1.4rem;font-weight:700;">Discussion</h1>
        <span style="background:rgba(155,184,216,.15);color:var(--sky);border:1px solid rgba(155,184,216,.25);border-radius:999px;font-size:.65rem;font-weight:700;letter-spacing:.08em;padding:2px 8px;text-transform:uppercase;">TEST</span>
      </div>
      <div class="glass-card" style="padding:12px 16px;margin-bottom:16px;font-size:.82rem;color:var(--ink-3);line-height:1.5;">
        💬 Décrivez ici votre projet de site web. Notre équipe et l'IA traiteront votre demande et vous prépareront un aperçu visuel personnalisé.
      </div>
      <div id="discussion-messages" style="flex:1;display:flex;flex-direction:column;gap:14px;margin-bottom:20px;min-height:160px;">
        ${reqs.length===0?`<div style="text-align:center;padding:48px 0;color:var(--ink-4);font-size:.875rem;">Envoyez votre première demande ci-dessous pour commencer.</div>`:
          reqs.map(r=>`
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:flex-end;">
              <div style="max-width:78%;background:rgba(155,184,216,.18);border:1px solid rgba(155,184,216,.22);border-radius:14px 14px 4px 14px;padding:10px 14px;">
                <div style="font-size:.875rem;color:var(--ink-2);line-height:1.5;white-space:pre-wrap;">${esc(r.originalMessage)}</div>
                ${r.originalPhoto?`<img src="${r.originalPhoto}" style="max-width:100%;max-height:180px;border-radius:8px;margin-top:8px;object-fit:contain;">`:``}
                <div style="font-size:.7rem;color:var(--ink-4);margin-top:5px;text-align:right;">${new Date(r.createdAt).toLocaleString('fr-FR')}</div>
              </div>
            </div>
            <div style="display:flex;justify-content:flex-start;">
              <div style="max-width:78%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px 14px 14px 4px;padding:9px 13px;font-size:.8rem;color:var(--ink-3);">
                ${statusLabel[r.status]||r.status}
              </div>
            </div>
          </div>`).join('')}
      </div>
      <div class="glass-card" style="padding:14px;margin-top:auto;">
        <div id="discussion-photo-preview" style="display:none;margin-bottom:10px;"></div>
        <div style="display:flex;gap:10px;align-items:flex-end;">
          <textarea id="discussion-input" class="glass-input" placeholder="Décrivez votre projet de site web..." style="flex:1;min-height:64px;max-height:130px;resize:vertical;font-size:.875rem;"></textarea>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label class="btn btn-ghost btn-sm" style="cursor:pointer;margin:0;padding:8px 10px;text-align:center;" title="Joindre une photo">
              📷
              <input id="discussion-photo-input" type="file" accept="image/*" style="display:none;">
            </label>
            <button id="discussion-send-btn" class="btn btn-primary btn-sm" style="padding:8px 14px;">Envoyer</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function wireClientDiscussion(){
    const photoInput = document.getElementById('discussion-photo-input');
    const photoPreview = document.getElementById('discussion-photo-preview');
    let pendingPhotoBase64 = null;

    if(photoInput) photoInput.addEventListener('change',()=>{
      const file = photoInput.files[0];
      if(!file){ pendingPhotoBase64=null; return; }
      const reader = new FileReader();
      reader.onload = e=>{
        pendingPhotoBase64 = e.target.result;
        if(photoPreview){
          photoPreview.style.display='flex';
          photoPreview.style.alignItems='center';
          photoPreview.style.gap='8px';
          photoPreview.innerHTML=`<img src="${pendingPhotoBase64}" style="height:48px;border-radius:6px;object-fit:cover;"><span style="font-size:.78rem;color:var(--ink-3);">${esc(file.name)}</span><button onclick="this.parentElement.style.display='none';document.getElementById('discussion-photo-input').value='';window._pendingDiscussionPhoto=null;" style="background:none;border:none;cursor:pointer;color:var(--ink-4);font-size:.85rem;">✕</button>`;
          window._pendingDiscussionPhoto = pendingPhotoBase64;
        }
      };
      reader.readAsDataURL(file);
    });

    const sendBtn = document.getElementById('discussion-send-btn');
    if(sendBtn) sendBtn.addEventListener('click', async ()=>{
      const input = document.getElementById('discussion-input');
      const text = (input?.value||'').trim();
      if(!text){ toast('Veuillez saisir un message.','error'); return; }
      const photo = window._pendingDiscussionPhoto||null;
      window._pendingDiscussionPhoto=null;
      if(input) input.value='';
      if(photoPreview){ photoPreview.style.display='none'; photoPreview.innerHTML=''; }
      if(photoInput) photoInput.value='';
      await submitDiscussionMessage(text, photo);
    });

    const msgs = document.getElementById('discussion-messages');
    if(msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  // ════════════════════════════════════════════════
  //  AI WORKFLOW
  // ════════════════════════════════════════════════
  async function submitDiscussionMessage(text, photoBase64){
    const reqId = 'air_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
    const req = {
      id: reqId,
      clientId: me.id,
      clientUsername: me.username,
      originalMessage: text,
      originalPhoto: photoBase64||null,
      moderationPassed: null,
      moderationReason: '',
      reformulatedPrompt: '',
      adminAction: null,
      adminModifiedPrompt: '',
      claudeResponse: '',
      status: 'pending_moderation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.aiRequests.push(req);
    saveDB();
    refreshClientTab();
    toast('Votre demande est enregistrée.','success');
    const geminiKey = db.aiConfig&&db.aiConfig.geminiKey;
    if(!geminiKey){
      const r = db.aiRequests.find(x=>x.id===reqId);
      if(r){ r.status='error'; r.moderationReason='Clé Gemini non configurée.'; r.updatedAt=new Date().toISOString(); saveDB(); }
      toast('Clé Gemini non configurée — contact votre admin.','error'); return;
    }
    try{
      const modResult = await callGeminiModerate(text, photoBase64, geminiKey);
      const r = db.aiRequests.find(x=>x.id===reqId);
      if(!r) return;
      if(!modResult.passed){
        r.status='moderation_failed'; r.moderationPassed=false; r.moderationReason=modResult.reason; r.updatedAt=new Date().toISOString();
        saveDB(); refreshClientTab(); return;
      }
      r.moderationPassed=true;
      const reformulated = await callGeminiReformulate(text, geminiKey);
      r.reformulatedPrompt = reformulated;
      r.status = 'pending_admin';
      r.updatedAt = new Date().toISOString();
      saveDB();
      refreshClientTab();
      logActivity('ai_request','Demande IA soumise par '+me.username);
    } catch(err){
      const r = db.aiRequests.find(x=>x.id===reqId);
      if(r){ r.status='error'; r.moderationReason=String(err); r.updatedAt=new Date().toISOString(); saveDB(); }
      toast('Erreur lors de la modération : '+err,'error');
    }
  }

  async function callGeminiModerate(text, photoBase64, apiKey){
    const parts = [{ text: `Tu es un modérateur de contenu. Analyse ce message et réponds UNIQUEMENT par un JSON valide avec deux champs : "passed" (true/false) et "reason" (string expliquant la décision). Le message doit être refusé s'il contient du contenu haineux, violent, illégal, ou contraire à l'éthique. Message à analyser : "${text.replace(/"/g,'\\"')}"` }];
    if(photoBase64&&photoBase64.startsWith('data:image')){
      const [meta,data] = photoBase64.split(',');
      const mime = meta.match(/data:(.*);/)?.[1]||'image/jpeg';
      parts.push({ inlineData:{ mimeType:mime, data:data } });
    }
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contents:[{ parts }] })
    });
    if(!resp.ok) throw new Error('Gemini modération erreur HTTP '+resp.status);
    const json = await resp.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text||'';
    const clean = raw.replace(/```json\n?/,'').replace(/```$/,'').trim();
    try{ return JSON.parse(clean); }
    catch(_){ return { passed: true, reason: 'Analyse non parseable — approuvé par défaut.' }; }
  }

  async function callGeminiReformulate(text, apiKey){
    const prompt = `Tu es un expert en prompt engineering pour des modèles IA génératifs (Claude). Reformule et optimise la demande suivante pour générer un site web HTML complet, esthétique et fonctionnel. Réponds UNIQUEMENT avec le prompt reformulé, sans commentaire ni explication.\n\nDemande originale : "${text.replace(/"/g,'\\"')}"`;
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contents:[{ parts:[{ text:prompt }] }] })
    });
    if(!resp.ok) throw new Error('Gemini reformulation erreur HTTP '+resp.status);
    const json = await resp.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text||text;
  }

  async function adminHandleAIRequest(reqId, action){
    const req = (db.aiRequests||[]).find(r=>r.id===reqId);
    if(!req) return;
    if(action==='reject'){
      req.status='rejected'; req.adminAction='rejected'; req.updatedAt=new Date().toISOString();
      saveDB(); toast('Demande refusée.','info'); refreshAdminTab(); return;
    }
    const editedPrompt = document.getElementById('prompt-edit-'+reqId)?.value?.trim()||req.reformulatedPrompt;
    if(action==='modify') req.adminModifiedPrompt = editedPrompt;
    const finalPrompt = action==='modify' ? editedPrompt : req.reformulatedPrompt;
    req.status='approved'; req.adminAction=action; req.updatedAt=new Date().toISOString();
    saveDB(); refreshAdminTab();
    const claudeKey = db.aiConfig&&db.aiConfig.claudeKey;
    if(!claudeKey){ toast('Clé Claude non configurée.','error'); return; }
    req.status='processing'; req.updatedAt=new Date().toISOString(); saveDB();
    try{
      const html = await callClaudeGenerate(finalPrompt, claudeKey);
      req.claudeResponse = html; req.status='completed'; req.updatedAt=new Date().toISOString();
      saveDB(); toast('Site généré avec succès ! Voir l\'onglet Visuel.','success'); refreshAdminTab();
    } catch(err){
      req.status='error'; req.updatedAt=new Date().toISOString(); saveDB();
      toast('Erreur Claude : '+err,'error'); refreshAdminTab();
    }
  }

  async function callClaudeGenerate(prompt, apiKey){
    const systemPrompt = `Tu es un expert développeur web. Génère un site web HTML complet, moderne et esthétique en une seule page HTML autonome (tout le CSS et JS inclus dans le fichier). Le site doit être responsive, beau, avec un design soigné. Réponds UNIQUEMENT avec le code HTML complet, sans aucun commentaire avant ou après le code.`;
    const resp = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 8192,
        system: systemPrompt,
        messages:[{ role:'user', content: prompt }]
      })
    });
    if(!resp.ok){
      const errText = await resp.text().catch(()=>'');
      throw new Error('HTTP '+resp.status+' — '+errText.substring(0,200));
    }
    const json = await resp.json();
    return json.content?.[0]?.text||'';
  }

  // ════════════════════════════════════════════════
  //  INIT
  // ════════════════════════════════════════════════
  bootApp();



