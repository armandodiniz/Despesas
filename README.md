# Despesas da Casa: guia de instalação

App para o casal registrar as despesas da casa, ver no fim do mês quem deve transferir quanto para quem e analisar o histórico. A base de dados é a planilha **Despesas da Casa** no Google Drive do Armando.

Tempo total de configuração: uns 20 minutos, feito uma vez só.

## O que vem neste pacote

| Arquivo | Para que serve |
|---|---|
| `index.html` | O aplicativo (telas, login, leitura de comprovantes, gráficos) |
| `logic.js` | Os cálculos: acerto do mês, comparação de preços, lista de compras |
| `manifest.webmanifest`, `sw.js`, `icon-*.png` | Permitem instalar o app na tela inicial do celular |

## Passo 1. Compartilhar a planilha com sua esposa

1. Abra a planilha **Despesas da Casa** no Google Drive.
2. Clique em **Compartilhar**, digite o e-mail Google dela e escolha **Editor**.
3. Na aba **Config**, troque "Esposa" pelo nome dela e preencha o e-mail Google dela (célula B5). Ajuste a divisão padrão (B6) se não for 50/50.

> O nome em "Pago por" precisa ser igual ao nome da aba Config. O app usa o e-mail de quem entrou para saber quem está lançando.

## Passo 2. Publicar o app (GitHub Pages, gratuito)

1. Crie uma conta em <https://github.com> (se não tiver).
2. Crie um repositório novo, por exemplo `despesas` (pode ser **Private** se tiver GitHub Pro; no plano gratuito o Pages exige repositório **Public**: o código fica público, mas os dados não, pois ficam só na sua planilha).
3. Envie todos os arquivos deste pacote (botão **Add file → Upload files**).
4. Em **Settings → Pages**, em "Branch" escolha `main` e `/ (root)` e salve.
5. Depois de 1 a 2 minutos o app estará em `https://SEU-USUARIO.github.io/despesas/`. Anote esse endereço exatamente, com a barra no final.

## Passo 3. Criar o login do Google (Client ID)

1. Acesse <https://console.cloud.google.com> com a conta do Armando e crie um projeto (ex.: "Despesas da Casa").
2. **APIs e serviços → Biblioteca**: ative a **Google Sheets API** e a **Google Drive API**.
3. **APIs e serviços → Tela de consentimento OAuth** (ou "Google Auth Platform"):
   - Tipo de usuário: **Externo**.
   - Nome do app: "Despesas da Casa"; e-mail de suporte: o seu.
   - Em **Público-alvo / Usuários de teste**, adicione os **dois e-mails** (o seu e o dela). Deixe o app em modo **Teste**: não precisa publicar.
4. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicativo da Web**.
   - **Origens JavaScript autorizadas**: `https://SEU-USUARIO.github.io`
   - **URIs de redirecionamento autorizados**: `https://SEU-USUARIO.github.io/despesas/` (o endereço exato do passo 2).
5. Copie o **ID do cliente** (termina em `.apps.googleusercontent.com`).
6. Abra `index.html`, procure `googleClientId: ''` perto do início do script e cole o ID entre as aspas. Envie o arquivo de novo ao GitHub. (Outra opção: colar o ID na aba **Ajustes** do app em cada celular.)

No primeiro login o Google mostra o aviso "O Google não verificou este app". É esperado para apps pessoais em modo Teste: toque em **Avançado → Acessar Despesas da Casa**.

## Passo 4. Chave da IA para ler comprovantes

1. Crie uma conta em <https://console.anthropic.com>, adicione créditos e gere uma **API key**.
2. No app, aba **Ajustes**, cole a chave em "Chave da API da Anthropic" e salve. Faça isso nos dois celulares (pode ser a mesma chave).
3. Custo de referência: cada cupom lido custa alguns centavos de dólar. Um casal que lança uns 40 cupons por mês gasta pouco por mês; acompanhe o consumo no console da Anthropic.

A chave fica guardada só no aparelho, nunca na planilha.

## Passo 5. Instalar no celular

- **Android (Chrome):** abra o endereço do app, menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").
- **iPhone (Safari):** abra o endereço, botão Compartilhar → **Adicionar à Tela de Início**.

Entre com a conta Google de cada um. Depois de 1 hora o Google pede para reconectar; o app faz isso sozinho, sem pedir senha.

## Como usar

- **Lançar → Fotografar comprovante:** a IA lê estabelecimento, data, valor, forma de pagamento e categoria. Para supermercado e padaria, também lê cada item (produto, classe, quantidade, preço). Você confere e salva. Cupom comprido: use "Escolher da galeria" com várias fotos.
- **Lançar → digitar:** formulário simples. Em "Divisão" dá para marcar uma despesa como só de um dos dois ou com percentual próprio.
- **Direto na planilha:** preencha uma linha na aba Despesas (Data, Descrição, Categoria, Valor, Pago por). O app lê na próxima atualização.
- **Mês:** mostra quanto cada um pagou, quanto deveria ter pago e quem transfere quanto para quem. Depois do Pix, toque em **Registrar transferência** para o mês ficar acertado.
- **Análises:** gastos por mês e categoria, quem pagou o quê, comparação com o período anterior e maiores despesas.
- **Compras:** lista da semana (pela frequência e quantidade habituais de cada produto), qual mercado é mais barato por classe de produto, tabela de preços por mercado e evolução de preço de cada produto. "Refinar com IA" gera uma lista comentada com dicas.

## Regras do cálculo

- Para cada despesa, a parte da pessoa 1 é a coluna "Parte da pessoa 1 (%)"; se vazia, vale a divisão padrão da aba Config. A pessoa 2 fica com o restante.
- Saldo = pagou − deveria pagar + transferências feitas − transferências recebidas.
- Quem tem saldo negativo transfere esse valor para o outro. A aba **Resumo** da planilha faz o mesmo cálculo com fórmulas (troque o mês na célula B2).

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| "redirect_uri_mismatch" no login | O URI de redirecionamento no Google Cloud precisa ser idêntico ao endereço do app, com a barra final. |
| "access_denied" | O e-mail não está na lista de usuários de teste da tela de consentimento. |
| Erro 403/404 ao ler a planilha | A planilha não foi compartilhada com esse e-mail, ou o ID em Ajustes está errado. |
| Valores do acerto estranhos | Confira se "Pago por" está escrito igual ao nome da aba Config. O app avisa quando encontra um nome diferente. |
| Comprovante lido errado | Corrija na tela de revisão antes de salvar. Fotos bem iluminadas e retas ajudam. |

Não renomeie as abas nem mude a ordem das colunas da planilha: o app depende delas. Listas de categorias, classes de itens e formas de pagamento podem ser editadas à vontade na aba Config.
