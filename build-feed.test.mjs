import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./build-feed.mjs", import.meta.url));
const sources = [
	"https://github.com/example/first/commits/main.atom",
	"https://github.com/example/second/commits/main.atom",
];
const previousFeed = "<rss>previous feed</rss>";

/** @param {import("node:test").TestContext} t @param {number} secondStatus */
function runBuild(t, secondStatus) {
	const cwd = mkdtempSync(join(tmpdir(), "skill-news-"));
	t.after(() => rmSync(cwd, { recursive: true, force: true }));
	writeFileSync(join(cwd, "sources.json"), JSON.stringify(sources));
	const feed = join(cwd, "feed.xml");
	writeFileSync(feed, previousFeed);

	const mockFetch = `
    globalThis.fetch = async (url) => {
      if (url === ${JSON.stringify(sources[1])} && ${secondStatus} !== 200) {
        return new Response("Service unavailable", { status: ${secondStatus} });
      }
      const title = url.split("/")[4];
      return new Response('<feed><entry><title>' + title + '</title>' +
        '<link href="' + url + '"/><updated>2026-01-01T00:00:00Z</updated>' +
        '</entry></feed>');
    };
  `;
	const preload = `data:text/javascript,${encodeURIComponent(mockFetch)}`;
	const result = spawnSync(process.execPath, ["--import", preload, script], {
		cwd,
		encoding: "utf8",
	});
	return { ...result, feed: readFileSync(feed, "utf8") };
}

test("publishes items from both successful sources", (t) => {
	const result = runBuild(t, 200);
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.feed, /<title>first \| example\/first<\/title>/);
	assert.match(result.feed, /<title>second \| example\/second<\/title>/);
});

test("a failed source leaves the previous feed untouched", (t) => {
	const result = runBuild(t, 503);
	assert.equal(result.feed, previousFeed);
	assert.equal(result.status, 1);
	assert.ok(result.stderr.includes(sources[1]));
	assert.match(result.stderr, /HTTP 503/);
});
