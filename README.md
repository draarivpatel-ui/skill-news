# skill-news

RSS feed of new Claude Code skills on GitHub. A daily Action reads the Atom feeds in `sources.json` and writes `feed.xml`.

Feed: https://raw.githubusercontent.com/flisk-sh/skill-news/main/feed.xml

Add a source: append its `.atom` URL to `sources.json`.

A Claude Code scheduled task reads this feed weekly and opens a native popup so you pick which skills to install.
