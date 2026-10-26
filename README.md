# SiloSmart

Monitoramento de um silo de grãos com ESP32. A placa mede temperatura, umidade e nível dos grãos, liga uma ventoinha de aeração quando o silo esquenta e manda as leituras por MQTT. Um backend grava tudo num PostgreSQL e um painel web mostra o estado atual, o histórico e os alertas.

Este repositório é um monorepo: o código do ESP32, o backend e o painel ficam juntos, cada um na sua pasta.

```
.
├── firmware/silosmart_esp32/   sketch do ESP32 (Arduino IDE)
├── backend/                    Node.js: recebe do MQTT, grava no banco e serve a API
├── frontend/                   painel em React, servido pelo nginx
├── docker-compose.yml          sobe banco, backend e painel (e o simulador, opcional)
└── .env.example                configuração do backend e do painel
```

O firmware é gravado na placa pela Arduino IDE. Backend, painel e banco rodam no computador com Docker. As duas metades não conversam diretamente: só precisam combinar o tópico MQTT e o formato do JSON (veja [Contrato MQTT](#contrato-mqtt)).

## Como funciona

```
 ESP32 ──MQTT──▶ broker.hivemq.com ──▶ backend ──▶ PostgreSQL
 sensores                                 │
 ventoinha                            /api (HTTP)
                                          │
                          navegador ◀── nginx + React
```

1. A cada 5 s o ESP32 lê os sensores, decide se a ventoinha fica ligada e publica um JSON em `silosmart/grupo01/silo01/dados`.
2. O broker público da HiveMQ repassa a mensagem para quem assina o tópico.
3. O backend assina `silosmart/grupo01/+/dados`. O `+` é o id do silo, então um ESP32 que publique com outro id (`silo02`, `silo03`...) aparece no painel sozinho, sem cadastro.
4. O backend confere cada campo, marca os que vieram com problema e grava a leitura com o horário em que ela chegou.
5. O painel consulta a API a cada 5 s e mostra os alertas: ESP32 offline, sem leituras há mais de 30 s, temperatura ou umidade acima do limite e leitura com erro.

Algumas decisões que explicam o resto do código:

- **A ventoinha é decidida no ESP32.** O backend e o painel só observam, nenhuma mensagem volta para a placa. Se o backend ou o computador caírem, a placa continua controlando a ventoinha.
- **O horário de cada leitura é o de chegada no backend.** O ESP32 não tem relógio, então não manda horário.
- **Toda leitura é gravada, mesmo com erro.** Sensor que falhou vai como `null` e o backend grava a leitura com uma flag dizendo qual campo falhou e por quê (veja [Flag de erro](#flag-de-erro)). Assim o histórico mostra quando e quanto cada sensor falha.
- **Online/offline vem do broker.** Ao conectar, o ESP32 registra um Last Will: se ele sumir, o broker publica `offline` no tópico de status no lugar dele.

## Contrato MQTT

É a única coisa que firmware e backend precisam combinar.

| Tópico | Conteúdo |
|---|---|
| `<prefixo>/<silo>/dados` | JSON com a leitura, a cada 5 s |
| `<prefixo>/<silo>/status` | `online` ao conectar ou `offline` (Last Will), como mensagem retida |

O prefixo é `silosmart/grupo01` e precisa ser igual no `.ino` e no `MQTT_PREFIXO` do backend. O id do silo aceita letras, números, `_` e `-`.

```json
{"temperatura":23.1,"umidade":61,"distancia_cm":11.5,"nivel_pct":69,"ventoinha":true}
```

| Campo | Unidade | De onde vem |
|---|---|---|
| `temperatura` | °C | DHT11 |
| `umidade` | % | DHT11 |
| `distancia_cm` | cm | HC-SR04, do sensor (no topo do silo) até o grão |
| `nivel_pct` | % | calculado no ESP32 a partir da distância (0 = vazio, 100 = cheio) |
| `ventoinha` | `true`/`false` | estado do relé |

Um sensor novo precisa entrar em quatro lugares: `publicarLeitura()` no `.ino`, `CAMPOS` em `backend/src/validar.js`, tabela e consultas em `backend/src/db.js` e o painel.

## Firmware (ESP32)

### Montagem

| Peça | Pino do ESP32 |
|---|---|
| DHT11 (dados) | GPIO 4 |
| HC-SR04 TRIG | GPIO 25 |
| HC-SR04 ECHO | GPIO 34, por um divisor de tensão (o ECHO sai em 5 V e o ESP32 aceita 3,3 V) |
| Módulo relé da ventoinha (S) | GPIO 26 |

### Gravar na placa

1. Na Arduino IDE, instale a placa **esp32** (Espressif) e as bibliotecas **PubSubClient** (Nick O'Leary) e **DHT sensor library** (Adafruit). A da Adafruit pede também a **Adafruit Unified Sensor**.
2. Copie `firmware/silosmart_esp32/secrets.example.h` para `secrets.h`, na mesma pasta, e coloque o nome e a senha do Wi-Fi. O ESP32 só conecta em rede 2,4 GHz. O `secrets.h` está no `.gitignore` e nunca vai pro repositório.
3. Abra `silosmart_esp32.ino`, escolha a placa e a porta e faça o upload.
4. No Monitor Serial (115200) aparecem a conexão e cada JSON enviado.

### Lógica

- **Nível**: `(ALTURA_SILO_CM - distância) / (ALTURA_SILO_CM - DIST_CHEIO_CM) × 100`, limitado entre 0 e 100. O "cheio" é com o grão a 3 cm do sensor, porque o HC-SR04 não mede abaixo de ~2 cm.
- **Ventoinha**: liga quando a temperatura chega a 23 °C e só desliga quando cai a 22 °C. Essa folga (histerese) evita que o relé fique ligando e desligando com a temperatura oscilando perto do limite. Se o DHT11 falhar, a ventoinha fica como estava.
- **Reconexão**: se o Wi-Fi ou o broker caírem, o `loop()` fica tentando reconectar. Enquanto isso a placa não lê os sensores, então a ventoinha fica no último estado.

Os valores ajustáveis ficam no topo do `.ino`: tópicos (troque `silo01` se tiver mais de um ESP32), temperaturas da ventoinha, altura do silo e `RELE_LIGA_COM_HIGH` (alguns módulos relé ligam com `LOW`).

## Backend e painel

### Rodar

```bash
docker compose up --build
```

Abra **http://localhost:8088**.

Sem o ESP32 ligado, dá para testar com o simulador, que publica leituras falsas (às vezes com campo `null`) no silo `simulado`:

```bash
docker compose --profile simulador up --build
```

Para parar: `docker compose down`. Os dados ficam no volume `dados-postgres`. Para apagar tudo e começar do zero: `docker compose down -v`.

### O que cada serviço faz

| Serviço | O que faz |
|---|---|
| `db` | PostgreSQL 16. Tabelas `silos` e `leituras`, criadas pelo backend ao subir. |
| `backend` | Assina `silosmart/grupo01/+/dados` e `silosmart/grupo01/+/status`, grava **toda** leitura recebida com o horário de chegada e expõe a API em `/api`. |
| `frontend` | Painel React servido pelo nginx, que também repassa `/api` para o backend. Busca dados novos a cada `FRONT_ATUALIZACAO_SEGUNDOS`. |
| `simulador` | Opcional (profile `simulador`). Finge ser um ESP32. |

### Flag de erro

Cada leitura é gravada com:

- `tem_erro` (boolean): `true` se **algum** campo veio com problema.
- `erros` (JSON): qual campo e por quê, por exemplo `{"temperatura": "nulo"}`.

| Motivo | Quando |
|---|---|
| `nulo` | o campo veio `null` (o ESP32 manda assim quando o sensor falha) |
| `ausente` | o campo não veio na mensagem |
| `invalido` | veio, mas não é do tipo certo: número nos sensores, `true`/`false` na ventoinha |
| `fora_da_faixa` | é número, mas fora da faixa aceita (temperatura: -40 a 80 °C; umidade: 0 a 100 %; distância: 2 a 400 cm; nível: 0 a 100 %) |

Valores fora da faixa são gravados mesmo assim, para análise. Os gráficos ignoram campos com erro ao calcular as médias. No gráfico da ventoinha, cada ponto é a porcentagem das leituras daquele intervalo em que ela estava ligada.

Leituras gravadas antes da ventoinha existir no projeto ficam com `ventoinha` vazio e sem erro.

Mensagens que **não** são gravadas: JSON inválido, JSON que não é objeto, objeto sem nenhum dos campos conhecidos e payload acima de 2 KB (o broker é público). Mensagens de dados *retidas* também são ignoradas, para não regravar a mesma leitura a cada reconexão.

O status `online`/`offline` fica na tabela `silos`.

### API

| Rota | Retorna |
|---|---|
| `GET /api/status` | conexão com o broker, tópicos assinados, horário da última mensagem |
| `GET /api/config` | intervalo de atualização e limites de alerta usados pelo painel |
| `GET /api/silos` | todos os silos com status e a última leitura |
| `GET /api/silos/:id/leituras?horas=24&limite=50&apenas_erros=1` | leituras brutas, mais recentes primeiro |
| `GET /api/silos/:id/serie?horas=24` | médias agrupadas no tempo (~240 pontos), % do tempo com a ventoinha ligada e o total de leituras/erros no período |

Exemplo: `curl localhost:8088/api/silos`

### Configuração

Copie `.env.example` para `.env` e ajuste. Tudo tem valor padrão. Essas variáveis valem para o backend e o painel; a configuração do ESP32 fica no `.ino` e no `secrets.h`.

| Variável | Padrão | |
|---|---|---|
| `MQTT_URL` | `mqtt://broker.hivemq.com:1883` | broker |
| `MQTT_PREFIXO` | `silosmart/grupo01` | prefixo dos tópicos |
| `PORTA_PAINEL` | `8088` | porta do painel no seu computador |
| `FRONT_ATUALIZACAO_SEGUNDOS` | `5` | de quanto em quanto tempo o painel busca dados |
| `SEM_DADOS_APOS_SEGUNDOS` | `30` | sem leitura há mais que isso, o painel avisa |
| `ALERTA_TEMPERATURA_MAX` | `30` | °C |
| `ALERTA_UMIDADE_MAX` | `70` | % |
| `SIMULADOR_SILO` | `simulado` | id do silo usado pelo simulador |

### Consultar o banco

```bash
docker compose exec db psql -U silosmart -c \
  "SELECT recebido_em, silo_id, temperatura, umidade, nivel_pct, tem_erro, erros
   FROM leituras ORDER BY recebido_em DESC LIMIT 20;"
```

### Desenvolvimento sem Docker

```bash
docker compose up -d db                     # só o banco (exponha a porta 5432 se for usar assim)
cd backend && npm install && npm start      # API em :3000
cd frontend && npm install && npm run dev   # painel em :5173, com /api apontando para :3000
cd backend && npm test                      # testes da validação e da flag de erro
```

### Código

```
backend/src/
  index.js      liga tudo: banco, broker e API
  broker.js     conexão MQTT e roteamento dos tópicos
  validar.js    interpreta o JSON e monta a flag de erro
  db.js         schema e consultas
  api.js        rotas HTTP
  simulador.js  ESP32 falso
frontend/src/
  App.jsx       página do painel
  usePainel.js  busca periódica dos dados
  situacao.js   regras de alerta (offline, sem dados, limites, erro)
  components/   cabeçalho, desenho do silo, gráficos, tabela
```
