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
  assert.match(html, /https:\/\/veil-of-secrets\.example\/og\.png/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  await access(new URL("../public/og.png", import.meta.url));
});

test("keeps the full tabletop case and accessibility controls in source", async () => {
  const [page, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  for (const room of [
    "observatory",
    "library",
    "study",
    "ballroom",
    "hall",
    "dining",
    "conservatory",
    "cellar",
    "kitchen",
  ]) {
    assert.match(page, new RegExp(`id: "${room}"`));
  }

  assert.match(page, /const rollDice/);
  assert.match(page, /const enterManor/);
  assert.match(page, /openingDeparting/);
  assert.match(page, /veil-sigil/);
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
  assert.match(page, /caseVariations/);
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
  assert.match(page, /pawn-head/);
  assert.match(page, /Movement tray/);
  assert.match(page, /manorEvents/);
  assert.match(page, /You \+ 3 manor minds/);
  assert.match(page, /selectedSuspect === "celia"/);
  assert.match(page, /Silver letter opener/);
  assert.match(page, /To conceal the stolen estate funds/);
  assert.match(page, /largeText/);
  assert.match(page, /reducedMotion/);
  assert.match(page, /captionsOn/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /\.manor-board/);
  assert.match(css, /\.opening-cinematic-bg/);
  assert.match(css, /\.veil-sigil/);
  assert.match(css, /\.velvet-curtain/);
  assert.match(css, /@keyframes curtain-open-left/);
  assert.match(css, /@keyframes title-metal-shimmer/);
  assert.match(css, /\.turn-phase-rail/);
  assert.match(css, /\.floor-space/);
  assert.match(css, /\.floor-room/);
  assert.match(css, /\.room-door/);
  assert.match(css, /\.room-furniture/);
  assert.match(css, /\.pawn-head/);
  assert.match(css, /\.dice-tray/);
  assert.match(css, /\.die-face i\.pip/);
  assert.match(css, /\.brass-die/);
  assert.match(css, /@keyframes roll-die/);
  assert.match(packageJson, /"lucide-react"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await access(new URL("../public/audio/dice-roll-wood.mp3", import.meta.url));
});
