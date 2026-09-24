// js/calc.js - Funções puras de cálculo de jornada, tolerância e banco de horas

/**
 * Converte horário no formato 'HH:MM' ou 'HH:MM:SS' para minutos totais desde a meia-noite.
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/**
 * Converte minutos para o formato HH:MM (com sinal se negativo/positivo).
 */
export function minutesToHHMM(totalMinutes) {
  const isNegative = totalMinutes < 0;
  const absMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = Math.round(absMinutes % 60);
  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Calcula o atraso na entrada considerando o horário oficial e a entrada realizada.
 * @param {string} horarioOficial - Formato '08:00:00'
 * @param {string} horarioRealizado - Formato '08:25:00' ou ISO Date
 * @returns {number} Minutos totais de atraso (0 se pontual ou antecipado)
 */
export function calcularAtrasoEntrada(horarioOficial, horarioRealizado) {
  const minOficial = typeof horarioOficial === 'string' ? timeToMinutes(horarioOficial) : horarioOficial;

  let minRealizado = 0;
  if (typeof horarioRealizado === 'string') {
    if (horarioRealizado.includes('T')) {
      const date = new Date(horarioRealizado);
      minRealizado = date.getHours() * 60 + date.getMinutes();
    } else {
      minRealizado = timeToMinutes(horarioRealizado);
    }
  } else if (horarioRealizado instanceof Date) {
    minRealizado = horarioRealizado.getHours() * 60 + horarioRealizado.getMinutes();
  }

  const diferenca = minRealizado - minOficial;
  return diferenca > 0 ? diferenca : 0;
}

/**
 * Aplica a regra de tolerância de 15 minutos (RN01).
 * - Se o atraso for de até 15 minutos: débito = 0 minutos.
 * - Se o atraso ultrapassar 15 minutos: debita apenas o excedente (atraso total - 15 min).
 * @param {number} atrasoMinutos - Total de minutos atrasados
 * @returns {{ debitarMinutos: number, dentroDaTolerancia: boolean }}
 */
export function aplicarTolerancia15Min(atrasoMinutos) {
  if (atrasoMinutos <= 15) {
    return {
      debitarMinutos: 0,
      dentroDaTolerancia: true
    };
  }
  return {
    debitarMinutos: atrasoMinutos - 15,
    dentroDaTolerancia: false
  };
}

/**
 * Atualiza o saldo do Banco de Horas e verifica o Alerta Crítico (-20.00 horas / RN02).
 * @param {number} saldoAtualHoras - Saldo atual em horas (ex: -19.50)
 * @param {number} debitarMinutos - Minutos a serem debitados (ex: 40)
 * @returns {{ novoSaldoHoras: number, alertaJustaCausa: boolean, status: string }}
 */
export function atualizarBancoDeHoras(saldoAtualHoras, debitarMinutos) {
  const horasDebitar = debitarMinutos / 60;
  const novoSaldo = Number((saldoAtualHoras - horasDebitar).toFixed(2));

  const alertaJustaCausa = novoSaldo <= -20.00;
  const status = alertaJustaCausa ? 'ALERTA_JUSTA_CAUSA' : (debitarMinutos > 0 ? 'ATRASO' : 'NORMAL');

  return {
    novoSaldoHoras: novoSaldo,
    alertaJustaCausa,
    status
  };
}

/**
 * Compara dois vetores faciais (arrays de 128 números) usando a distância euclidiana (RF01).
 * Regra: Distância < 0.45 indica correspondência válida.
 */
export function calcularDistanciaEuclidiana(vetorA, vetorB) {
  if (!vetorA || !vetorB || vetorA.length !== vetorB.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < vetorA.length; i++) {
    const diff = vetorA[i] - vetorB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Valida se a distância atende ao limite de decisão (< 0.45).
 */
export function validarFaceEuclidiana(vetorA, vetorB, threshold = 0.45) {
  const dist = calcularDistanciaEuclidiana(vetorA, vetorB);
  return {
    valido: dist < threshold,
    distancia: dist
  };
}
