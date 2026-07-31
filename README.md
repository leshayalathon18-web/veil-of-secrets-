# Veil of Secrets

Veil of Secrets is an original multiplayer-first mystery deduction game set in
the candlelit halls of Blackthorn Manor. Players search changing rooms, compare
testimony, build a shared evidence record, and submit a complete accusation
without eliminating anyone from the match.

## Current playable milestone

The first-launch vertical slice includes:

- Cinematic velvet-curtain opening with an original gold V, crimson veil, and
  keyhole crest, plus a storm-lit manor silhouette, embers, metallic title
  shimmer, and entrance transition
- Narrated 90-second tutorial film with seven detailed chapters, burned-in
  captions, original motion graphics, and the illustrated cast moving through
  the manor
- Walkable fifteen-location manor floor plan with individual marble hallway spaces
- Enterable, furnished rooms with working doorways and room-only searches
- Physical six-sided die with a licensed wooden-table roll recording
- Ten-character detective roster that draws a different four-player table for each new case
- Ten illustrated original character cards with biographies and investigation talents
- Private two-player rooms with six-character codes, optional round passwords,
  copy-ready invitations, and automatic connection recovery
- Synchronized dice, clue, turn, pawn, and movement-ledger state between both players
- Visible step-by-step bot movement instead of instant pawn teleporting
- Eleven distinct mystery cases with different victims, culprits, methods, motives, evidence trails, and verdicts
- Four illustrated character miniatures that visibly travel space-by-space, plus a four-step turn rail, movement points, and turn order
- Rival movement, round pressure, and flipping manor-event cards
- Room searches with interactive evidence
- Automatic detective notebook
- Full culprit, method, location, and motive accusation
- Wrong-theory guidance and completed-case scoring
- Persistent sound, text size, reduced-motion, and caption preferences
- Responsive desktop, tablet, and phone layouts
- Original procedural UI chimes
- Branded social share artwork

## Product direction

The next production milestone adds server-authoritative public matchmaking,
player-selected character abilities, discussion tools, voice controls,
moderation, and progression.

See [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md) and
[docs/ROADMAP.md](docs/ROADMAP.md) for the source-of-truth design and delivery
plan.

## Development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm test
```

`npm test` creates the production build and verifies the rendered experience,
metadata, asset wiring, and core case data.

## Originality and assets

Veil of Secrets is an original IP. It does not copy the rules, art, maps,
characters, terminology, or interface of another mystery game. Third-party
asset notices are tracked in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
