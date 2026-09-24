import {
  calcularAtrasoEntrada,
  aplicarTolerancia15Min,
  atualizarBancoDeHoras,
  calcularDistanciaEuclidiana,
  validarFaceEuclidiana
} from '../js/calc.js';

function runTests() {
  console.log('--- Executando Testes BDD / Unidade (js/calc.js) ---');
  let passed = 0;
  let failed = 0;

  function assertEqual(actual, expected, testName) {
    if (Math.abs(actual - expected) < 0.001 || actual === expected) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: esperado ${expected}, obtido ${actual}`);
      failed++;
    }
  }

  function assertTrue(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: condição esperada verdadeira`);
      failed++;
    }
  }

  // Cenário 1: Entrada com atraso dentro da tolerância de 15 minutos (08:12 -> 0m debitados)
  const atraso1 = calcularAtrasoEntrada('08:00:00', '08:12:00');
  const tol1 = aplicarTolerancia15Min(atraso1);
  assertEqual(atraso1, 12, 'Atraso total 08:12 deve ser 12 min');
  assertEqual(tol1.debitarMinutos, 0, 'Débito para atraso 12 min deve ser 0 min');
  assertTrue(tol1.dentroDaTolerancia, '08:12 deve estar dentro da tolerância');

  // Cenário 2: Entrada com atraso de 14 minutos
  const atraso14 = calcularAtrasoEntrada('08:00:00', '08:14:00');
  const tol14 = aplicarTolerancia15Min(atraso14);
  assertEqual(tol14.debitarMinutos, 0, 'Atraso 14 min deve ter 0 min debitados');

  // Cenário 3: Entrada com atraso superior à tolerância (08:25 -> 25 min atraso, 10 min debitados)
  const atraso2 = calcularAtrasoEntrada('08:00:00', '08:25:00');
  const tol2 = aplicarTolerancia15Min(atraso2);
  assertEqual(atraso2, 25, 'Atraso total 08:25 deve ser 25 min');
  assertEqual(tol2.debitarMinutos, 10, 'Débito para atraso 25 min deve ser 10 min (25 - 15)');

  // Cenário 4: Banco de horas atinge saldo crítico (-19.50h + 40min débito -> -20.16h -> ALERTA_JUSTA_CAUSA)
  const bancoRes = atualizarBancoDeHoras(-19.50, 40);
  assertEqual(bancoRes.novoSaldoHoras, -20.17, 'Novo saldo (-19.50 - 40/60) deve ser -20.17h');
  assertTrue(bancoRes.alertaJustaCausa, 'Saldo <= -20.00h deve acionar alerta crítica de justa causa');
  assertEqual(bancoRes.status, 'ALERTA_JUSTA_CAUSA', 'Status deve mudar para ALERTA_JUSTA_CAUSA');

  // Cenário 5: Validação Facial (Distância Euclidiana)
  const vecA = new Array(128).fill(0.1);
  const vecB = new Array(128).fill(0.12);
  const faceRes = validarFaceEuclidiana(vecA, vecB, 0.45);
  assertTrue(faceRes.valido, 'Distância facial pequena deve ser válida');
  assertTrue(faceRes.distancia < 0.45, 'Distância euclidiana deve ser < 0.45');

  console.log(`\nResumo dos Testes: ${passed} passou, ${failed} falhou.`);
  if (failed > 0) process.exit(1);
}

runTests();
