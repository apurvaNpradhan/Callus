# callus — agent context

This project uses PowerSync (Cloud + Postgres + custom backend). Load the `powersync`
skill (`.agents/skills/powersync/SKILL.md`) before any data, schema, deployment, or sync
work, and consult `docs/powersync.md` for this repo's architecture and runbooks
(`docs/powersync-current-practices.md` for the research report). Do not edit
`powersync/service.yaml` or `powersync/cli.yaml` without explicit operator authorization.