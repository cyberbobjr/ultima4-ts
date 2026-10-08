# Ultima IV — TypeScript + three.js + Tauri

*[English version](README.md)*

Réimplémentation d'**Ultima IV: Quest of the Avatar** (version DOS vendue par GOG) en TypeScript,
avec un rendu three.js et une application de bureau Tauri v2.

Le moteur a été reconstruit par rétro-ingénierie du jeu original : décodage des formats de fichiers
et décompilation avec Ghidra des exécutables (`AVATAR.EXE`, après suppression de sa compression
EXEPACK, et `TITLE.EXE`). Les règles, formules et tables citent en commentaire les adresses des
fonctions originales (`1000:xxxx`) et des données (`DS:xxxx`). Voir `docs/RE_NOTES.md`.

## Il faut les fichiers du jeu original

Aucun code original n'est exécuté (pas de DOSBox, pas d'émulation), mais les **données** du jeu sont
lues à l'exécution : `WORLD.MAP`, `SHAPES.EGA`, `CHARSET.EGA`, cartes des villes (`*.ULT`), dialogues
(`*.TLK`), arènes de combat (`*.CON`), donjons (`*.DNG`), images (`*.EGA`) et `TITLE.EXE` (lu comme
une donnée pour les textes et tables de l'intro).

Ces fichiers **ne sont pas inclus** dans ce dépôt. Ultima IV est disponible gratuitement sur GOG.
Par défaut, ils sont lus depuis :

```
C:\Program Files\GOG Galaxy\Games\Ultima 4
```

La variable d'environnement `U4_GAME_DIR` permet d'indiquer un autre dossier. L'installation
originale n'est jamais modifiée : les sauvegardes vont dans le dossier de données de l'application
(Tauri) ou dans le `localStorage` (mode navigateur).

> Pour une diffusion : `src/data/tables.ts` et `src/game/town/strings.ts` contiennent pour l'instant
> des textes extraits d'`AVATAR.EXE`. Il faudra les lire depuis la copie de l'utilisateur à
> l'exécution (comme l'intro le fait déjà avec `TITLE.EXE`) avant de publier.

## Lancer

Node.js est fourni dans `.nodeenv` ; Rust (chaîne MSVC) est nécessaire pour Tauri.

PowerShell :

```powershell
$env:Path = "E:\IdeaProjects\u4\.nodeenv\Scripts;" + $env:Path
npm install
npm run tauri dev   # application de bureau, rechargement à chaud du front
npm run dev         # navigateur seul : http://127.0.0.1:1420
npm run build       # vérification des types + bundle de production
```

Git Bash : `export PATH="/e/IdeaProjects/u4/.nodeenv/Scripts:$PATH"`, puis les mêmes commandes.

En mode dev, `http://127.0.0.1:1420/?skipintro` démarre directement sur la carte du monde (utilisé
par les tests automatisés) ; l'instance du jeu est exposée dans `window.__game`.

## Organisation

| Dossier | Contenu |
|---|---|
| `src/formats` | décodeurs des fichiers originaux : images RLE/LZW (`compression.ts`), tuiles et police EGA, WORLD.MAP / ULT / CON / DNG, dialogues TLK, PARTY.SAV (aller-retour exact) |
| `src/render` | rendu three.js : atlas de tuiles + grille 11x11 instanciée, couche UI 320x200, vue 3D découpée |
| `src/game` | moteur : boucle et commandes (`game.ts`), conversations (`talk.ts`), boutiques et Lord British (`shops.ts`), combat (`combat.ts`), donjons (`dungeon.ts`), sorts (`magic.ts`), objets (`items.ts`), sanctuaires (`shrine.ts`), intro (`intro.ts`) |
| `src/intro` | écran titre et création du personnage (cartes de la gitane), alimentés par les données de `TITLE.EXE` |
| `src/dungeon` | vue des donjons à la première personne (three.js) et tables des donjons |
| `src/data` | tables de règles extraites d'`AVATAR.EXE` (monstres, armes, armures, sorts, boutiques, karma…) |
| `src-tauri` | coquille Tauri v2 : lecture des fichiers du jeu, sauvegardes |
| `docs` | notes de rétro-ingénierie |

## Commandes (clavier, comme l'original)

Flèches : déplacement · A)ttack · B)oard · C)ast · D)escend · E)nter · F)ire · G)et chest · H)ole up ·
I)gnite torch · J)immy · K)limb · L)ocate · M)ix · N)ew order · O)pen · P)eer · Q)uit & save ·
R)eady · S)earch · T)alk · U)se · W)ear · X)it · Y)ell · Z)tats · Espace : passer

Dans les donjons : Haut/Bas pour avancer/reculer, Gauche/Droite pour tourner.

## État

Implémenté : intro et création du personnage, monde extérieur (lunes, portes lunaires, vent,
navires, chevaux, monstres errants), villes (PNJ, ligne de vue, portes, conversations, toutes les
boutiques, auberges, guérisseurs, Lord British, Hawkwind, compagnons), combat tactique, donjons 3D
(salles, autels, pierres), sorts et mélanges, objets, sanctuaires et méditation, fin du jeu
(Abysse, Codex).

Certains détails sont des interprétations plutôt que des portages exacts (temporisations qui
dépendaient de la vitesse du CPU dans l'original, rendu 3D des donjons) ; ils sont signalés dans le
code.
