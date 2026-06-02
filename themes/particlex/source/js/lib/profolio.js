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
                return JSON.parse(node.dataset.projects || "[]");
            } catch {
                return [];
            }
        },
        loadProfolioProjects() {
            const projects = this.getConfiguredProfolioProjects();
            const requestedRepo = this.normalizeProfolioRepo(new URLSearchParams(location.search).get("repo"));
            if (projects.length === 0) return;
            this.profolioProjects = projects;
            this.profolioError = "";
            if (requestedRepo) {
                const selected = this.profolioProjects.find((project) => project.full_name === requestedRepo);
                if (selected) this.selectProfolio(selected);
                else this.profolioError = `Cannot find project: ${requestedRepo}`;
            }
        },
        openProfolio(project) {
            location.href = `${location.pathname}?repo=${encodeURIComponent(project.full_name)}`;
        },
        selectProfolio(project) {
            this.selectedProfolio = project;
            if (project.readme_markdown && window.marked) {
                marked.use({ breaks: true, gfm: true });
                this.selectedReadme = marked.parse(project.readme_markdown);
                this.readmeError = "";
            } else {
                this.selectedReadme = project.readme_html || "";
                this.readmeError = project.readme_error || "";
            }
            this.readmeLoading = false;
            this.$nextTick(this.render);
        },
    },
};
