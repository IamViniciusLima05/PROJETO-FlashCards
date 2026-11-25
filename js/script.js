/* FlashCards — baralhos, estudo com cartão que vira e revisão espaçada (sistema Leitner) */

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const banco = {
  ler(k, padrao) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; } catch { return padrao; } },
  salvar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage */ } }
};
const iso = (d = new Date()) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const somarDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

/* Caixa 1 revisa todo dia; caixa 5 a cada 16 dias */
const INTERVALOS = [0, 1, 3, 7, 16];
const NIVEIS = [['Novo', '#e11d48'], ['Aprendendo', '#f97316'], ['Revisando', '#eab308'], ['Firme', '#22c55e'], ['Dominado', '#2563eb']];
const CORES = ['#2563eb', '#e11d48', '#16a34a', '#9333ea', '#f97316', '#0891b2'];

function embaralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const carta = (f, v, caixa = 1, proxima = iso()) => ({ id: Math.random().toString(36).slice(2, 10), f, v, caixa, proxima, acertos: 0, erros: 0, errouUltima: false });
function exemplos() {
  return [
    { id: 'ingles', nome: 'Inglês básico', desc: 'Palavras do dia a dia', cor: '#2563eb', cartas: [
      carta('house', 'casa', 3, somarDias(2)), carta('window', 'janela'), carta('to borrow', 'pegar emprestado'), carta('kitchen', 'cozinha', 2, somarDias(1)),
      carta('meanwhile', 'enquanto isso'), carta('to remind', 'lembrar alguém de algo'), carta('though', 'embora'), carta('tired', 'cansado', 5, somarDias(10)),
      carta('to achieve', 'conquistar, alcançar'), carta('rather', 'em vez de; preferencialmente')] },
    { id: 'js', nome: 'JavaScript', desc: 'Conceitos para entrevistas', cor: '#eab308', cartas: [
      carta('O que faz o operador === ?', 'Compara valor e tipo, sem conversão automática.'), carta('Diferença entre let e const', 'const não pode ser reatribuída; as duas têm escopo de bloco.'),
      carta('O que é uma Promise?', 'Um objeto que representa um valor que pode estar disponível agora, no futuro ou nunca.'), carta('Para que serve Array.map()?', 'Cria um novo array aplicando uma função a cada item.'),
      carta('O que é closure?', 'Uma função que lembra as variáveis do escopo onde foi criada.'), carta('O que retorna typeof null?', '"object" (um erro histórico da linguagem).')] },
    { id: 'capitais', nome: 'Capitais do Brasil', desc: 'Estados e suas capitais', cor: '#16a34a', cartas: [
      carta('Rio Grande do Sul', 'Porto Alegre', 5, somarDias(12)), carta('Tocantins', 'Palmas'), carta('Roraima', 'Boa Vista'), carta('Amapá', 'Macapá'),
      carta('Sergipe', 'Aracaju'), carta('Mato Grosso', 'Cuiabá'), carta('Paraíba', 'João Pessoa'), carta('Rondônia', 'Porto Velho')] }
  ];
}
let baralhos = banco.ler('fc_baralhos', null) ?? exemplos();
let diasEstudo = banco.ler('fc_dias', []);
const salvar = () => banco.salvar('fc_baralhos', baralhos);
const devidas = (b) => b.cartas.filter((c) => c.proxima <= iso());
let atual = null; // baralho aberto

/* ---------- Navegação ---------- */
function mostrar(tela) {
  ['inicio', 'baralho', 'estudo', 'fim'].forEach((t) => { $(`#tela-${t}`).hidden = t !== tela; });
  scrollTo(0, 0);
}
function sequencia() {
  const s = new Set(diasEstudo); let n = 0; const d = new Date();
  if (!s.has(iso(d))) d.setDate(d.getDate() - 1);
  while (s.has(iso(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function atualizarOfensiva() {
  const seq = sequencia();
  $('#ofensiva').textContent = seq ? `🔥 ${seq} ${seq === 1 ? 'dia' : 'dias'} seguidos` : '🔥 0 dias';
}

function telaInicio() {
  atual = null;
  const total = baralhos.reduce((s, b) => s + devidas(b).length, 0);
  atualizarOfensiva();
  $('#hoje').innerHTML = total
    ? `<div><h2>${total} ${total === 1 ? 'cartão' : 'cartões'} para revisar hoje</h2><p>A revisão espaçada mostra cada cartão na hora certa para você não esquecer.</p></div>`
    : '<div><h2>Tudo revisado por hoje! ✨</h2><p>Volte amanhã ou estude um baralho inteiro quando quiser.</p></div>';
  $('#baralhos').innerHTML = baralhos.length ? baralhos.map((b) => {
    const dom = b.cartas.filter((c) => c.caixa === 5).length, d = devidas(b).length;
    return `<li><button class="baralho" data-abrir="${b.id}" style="--c:${b.cor}">
      ${d ? `<span class="baralho__devidos">${d} hoje</span>` : ''}
      <h3>${escapar(b.nome)}</h3><p>${escapar(b.desc || '')}</p>
      <div class="baralho__nums"><span><b>${b.cartas.length}</b> cartões</span><span><b>${dom}</b> dominados</span></div>
      <div class="dominio" title="Domínio do baralho"><i style="width:${b.cartas.length ? (b.cartas.reduce((s, c) => s + c.caixa - 1, 0) / (b.cartas.length * 4)) * 100 : 0}%"></i></div>
    </button></li>`;
  }).join('') : '<li class="vazio">Nenhum baralho. Crie o primeiro!</li>';
  mostrar('inicio');
}

function telaBaralho(id) {
  atual = baralhos.find((b) => b.id === id);
  if (!atual) { telaInicio(); return; }
  const b = atual;
  $('#b-nome').textContent = b.nome;
  $('#b-desc').textContent = b.desc || `${b.cartas.length} cartões`;
  $('#b-caixas').innerHTML = NIVEIS.map(([n, cor], i) => `<div class="caixa" style="--k:${cor}"><strong>${b.cartas.filter((c) => c.caixa === i + 1).length}</strong><span>${n}</span><i></i></div>`).join('');
  const d = devidas(b).length, e = b.cartas.filter((c) => c.errouUltima).length;
  $('#m-int').textContent = d ? `${d} para hoje` : 'nada pendente hoje';
  $('#m-tudo').textContent = `${b.cartas.length} cartões, embaralhados`;
  $('#m-erros').textContent = e ? `${e} ${e === 1 ? 'cartão' : 'cartões'}` : 'nenhum erro recente';
  $('[data-modo=inteligente]').disabled = !d;
  $('[data-modo=tudo]').disabled = !b.cartas.length;
  $('[data-modo=erros]').disabled = !e;
  $('#lista-cartas').innerHTML = b.cartas.length ? b.cartas.map((c) => {
    const [n, cor] = NIVEIS[c.caixa - 1];
    return `<li><span class="f">${escapar(c.f)}</span><span class="v">${escapar(c.v)}</span><span class="nivel" style="--k:${cor}">${n}</span><button class="x" data-del="${c.id}" aria-label="Excluir cartão">✕</button></li>`;
  }).join('') : '<li class="vazio">Este baralho ainda não tem cartões. Adicione acima.</li>';
  mostrar('baralho');
}

/* ---------- Estudo ---------- */
let sessao = null;
function estudar(modo, cartas = null) {
  const b = atual;
  let fila = cartas || (modo === 'inteligente' ? devidas(b) : modo === 'erros' ? b.cartas.filter((c) => c.errouUltima) : b.cartas);
  if (!fila.length) return;
  fila = embaralhar(fila);
  sessao = { fila, i: 0, total: fila.length, acertos: 0, erros: 0, errados: [], repetidas: new Set(), modo };
  mostrar('estudo');
  mostrarCarta();
}
function mostrarCarta() {
  const c = sessao.fila[sessao.i];
  const el = $('#carta');
  el.classList.remove('virada', 'sai-dir', 'sai-esq');
  $('#carta-frente').textContent = c.f;
  $('#carta-verso').textContent = c.v;
  $('#est-cont').textContent = `${Math.min(sessao.i + 1, sessao.fila.length)}/${sessao.fila.length}`;
  $('#est-barra').style.width = `${(sessao.i / sessao.fila.length) * 100}%`;
  $('#errei').disabled = $('#acertei').disabled = true;
  el.focus({ preventScroll: true });
}
function virar() {
  if (!sessao) return;
  const el = $('#carta');
  el.classList.toggle('virada');
  if (el.classList.contains('virada')) $('#errei').disabled = $('#acertei').disabled = false;
}
function responder(acertou) {
  if (!sessao || $('#acertei').disabled) return;
  const c = sessao.fila[sessao.i];
  const primeira = !sessao.repetidas.has(c.id);
  if (primeira) {
    // só a primeira resposta do cartão conta para o placar e para a caixa
    if (acertou) { sessao.acertos++; c.acertos++; c.caixa = Math.min(5, c.caixa + 1); c.errouUltima = false; }
    else { sessao.erros++; c.erros++; c.caixa = 1; c.errouUltima = true; sessao.errados.push(c); }
    c.proxima = somarDias(INTERVALOS[c.caixa - 1]);
    salvar();
  }
  if (!acertou && primeira) {
    // o cartão errado volta mais para frente na mesma sessão
    sessao.repetidas.add(c.id);
    sessao.fila.splice(Math.min(sessao.fila.length, sessao.i + 3), 0, c);
  }
  $('#errei').disabled = $('#acertei').disabled = true;
  $('#carta').classList.add(acertou ? 'sai-dir' : 'sai-esq');
  setTimeout(() => {
    sessao.i++;
    if (sessao.i >= sessao.fila.length) terminar(); else mostrarCarta();
  }, 330);
}
function terminar() {
  if (!diasEstudo.includes(iso())) { diasEstudo.push(iso()); diasEstudo = diasEstudo.slice(-400); banco.salvar('fc_dias', diasEstudo); atualizarOfensiva(); }
  const t = sessao.acertos + sessao.erros, pct = t ? Math.round((sessao.acertos / t) * 100) : 0;
  $('#fim-acertos').textContent = sessao.acertos;
  $('#fim-erros').textContent = sessao.erros;
  $('#fim-pct').textContent = `${pct}%`;
  $('#fim-emoji').textContent = pct === 100 ? '🏆' : pct >= 70 ? '🎉' : pct >= 40 ? '💪' : '📚';
  $('#fim-titulo').textContent = pct === 100 ? 'Perfeito!' : pct >= 70 ? 'Mandou bem!' : 'Sessão concluída!';
  $('#fim-texto').textContent = sessao.erros ? 'Os cartões que você errou voltam para a revisão de amanhã.' : 'Seus cartões subiram de nível. Os próximos aparecem na hora certa.';
  $('#fim-revisar').hidden = !sessao.errados.length;
  mostrar('fim');
}
$('#carta').addEventListener('click', virar);
$('#acertei').addEventListener('click', () => responder(true));
$('#errei').addEventListener('click', () => responder(false));
$('#sair-estudo').addEventListener('click', () => { sessao = null; telaBaralho(atual.id); });
$('#fim-revisar').addEventListener('click', () => estudar('erros', sessao.errados));
document.addEventListener('keydown', (e) => {
  if ($('#tela-estudo').hidden || e.target.matches('input, textarea')) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); virar(); }
  if (e.key === '1' || e.key === 'ArrowLeft') responder(false);
  if (e.key === '2' || e.key === 'ArrowRight') responder(true);
  if (e.key === 'Escape') $('#sair-estudo').click();
});

/* ---------- Eventos das telas ---------- */
$('#ir-inicio').addEventListener('click', telaInicio);
$$('[data-voltar]').forEach((b) => b.addEventListener('click', telaInicio));
$$('[data-voltar-baralho]').forEach((b) => b.addEventListener('click', () => telaBaralho(atual.id)));
$('#baralhos').addEventListener('click', (e) => { const b = e.target.closest('[data-abrir]'); if (b) telaBaralho(b.dataset.abrir); });
$$('[data-modo]').forEach((b) => b.addEventListener('click', () => estudar(b.dataset.modo)));

$('#form-carta').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = $('#c-frente').value.trim(), v = $('#c-verso').value.trim();
  if (!f || !v) return;
  atual.cartas.unshift(carta(f, v));
  salvar(); $('#c-frente').value = ''; $('#c-verso').value = '';
  telaBaralho(atual.id); $('#c-frente').focus();
});
$('#lista-cartas').addEventListener('click', (e) => {
  const x = e.target.closest('[data-del]');
  if (!x) return;
  if (!x.classList.contains('confirmar')) { x.classList.add('confirmar'); x.textContent = 'Excluir?'; setTimeout(() => { if (x.isConnected) { x.classList.remove('confirmar'); x.textContent = '✕'; } }, 3000); return; }
  atual.cartas = atual.cartas.filter((c) => c.id !== x.dataset.del);
  salvar(); telaBaralho(atual.id);
});

/* Importar vários cartões colados */
$('#b-importar').addEventListener('click', () => { $('#di-texto').value = ''; $('#dlg-importar').showModal(); });
$('#dlg-importar').addEventListener('close', () => {
  if ($('#dlg-importar').returnValue !== 'importar') return;
  const novas = $('#di-texto').value.split('\n').map((l) => l.split(/\t|;/)).filter((p) => p.length >= 2 && p[0].trim() && p[1].trim())
    .map((p) => carta(p[0].trim().slice(0, 200), p.slice(1).join(';').trim().slice(0, 300)));
  atual.cartas.push(...novas); salvar(); telaBaralho(atual.id);
  toast(novas.length ? `${novas.length} cartões importados` : 'Nenhuma linha no formato frente ; verso');
});

/* Criar, renomear e excluir baralho */
let editandoBaralho = null;
$('#db-cores').innerHTML = CORES.map((c, i) => `<label><input type="radio" name="cor" value="${c}" ${i === 0 ? 'checked' : ''} aria-label="Cor ${i + 1}"><span style="--c:${c}"></span></label>`).join('');
function abrirBaralhoForm(b = null) {
  editandoBaralho = b;
  $('#db-titulo').textContent = b ? 'Editar baralho' : 'Novo baralho';
  $('#db-nome').value = b?.nome || ''; $('#db-desc').value = b?.desc || '';
  (document.querySelector(`[name=cor][value="${b?.cor || CORES[baralhos.length % CORES.length]}"]`) || document.querySelector('[name=cor]')).checked = true;
  $('#dlg-baralho').showModal();
}
$('#novo-baralho').addEventListener('click', () => abrirBaralhoForm());
$('#b-editar').addEventListener('click', () => abrirBaralhoForm(atual));
$('#dlg-baralho').addEventListener('close', () => {
  if ($('#dlg-baralho').returnValue !== 'salvar') return;
  const dados = { nome: $('#db-nome').value.trim(), desc: $('#db-desc').value.trim(), cor: document.querySelector('[name=cor]:checked').value };
  if (!dados.nome) return;
  if (editandoBaralho) { Object.assign(editandoBaralho, dados); salvar(); telaBaralho(editandoBaralho.id); }
  else { const b = { id: Date.now().toString(36), cartas: [], ...dados }; baralhos.push(b); salvar(); telaBaralho(b.id); $('#c-frente').focus(); }
});
let confirmaExcluir = false;
$('#b-excluir').addEventListener('click', (e) => {
  if (!confirmaExcluir) { confirmaExcluir = true; e.target.textContent = 'Confirmar'; e.target.classList.add('confirmar'); setTimeout(() => { confirmaExcluir = false; e.target.textContent = 'Excluir'; e.target.classList.remove('confirmar'); }, 3000); return; }
  confirmaExcluir = false; e.target.textContent = 'Excluir'; e.target.classList.remove('confirmar');
  baralhos = baralhos.filter((b) => b !== atual); salvar(); telaInicio(); toast('Baralho excluído');
});
$$('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

let timerToast;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(timerToast); timerToast = setTimeout(() => { t.hidden = true; }, 2600); }

telaInicio();
