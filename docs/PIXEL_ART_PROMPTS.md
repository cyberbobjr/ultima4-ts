# Prompts de test — génération de tuiles pixel art

Prompts pour tester un modèle d'image (texte → image, ou image → image à partir d'une tuile
d'origine) sur les deux familles de tuiles du jeu : **terrain** et **personnages / ennemis**.
Les prompts sont en anglais, car la plupart des modèles y répondent mieux.

## Contraintes communes (à garder en tête pour juger un résultat)

- **Grille** : une tuile = 16×16 pixels dans l'original. On génère plus grand (512 ou 1024 px), puis on
  réduit **au plus proche voisin** à 16, 32 ou 64 px. Demander une « grille de 32×32 gros pixels »
  facilite cette réduction.
- **Palette** : les 16 couleurs EGA (noir, bleu, vert, cyan, rouge, magenta, brun, gris clair, gris foncé,
  bleu clair, vert clair, cyan clair, rouge clair, magenta clair, jaune, blanc). Après génération, on
  quantifie l'image sur cette palette.
- **Vue** : vue de dessus (« top-down ») pour le terrain ; personnages de face, en pied, centrés.
- **Fond** : noir pur pour les personnages et les objets (le moteur l'affiche tel quel).
- **Terrain** : la tuile doit **se répéter sans couture** (bords gauche/droite et haut/bas raccords).
- **Animation** : les monstres ont 2 ou 4 images, l'eau et les champs défilent verticalement. Une
  tuile animée doit rester **le même dessin** d'une image à l'autre (voir « Feuilles d'animation »).
- Pas de texte, de cadre, de bordure, d'ombre portée hors de la tuile, ni de perspective 3/4.

### Négatif commun (pour les modèles qui l'acceptent)

```
blurry, anti-aliasing, gradient shading, soft edges, photorealistic, 3d render, isometric, perspective,
text, letters, watermark, signature, frame, border, drop shadow, noise, jpeg artifacts, extra colors
```

### Préfixe de style commun

```
pixel art game tile, 32x32 pixel grid, each pixel a crisp square block, limited 16-color EGA palette,
flat colors, no anti-aliasing, 1980s computer RPG style (Ultima, early CRPG), clean readable shapes
```

---

## 1. Tuiles de terrain (vue de dessus, répétables)

| Tuile | Prompt (à ajouter après le préfixe) |
|---|---|
| Herbe | `top-down grassland tile, black ground with scattered small bright green grass tufts, sparse and evenly distributed, seamless tileable texture` |
| Broussailles | `top-down scrubland tile, low green bushes and grass tufts on black ground, a bit denser than grassland, seamless tileable texture` |
| Forêt | `top-down dense forest tile, rounded green tree crowns packed together with dark gaps, seamless tileable texture` |
| Collines | `top-down rolling hills tile, soft green and dark green rounded mounds on black, seamless tileable texture` |
| Montagnes | `top-down mountain range tile, jagged grey and white rock peaks drawn as stacked zigzag ridges on black, impassable, seamless tileable texture` |
| Marais | `top-down swamp tile, dark green muddy ground with small murky puddles and reeds, seamless tileable texture` |
| Eau profonde | `top-down deep ocean tile, dark blue water with thin horizontal wave strokes, seamless tileable texture, designed to scroll vertically` |
| Eau | `top-down sea tile, medium blue water with short horizontal wave lines, seamless tileable texture, designed to scroll vertically` |
| Hauts-fonds | `top-down shallow water tile, light blue water with sandy specks, seamless tileable texture` |
| Lave | `top-down lava tile, glowing red and orange molten rock with dark cracks, seamless tileable texture, designed to scroll vertically` |
| Champ de poison | `top-down poison gas field tile, swirling green bubbles on black, seamless tileable texture` |
| Champ d'énergie | `top-down crackling energy field tile, bright cyan and white electric arcs on black, seamless tileable texture` |
| Champ de feu | `top-down fire field tile, small red and yellow flames on black, seamless tileable texture` |
| Sol de briques | `top-down brick floor tile, small rectangular bricks in a running bond pattern, cyan and black, seamless tileable texture` |
| Plancher | `top-down wooden plank floor tile, brown boards with dark seams, seamless tileable texture` |
| Rivage (coin) | `top-down shoreline corner tile, grass in three quarters, blue water in the north-east corner, curved coast, matches grass and water tiles` |

**Test de raccord** : assembler la tuile en 3×3 (ou 4×4) et vérifier qu'aucune couture n'apparaît.
Pour l'eau et la lave, faire défiler la tuile de 1 pixel par image (comme le jeu) et vérifier que le
mouvement reste fluide.

### Lieux sur la carte du monde (une seule tuile, pas répétable)

| Tuile | Prompt |
|---|---|
| Ville | `small walled medieval town seen from the side, white stone wall with battlements, two orange roofed towers, a dark gate in the middle, on black background` |
| Château | `small stone castle seen from the front, white walls with battlements, two round towers with blue bases, a red flag on top, a dark gate, on black background` |
| Village | `three small red-roofed huts on black ground with a few green grass tufts` |
| Entrée de donjon | `dark cave entrance in a grey rocky hill, black opening, on black background` |
| Sanctuaire | `small circle of grey standing stones seen from above, on black ground` |
| Porte de lune | `glowing magic portal, a blue gateway between two golden pillars, on black background` |

---

## 2. Personnages (de face, en pied, fond noir)

Préfixe à ajouter : `single character sprite, full body, front view, centered, standing on the bottom of
the tile, pure black background, readable silhouette at small size`.

| Personnage | Prompt |
|---|---|
| Avatar | `young hero with a brown hat, green tunic, red trousers, a white shield with a black cross in the left hand and a short sword in the right hand` |
| Mage | `old mage in a long blue robe with a pointed hat and a wooden staff` |
| Barde | `bard in a green and yellow tunic holding a lute` |
| Guerrier | `fighter in grey chain armour with a round shield and a sword` |
| Druide | `druid in a brown hooded robe with a gnarled staff and a leaf crown` |
| Bricoleur | `tinker in a leather apron with a hammer and a tool belt` |
| Paladin | `paladin knight in shining silver plate armour with a white tabard and a long sword` |
| Rôdeur | `ranger in a dark green cloak with a longbow` |
| Berger | `shepherd in simple brown clothes with a crook` |
| Garde | `town guard in grey armour with a helmet and a long spear` |
| Marchand | `townsperson merchant in a red coat with a coin purse` |
| Mendiant | `beggar in torn grey rags, hunched, holding out a bowl` |
| Bouffon | `jester in a red and yellow motley outfit with a belled hat` |
| Roi | `king with a golden crown, a purple royal robe with white fur and a sceptre` |

---

## 3. Ennemis (de face, fond noir)

Même préfixe que les personnages, en remplaçant « character » par « monster ».

| Ennemi | Prompt |
|---|---|
| Orc | `green orc warrior with small red horns, blue eyes, a loincloth, arms raised` |
| Squelette | `white skeleton warrior with a rusty sword, glowing eye sockets` |
| Troll | `big grey-green troll with a club, hunched` |
| Rat géant | `giant brown rat seen from the side, long tail` |
| Chauve-souris | `black bat with spread wings, red eyes` |
| Araignée géante | `giant black spider with red markings, eight legs spread` |
| Fantôme | `pale white ghost with a trailing wispy body and dark eyes` |
| Slime | `green slime blob with bubbles` |
| Gremlin | `small green gremlin with big ears, crouching` |
| Mimic | `wooden treasure chest monster with teeth and a tongue` |
| Faucheur | `hooded reaper in a black robe with a scythe` |
| Œil volant | `floating eye monster with a large single eye and small tentacles` |
| Mage maléfique | `evil mage in a red robe casting a spell` |
| Liche | `undead lich king in a dark robe with a crown and a glowing staff` |
| Lézard de lave | `red and orange lava lizard, side view` |
| Démon | `red winged demon with horns and a trident` |
| Hydre | `three-headed green hydra` |
| Dragon | `green dragon seen from the side, wings raised, breathing a small flame` |
| Balron | `huge dark balron demon with bat wings, horns and a flaming whip` |
| Serpent de mer | `green sea serpent rising from blue water` |
| Navire pirate | `pirate sailing ship seen from above with a black flag` |

---

## 4. Feuilles d'animation (cohérence entre les images)

Le défaut majeur d'une génération image par image est que le personnage change d'une image à
l'autre. Pour tester la cohérence, demander **toutes les images dans une seule feuille**, puis découper :

```
pixel art sprite sheet, 4 frames side by side in one row, each frame a 32x32 pixel grid, the SAME
<character/monster description> in every frame, identical colors, identical design and proportions,
only a small walk/idle animation changes between frames (arms and legs move by one or two pixels),
pure black background, no gaps between frames, no text
```

Pour la porte de lune (4 images : ouverture → ouverte) :

```
pixel art sprite sheet, 4 frames side by side, the same blue magic portal between two golden pillars,
frame 1 barely visible thin glow, frame 2 half open, frame 3 almost open, frame 4 fully open bright
portal, identical pillars in every frame, pure black background
```

Critères : même silhouette, mêmes couleurs, même cadrage d'une image à l'autre ; seules les parties
animées bougent.

## 5. Mode image → image (à partir des tuiles d'origine)

Agrandir la tuile 16×16 d'origine au plus proche voisin (×32 → 512 px), puis :

```
Redraw this image as a cleaner pixel art tile on the same 16x16 pixel grid (each original pixel stays a
square block), keep exactly the same shapes, silhouette, colors and position; only refine edges and add
one shade per color. Pure black background stays black.
```

Débruitage (« denoise ») faible (0,3 à 0,5) : au-delà, le modèle invente des détails et perd les formes,
comme lors du premier essai (châteaux déformés, animations incohérentes).

## Post-traitement conseillé

1. Réduire au plus proche voisin à la taille cible (16, 32 ou 64 px).
2. Quantifier sur la palette EGA (16 couleurs) sans tramage.
3. Pour le terrain, vérifier le raccord en 3×3 ; pour les animations, comparer les images côte à côte.
4. Comparer avec le pack algorithmique (`npx tsx tools/packs/upscale.ts --algo scale4x`), qui sert de
   référence de fidélité.
