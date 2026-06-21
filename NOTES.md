# Flow — Notes techniques

Ce document remplace `generate-report.html`, un ancien générateur de rapport PDF d'audit. Le contenu de l'audit est conservé ci-dessous comme référence ; le PDF lui-même a été abandonné — l'app n'a plus besoin de fichier dédié pour ça.

## Structure du projet

| Fichier | Rôle |
|---|---|
| `index.html` | Application complète — HTML, CSS et JS sont inline dans ce seul fichier |
| `manifest.json` | Manifeste PWA (icône, nom, couleurs) |
| `sw.js` | Service worker — cache offline |
| `logo.png` | Icône de l'app (utilisée par le manifest et la sidebar) |

> `app.js` et `style.css` (anciennes versions du code, antérieures à la fusion dans `index.html`) ainsi que `icon192.png` / `icon512.png` (doublons exacts de `logo.png`, jamais référencés) ont été supprimés — ils n'étaient plus utilisés par rien.

## Audit technique (résumé de l'ancien rapport v2.3)

### Vue d'ensemble
Flow est une application de gestion de projet en mode SaaS léger, déployée statiquement (GitHub Pages par exemple), avec synchronisation temps réel via Firebase Realtime Database. Design "liquid glass" avec mode sombre/clair, responsive mobile complet.

### Stack technologique
- **Frontend** : HTML5/CSS3 + JS vanilla ES6+, aucun framework ni build tool. Google Fonts (Geist).
- **Infrastructure** : Firebase Realtime Database (sync), jsPDF (export PDF côté navigateur), localStorage (cache/mode hors-ligne partiel).
- **Fonctionnalités** : multi-rôles (Admin/Contrôleur/Client), timelines de projet, documents/formulaires, suivi financier, journal d'activité, notifications navigateur + Discord, palette de commandes (Cmd+K), export PDF, PWA installable.

### Points forts identifiés
- Design system cohérent (tokens CSS, glassmorphism soigné dans les deux thèmes)
- Architecture zéro-coût / zéro-serveur (Firebase + hébergement statique)
- Expérience mobile soignée (tabbar native, touch targets 44px, safe-area iOS)
- Richesse fonctionnelle élevée pour un projet sans framework ni équipe

### Axes d'amélioration technique (état au moment de l'audit)
- **Modularisation** — le code était monolithique (`app.js` + `index.html` > 5000 lignes cumulées). *Depuis, `app.js` a été abandonné et tout est consolidé dans `index.html` ; le fichier reste volumineux (~7000 lignes) mais constitue maintenant la seule source de vérité.*
- **Performance** — lazy loading des vues, virtualisation des longues listes, cache d'assets via service worker. *Pagination + `content-visibility:auto` ajoutés depuis sur les listes Utilisateurs/Historique/Documents.*
- **Authentification** — migration possible vers Firebase Authentication, règles de sécurité par rôle, App Check, rate limiting serveur.
- **Tests & CI/CD** — aucun test automatisé actuellement (Vitest, Playwright, GitHub Actions à envisager).
- **Accessibilité** — ARIA sur les composants interactifs, navigation clavier complète. *Support clavier ajouté depuis sur le Kanban (flèches ←/→).*
- **PWA** — manifest + service worker. *Déjà en place.*

### Pistes d'intégration IA évoquées
- Génération assistée de briefs et de timelines à la création d'un projet
- Score de santé projet automatique (déjà implémenté depuis : `projectHealthScore`)
- Détection d'anomalies financières (déjà implémenté depuis : `detectFinanceAnomalies`)
- Rédaction automatique de relances client (déjà implémenté depuis : bouton "Relancer")
- Recherche sémantique (embeddings) — non implémenté
- Assistant conversationnel contextuel — implémenté depuis sous la forme de l'onglet "Discussion" (assistant projet côté client, via l'API Groq)

### Limite de sécurité connue, toujours valable
La clé API (Groq) et la configuration Firebase restent visibles dans le code source de la page, lisibles par quiconque l'ouvre. Aucun garde-fou côté front (rate-limit compris) ne change ça structurellement — une protection complète demanderait un petit serveur relais qui garde la clé côté serveur plutôt que côté navigateur.

---
*Document de référence, à mettre à jour manuellement si l'architecture évolue. Dernière consolidation : fusion de `generate-report.html` en notes Markdown.*
