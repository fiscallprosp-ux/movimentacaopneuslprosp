# Montagem, estorno e arquivamento de pneus

## Comportamento

- Montagem manual, cadastro retroativo e aprovação do pátio validam a posição no estado atual do banco. Duas montagens concorrentes não podem confirmar a mesma posição nesta versão.
- Uma aprovação pendente gera uma operação em `operacoesPatio`, com os estados anterior e posterior dos pneus e veículos afetados e os eventos de histórico associados. A solicitação e o estoque são confirmados juntos.
- Uma falha em qualquer item cancela a aprovação inteira. A mesma solicitação não pode ser aprovada novamente enquanto já estiver aprovada.
- Reabrir uma aprovação nova estorna seus efeitos e identifica os eventos originais como estornados, sem apagar o histórico. O estorno é bloqueado quando os registros ou o histórico indicam alterações posteriores. A checagem do histórico usa identidades dos eventos, sem depender dos relógios dos dispositivos.
- Pneus provisórios criados durante a aprovação são preservados em estoque após o estorno. A correção pode reutilizar o mesmo cadastro na próxima aprovação.
- Aprovações antigas não possuem os estados anteriores necessários e não são reabertas automaticamente. Precisam de revisão manual, sem reconstrução por adivinhação.
- O botão Arquivar substitui a exclusão definitiva. O pneu precisa estar desmontado. O cadastro, número de fogo, custos e histórico permanecem no banco. A lista permite alternar entre ativos e arquivados, consultar o histórico e restaurar o cadastro.
- A identificação e a autenticação do formulário do pátio não foram modificadas.

## Validação local

```sh
npm test
npm run test:emulator
node --check js/app.js
node --check js/operacoes.js
```

Os 21 testes locais executam o código da aplicação com um banco simulado, incluindo repetição de transações e omissão de campos nulos. Outros 7 testes usam o emulador oficial do Realtime Database e o mesmo SDK Firebase 9.22.1 carregado pelo site. Foram validados os acessos dos dois administradores, de outro usuário autenticado e de visitantes, além de montagem e aprovação concorrentes, estorno, nova aprovação e arquivamento/restauração. Todos passaram. Os testes usam somente o projeto local `demo-pneus-lprosp`; não usam nem alteram registros de produção.

O emulador exige Java 21 disponível no PATH. A leitura da raiz permanece ativa até a transação terminar: uma leitura com `once()` isolada pode liberar o cache antes da transação e provocar uma tentativa inicial sem dados.

## Publicação coordenada

1. Revisar `database.rules.json` contra as regras atuais do projeto `controle-de-pneus-87e2e`. O arquivo parte das regras consultadas em 29/10/2026. Não substituir alterações posteriores sem reconciliá-las.
2. A nova regra de escrita na raiz é necessária para a transação que confirma a operação completa. Ela permite somente os mesmos dois administradores já autorizados a gravar nas coleções. O envio público em `solicitacoes` foi mantido como estava. Não ampliar a regra da raiz para todos os usuários autenticados.
3. Validar os acessos dos dois administradores, de outro usuário autenticado e de um visitante no emulador/homologação. Administradores devem conseguir executar a transação; os demais não. O visitante deve continuar apenas com o acesso anterior às solicitações.
4. Publicar as regras antes do código:

```sh
npx -y firebase-tools@latest deploy --only database --project controle-de-pneus-87e2e
```

5. Publicar o site pelo mecanismo já utilizado pelo repositório. `index.html` carrega `operacoes.js` antes de `app.js`, ambos com versão atualizada para evitar o cache anterior. Orientar os operadores a recarregar abas antigas: o código antigo não possui estas proteções e ainda pode emitir gravações incompatíveis.
6. Conferir em homologação uma montagem livre, bloqueio de posição ocupada, aprovação e estorno, bloqueio de estorno após movimentação posterior e arquivamento/restauração.

As transações leem a raiz do banco para resolver conflitos entre solicitações, veículos, pneus e histórico. Isso exige as permissões descritas e aumenta o volume transferido conforme o histórico cresce. Se o volume ou a concorrência aumentarem, mover a coordenação para uma função de backend, mantendo as mesmas validações.

Não há migração, exclusão ou estorno automático de registros existentes na publicação. As operações antigas permanecem intactas.
