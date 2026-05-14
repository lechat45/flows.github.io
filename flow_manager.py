#!/usr/bin/env python3
"""
Flow Manager — Gestionnaire de données pour le site Flow
Lit/écrit data.json localement et synchronise avec GitHub.

Configuration :
  export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx
  export GITHUB_REPO=lechat45/flow.github.io
  export GITHUB_BRANCH=main

Dépendances : pip install requests
"""

import json
import os
import sys
import base64
import hashlib
from datetime import datetime, date

import requests

# ─── Config ──────────────────────────────────────────────────────────────────
GITHUB_TOKEN  = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPO   = os.environ.get("GITHUB_REPO",  "lechat45/flow.github.io")
GITHUB_BRANCH = os.environ.get("GITHUB_BRANCH","main")
DATA_PATH     = os.path.join(os.path.dirname(__file__), "data.json")
REMOTE_PATH   = "data.json"

HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Flow-Manager/1.0",
}

# ─── Couleurs terminal ────────────────────────────────────────────────────────
R  = "\033[91m"   # rouge
G  = "\033[92m"   # vert
Y  = "\033[93m"   # jaune
B  = "\033[94m"   # bleu
M  = "\033[95m"   # magenta
C  = "\033[96m"   # cyan
W  = "\033[97m"   # blanc
DIM= "\033[2m"
BLD= "\033[1m"
RST= "\033[0m"

def ok(msg):   print(f"{G}✔  {msg}{RST}")
def err(msg):  print(f"{R}✘  {msg}{RST}")
def warn(msg): print(f"{Y}⚠  {msg}{RST}")
def info(msg): print(f"{C}ℹ  {msg}{RST}")
def title(msg):print(f"\n{BLD}{W}{msg}{RST}\n{'─'*len(msg)}")

# ─── Seed par défaut ──────────────────────────────────────────────────────────
DEFAULT_DATA = {
    "users": [
        {
            "id": "u1", "username": "Sacha", "password": "$mila2012",
            "role": "admin", "firstName": "Sacha", "lastName": "",
            "email": "sacha@flow.app", "photo": None,
            "projectId": None, "createdAt": "2024-01-01"
        },
        {
            "id": "u2", "username": "Alexis", "password": "0000",
            "role": "controller", "firstName": "Alexis", "lastName": "",
            "email": "alexis@flow.app", "photo": None,
            "projectId": None, "createdAt": "2024-01-01"
        }
    ],
    "projects": [
        {
            "id": "proj1", "name": "Site Vitrine Demo", "clientId": None,
            "websiteUrl": "https://example.com", "status": "in_progress",
            "createdAt": "2024-02-01",
            "timeline": [
                {"id":"tl1","label":"Prise de contact",  "status":"done",    "date":"15 Jan 2024","note":"Premier échange établi."},
                {"id":"tl2","label":"Cahier des charges", "status":"done",    "date":"20 Jan 2024","note":"Besoins validés."},
                {"id":"tl3","label":"Maquette validée",   "status":"done",    "date":"01 Fév 2024","note":"Design approuvé."},
                {"id":"tl4","label":"Développement",      "status":"current", "date": None,        "note":"En cours — 60 %"},
                {"id":"tl5","label":"Tests & Recette",    "status":"pending", "date": None,        "note":""},
                {"id":"tl6","label":"Mise en ligne",      "status":"pending", "date": None,        "note":""}
            ]
        }
    ],
    "documents": [
        {
            "id":"doc1","name":"Brief créatif","projectId":"proj1","clientId": None,
            "sentBy":"u1","sentAt":"2024-01-16","status":"pending",
            "fields":[
                {"id":"f1","label":"Décrivez votre activité","type":"textarea","value":""},
                {"id":"f2","label":"Couleurs / univers graphique","type":"text","value":""},
                {"id":"f3","label":"Sites de référence (URLs)","type":"text","value":""},
                {"id":"f4","label":"Budget estimé (€)","type":"text","value":""}
            ],
            "filledAt": None
        }
    ]
}

# ─── Stockage local ───────────────────────────────────────────────────────────
def load_data() -> dict:
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    warn(f"{DATA_PATH} introuvable → création avec les données par défaut.")
    save_data(DEFAULT_DATA)
    return DEFAULT_DATA.copy()

def save_data(data: dict):
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    ok(f"Données sauvegardées dans {DATA_PATH}")

# ─── GitHub API ───────────────────────────────────────────────────────────────
def _api(method: str, path: str, **kwargs):
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"
    resp = requests.request(method, url, headers=HEADERS, **kwargs)
    return resp

def github_pull():
    """Télécharge data.json depuis GitHub → écrase le fichier local."""
    if not GITHUB_TOKEN:
        err("GITHUB_TOKEN non défini. Définissez la variable d'environnement.")
        return False
    resp = _api("GET", REMOTE_PATH, params={"ref": GITHUB_BRANCH})
    if resp.status_code == 404:
        warn("data.json introuvable sur GitHub. Utilisez 'push' pour l'y créer.")
        return False
    if resp.status_code != 200:
        err(f"Erreur GitHub {resp.status_code} : {resp.json().get('message','?')}")
        return False
    content = base64.b64decode(resp.json()["content"]).decode("utf-8")
    data = json.loads(content)
    save_data(data)
    ok("Données synchronisées depuis GitHub.")
    return True

def github_push(message: str = ""):
    """Envoie data.json local vers GitHub."""
    if not GITHUB_TOKEN:
        err("GITHUB_TOKEN non défini.")
        return False
    if not os.path.exists(DATA_PATH):
        err(f"{DATA_PATH} introuvable.")
        return False

    with open(DATA_PATH, "r", encoding="utf-8") as f:
        raw = f.read()
    encoded = base64.b64encode(raw.encode("utf-8")).decode("utf-8")

    # Récupère le sha actuel (nécessaire pour mise à jour)
    sha = None
    resp = _api("GET", REMOTE_PATH, params={"ref": GITHUB_BRANCH})
    if resp.status_code == 200:
        sha = resp.json().get("sha")

    if not message:
        message = f"chore: update data.json [{date.today().isoformat()}]"

    payload = {
        "message": message,
        "content": encoded,
        "branch": GITHUB_BRANCH,
    }
    if sha:
        payload["sha"] = sha

    resp = _api("PUT", REMOTE_PATH, json=payload)
    if resp.status_code in (200, 201):
        ok(f"data.json publié sur GitHub ({GITHUB_REPO}@{GITHUB_BRANCH}).")
        return True
    err(f"Erreur GitHub {resp.status_code} : {resp.json().get('message','?')}")
    return False

# ─── Helpers ──────────────────────────────────────────────────────────────────
def new_id(prefix: str) -> str:
    return prefix + base64.urlsafe_b64encode(
        hashlib.md5(datetime.now().isoformat().encode()).digest()
    )[:8].decode()

def prompt(label: str, default: str = "") -> str:
    val = input(f"  {C}{label}{RST}" + (f" [{default}]" if default else "") + " : ").strip()
    return val if val else default

def choose(options: list, label: str = "Choix") -> int:
    for i, o in enumerate(options, 1):
        print(f"  {DIM}{i}.{RST} {o}")
    while True:
        raw = input(f"  {C}{label}{RST} (1-{len(options)}) : ").strip()
        if raw.isdigit() and 1 <= int(raw) <= len(options):
            return int(raw) - 1
        print(f"  {Y}Veuillez entrer un nombre entre 1 et {len(options)}.{RST}")

def role_color(role: str) -> str:
    return {"admin": Y, "controller": C, "client": G}.get(role, W)

# ─── CRUD Utilisateurs ────────────────────────────────────────────────────────
def list_users(data: dict):
    title("👤 Utilisateurs")
    users = data["users"]
    if not users:
        info("Aucun utilisateur.")
        return
    for u in users:
        rc = role_color(u["role"])
        proj = next((p["name"] for p in data["projects"] if p.get("clientId") == u["id"]), "—")
        print(f"  {BLD}{u['username']}{RST}  {rc}[{u['role']}]{RST}  {DIM}{u.get('email','—')}  projet: {proj}{RST}")

def add_user(data: dict):
    title("➕ Nouveau utilisateur")
    u = {
        "id":        new_id("u"),
        "username":  prompt("Pseudo *"),
        "password":  prompt("Mot de passe *"),
        "role":      ["admin","controller","client"][choose(["Admin","Contrôleur","Client"],"Rôle")],
        "firstName": prompt("Prénom"),
        "lastName":  prompt("Nom"),
        "email":     prompt("Email"),
        "photo":     None,
        "projectId": None,
        "createdAt": date.today().isoformat(),
    }
    if not u["username"] or not u["password"]:
        err("Pseudo et mot de passe obligatoires.")
        return
    if any(x["username"].lower() == u["username"].lower() for x in data["users"]):
        err("Ce pseudo existe déjà.")
        return
    data["users"].append(u)
    save_data(data)
    ok(f"Utilisateur '{u['username']}' créé.")

def edit_user(data: dict):
    title("✏️  Modifier un utilisateur")
    usernames = [u["username"] for u in data["users"]]
    idx = choose(usernames, "Utilisateur à modifier")
    u = data["users"][idx]
    print(f"\n  Modification de {BLD}{u['username']}{RST} (Entrée = conserver la valeur actuelle)\n")
    u["firstName"] = prompt("Prénom",   u.get("firstName",""))
    u["lastName"]  = prompt("Nom",      u.get("lastName",""))
    u["email"]     = prompt("Email",    u.get("email",""))
    new_un = prompt("Pseudo", u["username"])
    if new_un != u["username"] and any(x["username"].lower()==new_un.lower() for x in data["users"] if x["id"]!=u["id"]):
        err("Ce pseudo est déjà utilisé.")
        return
    u["username"] = new_un
    new_pw = prompt("Nouveau MDP (vide = inchangé)", "")
    if new_pw:
        u["password"] = new_pw
    new_role = ["admin","controller","client"][choose(["Admin","Contrôleur","Client"],"Rôle")]
    u["role"] = new_role
    save_data(data)
    ok(f"Utilisateur '{u['username']}' mis à jour.")

def delete_user(data: dict):
    title("🗑  Supprimer un utilisateur")
    usernames = [u["username"] for u in data["users"]]
    idx = choose(usernames, "Utilisateur à supprimer")
    u = data["users"][idx]
    confirm = input(f"  {R}Supprimer '{u['username']}' ? (oui/non){RST} : ").strip().lower()
    if confirm != "oui":
        info("Annulé.")
        return
    data["users"] = [x for x in data["users"] if x["id"] != u["id"]]
    for p in data["projects"]:
        if p.get("clientId") == u["id"]:
            p["clientId"] = None
    save_data(data)
    ok(f"Utilisateur '{u['username']}' supprimé.")

# ─── CRUD Projets ─────────────────────────────────────────────────────────────
def list_projects(data: dict):
    title("📁 Projets")
    projects = data["projects"]
    if not projects:
        info("Aucun projet.")
        return
    for p in projects:
        client = next((u["username"] for u in data["users"] if u["id"] == p.get("clientId")), "—")
        done = sum(1 for s in p["timeline"] if s["status"] == "done")
        total = len(p["timeline"])
        status_color = G if p["status"] == "done" else Y if p["status"] == "in_progress" else DIM
        print(f"  {BLD}{p['name']}{RST}  {status_color}[{p['status']}]{RST}  "
              f"client: {client}  timeline: {done}/{total}  🔗 {p.get('websiteUrl','—')}")

def add_project(data: dict):
    title("➕ Nouveau projet")
    clients = [u for u in data["users"] if u["role"] == "client"]
    p = {
        "id":         new_id("proj"),
        "name":       prompt("Nom du projet *"),
        "clientId":   None,
        "websiteUrl": prompt("URL du site web"),
        "status":     "in_progress",
        "createdAt":  date.today().isoformat(),
        "timeline":   []
    }
    if not p["name"]:
        err("Le nom est obligatoire.")
        return
    if clients:
        opts = ["— Aucun client —"] + [u["username"] for u in clients]
        idx = choose(opts, "Associer un client")
        if idx > 0:
            p["clientId"] = clients[idx - 1]["id"]
    # Timeline par défaut
    add_steps = input("  Ajouter des étapes de timeline ? (oui/non) [oui] : ").strip().lower()
    if add_steps != "non":
        while True:
            label = input("  Nom de l'étape (vide pour arrêter) : ").strip()
            if not label:
                break
            p["timeline"].append({
                "id": new_id("tl"), "label": label,
                "status": "pending", "date": None, "note": ""
            })
    data["projects"].append(p)
    save_data(data)
    ok(f"Projet '{p['name']}' créé.")

def edit_timeline(data: dict):
    title("⏱  Modifier une timeline")
    if not data["projects"]:
        info("Aucun projet.")
        return
    names = [p["name"] for p in data["projects"]]
    idx = choose(names, "Projet")
    p = data["projects"][idx]
    print(f"\n  Timeline de {BLD}{p['name']}{RST}\n")
    for i, s in enumerate(p["timeline"]):
        sc = G if s["status"]=="done" else Y if s["status"]=="current" else DIM
        print(f"  {i+1}. {sc}{s['status']}{RST}  {s['label']}")
    print()
    action = choose(["Modifier une étape","Ajouter une étape","Supprimer une étape","Retour"], "Action")
    if action == 3:
        return
    if action == 1:   # ajouter
        label = prompt("Nom de la nouvelle étape *")
        if label:
            p["timeline"].append({"id": new_id("tl"), "label": label, "status": "pending", "date": None, "note": ""})
            save_data(data); ok("Étape ajoutée.")
    elif action == 0 and p["timeline"]:  # modifier
        step_idx = choose([s["label"] for s in p["timeline"]], "Étape à modifier")
        s = p["timeline"][step_idx]
        s["label"]  = prompt("Libellé", s["label"])
        s["status"] = ["done","current","pending"][choose(["Terminé","En cours","À faire"],"Statut")]
        s["date"]   = prompt("Date (ex: 15 Jan 2025)", s.get("date") or "")
        s["note"]   = prompt("Note", s.get("note") or "")
        save_data(data); ok("Étape mise à jour.")
    elif action == 2 and p["timeline"]:  # supprimer
        step_idx = choose([s["label"] for s in p["timeline"]], "Étape à supprimer")
        removed = p["timeline"].pop(step_idx)
        save_data(data); ok(f"Étape '{removed['label']}' supprimée.")

# ─── Documents ────────────────────────────────────────────────────────────────
def list_documents(data: dict):
    title("📄 Documents")
    docs = data["documents"]
    if not docs:
        info("Aucun document.")
        return
    for d in docs:
        sc = G if d["status"]=="reviewed" else Y if d["status"]=="filled" else DIM
        proj = next((p["name"] for p in data["projects"] if p["id"]==d["projectId"]), "—")
        print(f"  {BLD}{d['name']}{RST}  {sc}[{d['status']}]{RST}  projet: {proj}  envoyé: {d.get('sentAt','—')}")

def add_document(data: dict):
    title("➕ Nouveau document")
    projects = [p for p in data["projects"] if p.get("clientId")]
    if not projects:
        err("Aucun projet avec un client associé. Associez d'abord un client à un projet.")
        return
    proj_idx = choose([p["name"] for p in projects], "Projet")
    p = projects[proj_idx]
    doc = {
        "id":        new_id("doc"),
        "name":      prompt("Nom du document *"),
        "projectId": p["id"],
        "clientId":  p["clientId"],
        "sentBy":    "u1",
        "sentAt":    date.today().isoformat(),
        "status":    "pending",
        "fields":    [],
        "filledAt":  None,
    }
    if not doc["name"]:
        err("Le nom est obligatoire.")
        return
    print("  Ajoutez des champs (vide pour arrêter) :")
    while True:
        label = input("    Champ (libellé) : ").strip()
        if not label:
            break
        ftype = ["text","textarea"][choose(["Texte court","Paragraphe"],"Type")]
        doc["fields"].append({"id": new_id("f"), "label": label, "type": ftype, "value": ""})
    if not doc["fields"]:
        err("Au moins un champ est requis.")
        return
    data["documents"].append(doc)
    save_data(data)
    ok(f"Document '{doc['name']}' créé et envoyé.")

# ─── Menu principal ───────────────────────────────────────────────────────────
MENU = [
    ("👤 Lister les utilisateurs",      list_users),
    ("➕ Ajouter un utilisateur",        add_user),
    ("✏️  Modifier un utilisateur",      edit_user),
    ("🗑  Supprimer un utilisateur",     delete_user),
    ("─────────────────────────────",   None),
    ("📁 Lister les projets",            list_projects),
    ("➕ Ajouter un projet",             add_project),
    ("⏱  Modifier une timeline",        edit_timeline),
    ("─────────────────────────────",   None),
    ("📄 Lister les documents",          list_documents),
    ("📤 Créer / envoyer un document",   add_document),
    ("─────────────────────────────",   None),
    ("☁️  Télécharger depuis GitHub",    lambda d: github_pull() and print()),
    ("🚀 Publier vers GitHub",           lambda d: github_push()),
    ("─────────────────────────────",   None),
    ("❌ Quitter",                        None),
]

def main():
    print(f"\n{BLD}{W}{'═'*46}{RST}")
    print(f"{BLD}{W}    FLOW — Gestionnaire de données     {RST}")
    print(f"{BLD}{W}{'═'*46}{RST}")
    if not GITHUB_TOKEN:
        warn("GITHUB_TOKEN non défini → sync GitHub désactivé.")
        warn("Définissez : export GITHUB_TOKEN=ghp_votre_token\n")

    data = load_data()

    while True:
        print(f"\n{BLD}Menu principal :{RST}")
        active = [(label, fn) for label, fn in MENU if "───" not in label]
        for i, (label, _) in enumerate(active, 1):
            print(f"  {DIM}{i:2}.{RST} {label}")
        print()
        raw = input(f"  {C}Choix{RST} : ").strip()
        if not raw.isdigit() or not (1 <= int(raw) <= len(active)):
            warn("Entrée invalide.")
            continue
        label, fn = active[int(raw) - 1]
        if label.startswith("❌"):
            print(f"\n{G}À bientôt !{RST}\n")
            break
        if fn:
            try:
                fn(data)
                data = load_data()   # recharge après chaque action
            except KeyboardInterrupt:
                print(f"\n{Y}Action annulée.{RST}")
            except Exception as e:
                err(f"Erreur inattendue : {e}")

if __name__ == "__main__":
    main()
