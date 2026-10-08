# Prompt — session « écran et interface »

Tu travailles sur **ultima4-ts** (`E:\IdeaProjects\u4`, branche `feature/modernization`, seule branche à pousser ;
`local/bundled-assets` est locale). Lis `README.md`, `docs/RE_NOTES.md`, ta mémoire (`u4-testing-setup`,
`u4-modernization-plan`) et `src/ui/dom/` avant d'agir. Node est dans `.nodeenv/Scripts`. Vite et les tests headless
se lancent depuis l'outil PowerShell. Les fichiers TS s'écrivent avec Write/Edit, car les heredocs Bash mangent les
antislashs et le dossier de travail est en CRLF. Après un changement de branche : `npm run extract` puis
`npm run assets:local`.

## Problème constaté

Sur mon écran (fenêtre d'environ 990×740, et dans l'application Tauri sous Windows), il manque la partie droite de
l'interface : la barre de commandes (menus Inventaire/Carte/Aide/Options, pavé directionnel, commandes, Entrée/Échap/Taper)
n'apparaît pas, et le cadre du jeu semble coupé à droite. Seul le canvas 320×200 d'origine est visible.

Causes probables, à vérifier :
- `src/ui/dom/shell.ts` (`showBar`) : avec `controls.commandBar = "auto"`, la barre n'est montrée que sur écran
  tactile ou à partir de 1100 px de large. Sur un bureau plus petit, elle disparaît.
- `src/render/renderer.ts` (`resize`) : ajuste le canvas en 4:3 au conteneur `#stage`, avec une échelle
  horizontale entière dès 640 px. À vérifier dans Tauri/WebView2 avec une mise à l'échelle Windows de 125 % et 150 %
  (`devicePixelRatio` non entier), fenêtre redimensionnée, plein écran et sortie de plein écran : le canvas ne doit
  jamais déborder.

## Objectifs

1. **Mise en page responsive fiable** : le cadre du jeu (4:3) et la barre de commandes tiennent toujours entièrement à
   l'écran, de 800×600 à 4K, en paysage comme en portrait (iPad), dans le navigateur et dans Tauri. Si la place manque,
   la barre se replie (icônes seules, colonne plus étroite, ou panneau escamotable avec une poignée) au lieu de
   disparaître. Le canvas réduit son échelle plutôt que d'être coupé.
2. **Barre de commandes visible par défaut sur bureau**, avec un bouton pour la masquer ou la montrer (raccourci
   clavier, mémorisé dans `config.json`). Les options `auto/always/never` restent dans Options (F10).
3. **Interface plus moderne autour du jeu**, en gardant le cadre 320×200 d'origine intact au centre :
   - panneau latéral : état du groupe plus lisible (PV/PM en barres, statut, nourriture/or, effets actifs, phases
     des lunes avec infobulles), raccourcis vers les panneaux, journal des messages défilant (historique de la console
     du jeu, consultable), mini-carte optionnelle ;
   - thème cohérent (couleurs EGA, police Press Start 2P), animations sobres, accessibilité (focus visible, contrastes,
     tailles tactiles ≥ 44 px) ;
   - libellés traduits (catalogues `src/i18n/ui/<langue>/*.json`) ; aucun texte d'origine du jeu dans le code.
4. **Option « plein cadre »** : agrandir la vue de la carte (11×11 tuiles) au maximum, et basculer le statut et la
   console dans le panneau HTML. Option désactivée par défaut, le cadre d'origine restant la référence.

## Méthode

- Explore d'abord, propose un plan en plan mode et attends ma validation.
- Vérifie chaque étape avec captures headless à plusieurs tailles : `tools/ui-shot.mjs` (paysage 1400×900, portrait
  iPad), et ajoute 990×740, 800×600, 1280×720, 1920×1080, 2560×1440, un `devicePixelRatio` de 1,25 et 1,5, ainsi
  que `npm run tauri dev` pour l'application.
- Non-régression : `npx tsc --noEmit`, `npx vitest run`, `node tools/scenarios.mjs` (le canvas doit rester
  identique pixel à pixel dans les scénarios).
- Commits réguliers sur `feature/modernization`, poussés seulement sur cette branche.
