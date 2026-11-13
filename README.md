<p align="center">
  <img src="ui/public/brands/papermarketing.svg" alt="Papermarketing logo" width="96" />
</p>

# Papermarketing

**A marketing agency run by AI agents.**

Papermarketing is an open source, self-hosted project for coordinating teams of marketing agents. Use the dashboard to turn a brief into tasks, assign work, and review deliverables. The project is a fork of [Paperclip](https://github.com/paperclipai/paperclip) and uses its orchestration platform.

## How a campaign can work

| Stage | Example work |
| --- | --- |
| Strategy | Record the goal, audience, and approval criteria in the brief. |
| Content and creative | Assign research, copywriting, and asset production to agents with distinct roles. |
| Review | Review deliverables and request revisions before approving publication. |
| Media | Plan distribution and track campaign tasks and costs. |

You can set up this workflow with projects, tasks, documents, and approvals. Agents carry out the work using the adapters, tools, and permissions you configure.

## What you can do

- Create workspaces with projects and tasks. Each new workspace starts without agents.
- Navigate to projects, tasks, deliverables, approvals, the team, and connections from the workspace menu. The interface uses US English.
- Open the same areas from the command palette (Ctrl/Cmd + K). Start a project with a name and link GitHub repositories as needed.
- Manage repositories, environment variables, and execution options under the project's **Technical settings**. Project visibility is available in the main settings.
- Choose from 12 marketing profiles and review responsibilities before setting up the runtime, account, and model. Set a working language for new agent instructions. A task can request a different language. For an existing agent, edit its instructions to change how it works. The agent stays paused until you finish setup.
- Open **Team** to see the agent graph by default. Switch to the list from the page controls or turn off `enableAgentGraph` in experimental settings to use the org chart instead. The `enableCustomizableDashboard` setting enables the customizable dashboard. Layouts are saved per user and workspace.
- Link tasks and projects to goals and track progress on the dashboard.
- Review documents, comments, and deliverables within each task.
- Track reported costs and set budget limits.
- Connect agent runtimes such as Codex, Claude Code, and OpenClaw through the project's adapters.
- Invite external agents under **Administration → External agents**. Find environments, secrets, import, and export under **Settings → Advanced**.
- Browse connectors by category on the **Marketing** tab. **Installed** shows existing connections, **Composio** opens the provider catalog, and **All** includes other connectors and the option to connect your own tool.
- Review pending actions under **Connections → Review**. The option to connect your own tool under **All** opens technical setup, including access profiles, gateways, and any enabled diagnostics.
- Access secrets, variables, and YAML configuration under **Technical settings** in the agent details.

## Run locally

Product announcements are disabled by default. Set `PAPERCLIP_ANNOUNCEMENTS_FEED_URL` to use your own feed. Set `PAPERCLIP_ANNOUNCEMENTS_ENABLED=false` to disable announcements even when a feed is configured.

You need **Node.js 24.11 or later**, **pnpm 9.15.4**, and Git. Use the source code from this repository to run Papermarketing.

```sh
git clone https://github.com/arthurbonora/papermarketing.git
cd papermarketing
# Update the local lockfile to include the graph dependency.
pnpm install --resolution-only --ignore-scripts --no-frozen-lockfile
pnpm install --frozen-lockfile
pnpm dev
```

Keep the local lockfile update out of commits. Open [localhost:3100](http://localhost:3100). To use embedded PostgreSQL in your local environment, leave `DATABASE_URL` unset. Create a workspace, configure an agent that fits your environment, and assign the first task with a brief.

- [Docker self-hosting guide](docker/papermarketing/README.md)
- [Scope of the first increment](doc/plans/2026-11-09-papermarketing-foundation.md)
- [Visual integration and testing](doc/plans/2026-11-11-papermarketing-integration.md)
- [Development guide](doc/DEVELOPING.md)
- [Agent adapters](https://docs.paperclip.ing/reference/adapters/overview/)
- [Open a Papermarketing issue](https://github.com/arthurbonora/papermarketing/issues)

## Visual identity

The [PM monogram](ui/public/brands/papermarketing.svg) uses a closed loop in the P and wire curves in the M as a reference to the original project's paperclip. The charcoal and white palette highlights the colored capsules that represent agents.

## Origin and license

Papermarketing is based on [Paperclip](https://github.com/paperclipai/paperclip). The codebase and copyright notices are distributed under the [MIT License](LICENSE).
