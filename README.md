# Maurina AutoCar — Ordem de Serviço

Sistema de ordem de serviço para oficina mecânica multimarcas.
PWA mobile-first: o atendente abre a OS no balcão, o mecânico trabalha no
celular do pátio, e tudo continua funcionando quando a internet cai.

Plano completo de arquitetura e fases: [PLAN.md](PLAN.md).

---

## Rodar

```bash
npm install
cp .env.example .env.local     # preencha com as credenciais do Firebase
npm run dev
```

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (roda o TypeScript antes) |
| `npm test` | Testes das regras de negócio (offline, instantâneo) |
| `npm run test:rules` | Testa as Security Rules contra o emulador — **precisa de Java** |
| `npm run emu` | Sobe o Emulator Suite (Auth, Firestore, Storage) |
| `npm run deploy` | Build + deploy de hosting, rules e índices |
| `npm run deploy:rules` | Deploy só das regras e índices |
| `npm run test:producao` | Testa as regras contra o projeto **real**, com login de verdade |
| `npm run deploy:hosting` | Publica só o app, sem tocar em regras |

> `npm run test:rules` e `npm run emu` usam o emulador do Firebase, que roda em JVM.
> Em Ubuntu/Debian: `sudo apt install default-jre`.

### O banco se chama `default`

Este projeto usa um banco Firestore **nomeado** (`default`), e não o `(default)`
implícito. Por isso ele é passado explicitamente em `src/lib/firebase.ts`
(via `VITE_FIREBASE_DATABASE_ID`), nos scripts do Admin SDK e no `firebase.json`.
Sem isso o SDK procura um banco que não existe e devolve `NOT_FOUND`.

---

## Primeiro acesso

As Security Rules proíbem qualquer cliente de escrever em `/usuariosIndex` —
é isso que impede alguém de se promover a admin pelo navegador. O primeiro
usuário, então, é criado pelo Admin SDK:

1. Console do Firebase → Configurações do projeto → **Contas de serviço** →
   Gerar nova chave privada
2. Salve como `serviceAccount.json` na raiz (já está no `.gitignore`)
3. Rode:

```bash
node scripts/criar-admin.mjs "voce@oficina.com.br" "suasenha" "Seu Nome"
```

Para os demais, enquanto a tela de gestão de usuários não existe (Fase 3):

```bash
node scripts/criar-usuario.mjs "balcao@oficina.com.br" "senha123" "Ana" atendente
node scripts/criar-usuario.mjs "patio@oficina.com.br"  "senha123" "Pátio" mecanico
```

O acesso de mecânico é **compartilhado**: um login por oficina, usado no
aparelho do pátio. Quem executou o serviço é escolhido dentro do app e fica
registrado no histórico da OS.

---

## Como o código está organizado

```
src/
  theme.ts        Identidade visual — FONTE ÚNICA de cor, logo e marca
  types/          Tipos do domínio
  domain/         Regras de negócio puras, sem Firebase e 100% testadas
  utils/          Placa, dinheiro, documento, telefone, data, imagem
  lib/            Conexão com o Firebase e caminhos multi-tenant
  hooks/          Acesso a dados, um hook por domínio
  store/          Estado global (Zustand)
  components/     UI reutilizável
  features/       As telas
```

Três regras que valem para o projeto inteiro:

- **Dinheiro é sempre inteiro em centavos.** Nunca float. A formatação
  acontece só na hora de exibir.
- **Nada é apagado.** Soft delete via `excluidoEm` em todas as coleções.
- **Tudo vive dentro de uma oficina.** `oficinas/{oficinaId}/…`, desde o dia 1,
  mesmo com uma oficina só.

---

## Segurança

`firestore.rules` e `storage.rules` são escritas de verdade e testadas:
25 testes em `teste-rules/` rodam contra o emulador e verificam, entre outros,
que o mecânico **não** altera valor de peça, desconto, pagamento nem exclui OS.

E porque emulador não é produção, três scripts repetem a checagem contra o
projeto real, com login de verdade:

```bash
# Fase 1: cadastros, abertura de OS e bloqueios do mecânico
node scripts/teste-producao.mjs balcao@… senha patio@… senha

# Fases 2 e 3: orçamento, aprovação, recebimento, catálogo e acessos
node scripts/teste-producao-operacao.mjs admin@… senha patio@… senha

# Fase 4: o link público — a única escrita anônima do sistema
node scripts/teste-producao-aprovacao.mjs balcao@… senha

node scripts/limpar-teste.mjs      # remove tudo o que os testes criaram
```

### O link público de aprovação

`/aprovar/{token}` é o único lugar onde alguém **sem login** escreve no banco.
Por isso ele foi desenhado como uma porta estreita:

- vive em `/aprovacoes/{token}`, fora da árvore da oficina;
- carrega uma **cópia** do orçamento, não uma referência — dar ao cliente
  permissão de ler a OS abriria a coleção inteira para quem não tem conta;
- o token é um UUID sem hífens (32 caracteres) e vale 7 dias;
- a única escrita permitida é a resposta, uma vez só, sem encostar em valor,
  prazo ou identificação da OS;
- nem o admin apaga o link: ele é o comprovante da autorização.

`src/domain/permissoes.ts` espelha essas regras no cliente para esconder o que
o usuário não pode usar. **Mudou lá, muda aqui** — a UI esconde, a rule bloqueia.
