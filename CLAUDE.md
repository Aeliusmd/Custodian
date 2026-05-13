# Custudian

> Initialised: 2026-05-13

---

# Project Architecture

## Multi-Agent System (v2.1)

This project uses the 13-Agent Architecture for development. Use the `/team` or `/agent` commands to spawn agents.

### Phases & Agents

| Phase | Agent | Description |
|-------|-------|-------------|
| **0. Global** | `token-cost-manager` | **Always runs first.** Compresses context, saves memory, manages budget. |
| **1. Plan** | `architect` | System design, infrastructure planning, ADRs. |
| | `analyst` | Requirements, MVP scoping, user stories. |
| **2. Build** | `backend` | Polyglot backend (detects language/framework), APIs. |
| | `frontend-react` | React/Next.js UI implementation. |
| | `dba` | Database design, schema migrations, complex queries. |
| | `ai-integrator` | Prompt engineering, RAG pipelines, AI API integrations. |
| **3. Quality** | `tester` | Automated tests (unit, integration, E2E). |
| | `security` | OWASP checks, secret detection, access reviews. |
| | `reviewer` | Code reviews, SOLID principles, refactoring. |
| | `perf-tuner` | Latency optimization, profiling, caching strategies. |
| **4. Deliver** | `writer` | Documentation, README, changelogs, user guides. |
| | `devops` | CI/CD, Dockerization, deployment. |

### Always-On Token Budget Rules

> [!IMPORTANT]
> **Token Cost Management is strictly enforced.**
> The `token-cost-manager` MUST be invoked during Phase 0 to compress context or save session states before heavy work.
> 
> When starting a new session or running `/team full` or `/team compact`:
> 1. `token-cost-manager` reads the codebase and previous history to compress it.
> 2. It saves important states to disk (using `planning-with-files` and `diary`).
> 3. It provides a compact summary to keep the context window lean for the next agents.

### Backend Agent (Polyglot) Rules

The `backend` agent is language-agnostic.
1. On a new project, it will **ask you** for your preferred backend language/framework.
2. On an existing project, it will **detect** the stack automatically from `package.json`, `go.mod`, `Cargo.toml`, etc.
3. It will load language-specific skills automatically.

---

## Skill Routing Rules

- Use `--skills=<list>` to manually override which skills are loaded for any agent.
- Use `--no-skills` to skip skill loading entirely (fastest, for simple tasks).
- Use `--skills-only=<list>` with the `/team` command to apply a shared skill set to all agents.

## MCP Server Routing

| Server | When to use |
|--------|-------------|
| `Figma` | User shares a figma.com URL or mentions Figma/FigJam |
| `Vercel` | Deployment, preview URLs, build logs |
| `Google Drive / Calendar / Gmail` | Workspace integrations |
| `Hugging Face` | Model hub, datasets, evaluation |
