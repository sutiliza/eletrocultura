# Sistema de Eletrocultura Comparada — Arquitetura de Componentes

**Projeto:** Registro e Acompanhamento de Produtividades Comparadas (Canteiro com e sem Campos Magnéticos)  
**Plataforma:** Google Apps Script + Google Colab (Python) + Google Sheets (CRUD)  
**Autor:** Manus AI | Junho 2026

> **⚠️ NOTA PEDAGÓGICA IMPORTANTE:**  
> Este README documenta a arquitetura técnica completa do sistema, incluindo componentes de pesquisa avançada (ESP32-S3, World Models GGUF, Protocol of Things) que **não estão implementados no webapp escolar atual**. O webapp em produção foca em **método científico escolar (POE: Predição–Observação–Explicação)** aplicado a um **experimento exploratório com campos magnéticos** como hipótese a testar.
>
> **Foco Pedagógico Real:**  
> - Experimento com **3 canteiros** (Controle, Cobre Passivo, PEMF Ativo)  
> - Coleta de dados: biomassa, NDVI, umidade, temperatura  
> - Ciclo POE: alunos fazem predições ANTES de ver dados  
> - **Análise exploratória**, não confirmatória (tamanho amostral insuficiente para causalidade)  
> - "Ressonância ciclotrônica" é **hipótese operacional** para cálculo de frequências, não mecanismo comprovado  
>
> **Documentos Canônicos:**  
> - **Artigo.md** (revisado em set/2026): estudo canônico com ANOVA demonstrativa  
> - **WORKFLOW_BASICO.md**: protocolo pedagógico POE  
>
> Este README descreve uma **arquitetura de pesquisa futura**, não o sistema escolar atual.

---

## Visão Geral da Arquitetura

Este projeto implementa o **Protocol of Things (PoT)** para explicabilidade ciberfísica em eletrocultura de PANCs. O sistema opera em três camadas integradas:

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| **Borda (Edge)** | ESP32-S3 WROOM | Sensoriamento, PEMF, segurança local |
| **Nuvem (Cloud)** | Google Apps Script | CRUD, autenticação, World Model, XAI |
| **Análise** | Google Colab (Python) | Simulação, estatística, visualização |

---

## Inventário de Componentes

### notebook.py (1 arquivo)
Script Python para Google Colab que implementa a simulação do World Model, cálculo de ICR e ponte com a API do Google Sheets.

### Componentes .gs — Google Apps Script (41 arquivos)

| # | Arquivo | Título | Categoria |
|---|---|---|---|
| 1 | `Config.gs` | Configuração Global | Infraestrutura |
| 2 | `Auth.gs` | Autenticação de Usuários | Segurança |
| 3 | `Main.gs` | Roteamento Principal (doGet/doPost) | Infraestrutura |
| 4 | `Db_Core.gs` | Operações CRUD Base | Banco de Dados |
| 5 | `Db_Canteiros.gs` | Gerenciamento de Canteiros | Banco de Dados |
| 6 | `Db_Leituras.gs` | Histórico de Leituras de Sensores | Banco de Dados |
| 7 | `Db_Eletroma.gs` | Registros do Eletroma Vegetal | Banco de Dados |
| 8 | `Db_Biomassa.gs` | Dados de Biomassa e Produtividade | Banco de Dados |
| 9 | `Db_NDVI.gs` | Índices NDVI e Cobertura de Dossel | Banco de Dados |
| 10 | `Db_Usuarios.gs` | Cadastro de Usuários | Banco de Dados |
| 11 | `Db_XAI.gs` | Banco de Explicações do World Model | Banco de Dados |
| 12 | `ICR_Calc.gs` | Calculadora de Ressonância Ciclotrônica | Ciência |
| 13 | `Edge_Sync.gs` | Sincronizador de Borda (ESP32-S3) | IoT |
| 14 | `World_Model_Bridge.gs` | Ponte com World Model | IA |
| 15 | `Foliage_Growth.gs` | Morfogênese Foliar (Foliage) | IA |
| 16 | `Triggers_Native.gs` | Gatilhos Nativos do GAS | Automação |
| 17 | `Export_Data.gs` | Exportador de Dados de Pesquisa | Utilitários |
| 18 | `Stats_Anova.gs` | Análise Estatística ANOVA | Ciência |
| 19 | `Alerts.gs` | Sistema de Alertas e Notificações | Segurança |
| 20 | `Audit_Logs.gs` | Logs de Auditoria | Segurança |
| 21 | `Canteiro_Controle.gs` | Lógica do Canteiro Controle | Experimento |
| 22 | `Canteiro_CobrePassivo.gs` | Lógica do Canteiro Cobre Passivo | Experimento |
| 23 | `Canteiro_PEMFAtivo.gs` | Lógica do Canteiro PEMF Ativo | Experimento |
| 24 | `PANC_OraProNobis.gs` | Parâmetros Ora-pro-nóbis | Biologia |
| 25 | `PANC_Peixinho.gs` | Parâmetros Peixinho-da-horta | Biologia |
| 26 | `PANC_Taioba.gs` | Parâmetros Taioba | Biologia |
| 27 | `Sensors_Air.gs` | Processamento de Sensores de Ar | IoT |
| 28 | `Sensors_Soil.gs` | Processamento de Sensores de Solo | IoT |
| 29 | `Sensors_Light.gs` | Processamento de Luminosidade | IoT |
| 30 | `Sensors_Bioelec.gs` | Condicionamento do Eletroma | IoT |
| 31 | `Actuators_Irrigation.gs` | Controle de Atuadores de Irrigação | Atuadores |
| 32 | `Actuators_PEMF.gs` | Controle de Atuadores PEMF | Atuadores |
| 33 | `Safety_Core.gs` | Intertravamento de Segurança | Segurança |
| 34 | `XAI_Narratives.gs` | Gerador de Narrativas de Explicabilidade | IA |
| 35 | `Visual_Analysis.gs` | Análise de Imagens RGB | IA |
| 36 | `Dashboard_Data.gs` | API de Dados do Painel | Interface |
| 37 | `Report_Generator.gs` | Gerador de Relatórios de Produtividade | Utilitários |
| 38 | `Calibration.gs` | Calibração de Sensores | IoT |
| 39 | `Backup.gs` | Backup Automatizado | Infraestrutura |
| 40 | `Test_Suite.gs` | Suíte de Testes Unitários | Qualidade |
| 41 | `Validador_Logico.gs` | Validador de Cadeia Lógica | Qualidade |

### Componentes .html — Interface Web (35 arquivos)

| # | Arquivo | Título | Categoria |
|---|---|---|---|
| 1 | `Index.html` | Página de Entrada Principal (SPA) | Estrutura |
| 2 | `Sidebar.html` | Barra de Navegação Lateral | Estrutura |
| 3 | `Navbar.html` | Barra de Navegação Superior | Estrutura |
| 4 | `Footer.html` | Rodapé do Sistema | Estrutura |
| 5 | `Styles.html` | Estilos CSS e Tailwind | Estilo |
| 6 | `Scripts.html` | Lógica JavaScript Central | Lógica |
| 7 | `Login.html` | Interface de Login | Autenticação |
| 8 | `Dashboard.html` | Painel de Controle Central | Painel |
| 9 | `Canteiros_List.html` | Listagem de Canteiros | Dados |
| 10 | `Canteiros_Form.html` | Formulário de Canteiros | Dados |
| 11 | `Leituras_List.html` | Tabela de Leituras Ambientais | Dados |
| 12 | `Leituras_Chart.html` | Gráficos de Leituras de Sensores | Visualização |
| 13 | `Eletroma_Monitor.html` | Monitor de Sinais Bioelétricos | Ciência |
| 14 | `Eletroma_PSD.html` | Densidade Espectral de Potência (PSD) | Ciência |
| 15 | `Biomassa_Log.html` | Registro de Biomassa | Dados |
| 16 | `Biomassa_Chart.html` | Gráfico Comparativo de Produtividade | Visualização |
| 17 | `NDVI_Monitor.html` | Monitor de NDVI e Dossel | Ciência |
| 18 | `XAI_Console.html` | Console do World Model e XAI | IA |
| 19 | `ICR_Calculator.html` | Calculadora Interativa ICR | Ciência |
| 20 | `Foliage_Growth_View.html` | Visualização de Crescimento Foliage | IA |
| 21 | `PANC_OraProNobis_View.html` | Painel de Pereskia aculeata | Biologia |
| 22 | `PANC_Peixinho_View.html` | Painel de Stachys byzantina | Biologia |
| 23 | `PANC_Taioba_View.html` | Painel de Xanthosoma sagittifolium | Biologia |
| 24 | `Settings.html` | Configurações Globais | Administração |
| 25 | `Users_Admin.html` | Administração de Usuários | Administração |
| 26 | `Alerts_Config.html` | Configuração de Alertas | Segurança |
| 27 | `Audit_Logs_View.html` | Visualizador de Logs de Auditoria | Segurança |
| 28 | `Export_Panel.html` | Painel de Exportação e Relatórios | Utilitários |
| 29 | `Canteiro_Controle_View.html` | Painel Detalhado - Controle | Experimento |
| 30 | `Canteiro_CobrePassivo_View.html` | Painel Detalhado - Cobre Passivo | Experimento |
| 31 | `Canteiro_PEMFAtivo_View.html` | Painel Detalhado - PEMF Ativo | Experimento |
| 32 | `Safety_Console.html` | Console de Segurança | Segurança |
| 33 | `Calibration_Panel.html` | Painel de Calibração | IoT |
| 34 | `Test_Runner.html` | Executores de Testes | Qualidade |
| 35 | `About.html` | Sobre o Projeto | Informação |

---

## Configuração Inicial no Google Apps Script

1. Acesse [script.google.com](https://script.google.com) e crie um novo projeto.
2. Copie todos os arquivos `.gs` e `.html` para o projeto.
3. Em **Projeto > Propriedades do Script**, adicione a variável de ambiente:
   - Chave: `SPREADSHEETS_ID`
   - Valor: ID da sua planilha Google Sheets
4. Execute a função `setupNativeTriggers()` para ativar os gatilhos automáticos.
5. Publique como **Aplicativo da Web** (Execute como: Eu; Quem tem acesso: Qualquer pessoa).

---

## Delineamento Experimental

O sistema suporta três grupos experimentais conforme o protocolo científico:

| Grupo | Tipo | Objetivo |
|---|---|---|
| **Controle** | Sem intervenção | Referência basal de crescimento natural |
| **Cobre Passivo** | Bobina sem alimentação | Isola efeito de microcorrosão e sombreamento |
| **PEMF Ativo** | Bobina alimentada por ESP32-S3 | Testa estimulação eletromagnética ativa |

As PANCs avaliadas são: **Ora-pro-nóbis** (*Pereskia aculeata*), **Peixinho-da-horta** (*Stachys byzantina*) e **Taioba** (*Xanthosoma sagittifolium*).

---

## Maturidade do Backend

O AG Kit inclui um auditor estático específico para o backend. Ele avalia segurança,
confiabilidade, arquitetura, persistência, testes e observabilidade, sempre apontando
as evidências encontradas no código.

```powershell
# Relatório no terminal
python .agent\scripts\backend_maturity.py .

# Saída para automação
python .agent\scripts\backend_maturity.py . --format json

# Quality gate
python .agent\scripts\backend_maturity.py . --min-score 70 --fail-on-critical
```

O scanner também é executado pelo checklist geral:

```powershell
python .agent\scripts\checklist.py .
```

## Maturidade e Intuitividade do Frontend

O auditor de frontend combina os critérios de acessibilidade e engenharia do
`frontend-specialist` com as leis de UX e as Web Interface Guidelines. O relatório
apresenta um score geral e índices separados de maturidade e intuitividade.

```powershell
# Relatório no terminal
python .agent\scripts\frontend_maturity.py .

# Saída estruturada
python .agent\scripts\frontend_maturity.py . --format json

# Quality gate geral e de intuitividade
python .agent\scripts\frontend_maturity.py . --min-score 70 --min-intuitiveness 75
```

O scanner verifica semântica, teclado, formulários, navegação, feedback,
responsividade, desempenho percebido, componentização e testes de interface.

## Integração Frontend e Backend

A interface utiliza uma única fronteira, `apiRequest`, definida em
`Backend_Api.gs`. O gateway padroniza respostas, mantém sessão temporária,
valida ações e restringe configurações e parada de emergência por perfil.

O `Scripts.html` centraliza chamadas com `google.script.run`, navegação,
carregamento, erros e renderização. Os fluxos conectados são:

- autenticação e restauração de sessão;
- dashboard e listagem/cadastro de canteiros;
- leituras de sensores e registro de biomassa;
- configuração da planilha;
- cálculo ICR, exportação CSV e testes;
- parada de emergência com confirmação.

As páginas da SPA são carregadas por `includeAppPages()` em `Main.gs`.
