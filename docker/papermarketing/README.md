# Self-host Papermarketing

Use this setup to test Papermarketing with your own projects. The application and this fork's CI do not run deployment commands. The Compose setup uses the upstream Dockerfile's `production` stage, a separate PostgreSQL service, and persistent volumes. The core application runs without Paperclip Cloud, WordPress, GA4, or Composio accounts.

## Prerequisites

- A Linux x64 host with Docker Engine and the Docker Compose v2 plugin.
- The build uses Node 24 and compiles the Rust Runner in a Debian Trixie container to meet the Runner's glibc requirement.
- Start with 4 CPUs, 8 GB of RAM, and 20 GB of disk space for the build. These are estimates.
- Internet access for build dependencies and any LLM providers and connectors you configure.

## Prepare the build without starting services

From the repository root with Node 24 available, run:

```sh
node docker/papermarketing/init-env.mjs
docker compose --env-file docker/papermarketing/.env -f docker/papermarketing/compose.yaml config --quiet
docker compose --env-file docker/papermarketing/.env -f docker/papermarketing/compose.yaml build app
```

The generator creates three independent secrets and leaves an existing `.env` file intact. Keep the file private. Compose receives no global LLM keys. Set the model, account, and authentication method for each agent in the interface. Internal variables retain the `PAPERCLIP_*` names for compatibility.

## Start services when authorized

```sh
docker compose --env-file docker/papermarketing/.env -f docker/papermarketing/compose.yaml up -d
docker compose --env-file docker/papermarketing/.env -f docker/papermarketing/compose.yaml ps
```

Open `http://localhost:3100`, create a local account, and complete **Claim this instance** when setting up the private authenticated instance for the first time. The service listens only on `127.0.0.1`. To test on a VPS, use an SSH tunnel to access it in your browser. Public access requires a public URL, TLS at the proxy, and the bootstrap flow in [Deployment modes](../../doc/DEPLOYMENT-MODES.md). Keep the authenticated deployment mode for public access.

The interface uses US English. Create two workspaces with different names and content. In each workspace, add agents by type, review their profiles, choose a working language for their new instructions, and configure their accounts separately. If you exit setup before connecting an account, the agent stays in setup and cannot run. The **Team** page opens the agent graph by default. Turn off `enableAgentGraph` in experimental settings to use the org chart instead. You can create projects and tasks without a CMS or publishing platform.

## Persistence, updates, and recovery

The `database` volume stores PostgreSQL data. The `application` volume stores files, instructions, settings, and authentication material managed by Paperclip. Back up both volumes and `.env` to capture the entire instance. The application applies migrations at startup. Marketing profiles use validated agent metadata. Migration 0467 adds the `company_user_ui_layouts` table for layouts by user and workspace. The database also stores saved notes and widgets.

Before updating, stop the application and create a consistent backup. Run these commands in a Linux shell from `docker/papermarketing`:

```sh
umask 077
mkdir -p backups
docker compose stop app
docker compose exec -T db pg_dump -U papermarketing -d papermarketing -Fc > backups/database.dump
docker compose run --rm --no-deps --entrypoint sh app -c 'tar -C /paperclip -czf - .' > backups/application.tar.gz
cp .env backups/instance.env
```

Encrypt the backup and store it off the host. To test recovery, use a separate empty installation, copy `.env` from the backup, and restore the application volume and database dump before starting the application. Restore only into an empty installation.

```sh
docker compose up -d db
docker compose exec -T db pg_restore -U papermarketing -d papermarketing --exit-on-error < backups/database.dump
docker compose run --rm --no-deps -T --entrypoint sh app -c 'tar -C /paperclip -xzf -' < backups/application.tar.gz
docker compose up -d app
```

After restoring, verify login, workspaces, agents, instructions, and files. To update, record the commit, make a backup, update `PAPERCLIP_BUILD_COMMIT` in `.env`, rebuild, and start the application. Rolling back across migrations requires the previous image and its matching backup.

## Limits of this Compose setup

A separate database and permissions scoped by `companyId` do not isolate agent processes. Local runtimes can execute in the application container, which can access the database and application volume. Use this setup only with trusted agent users. Before declaring the MVP complete, verify that workers are isolated by workspace and cannot access server credentials or directories from other workspaces. This setup leaves the Docker socket unmounted.

The common subprocess launcher strips inherited `DATABASE_URL` and `BETTER_AUTH_SECRET` values. Agent processes can still access files and other processes on the same host. The launcher still passes connections explicitly configured for an agent.

Connect subscription accounts only through methods supported by the provider and harness. Verify with your own accounts that requests are covered by the subscription. OpenRouter and DeepSeek may charge API credits. An equivalent chat subscription is not guaranteed. Image and video generation require connected tools.

Verify the image build, first startup, and recovery on Linux. See the increment report for which checks have been run and which steps are prepared. Upstream telemetry is disabled in this Compose setup.

## Automated qualification without deployment

The `papermarketing qualification` workflow runs the full Vitest suite in shards, type-checks the code, and builds the project and the `production` image. CI loads the image only on a temporary GitHub runner, without publishing it to a registry or deploying it.

The `scripts/papermarketing/image-smoke.mjs` test explicitly requires the Compose project `papermarketing-qualification` and `PAPERMARKETING_TEST_ONLY=1`. It creates synthetic data, users, two workspaces, agent keys, and all 12 marketing types. It verifies permissions, secret references, and persistence after restarting the database and application. Workspace users have no instance admin privileges. The test connects no LLM accounts and invokes no models. CI removes only this test project's containers and volumes when it finishes.
