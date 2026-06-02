mixins.profolio = {
    data() {
        return {
            profolioLoading: false,
            profolioError: "",
            profolioProjects: [],
            selectedProfolio: null,
            selectedReadme: "",
            readmeLoading: false,
            readmeError: "",
            profolioListUrl: location.pathname,
        };
    },
    mounted() {
        this.loadProfolioProjects();
    },
    methods: {
        normalizeProfolioRepo(repo) {
            return String(repo || "")
                .trim()
                .replace(/^https?:\/\/github\.com\//, "")
                .replace(/^\/+|\/+$/g, "")
                .replace(/\.git$/i, "");
        },
        getConfiguredProfolioProjects() {
            const node = document.getElementById("profolio");
            if (!node) return [];
            try {
                return JSON.parse(node.dataset.projects || "[]").map((item) => {
                    if (typeof item === "string") return this.normalizeProfolioRepo(item);
                    if (item.repo) return this.normalizeProfolioRepo(item.repo);
                    if (item.owner && item.name) return this.normalizeProfolioRepo(`${item.owner}/${item.name}`);
                    return "";
                }).filter(Boolean);
            } catch {
                return [];
            }
        },
        async loadProfolioProjects() {
            const repos = this.getConfiguredProfolioProjects();
            const requestedRepo = this.normalizeProfolioRepo(new URLSearchParams(location.search).get("repo"));
            if (repos.length === 0) return;
            this.profolioProjects = repos.map((repo) => {
                const name = repo.split("/").pop();
                return {
                    full_name: repo,
                    name,
                    description: "Loading description from GitHub...",
                    html_url: `https://github.com/${repo}`,
                };
            });
            this.profolioLoading = true;
            this.profolioError = "";
            try {
                const results = await Promise.allSettled(
                    repos.map(async (repo, index) => {
                        const response = await fetch(`https://api.github.com/repos/${repo}`);
                        if (!response.ok) throw new Error(`Cannot load ${repo}`);
                        return { index, project: await response.json() };
                    })
                );
                const failed = [];
                results.forEach((result, index) => {
                    if (result.status === "fulfilled") {
                        this.profolioProjects[result.value.index] = result.value.project;
                    } else {
                        failed.push(repos[index]);
                        this.profolioProjects[index].description = "Cannot load description from GitHub.";
                    }
                });
                if (requestedRepo) {
                    const selected = this.profolioProjects.find((project) => project.full_name === requestedRepo) || {
                        full_name: requestedRepo,
                        name: requestedRepo.split("/").pop(),
                        description: "Cannot load description from GitHub.",
                        html_url: `https://github.com/${requestedRepo}`,
                    };
                    await this.selectProfolio(selected);
                }
                if (failed.length > 0) {
                    this.profolioError = `Cannot load GitHub data for: ${failed.join(", ")}`;
                }
            } catch (error) {
                this.profolioError = error.message || "Cannot load GitHub projects.";
            } finally {
                this.profolioLoading = false;
            }
        },
        openProfolio(project) {
            location.href = `${location.pathname}?repo=${encodeURIComponent(project.full_name)}`;
        },
        async selectProfolio(project) {
            this.selectedProfolio = project;
            this.selectedReadme = "";
            this.readmeError = "";
            this.readmeLoading = true;
            try {
                const response = await fetch(`https://api.github.com/repos/${project.full_name}/readme`);
                if (!response.ok) throw new Error("This project does not have a README.md.");
                const readme = await response.json();
                const markdown = decodeURIComponent(
                    Array.from(atob(readme.content.replace(/\n/g, "")), (char) => {
                        return `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`;
                    }).join("")
                );
                if (window.marked) {
                    marked.use({ breaks: true, gfm: true });
                    this.selectedReadme = marked.parse(markdown);
                } else {
                    this.selectedReadme = `<pre>${markdown
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")}</pre>`;
                }
                this.$nextTick(this.render);
            } catch (error) {
                this.readmeError = error.message || "Cannot load README.md.";
            } finally {
                this.readmeLoading = false;
            }
        },
    },
};
