// js/admin_app.js - Lógica do Painel do Gestor e Auditoria

import {
  getEspelhoPontoDiario,
  getFuncionariosAtivos,
  registrarPonto
} from './supabase.js';

import { minutesToHHMM } from './calc.js';

let funcionarios = [];
let espelhoData = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) window.lucide.createIcons();

  const inputFiltroData = document.getElementById('filtro-data');
  const btnFiltrar = document.getElementById('btn-filtrar');
  const modalAjuste = document.getElementById('modal-ajuste-manual');
  const btnFecharModal = document.getElementById('btn-fechar-modal');
  const btnCancelarAjuste = document.getElementById('btn-cancelar-ajuste');
  const formAjusteManual = document.getElementById('form-ajuste-manual');

  // Define data atual no filtro por padrão
  const hoje = new Date().toISOString().split('T')[0];
  inputFiltroData.value = hoje;

  await carregarDados(hoje);

  btnFiltrar.addEventListener('click', () => {
    carregarDados(inputFiltroData.value);
  });

  btnFecharModal.addEventListener('click', () => modalAjuste.close());
  btnCancelarAjuste.addEventListener('click', () => modalAjuste.close());
  formAjusteManual.addEventListener('submit', salvarAjusteManual);
});

async function carregarDados(dataFiltro) {
  try {
    funcionarios = await getFuncionariosAtivos();
    espelhoData = await getEspelhoPontoDiario(dataFiltro);

    popularGestoresNoModal();
    renderizarEspelhoTabela(espelhoData);
    verificarAlertasCriticos(espelhoData, funcionarios);
  } catch (err) {
    console.error('Erro ao carregar dados do admin:', err);
  }
}

function popularGestoresNoModal() {
  const selectGestor = document.getElementById('ajuste-gestor');
  selectGestor.innerHTML = '<option value="">Selecione o Gestor...</option>';

  funcionarios.forEach(f => {
    const option = document.createElement('option');
    option.value = f.id;
    option.textContent = `${f.nome} (${f.cargo || 'Gestor'})`;
    selectGestor.appendChild(option);
  });
}

function renderizarEspelhoTabela(dados) {
  const tbody = document.getElementById('tbody-espelho');
  tbody.innerHTML = '';

  if (!dados || dados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center;">Nenhum registro de ponto encontrado para a data informada.</td></tr>`;
    return;
  }

  dados.forEach(row => {
    const func = row.funcionarios || {};
    const tr = document.createElement('tr');

    const saldoHoras = func.saldo_banco_horas !== undefined ? Number(func.saldo_banco_horas).toFixed(2) : '0.00';
    const isAlertaCritico = func.status === 'ALERTA_JUSTA_CAUSA' || Number(saldoHoras) <= -20.00;

    let badgeStatus = `<span class="badge badge-success">NORMAL</span>`;
    if (isAlertaCritico) {
      badgeStatus = `<span class="badge badge-justa-causa"><i data-lucide="alert-triangle"></i> ALERTA_JUSTA_CAUSA</span>`;
    } else if (row.status === 'ATRASO') {
      badgeStatus = `<span class="badge badge-warning">ATRASO</span>`;
    } else if (row.status === 'FALTA') {
      badgeStatus = `<span class="badge badge-danger">FALTA</span>`;
    }

    const entradaFmt = row.primeira_entrada ? new Date(row.primeira_entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const saidaFmt = row.ultima_saida ? new Date(row.ultima_saida).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

    tr.innerHTML = `
      <td><strong>${func.nome || 'N/A'}</strong></td>
      <td>${func.matricula || '-'} <br><small>${func.cargo || 'Colaborador'}</small></td>
      <td>${row.data}</td>
      <td>${entradaFmt}</td>
      <td>${saidaFmt}</td>
      <td>${minutesToHHMM(row.minutos_atraso || 0)}</td>
      <td><strong style="color: ${Number(saldoHoras) < 0 ? '#dc2626' : '#16a34a'}">${saldoHoras} h</strong></td>
      <td>${badgeStatus}</td>
      <td>
        <button class="outline secondary btn-ajustar" data-func-id="${row.funcionario_id}" data-func-nome="${func.nome}" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;">
          <i data-lucide="edit"></i> Ajustar
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  if (window.lucide) window.lucide.createIcons();

  // Event listeners para botões de ajuste
  document.querySelectorAll('.btn-ajustar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget;
      abrirModalAjuste(target.dataset.funcId, target.dataset.funcNome);
    });
  });
}

function abrirModalAjuste(funcId, funcNome) {
  document.getElementById('ajuste-funcionario-id').value = funcId;
  document.getElementById('ajuste-nome-func').textContent = funcNome;
  document.getElementById('ajuste-motivo').value = '';
  document.getElementById('modal-ajuste-manual').showModal();
}

async function salvarAjusteManual(e) {
  e.preventDefault();

  const funcionarioId = document.getElementById('ajuste-funcionario-id').value;
  const tipo = document.getElementById('ajuste-tipo').value;
  const alteradoPorId = document.getElementById('ajuste-gestor').value;
  const motivo = document.getElementById('ajuste-motivo').value.trim();

  if (!alteradoPorId) {
    alert('Selecione o Superior Direto responsável pelo ajuste.');
    return;
  }

  if (!motivo) {
    alert('Informe a justificativa obrigatória para a trilha de auditoria.');
    return;
  }

  try {
    await registrarPonto({
      funcionarioId,
      tipo,
      metodo: 'BIOMETRIA_DIGITAL',
      alteradoManualmente: true,
      alteradoPorId,
      motivo
    });

    alert('Ajuste de ponto gravado com sucesso e registrado no Audit Trail!');
    document.getElementById('modal-ajuste-manual').close();

    const dataFiltro = document.getElementById('filtro-data').value;
    await carregarDados(dataFiltro);
  } catch (err) {
    console.error('Erro ao gravar ajuste manual:', err);
    alert('Erro ao gravar ajuste manual.');
  }
}

function verificarAlertasCriticos(espelho, funcs) {
  const painelAlertas = document.getElementById('painel-alertas');
  const textoAlerta = document.getElementById('texto-alerta');

  const comAlerta = funcs.filter(f => f.status === 'ALERTA_JUSTA_CAUSA' || Number(f.saldo_banco_horas) <= -20.00);

  if (comAlerta.length > 0) {
    painelAlertas.style.display = 'block';
    const nomes = comAlerta.map(f => `${f.nome} (Saldo: ${Number(f.saldo_banco_horas).toFixed(2)}h)`).join(', ');
    textoAlerta.innerHTML = `Notificação enviada ao Gestor/RH. Colaborador(es) em estado de ALERTA_JUSTA_CAUSA: <strong>${nomes}</strong>`;
  } else {
    painelAlertas.style.display = 'none';
  }
}
