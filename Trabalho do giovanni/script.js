
"use strict";

const STORAGE_KEY = "industrialPro_registos_v1";

const $ = (id) => document.getElementById(id);

function dataLocal() {
const agora = new Date();
const ano = agora.getFullYear();
const mes = String(agora.getMonth() + 1).padStart(2, "0");
const dia = String(agora.getDate()).padStart(2, "0");

return `${ano}-${mes}-${dia}`;
}

function lerRegistos() {
try {
    const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(dados) ? dados : [];
} catch {
    return [];
}
}

let registos = lerRegistos();

function guardarRegistos() {
try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registos));
    return true;
} catch {
    mostrarAviso(
    "Não foi possível guardar. Verifica o espaço disponível no navegador."
    );
    return false;
}
}

function gerarId() {
return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatarNumero(valor) {
return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 1
}).format(valor);
}

function formatarPercentagem(valor) {
return `${formatarNumero(valor)}%`;
}

function escaparHTML(valor) {
return String(valor).replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
})[caractere]);
}

function mostrarAviso(mensagem) {
const toast = $("toast");
toast.textContent = mensagem;
toast.classList.add("show");

clearTimeout(mostrarAviso.timer);
mostrarAviso.timer = setTimeout(() => {
    toast.classList.remove("show");
}, 3000);
}

function registosDaData(data) {
return registos.filter((registo) => registo.data === data);
}

function atualizarPainel() {
const data = $("filtroData").value;
const doDia = registosDaData(data);

const producoes = doDia.filter((r) => r.tipo === "producao");
const paragens = doDia.filter((r) => r.tipo === "paragem");

const totalProduzido = producoes.reduce(
    (soma, r) => soma + r.produzidas, 0
);

const totalRejeitadas = producoes.reduce(
    (soma, r) => soma + r.rejeitadas, 0
);

const metaTotal = producoes.reduce(
    (soma, r) => soma + r.meta, 0
);

const tempoPlaneado = producoes.reduce(
    (soma, r) => soma + r.tempoPlaneado, 0
);

const totalParagens = paragens.reduce(
    (soma, r) => soma + r.duracao, 0
);

  // A eficiência abaixo mede a disponibilidade temporal,
  // não a eficiência global OEE.
const tempoProdutivo = Math.max(0, tempoPlaneado - totalParagens);

const eficiencia = tempoPlaneado > 0
    ? (tempoProdutivo / tempoPlaneado) * 100
    : 0;

const cumprimentoMeta = metaTotal > 0
    ? (totalProduzido / metaTotal) * 100
    : 0;

const taxaRejeicao = totalProduzido > 0
    ? (totalRejeitadas / totalProduzido) * 100
    : 0;

$("totalProduzido").textContent = formatarNumero(totalProduzido);
$("cumprimentoMeta").textContent = formatarPercentagem(cumprimentoMeta);
$("barraMeta").style.width = `${Math.min(cumprimentoMeta, 100)}%`;

$("eficiencia").textContent = formatarPercentagem(eficiencia);
$("barraEficiencia").style.width = `${Math.min(eficiencia, 100)}%`;
$("tempoProdutivo").textContent = `${formatarNumero(tempoProdutivo)} min`;

$("totalRejeitadas").textContent = formatarNumero(totalRejeitadas);
$("taxaRejeicao").textContent = formatarPercentagem(taxaRejeicao);

$("totalParagens").innerHTML =
    `${formatarNumero(totalParagens)} <small>min</small>`;
$("numeroParagens").textContent = formatarNumero(paragens.length);

atualizarHistorico(doDia);
}

function atualizarHistorico(doDia) {
const tabela = $("tabelaHistorico");

if (doDia.length === 0) {
    tabela.innerHTML = `
    <tr>
        <td colspan="5" class="empty-state">
        Ainda não existem registos para esta data.
        </td>
    </tr>
    `;
    return;
}

const ordenados = [...doDia].reverse();

tabela.innerHTML = ordenados.map((r) => {
    const producao = r.tipo === "producao";

    const tipo = producao
    ? '<span class="type-tag tag-production">PRODUÇÃO</span>'
    : '<span class="type-tag tag-stop">PARAGEM</span>';

    const detalhe = producao
    ? `Meta: ${formatarNumero(r.meta)} peças`
    : `${escaparHTML(r.maquina)} — ${escaparHTML(r.motivo)}`;

    const quantidade = producao
    ? `${formatarNumero(r.produzidas)} produzidas / ${formatarNumero(r.rejeitadas)} rejeitadas`
    : `${formatarNumero(r.duracao)} min`;

    return `
    <tr>
        <td>${tipo}</td>
        <td>${detalhe}</td>
        <td>${quantidade}</td>
        <td>${escaparHTML(r.data)}</td>
        <td>
        <button
            class="delete-btn"
            type="button"
            data-id="${escaparHTML(r.id)}"
            aria-label="Eliminar registo"
        >Eliminar</button>
        </td>
    </tr>
    `;
}).join("");
}

$("formProducao").addEventListener("submit", (evento) => {
evento.preventDefault();

const data = $("dataProducao").value;
const meta = Number($("meta").value);
const produzidas = Number($("produzidas").value);
const rejeitadas = Number($("rejeitadas").value);
const tempoPlaneado = Number($("tempoPlaneado").value);

if (
    !data ||
    !Number.isSafeInteger(meta) ||
    meta <= 0 ||
    !Number.isSafeInteger(produzidas) ||
    produzidas < 0 ||
    !Number.isSafeInteger(rejeitadas) ||
    rejeitadas < 0 ||
    rejeitadas > produzidas ||
    !Number.isSafeInteger(tempoPlaneado) ||
    tempoPlaneado <= 0
) {
    mostrarAviso(
"Verifica os valores. As rejeitadas não podem superar as produzidas."
    );
    return;
}

registos.push({
    id: gerarId(),
    tipo: "producao",
    data,
    meta,
    produzidas,
    rejeitadas,
    tempoPlaneado
});

if (!guardarRegistos()) {
    registos.pop();
    return;
}

$("filtroData").value = data;
$("formProducao").reset();
$("dataProducao").value = dataLocal();
$("rejeitadas").value = "0";
$("tempoPlaneado").value = "480";

atualizarPainel();
mostrarAviso("Registo de produção guardado com sucesso.");
});

$("formParagem").addEventListener("submit", (evento) => {
evento.preventDefault();

const data = $("dataParagem").value;
const maquina = $("maquina").value.trim();
const duracao = Number($("duracao").value);
const motivo = $("motivo").value;

if (
    !data ||
    !maquina ||
    !motivo ||
    !Number.isSafeInteger(duracao) ||
    duracao <= 0
) {
    mostrarAviso("Preenche os campos da paragem corretamente.");
    return;
}

registos.push({
    id: gerarId(),
    tipo: "paragem",
    data,
    maquina,
    duracao,
    motivo
});

if (!guardarRegistos()) {
    registos.pop();
    return;
}

$("filtroData").value = data;
$("formParagem").reset();
$("dataParagem").value = dataLocal();

atualizarPainel();
mostrarAviso("Paragem registada com sucesso.");
});

$("tabelaHistorico").addEventListener("click", (evento) => {
const botao = evento.target.closest("[data-id]");

if (!botao) return;

const id = botao.dataset.id;

if (!confirm("Tens a certeza de que queres eliminar este registo?")) {
    return;
}

const anteriores = registos;
registos = registos.filter((r) => r.id !== id);

if (!guardarRegistos()) {
    registos = anteriores;
    return;
}

atualizarPainel();
mostrarAviso("Registo eliminado.");
});

$("filtroData").addEventListener("change", atualizarPainel);

$("hojeBtn").addEventListener("click", () => {
$("filtroData").value = dataLocal();
atualizarPainel();
});

function exportarCSV() {
const data = $("filtroData").value;
const doDia = registosDaData(data);

if (doDia.length === 0) {
    mostrarAviso("Não existem registos para exportar nesta data.");
    return;
}

const colunas = [
    "Data",
    "Tipo",
    "Meta",
    "Produzidas",
    "Rejeitadas",
    "Tempo planeado (min)",
    "Máquina",
    "Motivo",
    "Duração (min)"
];

const linhas = doDia.map((r) => [
    r.data,
    r.tipo,
    r.meta ?? "",
    r.produzidas ?? "",
    r.rejeitadas ?? "",
    r.tempoPlaneado ?? "",
    r.maquina ?? "",
    r.motivo ?? "",
    r.duracao ?? ""
]);

function campoCSV(valor) {
    return `"${String(valor).replace(/"/g, '""')}"`;
}

const csv = "\uFEFF" + [colunas, ...linhas]
    .map((linha) => linha.map(campoCSV).join(";"))
    .join("\r\n");

const ficheiro = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
});

const url = URL.createObjectURL(ficheiro);
const link = document.createElement("a");

link.href = url;
link.download = `producao_${data}.csv`;
document.body.appendChild(link);
link.click();
link.remove();
URL.revokeObjectURL(url);

mostrarAviso("Ficheiro CSV exportado.");
}

$("exportarBtn").addEventListener("click", exportarCSV);

// Inicialização do painel
const hoje = dataLocal();

$("filtroData").value = hoje;
$("dataProducao").value = hoje;
$("dataParagem").value = hoje;

atualizarPainel();
