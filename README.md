# papermarketing

Ferramenta open source e auto-hospedável para equipes de agentes de marketing.
Repositório oficial: [arthurbonora/papermarketing](https://github.com/arthurbonora/papermarketing).

Este fork começa no Paperclip **v2026.1106.0**, commit
`d69631b01b9c658f80bf8bed389863dce82643e1`. A licença MIT e os avisos de autoria
upstream são preservados. Os pacotes e as APIs mantêm seus nomes internos para
facilitar atualizações.

- **Workspaces** como única divisão administrativa, com projetos e tarefas dentro deles.
- **12 tipos de agentes** com perfil inicial editável: CMO, VP de Estratégia, Designer,
  Redação / Copywriting, Analista de Mídia Paga, Analista de Mídia Orgânica,
  Social Media, Tecnologia / Desenvolvimento, Motion Designer, BI & Data Analytics,
  Pesquisa e Insights e Coordenador de Performance.
- Modelo, runtime e conta independentes do cargo. Cadastro salvo antes da conexão
  permanece em configuração e não inicia tarefas.
- Estrutura existente de equipe visual, documentos, aprovações e histórico.
- Grafo de agentes e dashboard personalizável, com layouts separados por usuário
  e workspace. Ative `enableAgentGraph` e `enableCustomizableDashboard` nas
  configurações experimentais da instância para testar essas telas.
- Sem WordPress, CMS, rede social ou analytics obrigatórios.

Comece pelo [guia de auto-hospedagem](docker/papermarketing/README.md).
O pacote está em desenvolvimento; a execução de contêineres, o isolamento dos
trabalhadores e o uso efetivo das assinaturas exigem homologação antes do MVP.
Veja [o escopo do primeiro incremento](doc/plans/2026-11-09-papermarketing-foundation.md).
Veja também [o contrato da integração visual e seus testes](doc/plans/2026-11-11-papermarketing-integration.md).

As instruções abaixo documentam o **Paperclip original**. Comandos `npx paperclipai`
instalam o upstream; para usar as alterações deste fork, construa a partir deste
repositório seguindo o guia acima.

---

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

- Organizar agentes em equipes, com funções, instruções e responsabilidades.
- Vincular tarefas e projetos a objetivos e acompanhar a execução no painel.
- Revisar documentos, comentários e entregas no contexto da tarefa.
- Acompanhar custos reportados e definir limites de orçamento.
- Conectar runtimes de agentes como Codex, Claude Code e OpenClaw pelos adaptadores do projeto.

## Executar localmente

Você precisa do **Node.js 24.11 ou superior**, do **pnpm 9.15.4** e do Git. Use o código deste repositório para executar o Papermarketing.

```sh
git clone https://github.com/arthurbonora/papermarketing.git
cd papermarketing
pnpm install --frozen-lockfile
pnpm dev
```

Abra [localhost:3100](http://localhost:3100). Para usar o PostgreSQL integrado no ambiente local, deixe `DATABASE_URL` sem configuração. Crie uma organização, configure um agente compatível com seu ambiente e atribua a primeira tarefa com um briefing.

- [Guia de desenvolvimento](doc/DEVELOPING.md)
- [Adaptadores de agentes](https://docs.paperclip.ing/reference/adapters/overview/)
- [Abrir um problema no Papermarketing](https://github.com/arthurbonora/papermarketing/issues)

## Identidade visual

O [monograma PM](ui/public/brands/papermarketing.svg) usa um laço fechado no P e curvas de arame no M, em referência ao clipe do projeto original. A base em carvão e branco dá destaque às cápsulas coloridas que representam os agentes.

## Origem e licença

Papermarketing deriva do [Paperclip](https://github.com/paperclipai/paperclip). A base do projeto e os avisos de direitos autorais são distribuídos sob a [licença MIT](LICENSE).
