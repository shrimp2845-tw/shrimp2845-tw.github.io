"use strict";

const fs = require("fs/promises");
const path = require("path");

const CACHE_FILE = path.join(process.cwd(), ".profolio-github-cache.json");
const CACHE_TTL = 24 * 60 * 60 * 1000;

function normalizeRepo(repo) {
    return String(repo || "")
        .trim()
        .replace(/^https?:\/\/github\.com\//, "")
        .replace(/^\/+|\/+$/g, "")
        .replace(/\.git$/i, "");
}

function normalizeConfiguredRepo(item) {
    if (typeof item === "string") return normalizeRepo(item);
    if (item && item.repo) return normalizeRepo(item.repo);
    if (item && item.owner && item.name) return normalizeRepo(`${item.owner}/${item.name}`);
    return "";
}

function fallbackProject(repo, cached) {
    const name = repo.split("/").pop();
    return {
        full_name: repo,
        name,
        description: cached && cached.description ? cached.description : "No description on GitHub.",
        html_url: `https://github.com/${repo}`,
        language: cached && cached.language,
        stargazers_count: cached && cached.stargazers_count,
        readme_html: cached && cached.readme_html ? cached.readme_html : "",
        readme_error: cached && cached.readme_error ? cached.readme_error : "This project does not have a README.md.",
    };
}

function hasCachedProject(cached) {
    return Boolean(cached && cached.full_name && cached.name && cached.html_url);
}

async function readCache() {
    try {
        return JSON.parse(await fs.readFile(CACHE_FILE, "utf8"));
    } catch {
        return {};
    }
}

async function writeCache(cache) {
    await fs.writeFile(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`);
}

async function fetchJson(url) {
    const headers = {
        accept: "application/vnd.github+json",
        "user-agent": "hexo-profolio-builder",
    };
    if (process.env.GITHUB_TOKEN) {
        headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const response = await fetch(url, {
        headers,
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
}

hexo.extend.filter.register("before_generate", async function () {
    const repos = (hexo.config.github_projects || [])
        .map(normalizeConfiguredRepo)
        .filter(Boolean);

    if (repos.length === 0) {
        hexo.config.github_projects_resolved = [];
        return;
    }

    const cache = await readCache();
    const now = Date.now();
    const resolved = [];
    const serverMode = hexo.env.cmd === "server";

    for (const repo of repos) {
        const cached = cache[repo];
        if (serverMode) {
            resolved.push(fallbackProject(repo, cached));
            continue;
        }

        if (
            !process.env.PROFOLIO_REFRESH &&
            hasCachedProject(cached) &&
            (now - cached.updated_at < CACHE_TTL ||
                (!process.env.GITHUB_TOKEN && now < (cached.rate_limited_until || 0)))
        ) {
            resolved.push(fallbackProject(repo, cached));
            continue;
        }

        try {
            const data = await fetchJson(`https://api.github.com/repos/${repo}`);
            let readmeHtml = "";
            let readmeError = "";

            try {
                const readme = await fetchJson(`https://api.github.com/repos/${repo}/readme`);
                const markdown = Buffer.from(readme.content, "base64").toString("utf8");
                readmeHtml = await hexo.render.render({ text: markdown, engine: "md" });
            } catch {
                readmeError = "This project does not have a README.md.";
            }

            cache[repo] = {
                updated_at: now,
                full_name: data.full_name,
                name: data.name,
                description: data.description,
                html_url: data.html_url,
                language: data.language,
                stargazers_count: data.stargazers_count,
                readme_html: readmeHtml,
                readme_error: readmeError,
            };
            resolved.push(fallbackProject(repo, cache[repo]));
        } catch (error) {
            hexo.log.warn(`Cannot load GitHub data for ${repo}: ${error.message}`);
            if (/403|rate limit/i.test(error.message)) {
                cache[repo] = {
                    ...(cached || {}),
                    updated_at: cached && cached.updated_at ? cached.updated_at : now,
                    rate_limited_until: now + 60 * 60 * 1000,
                };
            }
            resolved.push(fallbackProject(repo, cached));
        }
    }

    await writeCache(cache);
    hexo.config.github_projects_resolved = resolved;
});
