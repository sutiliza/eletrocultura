/**
 * ==============================================================================
 * COMPONENTE: Edge_Sync.gs
 * TÍTULO: Sincronizador de Borda (ESP32-S3)
 * FUNCIONALIDADES:
 *   - Endpoint otimizado para receber dados compactados dos microcontroladores de borda.
 * INTEGRAÇÕES E DEPENDÊNCIAS:
 *   - Main.gs, ESP32-S3 firmware simulation.
 * AUTOR: Manus AI | DATA: Junho 2026
 * ==============================================================================
 */

function syncEdgeData(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload de telemetria invalido.');
  }
  if (!payload.eletroma || typeof payload.eletroma !== 'object' || Array.isArray(payload.eletroma)) {
    throw new Error('Bloco eletroma ausente.');
  }
  if (!payload.ambient || typeof payload.ambient !== 'object' || Array.isArray(payload.ambient)) {
    throw new Error('Bloco ambiental ausente.');
  }

  var numericFields = [
    { block: payload.eletroma, field: 'potencial' },
    { block: payload.eletroma, field: 'capacitancia' },
    { block: payload.ambient, field: 'temp' },
    { block: payload.ambient, field: 'umidAr' },
    { block: payload.ambient, field: 'umidSolo' },
    { block: payload.ambient, field: 'luz' }
  ];
  for (var i = 0; i < numericFields.length; i++) {
    var item = numericFields[i];
    if (typeof item.block[item.field] !== 'number' || !isFinite(item.block[item.field])) {
      throw new Error('Leitura numerica invalida: ' + item.field + '.');
    }
  }

  if (!String(payload.eletroma.plantaId || '').trim() ||
      !String(payload.ambient.canteiroId || '').trim()) {
    throw new Error('Identificador de planta ou canteiro ausente.');
  }

  logEletroma(payload.eletroma);
  insertLeitura(payload.ambient);
  return { status: 'SYNCED', next_action: 'PEMF_ON', target_freq: 15.3 };
}
