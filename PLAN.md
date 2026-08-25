# Maurina AutoCar — Sistema de Ordem de Serviço

Plano de arquitetura e execução. Documento vivo: atualizado ao fim de cada fase.

---

## 1. Visão

Sistema web (PWA instalável) de Ordem de Serviço para oficina mecânica multimarcas.
Cobre o fluxo real: **entrada do veículo → checklist → diagnóstico → orçamento → aprovação →
execução → entrega → pagamento → OS impressa/enviada**.

**Mobile-first de verdade**: o mecânico usa no pátio, no celular, com a mão suja e internet ruim.
Botões grandes (mín. 44px), poucos campos obrigatórios, offline-first.

---

## 2. Stack

| Camada | Escolha |
|---|---|
| Build | Vite + React 18 + TypeScript (strict) |
| Estilo | Tailwind CSS — design system próprio, sem lib de componente |
| Estado global | Zustand (auth, oficina atual, OS em edição, status de rede) |
| Backend | Firebase: Auth (email/senha), Firestore, Storage |
| Rotas | react-router-dom v6 |
| Formulários | react-hook-form + zod (resolver) |
| Datas | date-fns (`locale/pt-BR`) |
| PWA | vite-plugin-pwa (offline-first, instalável) |
| PDF/Impressão | `react-to-print` para impressão A4 + jsPDF/html2canvas para exportar PDF |
| Testes | Vitest + @testing-library/react (regras de negócio críticas) |
| Rules | `firestore.rules` + `storage.rules` + `firestore.indexes.json` versionados |

**Sem backend próprio na v1.** Segredo (se aparecer) → Cloud Function.
**Proibido:** MUI/Ant/Chakra, `any`, float para dinheiro, localStorage para dado de negócio.

---

## 3. Estrutura de pastas

```
src/
  main.tsx
  App.tsx                    # providers + router
  theme.ts                   # ÚNICO ponto de cor/marca/logo — troca de identidade visual mexe só aqui
  types/                     # Cliente, Veiculo, OrdemServico, Usuario, ... (sem any)
    index.ts
  lib/
    firebase.ts              # init, persistência IndexedDB, emuladores em dev
    paths.ts                 # helpers de caminho multi-tenant: oficinas/{id}/...
  utils/
    dinheiro.ts              # centavos <-> exibição, parse, soma, percentual
    placa.ts                 # validação/máscara ABC1234 e ABC1D23, normalização
    documento.ts             # CPF/CNPJ máscara + validação
    telefone.ts              # máscara + link wa.me
    data.ts                  # wrappers date-fns pt-BR
    imagem.ts                # compressão canvas 1280px q=0.7 antes do upload
  domain/
    statusOS.ts              # máquina de estados + labels + cores + transições válidas
    calculoOS.ts             # subtotais, desconto, acréscimo, total (puro, testável)
    numeracaoOS.ts           # runTransaction do contador sequencial
    permissoes.ts            # pode(papel, acao) — espelha as Security Rules
  store/
    authStore.ts             # usuário, papel, oficinaId
    uiStore.ts               # tema, sidebar, status offline/sincronizando
  hooks/
    useAuth.ts  useClientes.ts  useVeiculos.ts  useOrdemServico.ts
    useOrdens.ts  useCatalogo.ts  usePagamentos.ts  useOnlineStatus.ts
  components/
    ui/                      # Button, Input, Select, Modal, Sheet, Badge, Card, Toast, Skeleton...
    layout/                  # AppShell, BottomNav (mobile), Sidebar (desktop), Header
    os/                      # StatusBadge, StatusStepper, ItemPecaRow, ItemServicoRow, Timeline
  features/
    auth/  dashboard/  clientes/  veiculos/  ordens/  catalogo/  financeiro/  config/  publico/
  routes.tsx
firestore.rules
storage.rules
firestore.indexes.json
```

**Regra:** `features/*` monta a tela; `hooks/*` fala com o Firestore; `domain/*` é lógica pura sem
dependência de Firebase (100% testável); `utils/*` é formatação/validação.

---

## 4. Arquitetura multi-tenant (dia 1)

Tudo vive dentro de uma oficina, mesmo havendo só uma hoje.

```
/oficinas/{oficinaId}
  /usuarios/{uid}          { nome, email, papel: 'admin'|'atendente'|'mecanico', ativo, criadoEm }
  /clientes/{clienteId}
  /veiculos/{veiculoId}
  /ordens/{osId}
    /historico/{eventoId}  { de, para, autorId, autorNome, observacao, em }
  /catalogoPecas/{id}
  /catalogoServicos/{id}
  /pagamentos/{id}
  /config/geral            { nome, cnpj, endereco, telefone, logoUrl, termos, contadorOS, anoContador,
                             revisaoPadraoKm: 10000, revisaoPadraoMeses: 6 }
/aprovacoes/{token}        # coleção raiz: link público de aprovação (Fase 4), leitura anônima restrita
/usuariosIndex/{uid}       { oficinaId, papel, ativo }  # lookup no login, antes de saber a oficina
```

Claims de papel são materializados em `/usuariosIndex/{uid}` para as Rules resolverem
`oficinaId` e `papel` sem custo de leitura em cadeia.

### Security Rules — princípios
- Ninguém lê/escreve fora da sua `oficinaId`.
- `mecanico`: lê OS; escreve **somente** `diagnostico`, `pecas[].aplicada`, `servicos[].concluido`,
  `checklistEntrada.fotos`, e transições de status operacionais. **Não** toca em valores nem exclui.
- `atendente`: CRUD de cliente/veículo/OS/pagamento; não mexe em `config` nem em usuários.
- `admin`: tudo.
- Escrita valida campos imutáveis (`numero`, `criadoEm`, `criadoPor`).
- **Nada** de `allow read, write: if true`.

---

## 5. Modelo de dados (TypeScript)

Fonte da verdade em `src/types/index.ts`. Resumo:

- **Cliente** — `nome, tipo PF|PJ, cpfCnpj?, telefone, whatsapp, email?, endereco?, observacoes?`
- **Veiculo** — `clienteId, placa (normalizada, sem hífen, maiúscula), marca, modelo, anoFabricacao,
  anoModelo, cor, combustivel, chassi?, renavam?, motor?, kmAtual, proximaRevisaoKm?,
  proximaRevisaoData?`
- **OrdemServico** — conforme especificado: `numero` sequencial `AAAA-NNNN`, `snapshotCliente` e
  `snapshotVeiculo` congelados, `checklistEntrada` (itens + avarias + fotos), `reclamacaoCliente`,
  `diagnostico?`, `pecas[]`, `servicos[]`, subtotais, `desconto`, `acrescimo?`, `valorTotal`,
  `aprovacao?`, `pagamento?`, garantias, `observacoesInternas`, auditoria.

### Regras invariantes
1. **Dinheiro em centavos (integer). Sempre.** Formatação só na exibição (`utils/dinheiro.ts`).
2. **Soft delete** em tudo: `excluidoEm: Timestamp | null` + filtro padrão nas queries.
3. Todo documento carrega `criadoEm`, `atualizadoEm`, `criadoPor`.
4. `snapshot*` congela nome/telefone/placa/modelo no momento da abertura da OS.

### Cálculo (`domain/calculoOS.ts`, puro)
```
subtotalPecas    = Σ (quantidade × valorUnitario)
subtotalServicos = Σ (quantidade × valorUnitario)
bruto            = subtotalPecas + subtotalServicos
descontoValor    = tipo === 'percentual' ? round(bruto × valor / 10000) : valor
valorTotal       = max(0, bruto - descontoValor + (acrescimo ?? 0))
```
Desconto percentual incide sobre o **subtotal geral**. Percentual guardado em basis points
(1250 = 12,50%) para não usar float.

### Máquina de estados (`domain/statusOS.ts`)
```
orcamento             → aguardando_aprovacao | aprovada | cancelada
aguardando_aprovacao  → aprovada | orcamento | cancelada
aprovada              → em_execucao | cancelada
em_execucao           → aguardando_peca | pronta | cancelada
aguardando_peca       → em_execucao | cancelada
pronta                → entregue | em_execucao        (reabre se voltou problema)
entregue              → (terminal)
cancelada             → (terminal)
```
Guardas:
- `cancelada` exige **motivo** (gravado no histórico).
- `entregue` exige `dataSaida` + `pagamento.status` definido + `kmSaida`.
- Toda transição grava evento em `/historico` (autor, timestamp, observação) — **transação única**.
- Ao entrar em `entregue`: atualiza `veiculo.kmAtual` e calcula
  `proximaRevisaoKm = kmSaida + config.revisaoPadraoKm` e `proximaRevisaoData = hoje + 6 meses`.

---

## 6. Telas e rotas

| Rota | Tela | Fase |
|---|---|---|
| `/login` | Login (email/senha) | 1 |
| `/` | Dashboard: OS por status, **busca por placa em destaque**, carros no pátio, faturamento do mês, ticket médio | 1 (básico) / 3 (métricas) |
| `/os/nova` | Wizard: cliente → veículo → checklist entrada → reclamação | 1 |
| `/os` | Lista com filtros (status, período, cliente, placa, mecânico) | 1 |
| `/os/:id` | Detalhe: abas **Dados / Orçamento / Execução / Financeiro** + stepper de status + timeline | 1 (Dados/Execução) / 2 (Orçamento) / 3 (Financeiro) |
| `/clientes`, `/clientes/:id` | CRUD + veículos + histórico de OS | 1 (CRUD) / 2 (histórico) |
| `/veiculos/:id` | Ficha + histórico completo de serviços + alerta de revisão | 2 |
| `/os/:id/imprimir` | Layout A4, 2 vias, termos de garantia, assinatura | 2 |
| `/catalogo` | Peças e serviços com preço padrão (autocomplete no orçamento) | 3 |
| `/financeiro` | Contas a receber, caixa do dia, fechamento por período | 3 |
| `/config` | Dados da oficina, logo, usuários, termos | 3 |
| `/aprovar/:token` | Página **pública** de aprovação do orçamento | 4 |

**Navegação:** BottomNav no mobile (Início · OS · Nova · Clientes · Menu) e sidebar no desktop.
FAB "Nova OS" sempre acessível.

---

## 7. Identidade visual (`src/theme.ts`)

Industrial, alto contraste, legível sob luz de galpão. **Modo escuro por padrão**, claro opcional.

- Base: cinza-grafite / quase-preto. Acento: **laranja/âmbar** (sinalização automotiva).
- Tipografia forte e condensada nos títulos; corpo nunca < 14px.
- Cores de status (consistentes em todo o app):

| Status | Cor |
|---|---|
| orçamento | cinza |
| aguardando aprovação | âmbar |
| em execução | azul |
| aguardando peça | roxo |
| pronta | verde |
| entregue | verde escuro |
| cancelada | vermelho |

Logo e cores oficiais entram depois — **tudo centralizado em `theme.ts`**, nada de hex solto.

---

## 8. Requisitos transversais

- **Offline:** persistência IndexedDB do Firestore ativada; badge global `offline / sincronizando / ok`.
  A OS abre e edita sem internet e sincroniza depois.
- **Fotos:** compressão no cliente (canvas, máx 1280px, qualidade 0.7) antes do Storage.
- **Placa:** máscara na digitação, aceita `ABC1234` e `ABC1D23`, salva normalizada.
- **Permissões:** `domain/permissoes.ts` espelha as Rules; mecânico não vê valor nenhum na UI.
- **Acessibilidade/ergonomia:** alvo de toque ≥ 44px, foco visível, labels reais.

---

## 9. Fases

### Fase 1 — Espinha dorsal
Setup (Vite/TS/Tailwind/router/zustand), Firebase + persistência offline, Auth com 3 papéis,
`theme.ts`, AppShell + navegação mobile, utils (dinheiro/placa/documento/telefone/data),
`domain/statusOS` + `calculoOS` + `numeracaoOS` + `permissoes` com testes,
CRUD de clientes e veículos, wizard de abertura de OS com checklist, lista e detalhe de OS,
transições de status com histórico, **Security Rules + índices reais**.

*Aceite:* login com 3 papéis e permissões distintas · OS completa em < 90s no celular ·
busca por placa acha o veículo em 1 tela · status só transiciona por caminho válido, com histórico ·
rules bloqueiam mecânico de editar valor (testado no emulador) · build sem erro TS, sem `any`,
sem warning de console.

### Fase 2 — Orçamento e fechamento
Itens de peça e serviço (add/edit/remove), totais e desconto, assinatura em canvas,
impressão/PDF A4 em 2 vias com termos, histórico do veículo, upload de fotos comprimidas
(checklist e execução).

### Fase 3 — Operação diária
Dashboard com métricas reais (faturamento do mês, ticket médio, carros no pátio),
catálogo de peças/serviços com autocomplete no orçamento, financeiro
(pagamentos, contas a receber, caixa do dia), alertas de revisão.

### Fase 4 — Polimento
PWA offline completo (precache, update prompt), link público `/aprovar/:token`
(peças, valores, fotos, botão Aprovar, grava timestamp + IP),
botão "Enviar OS no WhatsApp" (`wa.me`), relatórios por período, exportação CSV,
tela de configuração da oficina.

---

## 10. Fora de escopo (v1)
- ❌ NF-e / SEFAZ — apenas campo manual "número da nota".
- ❌ Gateway de pagamento — registro manual de recebimento.
- ❌ Lib de UI pesada, gráfico enfeitado antes do CRUD, chave secreta no front,
  localStorage para dado de negócio.

---

## 11. Convenções de trabalho
- Commits pequenos e descritivos **em português** (`feat: wizard de abertura de OS`).
- Ao fim de cada fase: `npm run build` limpo + lista do que dá pra testar.
- Nenhum mock permanente: toda fase entrega tela funcional gravando no Firestore.

---

## 12. Decisões tomadas (24/08/2026)

| Tema | Decisão | Impacto |
|---|---|---|
| Firebase | Projeto já existe; credenciais vão em `.env.local` (nunca commitado) | Fase 1 grava no Firestore real |
| Usuários | **Admin cadastra dentro do app** (`/config/usuarios`) | Exige Cloud Function `criarUsuario` (Admin SDK) — entra na **Fase 3**. Na Fase 1 o admin é criado por script `scripts/criar-admin.mjs` |
| Cadastro rápido | Cliente exige **só nome + telefone** | CPF/CNPJ, e-mail e endereço opcionais; um aviso "cadastro incompleto" aparece na hora de imprimir a OS |
| Wizard de entrada | Atendente **escolhe o caminho**: buscar por placa ou por cliente | Primeira etapa do wizard com dois botões grandes; achou → pula direto pro checklist |
| Mecânico | **Login compartilhado no pátio** (um usuário `mecanico` por oficina) | Nova coleção `/mecanicos`; ao lançar diagnóstico/execução o app pede "quem é você?" e grava o nome no histórico |
| Numeração | **Reinicia por ano**: `2026-0001` | `config/geral` guarda `contadorOS` + `anoContador`; a transação zera o contador na virada do ano |
| Deploy | **Firebase Hosting completo na Fase 1** | `firebase.json`, deploy de hosting + rules + indexes; testável no celular ao fim da fase |

### Ajustes no modelo decorrentes

```
/oficinas/{oficinaId}/mecanicos/{mecanicoId}   { nome, apelido?, ativo, criadoEm }
```
- `OrdemServico.mecanicoResponsavelId` → aponta para `/mecanicos`, **não** para `/usuarios`.
- `historico.autorNome` guarda o nome do mecânico escolhido; `autorId` guarda o uid (compartilhado).
- Seleção do mecânico fica em `sessionStorage` (preferência de UI, não dado de negócio) para não
  perguntar a cada toque — com botão "trocar mecânico" sempre visível no header.

---

## 13. Estado da Fase 1

### Entregue

| Área | O que existe |
|---|---|
| Fundação | Vite + React 18 + TS strict, Tailwind com tema em `theme.ts`, PWA configurado, ícones |
| Domínio | Máquina de estados, cálculo de totais, permissões, numeração — puros e testados (49 testes) |
| Utils | Placa (2 formatos), dinheiro em centavos, CPF/CNPJ, telefone/WhatsApp, datas pt-BR, compressão de imagem |
| Firebase | Conexão com persistência offline (IndexedDB, multi-aba), caminhos multi-tenant centralizados |
| Segurança | `firestore.rules` + `storage.rules` + índices, **25 testes rodando contra o emulador** |
| Auth | Login, sessão via `/usuariosIndex`, 3 papéis, rota protegida por permissão |
| Telas | Login · Dashboard (busca por placa + pátio) · Lista de OS com filtros na URL · Wizard de abertura · Detalhe com abas e timeline · Clientes · Ficha do cliente |
| Scripts | `criar-admin.mjs` e `criar-usuario.mjs` (Admin SDK) |

### Critérios de aceite

- [x] Login com 3 papéis e permissões distintas
- [x] Busca por placa achando o veículo em 1 tela
- [x] Status só transiciona por caminhos válidos, com registro no histórico
- [x] Rules bloqueiam mecânico de editar valores — **testado no emulador**
- [x] Build sem erro de TypeScript, sem `any`, sem warning
- [ ] Abrir OS completa em menos de 90 segundos no celular — *depende de teste com o app publicado*

### Publicado — 24/08/2026

- **App no ar:** https://maurina-73a7d.web.app
- Projeto `maurina-73a7d`, Firestore em `southamerica-east1` (São Paulo), edição Standard
- Rules e índices deployados; Auth com e-mail/senha ativo
- Três usuários criados (admin, atendente, mecânico)
- **23/23 testes de fumaça passando contra o projeto real**, incluindo 9 bloqueios
  de segurança verificados com login de verdade
- Equipe do pátio (`/equipe`) e seletor "quem está no aparelho" implementados —
  o que faltava para a decisão do login compartilhado fazer sentido

### Pendente

- **Firebase Storage não inicializado** — bloqueia as fotos do checklist (Fase 2).
  Console → Storage → Começar, e depois `npm run deploy:rules`.
- Cronometrar a abertura de OS no celular (< 90 s)

### Decisões técnicas registradas no caminho

- **Tailwind v3 + `tailwind.config.ts` importando `src/theme.ts`**: mantém a identidade
  visual em fonte única, como pedido. Com Tailwind v4 os tokens viveriam no CSS e
  haveria duas fontes de verdade.
- **`persistentLocalCache` em vez de `enableIndexedDbPersistence`**: mesma
  funcionalidade offline, API atual do SDK v12; o multi-tab manager evita
  briga de lock entre abas.
- **`firebase` atualizado para v12**: exigência do `@firebase/rules-unit-testing` 5.
- **Chunks separados** (firestore / firebase / react / formulário): a internet da
  oficina é ruim, e o Firestore sozinho é 160 kB gzip que não precisam voltar a
  cada deploy de correção de tela.
- **Mecânico não vê valor nem no banco**: as Rules recusam qualquer update dele que
  mexa em `valorTotal`, `subtotais`, `desconto`, `pagamento`, ou que mude o tamanho
  das listas de peças e serviços.

---

## 14. Fases 2, 3 e 4 — entregues em 25/08/2026

### Fase 2 — Orçamento e fechamento

- Lançamento de peças e serviços; total de linha sempre calculado, nunca digitado
- Desconto em reais ou percentual (basis points) sobre o subtotal geral, e acréscimo
- `CampoMoeda` com digitação contínua — centavos inteiros de ponta a ponta
- Aprovação com assinatura em canvas, canal e horário
- Fotos de entrada e de execução, comprimidas no aparelho (1280px, q=0.7)
- Via impressa A4 em duas vias, com termos, checklist e assinaturas
- Ficha do veículo: histórico completo e lista de peças já aplicadas

### Fase 3 — Operação diária

- Dashboard: faturamento do mês, ticket médio, entregue hoje, a receber
- Alertas de revisão vencida (por KM **ou** por data), com atalho de WhatsApp
- Catálogo de peças e serviços alimentando o autocomplete do orçamento
- Financeiro em três painéis: caixa do dia, contas a receber, fechamento por período
- Exportação CSV compatível com Excel pt-BR (`;` + decimal com vírgula + BOM)
- Configuração da oficina, termos da OS e gestão de acessos

### Fase 4 — Polimento

- Link público `/aprovar/{token}`: cliente aprova pelo celular, sem login
- Aviso de nova versão do PWA — nunca atualiza sozinho no meio de uma OS
- Botão de WhatsApp com resumo e link em todas as telas relevantes
- Relatórios por período e exportação CSV no financeiro e nas revisões

### Decisões técnicas do caminho

| Decisão | Por quê |
|---|---|
| **Banco nomeado `default`** | Foi assim que o Firestore criou; nomeado explicitamente em `firebase.ts`, nos scripts e no `firebase.json` |
| **Impressão via `window.print()`** | Rota dedicada com CSS `@page A4`. Mais fiel ao papel que rasterizar tela com html2canvas, e zero biblioteca no download |
| **Usuário criado por app Firebase secundário** | `createUserWithEmailAndPassword` trocaria a sessão do admin. O app secundário é descartado logo depois. Evita Cloud Function (plano pago) |
| **Rules de `usuariosIndex` afrouxadas com trava tripla** | Admin cadastra a equipe pelo app, mas só na própria oficina, nunca o próprio acesso, e só com papel conhecido |
| **Link de aprovação carrega cópia do orçamento** | Dar ao cliente permissão de ler a OS abriria a coleção inteira para anônimos |
| **`fotosExecucao` separado de `checklistEntrada.fotos`** | Foto de avaria na entrada e foto do serviço pronto servem a discussões diferentes |

### Verificação

| Suíte | Resultado |
|---|---|
| Unidade (`npm test`) | **56 passando** |
| Rules no emulador (`npm run test:rules`) | **43 passando** |
| Produção — Fase 1 | **23/23** |
| Produção — Fases 2 e 3 | **24/24** |
| Produção — link público | **21/21** |

### Ainda pendente

- **Firebase Storage não inicializado.** As telas de foto estão prontas e avisam
  na tela quando o upload falha por isso. Console → Storage → Começar, depois
  `npm run deploy:rules`.
- Cronometrar a abertura de OS no celular (alvo: < 90 s).
- Logo e cores oficiais da Maurina — tudo centralizado em `src/theme.ts`.
