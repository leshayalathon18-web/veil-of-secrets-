import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("https://veil-of-secrets.example/", {
      headers: {
        accept: "text/html",
        host: "veil-of-secrets.example",
      },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Veil of Secrets opening", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Veil of Secrets \| Blackthorn Manor<\/title>/i);
  assert.match(html, /Enter Blackthorn Manor/);
  assert.match(html, /Every room remembers/);
  assert.match(html, /An original mystery experience/);
  assert.match(html, /New cast/);
  assert.match(html, /Every case/);
  assert.doesNotMatch(html, /codex-preview|Starter Project|loading skeleton/i);
});

test("publishes branded social metadata and artwork", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /property="og:title" content="Veil of Secrets"/i);
  assert.match(html, /https:\/\/veil-of-secrets\.example\/og-multiplayer\.png/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/og-multiplayer.png", import.meta.url));
});

test("keeps the full tabletop case and accessibility controls in source", async () => {
  const [page, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  for (const room of [
    "observatory",
    "attic",
    "library",
    "study",
    "masterBedroom",
    "ballroom",
    "hall",
    "guestSuite",
    "dining",
    "garden",
    "conservatory",
    "cellar",
    "kitchen",
    "basement",
    "secretPassage",
  ]) {
    assert.match(page, new RegExp(`id: "${room}"`));
  }

  assert.match(page, /const rollDice/);
  assert.match(page, /startHosting/);
  assert.match(page, /joinFriendGame/);
  assert.match(page, /ROOM_CODE_LENGTH = 6/);
  assert.match(page, /createRoomCode/);
  assert.match(page, /hashRoomPassword/);
  assert.match(page, /Copy invitation/);
  assert.match(page, /Round password/);
  assert.match(page, /peer\.reconnect\(\)/);
  assert.match(page, /visibilitychange/);
  assert.doesNotMatch(page, /Direct browser-to-browser play/);
  assert.match(page, /animateBotTurns/);
  assert.match(page, /Visible move ledger/);
  assert.match(page, /portraitIndex/);
  assert.match(page, /const enterManor/);
  assert.match(page, /openingDeparting/);
  assert.match(page, /tutorialVideoRef/);
  assert.match(page, /Play tutorial/);
  assert.match(page, /veil-of-secrets-tutorial\.mp4/);
  assert.match(page, /veil-of-secrets-tutorial\.vtt/);
  assert.match(page, /actual detective cast/);
  assert.doesNotMatch(page, /ruleIndex|setRuleIndex|Next principle/);
  assert.match(page, /veil-sigil/);
  assert.match(page, /sigil-crest-art/);
  assert.match(page, /veil-sigil-v2\.png/);
  assert.match(page, /const returnToOpeningScene/);
  assert.match(page, /Return to the Veil of Secrets opening scene/);
  assert.match(page, /setScene\("opening"\)/);
  assert.match(page, /className="brand-mark-art"/);
  assert.match(css, /\.brand-mark-art/);
  assert.match(page, /type NotebookTab = "evidence" \| "timeline" \| "suspects"/);
  assert.match(page, /role="tablist"/);
  assert.match(page, /notebookTab === "timeline"/);
  assert.match(page, /notebookTab === "suspects"/);
  assert.match(page, /Mark as prime suspect/);
  assert.match(css, /\.notebook-suspect\.marked/);
  assert.match(page, /MediaConnection/);
  assert.match(page, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(page, /echoCancellation: true/);
  assert.match(page, /noiseSuppression: true/);
  assert.match(page, /autoGainControl: true/);
  assert.match(page, /peer\.call\(/);
  assert.match(page, /peer\.on\("call"/);
  assert.match(page, /type: "voice-ready"/);
  assert.match(page, /Push to talk/);
  assert.match(page, /Open mic/);
  assert.match(page, /Hold to talk · V on PC/);
  assert.match(page, /Friend volume/);
  assert.match(css, /\.voice-console/);
  assert.match(css, /\.push-talk-button\.talking/);
  assert.match(css, /@keyframes voice-speaking-pulse/);
  assert.doesNotMatch(page, /sigil-eye-shell/);
  assert.match(page, /velvet-curtain/);
  assert.match(page, /opening-embers/);
  assert.match(page, /function playDiceRoll/);
  assert.match(page, /dice-roll-wood\.mp3/);
  assert.match(page, /new Audio\(/);
  assert.match(page, /Math\.floor\(Math\.random\(\) \* 6\) \+ 1/);
  assert.match(page, /dicePips/);
  assert.match(page, /corridorCoordinates/);
  assert.match(page, /boardGraph/);
  assert.match(page, /evidenceVariants/);
  assert.match(page, /caseFiles/);
  assert.match(page, /quietRoomEvidence/);
  assert.match(page, /The Silent Waltz/);
  assert.match(page, /The Bell at Dawn/);
  assert.match(page, /The Crimson Masquerade/);
  assert.match(page, /caseFiles\.length/);
  assert.match(page, /currentCase\.reveal/);
  assert.match(page, /detectiveRoster/);
  assert.match(page, /drawDetectives/);
  assert.match(page, /Mara Vale/);
  assert.match(page, /Bram Locke/);
  assert.match(page, /const movePawn/);
  assert.match(page, /const searchCurrentRoom/);
  assert.match(page, /const endBoardTurn/);
  assert.match(page, /Interactive Blackthorn Manor board/);
  assert.match(page, /turn-phase-rail/);
  assert.match(page, /floor-space/);
  assert.match(page, /floor-room/);
  assert.match(page, /room-furniture/);
  assert.match(page, /pawn-character/);
  assert.match(page, /Movement tray/);
  assert.match(page, /manorEvents/);
  assert.match(page, /type CouncilStage = "intel" \| "vote" \| "outcome"/);
  assert.match(page, /const beginMidnightCouncil/);
  assert.match(page, /const resolveCouncilLead/);
  assert.match(page, /const useCouncilAbility/);
  assert.match(page, /The Midnight Council/);
  assert.match(page, /Reveal honestly/);
  assert.match(page, /Seed a doubt/);
  assert.match(page, /Lock this lead/);
  assert.match(page, /councilRollModifier/);
  assert.match(page, /2 players \+ 2 bots/);
  assert.match(page, /Solo table · You \+ 3 bots/);
  assert.match(page, /currentCase\.solution\.suspect/);
  assert.match(page, /Silver letter opener/);
  assert.match(page, /To conceal the stolen estate funds/);
  assert.match(page, /largeText/);
  assert.match(page, /reducedMotion/);
  assert.match(page, /captionsOn/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /\.manor-board/);
  assert.match(css, /\.character-card-grid/);
  assert.match(css, /\.character-portrait/);
  assert.match(css, /\.council-detective-portrait,?\s*\.vote-portrait/);
  assert.match(css, /blackthorn-cast-sheet\.png/);
  assert.match(css, /\.movement-ledger/);
  assert.match(css, /@keyframes pawn-visible-step/);
  assert.match(css, /\.opening-cinematic-bg/);
  assert.match(css, /\.veil-sigil/);
  assert.match(css, /@keyframes crest-glint/);
  assert.match(css, /\.tutorial-film-frame/);
  assert.match(css, /\.tutorial-play-button/);
  assert.doesNotMatch(css, /\.sigil-eye-shell|\.crest-eye/);
  assert.match(css, /\.velvet-curtain/);
  assert.match(css, /@keyframes curtain-open-left/);
  assert.match(css, /@keyframes title-metal-shimmer/);
  assert.match(css, /\.turn-phase-rail/);
  assert.match(css, /\.floor-space/);
  assert.match(css, /\.floor-room/);
  assert.match(css, /\.room-door/);
  assert.match(css, /\.room-furniture/);
  assert.match(css, /\.pawn-character/);
  assert.match(css, /\.dice-tray/);
  assert.match(css, /\.die-face i\.pip/);
  assert.match(css, /\.brass-die/);
  assert.match(css, /@keyframes roll-die/);
  assert.match(css, /\.midnight-council/);
  assert.match(css, /\.council-stance-options/);
  assert.match(css, /\.council-outcome/);
  assert.match(css, /@keyframes council-enter/);
  assert.match(page, /const evidenceArtwork: Record<RoomId, string>/);
  assert.match(page, /evidence-art-label/);
  assert.match(page, /Illustrated evidence recovered in the/);
  assert.match(css, /@keyframes evidence-art-reveal/);
  assert.match(page, /const roomHotspots: Record<RoomId, RoomHotspot\[\]>/);
  assert.match(page, /const beginRoomInvestigation/);
  assert.match(page, /const inspectRoomHotspot/);
  assert.match(page, /inspectRoom\(room, false\)/);
  assert.match(page, /Keep examining the other objects/);
  assert.match(page, /Continue examining the remaining objects before you leave/);
  assert.doesNotMatch(page, /setInvestigationRoom\(null\);\s*setSearchedThisTurn\(true\);\s*inspectRoom\(room\)/);
  assert.match(page, /Interactive illustrated interior of the/);
  assert.match(page, /Investigate room/);
  assert.match(page, /room-investigation-modal/);
  assert.match(page, /investigation-detective-art/);
  assert.match(css, /blackthorn-fullbody-sheet-v1\.png/);
  assert.match(css, /@keyframes investigator-walk-cycle/);
  assert.match(css, /\.room-hotspot\.clue-found/);
  assert.match(packageJson, /"lucide-react"/);
  assert.match(packageJson, /"peerjs"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("../public/audio/dice-roll-wood.mp3", import.meta.url));
  await access(new URL("../public/characters/blackthorn-cast-sheet.png", import.meta.url));
  await access(new URL("../public/branding/veil-sigil-v2.png", import.meta.url));
  await access(new URL("../public/evidence/library.webp", import.meta.url));
  await access(new URL("../public/evidence/secret-passage.webp", import.meta.url));
  await access(new URL("../public/rooms/library.webp", import.meta.url));
  await access(new URL("../public/rooms/secret-passage.webp", import.meta.url));
  await access(new URL("../public/characters/blackthorn-fullbody-sheet-v1.png", import.meta.url));
  for (const roomAsset of [
    "observatory", "attic", "library", "study", "master-bedroom",
    "ballroom", "grand-hall", "guest-suite", "dining-hall", "moon-garden",
    "conservatory", "wine-cellar", "kitchen", "basement", "secret-passage",
  ]) {
    await access(new URL(`../public/rooms/${roomAsset}.webp`, import.meta.url));
  }
  await access(new URL("../public/tutorial/veil-of-secrets-tutorial.mp4", import.meta.url));
  await access(new URL("../public/tutorial/veil-of-secrets-tutorial-poster.jpg", import.meta.url));
  await access(new URL("../public/tutorial/veil-of-secrets-tutorial.vtt", import.meta.url));
});
