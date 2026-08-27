document.getElementById("year").textContent = new Date().getFullYear();

// Mesmo servidor STUN que o Concord usa de verdade (webrtcMesh.ts) — o teste só tem valor
// preditivo se usar exatamente o mesmo caminho que o app vai usar.
const STUN_SERVER = "stun:stun.l.google.com:19302";
const GATHER_TIMEOUT_MS = 10000;

const runButton = document.getElementById("run-test");
const statusEl = document.getElementById("test-status");
const resultEl = document.getElementById("test-result");
const bannerEl = document.getElementById("result-banner");
const detailEl = document.getElementById("result-detail");
const detailsEl = document.getElementById("test-details");
const rowsEl = document.getElementById("candidate-rows");

function parseCandidate(candidateString) {
  // Formato padrão: "candidate:<foundation> <component> <protocol> <priority> <address> <port> typ <type> ..."
  const parts = candidateString.split(" ");
  const typeIndex = parts.indexOf("typ");
  return {
    type: typeIndex !== -1 ? parts[typeIndex + 1] : "?",
    protocol: parts[2] || "?",
    address: parts[4] || "?"
  };
}

function addRow(candidate) {
  const row = document.createElement("tr");
  const typeCell = document.createElement("td");
  typeCell.textContent = candidate.type;
  const protoCell = document.createElement("td");
  protoCell.textContent = candidate.protocol;
  const addrCell = document.createElement("td");
  addrCell.textContent = candidate.address;
  row.append(typeCell, protoCell, addrCell);
  rowsEl.appendChild(row);
}

function showResult(hasReflexiveOrRelay, errorTexts) {
  resultEl.hidden = false;
  detailsEl.hidden = false;

  if (hasReflexiveOrRelay) {
    bannerEl.className = "result-banner result-banner--good";
    bannerEl.textContent = "Sua rede parece pronta para o Concord.";
    detailEl.textContent = "Encontramos um endereço público (srflx) — sua rede consegue fazer conexão direta.";
  } else {
    bannerEl.className = "result-banner result-banner--bad";
    bannerEl.textContent = "Sua rede pode ter dificuldade para conectar.";
    detailEl.textContent = errorTexts.length
      ? "Motivo reportado pelo navegador: " + errorTexts.join("; ") + ". Isso costuma ser roteador/firewall bloqueando esse tipo de conexão, não algo quebrado no seu computador."
      : "Só apareceu o endereço da sua rede local (host) — nenhum endereço público foi encontrado a tempo. Isso costuma ser roteador/firewall bloqueando esse tipo de conexão.";
  }
}

async function runTest() {
  runButton.disabled = true;
  statusEl.textContent = "Testando...";
  resultEl.hidden = true;
  detailsEl.hidden = true;
  rowsEl.innerHTML = "";

  const pc = new RTCPeerConnection({ iceServers: [{ urls: STUN_SERVER }] });
  const foundTypes = new Set();
  const errorTexts = [];
  let settled = false;

  function finish() {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutHandle);
    pc.close();
    runButton.disabled = false;
    statusEl.textContent = "Teste concluído.";
    showResult(foundTypes.has("srflx") || foundTypes.has("relay"), errorTexts);
  }

  pc.onicecandidate = (event) => {
    if (!event.candidate) {
      finish();
      return;
    }
    const parsed = parseCandidate(event.candidate.candidate);
    foundTypes.add(parsed.type);
    addRow(parsed);
  };

  pc.onicegatheringstatechange = () => {
    if (pc.iceGatheringState === "complete") finish();
  };

  pc.onicecandidateerror = (event) => {
    if (event.errorText) errorTexts.push(event.errorText);
  };

  // Sem isso o navegador não tem nada pra negociar e nunca começa a coletar candidato nenhum —
  // um canal de dados vazio é suficiente, o conteúdo nunca importa aqui.
  pc.createDataChannel("teste");

  const timeoutHandle = setTimeout(finish, GATHER_TIMEOUT_MS);

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
  } catch {
    finish();
  }
}

runButton.addEventListener("click", () => void runTest());
