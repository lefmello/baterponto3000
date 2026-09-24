// js/app.js - Lógica da Interface de Registro de Ponto

import {
  getFuncionariosAtivos,
  getFuncionarioPorCracha,
  registrarPonto
} from './supabase.js';

import {
  validarFaceEuclidiana
} from './calc.js';

// Estado do aplicativo
let tipoRegistroSelecionado = 'ENTRADA';
let tentativasFacial = 0;
const MAX_TENTATIVAS = 3;
let streamVideo = null;
let funcionariosAtivos = [];
let html5QrScanner = null;

// Elementos DOM
const btnTipoEntrada = document.getElementById('btn-tipo-entrada');
const btnTipoSaida = document.getElementById('btn-tipo-saida');
const videoFeed = document.getElementById('video-feed');
const canvasOverlay = document.getElementById('canvas-overlay');
const statusFacial = document.getElementById('status-facial');
const tentativasInfo = document.getElementById('tentativas-info');
const btnCapturarFacial = document.getElementById('btn-capturar-facial');
const secaoFacial = document.getElementById('secao-facial');
const secaoContingencia = document.getElementById('secao-contingencia');
const formCrachaManual = document.getElementById('form-cracha-manual');
const inputCracha = document.getElementById('input-cracha');
const msgResultado = document.getElementById('msg-resultado');

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) window.lucide.createIcons();

  configurarBotoesTipo();
  await carregarModelosEIniciarCamera();
  await carregarFuncionarios();

  btnCapturarFacial.addEventListener('click', executarValidacaoFacial);
  formCrachaManual.addEventListener('submit', executarValidacaoCracha);
});

// Configura botões Entrada / Saída
function configurarBotoesTipo() {
  btnTipoEntrada.addEventListener('click', () => {
    tipoRegistroSelecionado = 'ENTRADA';
    btnTipoEntrada.className = 'contrast';
    btnTipoSaida.className = 'outline contrast';
  });

  btnTipoSaida.addEventListener('click', () => {
    tipoRegistroSelecionado = 'SAIDA';
    btnTipoSaida.className = 'contrast';
    btnTipoEntrada.className = 'outline contrast';
  });
}

// Carrega os modelos neurais locais do face-api.js e ativa a câmera
async function carregarModelosEIniciarCamera() {
  try {
    statusFacial.innerHTML = `<i data-lucide="loader"></i> Carregando modelos IA locais...`;
    if (window.lucide) window.lucide.createIcons();

    // Carregar modelos do diretório local /models
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

    statusFacial.innerHTML = `<i data-lucide="camera"></i> Conectando à câmera...`;
    if (window.lucide) window.lucide.createIcons();

    streamVideo = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    videoFeed.srcObject = streamVideo;

    statusFacial.className = 'badge badge-success';
    statusFacial.innerHTML = `<i data-lucide="check-circle"></i> Sistema Pronto para Reconhecimento`;
    if (window.lucide) window.lucide.createIcons();

    btnCapturarFacial.disabled = false;
  } catch (err) {
    console.error('Erro ao carregar câmera/modelos:', err);
    statusFacial.className = 'badge badge-danger';
    statusFacial.innerHTML = `<i data-lucide="x-circle"></i> Câmera indisponível. Use a contingência.`;
    if (window.lucide) window.lucide.createIcons();
    ativarContingencia();
  }
}

// Carrega lista de funcionários para comparação
async function carregarFuncionarios() {
  try {
    funcionariosAtivos = await getFuncionariosAtivos();
  } catch (err) {
    console.error('Erro ao carregar funcionários:', err);
  }
}

// Executa a captura e validação facial (RF01 & RF02)
async function executarValidacaoFacial() {
  if (tentativasFacial >= MAX_TENTATIVAS) {
    ativarContingencia();
    return;
  }

  tentativasFacial++;
  tentativasInfo.textContent = `Tentativa ${tentativasFacial} de ${MAX_TENTATIVAS}`;

  btnCapturarFacial.disabled = true;
  statusFacial.className = 'badge badge-warning';
  statusFacial.innerHTML = `<i data-lucide="loader"></i> Processando rosto na RAM...`;
  if (window.lucide) window.lucide.createIcons();

  try {
    // Detecta o rosto e calcula os 128 vetores neurais na memória temporária
    const detection = await faceapi.detectSingleFace(videoFeed).withFaceLandmarks().withFaceDescriptor();

    if (!detection) {
      exibirMensagem('Nenhum rosto detectado na câmera. Enquadre seu rosto.', 'danger');
      tratarFalhaFacial();
      return;
    }

    const vetorCapturado = Array.from(detection.descriptor);

    // Comparação com a base de funcionários cadastrados (Distância Euclidiana < 0.45)
    let funcionarioEncontrado = null;
    let menorDistancia = Infinity;

    for (const func of funcionariosAtivos) {
      if (func.vetor_facial) {
        let vetorCadastrado = func.vetor_facial;
        if (typeof vetorCadastrado === 'string') {
          vetorCadastrado = JSON.parse(vetorCadastrado);
        }
        const { valido, distancia } = validarFaceEuclidiana(vetorCapturado, vetorCadastrado, 0.45);
        if (valido && distancia < menorDistancia) {
          menorDistancia = distancia;
          funcionarioEncontrado = func;
        }
      }
    }

    // Descarte imediato do frame da RAM por diretiva de privacidade
    const canvasContext = canvasOverlay.getContext('2d');
    canvasContext?.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);

    if (funcionarioEncontrado) {
      await concluirRegistro(funcionarioEncontrado, 'FACIAL');
    } else {
      exibirMensagem(`Reconhecimento facial não correspondeu (distância: ${menorDistancia.toFixed(2)}).`, 'warning');
      tratarFalhaFacial();
    }

  } catch (err) {
    console.error('Erro na validação facial:', err);
    tratarFalhaFacial();
  }
}

function tratarFalhaFacial() {
  btnCapturarFacial.disabled = false;
  if (tentativasFacial >= MAX_TENTATIVAS) {
    statusFacial.className = 'badge badge-danger';
    statusFacial.innerHTML = `<i data-lucide="alert-triangle"></i> Limite de 3 tentativas atingido. Redirecionando...`;
    if (window.lucide) window.lucide.createIcons();
    setTimeout(ativarContingencia, 1000);
  } else {
    statusFacial.className = 'badge badge-info';
    statusFacial.innerHTML = `<i data-lucide="refresh-cw"></i> Tente novamente`;
    if (window.lucide) window.lucide.createIcons();
  }
}

// Ativa a tela de contingência (Leitura de Crachá / QR Code)
function ativarContingencia() {
  secaoFacial.style.display = 'none';
  secaoContingencia.style.display = 'block';

  if (!html5QrScanner && window.Html5QrcodeScanner) {
    html5QrScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 });
    html5QrScanner.render(onScanSucesso);
  }
}

async function onScanSucesso(decodedText) {
  if (html5QrScanner) html5QrScanner.clear();
  await processarCracha(decodedText);
}

async function executarValidacaoCracha(e) {
  e.preventDefault();
  const codigo = inputCracha.value.trim();
  if (codigo) {
    await processarCracha(codigo);
  }
}

async function processarCracha(codigo) {
  try {
    const funcionario = await getFuncionarioPorCracha(codigo);
    if (!funcionario) {
      exibirMensagem(`Crachá / Código "${codigo}" não cadastrado ou inativo.`, 'danger');
      return;
    }
    await concluirRegistro(funcionario, 'CRACHA_BARCODE');
  } catch (err) {
    console.error('Erro ao validar crachá:', err);
    exibirMensagem('Erro de conexão ao validar crachá.', 'danger');
  }
}

// Conclui o registro no banco e gera o comprovante
async function concluirRegistro(funcionario, metodo) {
  try {
    const reg = await registrarPonto({
      funcionarioId: funcionario.id,
      tipo: tipoRegistroSelecionado,
      metodo
    });

    exibirMensagem(`Ponto registrado! (${tipoRegistroSelecionado}) - Colaborador: ${funcionario.nome} [Matrícula: ${funcionario.matricula}]`, 'success');

    gerarEImprimirTicket({
      dataHora: new Date(reg.data_hora).toLocaleString('pt-BR'),
      nome: funcionario.nome,
      matricula: funcionario.matricula,
      tipo: tipoRegistroSelecionado,
      metodo,
      id: reg.id
    });

  } catch (err) {
    console.error('Erro ao gravar registro:', err);
    exibirMensagem('Erro ao salvar registro de ponto no Supabase.', 'danger');
  }
}

function gerarEImprimirTicket(dados) {
  document.getElementById('ticket-datahora').textContent = dados.dataHora;
  document.getElementById('ticket-nome').textContent = dados.nome;
  document.getElementById('ticket-matricula').textContent = dados.matricula;
  document.getElementById('ticket-tipo').textContent = dados.tipo;
  document.getElementById('ticket-metodo').textContent = dados.metodo;
  document.getElementById('ticket-id').textContent = dados.id;

  // Aciona a impressão nativa window.print() para o ticket 80mm
  setTimeout(() => {
    window.print();
  }, 500);
}

function exibirMensagem(texto, tipo) {
  msgResultado.style.display = 'block';
  msgResultado.className = `badge badge-${tipo}`;
  msgResultado.style.width = '100%';
  msgResultado.style.padding = '1rem';
  msgResultado.style.fontSize = '1rem';
  msgResultado.textContent = texto;
}
