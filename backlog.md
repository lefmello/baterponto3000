# Backlog do Projeto - BaterPonto3000

## Status dos Módulos e Tarefas

### 1. Banco de Dados e Supabase Backend
- [x] **[BD-01]** Mapeamento do Schema SQL com Enums, Tabelas e Índices
- [x] **[BD-02]** Atualização do Script SQL (`SQL`) com suporte a Banco de Horas, Cargo e Alerta
- [x] **[BD-03]** Trigger e Stored Procedure para processamento de ponto e tolerância de 15 minutos
- [x] **[BD-04]** Trigger/Função para cálculo do saldo de banco de horas e alteração automática de status para `ALERTA_JUSTA_CAUSA` (limite -20.00h)
- [x] **[BD-05]** Configuração da integração cliente Supabase JS em `js/supabase.js`

### 2. Módulo de Reconhecimento Facial e Fallback
- [x] **[RF-01]** Configuração e carregamento dos modelos estáticos do `face-api.js`
- [x] **[RF-02]** Captura via câmera WebRTC e geração da matriz de 128 dimensões
- [x] **[RF-03]** Comparação facial via distância euclidiana (threshold < 0.45) e descarte imediato do frame da memória RAM
- [x] **[RF-04]** Controle do ciclo de 3 tentativas consecutivas e redirecionamento automático para contingência (Crachá / Biometria)

### 3. Módulo de Leitura de Crachá / QR Code (Contingência)
- [x] **[CT-01]** Integração da biblioteca HTML5-QRCode via ES Module
- [x] **[CT-02]** Leitura do código de barras/QR do crachá para validação do colaborador

### 4. Lógica de Negócio e Cálculos de Jornada (`js/calc.js`)
- [x] **[CALC-01]** Função de cálculo de minutos trabalhados e atrasos
- [x] **[CALC-02]** Aplicação da regra de tolerância de 15 minutos (debitando apenas o excedente)
- [x] **[CALC-03]** Atualização acumulada do Banco de Horas e detecção do limite crítico (-20.00h)

### 5. Interface do Colaborador e Comprovante (`index.html` & `js/app.js`)
- [x] **[UI-01]** Interface limpa semântica utilizando Pico.css e Lucide Icons (sem emojis)
- [x] **[UI-02]** Fluxo de Seleção: Registrar Entrada / Registrar Saída
- [x] **[UI-03]** Exibição do status da validação (Sucesso, Tentativas, Contingência)
- [x] **[UI-04]** Geração e impressão do Comprovante de Ponto (Ticket Térmico 80mm com `@media print`)

### 6. Painel do Gestor e Auditoria (`admin.html`)
- [x] **[ADM-01]** Visualização do Espelho de Ponto Diário e Saldos de Banco de Horas
- [x] **[ADM-02]** Ajustes Manuais de Ponto exclusivamente por Superior Direto com justificativa obrigatória e gravação imutável no Audit Trail (`alterado_por_id`, `motivo_alteracao`)
- [x] **[ADM-03]** Indicadores de Alerta Crítico (`ALERTA_JUSTA_CAUSA`) para notificação do RH e Gestor
- [x] **[ADM-04]** Relatório de espelho de ponto impresso/exportável

### 7. Verificação, Testes e Documentação
- [x] **[TEST-01]** Testes unitários para a lógica de cálculo em `js/calc.js`
- [x] **[TEST-02]** Teste das regras BDD (Gherkin) de tolerância e banco de horas
- [x] **[DOC-01]** Atualização do `README.md` com instruções de uso e configuração
