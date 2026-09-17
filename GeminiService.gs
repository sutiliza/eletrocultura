/**
 * ==============================================================================
 * COMPONENTE: GeminiService.gs
 * TÍTULO: Interpretação Pedagógica dos Experimentos via Google Gemini
 * FUNCIONALIDADES:
 *   - Lê as métricas comparativas dos canteiros (Controle, Cobre Passivo,
 *     PEMF Ativo) e pede ao Gemini uma leitura clara e honesta dos resultados,
 *     adequada a estudantes.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Dashboard_Data.gs (getDashboardMetrics), Backend_Api.gs (apiError_),
 *     acionado pela ação de API 'ia.interpretar'.
 * CONFIGURAÇÃO:
 *   - Requer a propriedade de script GEMINI_API_KEY
 *     (script.google.com → Configurações do projeto → Propriedades do script).
 *     Sem a chave, a função devolve um erro amigável e o restante do sistema
 *     continua funcionando normalmente.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

var GEMINI_ELETRO_CONFIG = {
  MODELO: 'gemini-1.5-flash',
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/'
};

/** Lê a chave da API do Gemini das propriedades do script. */
function getGeminiApiKey() {
  try {
    return PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  } catch (error) {
    Logger.log("Erro em getGeminiApiKey: " + error.message);
    throw error;
  }
}

/** Indica se a integração com o Gemini está configurada. */
function geminiDisponivel() {
  var chave = getGeminiApiKey();
  return Boolean(chave && chave.length > 10);
}

/**
 * Gera uma interpretação pedagógica dos resultados do experimento.
 * @param {Object} payload Opcional: { foco: string } com um recorte de interesse.
 * @return {Object} { modelo, metricas, interpretacao }
 * @throws {Error} apiError_ amigável quando a IA não está configurada/falha.
 */
function interpretarExperimentoComIA_(payload) {
  try {
    if (!geminiDisponivel()) {
      throw apiError_(
        'GEMINI_NOT_CONFIGURED',
        'Interpretacao por IA indisponivel: configure a chave GEMINI_API_KEY nas propriedades do script.'
      );
    }

    var metricas = getDashboardMetrics();
    var foco = payload && payload.foco ? String(payload.foco).slice(0, 300) : '';
    var texto = chamarGeminiEletro_(montarPromptInterpretacao_(metricas, foco), { temperature: 0.4 });
    var interpretacao = parseJsonGemini_(texto, 'interpretacao pedagogica');

    return {
      modelo: GEMINI_ELETRO_CONFIG.MODELO,
      fonte: 'gemini',
      metricas: metricas,
      interpretacao: normalizarInterpretacaoEletro_(interpretacao),
      evidenceScope: 'exploratory_observed_metrics',
      causalInference: false,
      independentReplicationVerified: false,
      ajusteFisicoExecutado: false,
      confirmacaoHumanaObrigatoria: true
    };
  } catch (error) {
    Logger.log("Erro em interpretarExperimentoComIA_: " + error.message);
    throw error;
  }
}

/**
 * POE (Predição-Observação-Explicação): feedback formativo sobre a predição
 * do estudante a respeito do experimento. O estudante prevê qual canteiro
 * terá mais biomassa e justifica; a função compara com os dados reais do
 * dashboard e devolve um retorno que valoriza o raciocínio (não o acerto),
 * convida à explicação e mantém a ressalva científica honesta.
 *
 * Diferente de interpretarExperimentoComIA (admin/pesquisador), esta função
 * NUNCA lança por falta de chave: o líder em biomassa é computável localmente,
 * então sem GEMINI_API_KEY (ou com a IA fora) degrada para feedback local.
 *
 * @param {Object} payload { predicao: 'controle'|'cobre'|'pemf', justificativa?: string }
 * @return {Object} { predicao, lider, metricas, feedback, fonte, modelo }
 */
function avaliarPredicaoPOE(payload) {
  try {
    var VALIDAS = { controle: 'Controle', cobre: 'Cobre Passivo', pemf: 'PEMF Ativo' };
    var predicao = String(payload && payload.predicao || '').toLowerCase().trim();
    if (!VALIDAS[predicao]) {
      throw apiError_('POE_PREDICAO_INVALIDA', 'Escolha um canteiro: controle, cobre ou pemf.');
    }
    var justificativa = String(payload && payload.justificativa || '').slice(0, 500);

    var metricas = getDashboardMetrics();
    var lider = poeLiderBiomassa_(metricas);
    var acertou = lider.chave === predicao;

    var feedback = null;
    var fonte = 'local';
    if (geminiDisponivel()) {
      try {
        feedback = String(chamarGeminiEletro_(
          montarPromptPOE_(VALIDAS[predicao], justificativa, lider, metricas, acertou),
          { temperature: 0.4 }
        ) || '').trim();
        fonte = 'gemini';
      } catch (e) {
        feedback = null; // degrada para o feedback local abaixo
      }
    }
    if (!feedback) {
      fonte = 'local';
      feedback = poeFeedbackLocal_(VALIDAS[predicao], lider, acertou);
    }

    return {
      predicao: VALIDAS[predicao],
      lider: lider.nome,
      metricas: metricas,
      feedback: feedback,
      fonte: fonte,
      modelo: fonte === 'gemini' ? GEMINI_ELETRO_CONFIG.MODELO : 'local',
      liderBiomassa: lider,
      interpretationScope: {
        analysisType: 'descriptive_leader',
        selectedBy: 'highest_observed_biomass',
        isAnova: false,
        causalInference: false,
        independentReplicationVerified: false,
        note: 'A função identifica a maior biomassa observada; não demonstra superioridade do tratamento.'
      }
    };
  } catch (error) {
    Logger.log("Erro em avaliarPredicaoPOE: " + error.message);
    throw error;
  }
}

/** Identifica o canteiro líder em biomassa nas métricas do dashboard. */
function poeLiderBiomassa_(metricas) {
  try {
    var nomes = { controle: 'Controle', cobre: 'Cobre Passivo', pemf: 'PEMF Ativo' };
    var lider = { chave: 'controle', nome: nomes.controle, biomass: -Infinity };
    ['controle', 'cobre', 'pemf'].forEach(function (chave) {
      var valor = Number(metricas && metricas[chave] && metricas[chave].biomass);
      if (isFinite(valor) && valor > lider.biomass) {
        lider = { chave: chave, nome: nomes[chave], biomass: valor };
      }
    });
    if (!isFinite(lider.biomass)) { lider.biomass = 0; }
    lider.analysisType = 'descriptive_leader';
    lider.selectedBy = 'highest_observed_biomass';
    lider.isAnova = false;
    lider.causalInference = false;
    lider.independentReplicationVerified = false;
    lider.note = 'Maior biomassa observada nas métricas fornecidas; não é teste ANOVA nem evidência de superioridade causal.';
    return lider;
  } catch (error) {
    Logger.log("Erro em poeLiderBiomassa_: " + error.message);
    throw error;
  }
}

/** Prompt do feedback formativo POE (valoriza o raciocínio, não o acerto). */
function montarPromptPOE_(predicao, justificativa, lider, metricas, acertou) {
  try {
    return [
      'Voce e um professor de ciencias acompanhando um experimento escolar de',
      'ELETROCULTURA com tres canteiros: Controle, Cobre Passivo e PEMF Ativo.',
      'Um estudante fez uma PREDICAO (etapa P do ciclo Predicao-Observacao-',
      'Explicacao) antes de olhar os dados.',
      '',
      'Predicao do estudante: o canteiro "' + predicao + '" tera mais biomassa.',
      justificativa ? ('Justificativa do estudante: ' + justificativa) : 'O estudante nao justificou.',
      '',
      'Dados reais agregados (biomass em gramas; water em % de umidade):',
      JSON.stringify(metricas),
      'Lider atual em biomassa: ' + lider.nome + '.',
      'A identificação do líder é apenas descritiva: maior valor observado. Não trate essa seleção como ANOVA, eficácia, superioridade causal ou replicação independente; um canteiro por condição não é replicação.',
      'A predicao ' + (acertou ? 'COINCIDE' : 'NAO coincide') + ' com os dados atuais.',
      '',
      'Escreva de 3 a 5 frases de feedback formativo, em portugues do Brasil,',
      'linguagem acessivel ao ensino fundamental, que: (1) valorizem o ato de',
      'prever e o raciocinio apresentado, sem celebrar o acerto nem censurar o',
      'erro; (2) comparem a predicao com a OBSERVACAO dos dados reais, citando',
      'os numeros; (3) convidem o estudante a EXPLICAR por que os resultados',
      'sairam assim, sugerindo uma pergunta investigativa concreta; (4) tragam a',
      'ressalva honesta de que a amostra e pequena e o experimento continua.',
      'Nao invente numeros alem dos fornecidos. Sem markdown, texto corrido.'
    ].join('\n');
  } catch (error) {
    Logger.log("Erro em montarPromptPOE_: " + error.message);
    throw error;
  }
}

/** Feedback POE determinístico local (sem LLM), com os mesmos princípios. */
function poeFeedbackLocal_(predicao, lider, acertou) {
  var inicio = acertou
    ? 'Sua predicao de que o canteiro ' + predicao + ' teria mais biomassa coincide com os dados atuais: ' +
      lider.nome + ' lidera com ' + lider.biomass + 'g de biomassa media.'
    : 'Voce previu o canteiro ' + predicao + ', e ate agora quem lidera em biomassa e ' +
      lider.nome + ' (' + lider.biomass + 'g de biomassa media). Otimo material para investigar!';
  return inicio + ' O mais importante no metodo cientifico nao e acertar a predicao, e comparar o que' +
    ' esperavamos com o que observamos. Tente explicar: o que pode ter feito ' + lider.nome +
    ' se destacar ate aqui? Lembre que a amostra ainda e pequena e o experimento continua —' +
    ' os resultados podem mudar nas proximas medicoes.';
}

/** Monta o prompt comparando os três tratamentos. */
function montarPromptInterpretacao_(metricas, foco) {
  try {
    try {
      return [
        'Voce e um educador de ciencias apoiando um professor na interpretacao de',
        'um experimento escolar de ELETROCULTURA. Compare principalmente Controle',
        'e PEMF, sem ignorar Cobre Passivo. Responda em portugues do Brasil.',
        '',
        'Dados agregados (biomass em gramas, water em %, NDVI de 0 a 1 e ANOVA):',
        JSON.stringify(metricas),
        foco ? ('\nFoco solicitado pelo usuario: ' + foco) : '',
        '',
        'Devolva SOMENTE JSON valido, sem markdown, neste formato:',
        '{"leituraPedagogica":"texto","comparacaoControlePemf":"texto",',
        '"confundidores":["item"],"limitacoes":["item"],',
        '"perguntasInvestigativas":["pergunta 1","pergunta 2"],',
        '"aviso":"texto"}',
        '',
        'Regras obrigatorias: nao invente dados; diferencie associacao de causalidade;',
        'a funcao poeLiderBiomassa_ apenas seleciona descritivamente a maior biomassa observada;',
        'ela nao substitui o modulo ANOVA exploratorio e nao autoriza afirmar superioridade;',
        'um canteiro por condicao nao constitui replicacao independente;',
        'nao afirme que eletrocultura ou PEMF funciona; trate p-valor e ANOVA como',
        'evidencia que exige desenho experimental, tamanho amostral e repeticao;',
        'aponte umidade, luz, solo, temperatura, posicao e manejo como confundidores',
        'quando nao controlados; informe que qualquer ajuste fisico depende de revisao',
        'e confirmacao de um adulto responsavel. Produza exatamente duas perguntas.'
      ].join('\n');
    } catch (error) {
      Logger.log("Erro em montarPromptInterpretacao_: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em montarPromptInterpretacao_: " + error.message);
    throw error;
  }
}

function normalizarInterpretacaoEletro_(dados) {
  try {
    dados = dados && typeof dados === 'object' ? dados : {};
    return {
      leituraPedagogica: String(dados.leituraPedagogica || 'Os dados devem ser comparados como observacoes preliminares.'),
      comparacaoControlePemf: String(dados.comparacaoControlePemf || 'A diferenca observada entre Controle e PEMF nao demonstra causalidade.'),
      confundidores: Array.isArray(dados.confundidores) ? dados.confundidores.slice(0, 6) : [],
      limitacoes: Array.isArray(dados.limitacoes) ? dados.limitacoes.slice(0, 6) : [],
      perguntasInvestigativas: Array.isArray(dados.perguntasInvestigativas)
        ? dados.perguntasInvestigativas.slice(0, 2)
        : [],
      aviso: 'A IA nao confirma eficacia da eletrocultura; o lider de biomassa e apenas uma leitura descritiva e o ANOVA permanece exploratorio sem replicacao independente verificada. Toda decisao exige revisao humana.',
      escopoEvidencia: 'exploratorio_descritivo',
      causalidadeDemonstrada: false,
      replicacaoIndependenteVerificada: false
    };
  } catch (error) {
    Logger.log("Erro em normalizarInterpretacaoEletro_: " + error.message);
    throw error;
  }
}

/**
 * Ponto único de HTTP com o Gemini (generateContent), já resiliente.
 * @param {string} prompt
 * @param {Object} generationConfig
 * @return {string} Texto gerado pelo modelo.
 */
function chamarGeminiEletro_(prompt, generationConfig) {
  try {
    // FROTA-05: rate limit, dedup e quota antes de chamar o provedor
    var _rl05 = AiRateLimitService.check('eletroculturaGenerate', prompt);
    if (_rl05.dedupHit) return _rl05.cached;
    var chave = getGeminiApiKey();
    if (!chave) {
      throw apiError_('GEMINI_NOT_CONFIGURED', 'Chave GEMINI_API_KEY nao configurada.');
    }

    var url = GEMINI_ELETRO_CONFIG.BASE_URL +
      encodeURIComponent(GEMINI_ELETRO_CONFIG.MODELO) +
      ':generateContent?key=' + encodeURIComponent(chave);

    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: generationConfig || {}
      }),
      muteHttpExceptions: true
    };

    var resp = fetchGeminiComRetentativa_(url, options);
    var codigo = resp.getResponseCode();
    if (codigo !== 200) {
      throw apiError_('GEMINI_HTTP_' + codigo, 'Falha ao consultar a IA (HTTP ' + codigo + ').');
    }

    var json = parseJsonGemini_(resp.getContentText(), 'envelope da API');
    var texto = json && json.candidates && json.candidates[0] && json.candidates[0].content &&
      json.candidates[0].content.parts && json.candidates[0].content.parts[0] &&
      json.candidates[0].content.parts[0].text;
    if (!texto) {
      throw apiError_('GEMINI_EMPTY', 'A IA nao retornou um texto utilizavel.');
    }
    return texto;
  } catch (error) {
    Logger.log("Erro em chamarGeminiEletro_: " + error.message);
    throw error;
  }
}

/**
 * Wrapper de resiliência sobre UrlFetchApp.fetch: repete a chamada em falhas
 * transitórias do Gemini (HTTP 429/500/503 e exceções de rede) com backoff
 * exponencial. As opções devem manter muteHttpExceptions:true.
 */
function fetchGeminiComRetentativa_(url, options) {
  var MAX_TENTATIVAS = 3;
  var esperaMs = 700;
  for (var tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      var resp = UrlFetchApp.fetch(url, options);
      var codigo = resp.getResponseCode();
      var transitorio = (codigo === 429 || codigo === 500 || codigo === 503);
      if (transitorio && tentativa < MAX_TENTATIVAS) {
        Utilities.sleep(esperaMs);
        esperaMs *= 2;
        continue;
      }
      return resp;
    } catch (e) {
      if (tentativa >= MAX_TENTATIVAS) throw e;
      Utilities.sleep(esperaMs);
      esperaMs *= 2;
    }
  }
}

/**
 * JSON.parse de um texto vindo do Gemini, lançando um erro CLARO (em vez do
 * SyntaxError cru) quando o conteúdo não é JSON válido.
 */
function parseJsonGemini_(texto, contexto) {
  try {
    try {
      try {
        var limpo = String(texto == null ? '' : texto).trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, '');
        return JSON.parse(limpo);
      } catch (e) {
        throw new Error('Resposta do Gemini nao veio em JSON valido' +
          (contexto ? ' (' + contexto + ')' : '') + ': ' +
          String(texto == null ? '' : texto).slice(0, 200));
      }
    } catch (error) {
      Logger.log("Erro em parseJsonGemini_: " + error.message);
      throw error;
    }
  } catch (error) {
    Logger.log("Erro em parseJsonGemini_: " + error.message);
    throw error;
  }
}
