// js/supabase.js - Cliente e utilitários do Supabase para BaterPonto3000

const SUPABASE_URL = 'https://njdspmedktdiaqusfsnv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ItAvbGW3BM0gSYQgCPaLSQ_y8e58wDT';

// Usar o objeto global 'supabase' carregado via vendor/supabase.js
const { createClient } = window.supabase || {};

if (!createClient) {
  console.error('Biblioteca do Supabase não carregada.');
}

// Inicializa cliente público seguro (utilizando apenas a chave anônima/pública)
export const supabaseClient = createClient ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/**
 * Busca todos os funcionários ativos.
 */
export async function getFuncionariosAtivos() {
  const { data, error } = await supabaseClient
    .from('funcionarios')
    .select('*')
    .eq('ativo', true);

  if (error) {
    console.error('Erro ao buscar funcionários:', error);
    throw error;
  }
  return data;
}

/**
 * Busca funcionário por crachá/código de barras.
 */
export async function getFuncionarioPorCracha(codigoCracha) {
  const { data, error } = await supabaseClient
    .from('funcionarios')
    .select('*')
    .eq('codigo_barras_cracha', codigoCracha)
    .eq('ativo', true)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar funcionário por crachá:', error);
    throw error;
  }
  return data;
}

/**
 * Registra a batida de ponto (Entrada ou Saída).
 */
export async function registrarPonto({ funcionarioId, tipo, metodo, alteradoManualmente = false, alteradoPorId = null, motivo = null }) {
  const payload = {
    funcionario_id: funcionarioId,
    data_hora: new Date().toISOString(),
    tipo,
    metodo,
    alterado_manualmente: alteradoManualmente,
    alterado_por_id: alteradoPorId,
    motivo_alteracao: motivo
  };

  const { data, error } = await supabaseClient
    .from('registros_ponto')
    .insert([payload])
    .select();

  if (error) {
    console.error('Erro ao registrar ponto:', error);
    throw error;
  }
  return data[0];
}

/**
 * Busca histórico do espelho de ponto.
 */
export async function getEspelhoPontoDiario(dataFiltro = null) {
  let query = supabaseClient
    .from('espelho_ponto_diario')
    .select('*, funcionarios(nome, matricula, cargo, saldo_banco_horas, status)')
    .order('data', { ascending: false });

  if (dataFiltro) {
    query = query.eq('data', dataFiltro);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar espelho de ponto:', error);
    throw error;
  }
  return data;
}

/**
 * Busca registros de ponto por data ou funcionário.
 */
export async function getRegistrosPonto(dataFiltro = null) {
  let query = supabaseClient
    .from('registros_ponto')
    .select('*, funcionarios(nome, matricula, cargo)')
    .order('data_hora', { ascending: false });

  if (dataFiltro) {
    const inicioDia = `${dataFiltro}T00:00:00.000Z`;
    const fimDia = `${dataFiltro}T23:59:59.999Z`;
    query = query.gte('data_hora', inicioDia).lte('data_hora', fimDia);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Erro ao buscar registros de ponto:', error);
    throw error;
  }
  return data;
}

/**
 * Cadastra ou atualiza um funcionário.
 */
export async function salvarFuncionario(funcionario) {
  const { data, error } = await supabaseClient
    .from('funcionarios')
    .upsert(funcionario)
    .select();

  if (error) {
    console.error('Erro ao salvar funcionário:', error);
    throw error;
  }
  return data[0];
}
