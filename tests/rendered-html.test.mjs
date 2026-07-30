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
  assert.match(html, /An original social deduction mystery/);
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

test("keeps the full practice case and accessibility controls in source", async () => {
  const [page, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  for (const room of ["library", "conservatory", "study", "hall"]) {
    assert.match(page, new RegExp(`id: "${room}"`));
  }

  assert.match(page, /selectedSuspect === "celia"/);
  assert.match(page, /Silver letter opener/);
  assert.match(page, /To conceal the stolen estate funds/);
  assert.match(page, /largeText/);
  assert.match(page, /reducedMotion/);
  assert.match(page, /captionsOn/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(packageJson, /"lucide-react"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
