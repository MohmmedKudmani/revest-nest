## Required Context Loading

Before acting on any request in this workspace, ensure the context files below have been loaded in the current session.

If these files have not already been loaded, read them in order before using any tool, writing any code, or running any command.

If they have already been loaded and nothing has changed, do not re-read them on every message.

1. `context/project-overview.md` — assignment scope, services, goals, and constraints
2. `context/architecture.md` — system structure, service boundaries, communication patterns, and invariants
3. `context/code-standards.md` — NestJS conventions, module rules, DTO patterns, and naming
4. `context/ai-workflow-rules.md` — development workflow, scoping rules, and implementation order

After loading, follow these files as the source of truth. If a request conflicts with them, ask before proceeding unless the user explicitly asked to change the rule.

Re-read affected context files when they are modified during the session. Re-read all five if context may have been lost or compacted.

## Rule Ownership

All project rules live in the relevant `context/` file. Do not add architecture, workflow, or implementation rules here.
