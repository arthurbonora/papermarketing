<p align="center">
  <img src="doc/assets/papermarketing-banner.png" alt="Papermarketing. Da estratégia à campanha." width="900" />
</p>

# Papermarketing

**Agência de marketing operada por agentes de IA.**

Papermarketing é um projeto de código aberto e auto-hospedado para coordenar equipes de agentes de marketing. Use o painel para transformar um briefing em tarefas, distribuir o trabalho e revisar as entregas. O projeto é um fork do [Paperclip](https://github.com/paperclipai/paperclip) e usa sua base de orquestração.

## Como uma campanha pode funcionar

| Etapa | Exemplo de trabalho |
| --- | --- |
| Estratégia | Registrar o objetivo, o público e os critérios de aprovação no briefing. |
| Conteúdo e criação | Atribuir pesquisa, redação e produção de peças a agentes com funções distintas. |
| Revisão | Conferir as entregas e solicitar ajustes antes de aprovar a publicação. |
| Mídia | Planejar a distribuição e acompanhar as tarefas e os custos da campanha. |

Esse é um exemplo de fluxo que você pode configurar com projetos, tarefas, documentos e aprovações. Os agentes executam o trabalho conforme os adaptadores, as ferramentas e as permissões que você configurar.

## O que você pode fazer

- Criar workspaces com projetos e tarefas. Cada workspace novo começa sem agentes.
- Navegar por projetos, tarefas, entregas, aprovações, equipe e conexões no menu do workspace.
- Abrir as mesmas áreas pela busca rápida (Ctrl/Cmd + K). Projetos começam pelo nome, com a opção de vincular repositórios GitHub quando necessário.
- Ajustar repositórios, variáveis de ambiente e opções de execução na seção **Configuração técnica** do projeto. A visibilidade do projeto fica acessível nas configurações principais.
- Escolher entre 12 perfis de marketing e revisar responsabilidades antes de configurar runtime, conta e modelo. O agente permanece pausado até concluir a configuração.
- Usar o grafo de agentes e o dashboard personalizável. As opções experimentais `enableAgentGraph` e `enableCustomizableDashboard` habilitam essas telas, com layouts por usuário e workspace.
- Vincular tarefas e projetos a objetivos e acompanhar a execução no painel.
- Revisar documentos, comentários e entregas no contexto da tarefa.
- Acompanhar custos reportados e definir limites de orçamento.
- Conectar runtimes de agentes como Codex, Claude Code e OpenClaw pelos adaptadores do projeto.
- Convidar agentes externos em **Administração → Agentes externos**. Ambientes, segredos, importação e exportação ficam em **Configurações → Avançado**.
- Encontrar conectores por categoria na aba **Marketing**. **Installed** mostra as conexões existentes, **Composio** abre o catálogo do provedor e **All** inclui outros conectores e a opção de conectar uma ferramenta própria.
- Revisar ações pendentes em **Conexões → Review**. O fluxo de ferramenta própria em **All** dá acesso à configuração técnica, incluindo perfis de acesso, gateways e diagnósticos habilitados.
- Acessar segredos, variáveis e configuração YAML em **Configuração técnica** nos detalhes do agente.

## Executar localmente

Os anúncios de produto ficam desativados por padrão. Para usar um feed próprio, configure `PAPERCLIP_ANNOUNCEMENTS_FEED_URL`. Para desativar inclusive um feed configurado, use `PAPERCLIP_ANNOUNCEMENTS_ENABLED=false`.

Você precisa do **Node.js 24.11 ou superior**, do **pnpm 9.15.4** e do Git. Use o código deste repositório para executar o Papermarketing.

```sh
git clone https://github.com/arthurbonora/papermarketing.git
cd papermarketing
# Atualize o lockfile local para incluir a dependência do grafo.
pnpm install --resolution-only --ignore-scripts --no-frozen-lockfile
pnpm install --frozen-lockfile
pnpm dev
```

Mantenha a atualização do lockfile local fora dos commits. Abra [localhost:3100](http://localhost:3100). Para usar o PostgreSQL integrado no ambiente local, deixe `DATABASE_URL` sem configuração. Crie um workspace, configure um agente compatível com seu ambiente e atribua a primeira tarefa com um briefing.

- [Guia de auto-hospedagem com Docker](docker/papermarketing/README.md)
- [Escopo do primeiro incremento](doc/plans/2026-11-09-papermarketing-foundation.md)
- [Integração visual e testes](doc/plans/2026-11-11-papermarketing-integration.md)
- [Guia de desenvolvimento](doc/DEVELOPING.md)
- [Adaptadores de agentes](https://docs.paperclip.ing/reference/adapters/overview/)
- [Abrir um problema no Papermarketing](https://github.com/arthurbonora/papermarketing/issues)

## Identidade visual

O [monograma PM](ui/public/brands/papermarketing.svg) usa um laço fechado no P e curvas de arame no M, em referência ao clipe do projeto original. A base em carvão e branco dá destaque às cápsulas coloridas que representam os agentes.

## Origem e licença

Papermarketing deriva do [Paperclip](https://github.com/paperclipai/paperclip). A base do projeto e os avisos de direitos autorais são distribuídos sob a [licença MIT](LICENSE).
