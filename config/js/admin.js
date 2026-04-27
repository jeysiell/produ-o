const API_URL = "https://sinal.onrender.com/api/schedule";

// ======== Nomes amigáveis das músicas ========
const musicLabels = {
  "musica1.mp3": "Tu me Sondas",
  "musica2.mp3": "Eu Amo a Minha Escola",
  "musica3.mp3": "My Lighthouse",
  "musica4.mp3": "Amor Teimoso",
  "musica5.mp3": "Minha vida e uma viagem",
  "musica6.mp3": "A Biblia"

};

let modal;
let modalContent;

// ================= RELÓGIO =================
function updateClock() {
  const clock = document.getElementById("currentTime");
  if (!clock) return;

  const now = new Date();
  clock.textContent = now.toLocaleTimeString("pt-BR");
}

// ================= CARREGAR HORÁRIOS =================
async function loadSchedule() {
  const tbody = document.getElementById("scheduleTable");
  const filter = document.getElementById("filterPeriod")?.value || "all";

  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-6 text-gray-500">
        Carregando...
      </td>
    </tr>
  `;

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error();

    const data = await res.json();

    const periods = {
      morning: "Manhã",
      afternoon: "Tarde",
      afternoonFriday: "Tarde de Sexta",
    };

    tbody.innerHTML = "";
    let hasData = false;

    Object.entries(periods).forEach(([key, label]) => {

      if (filter !== "all" && filter !== key) return;

      const list = Array.isArray(data[key]) ? data[key] : [];

      list.sort((a, b) => a.time.localeCompare(b.time));

      list.forEach((s) => {
        hasData = true;

        const tr = document.createElement("tr");

        tr.innerHTML = `
          <td class="py-3 px-4">${label}</td>
          <td class="py-3 px-4">${s.time}</td>
          <td class="py-3 px-4">${s.name}</td>
          <td class="py-3 px-4">${musicLabels[s.music] || s.music}</td>
          <td class="py-3 px-4">${s.duration || 8}s</td>
          <td class="py-3 px-4 text-center">
            <button class="text-red-600 hover:text-red-800 transition">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `;

        tr.querySelector("button").onclick = (e) => {
          e.stopPropagation();
          deleteSignal(key, s.time);
        };

        tr.onclick = () => openEditModal(key, s);

        tbody.appendChild(tr);
      });
    });

    if (!hasData) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-6 text-gray-400">
            Nenhum horário cadastrado
          </td>
        </tr>
      `;
    }

  } catch {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-red-600 py-6">
          Erro ao carregar horários
        </td>
      </tr>
    `;
  }
}

// ================= ABRIR MODAL =================
function openEditModal(period, signal) {
  document.getElementById("editMode").value = "true";
  document.getElementById("editPeriod").value = period;
  document.getElementById("editTimeOriginal").value = signal.time;

  document.getElementById("modalTitle").innerHTML =
    `<i class="fas fa-pen text-blue-600"></i> Editar Horário`;

  document.getElementById("periodSelect").value = period;
  document.getElementById("timeInput").value = signal.time;
  document.getElementById("nameInput").value = signal.name;
  document.getElementById("musicSelect").value = signal.music;
  document.getElementById("durationSelect").value = signal.duration;

  modal.classList.remove("hidden");
  setTimeout(() =>
    modalContent.classList.remove("scale-95", "opacity-0"), 50);
}

// ================= DELETAR =================
async function deleteSignal(period, time) {
  if (!confirm(`Remover o sinal das ${time}?`)) return;

  try {
    const res = await fetch(`${API_URL}/${period}/${time}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error();

    loadSchedule();
  } catch {
    alert("Erro ao remover.");
  }
}

// ================= SALVAR =================
async function saveSchedule(e) {
  e.preventDefault();

  const isEdit = document.getElementById("editMode").value === "true";
  const period = document.getElementById("periodSelect").value;
  const time = document.getElementById("timeInput").value;
  const name = document.getElementById("nameInput").value;
  const music = document.getElementById("musicSelect").value;
  const duration = parseInt(document.getElementById("durationSelect").value);

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error();

    const data = await res.json();

    if (isEdit) {
      const editPeriod = document.getElementById("editPeriod").value;
      const editTimeOriginal = document.getElementById("editTimeOriginal").value;

      data[editPeriod] = (data[editPeriod] || []).filter(
        (s) => s.time !== editTimeOriginal
      );
    }

    data[period] = data[period] || [];

    const exists = data[period].some((s) => s.time === time);
    if (exists) {
      alert("Já existe um sinal nesse horário.");
      return;
    }

    data[period].push({ time, name, music, duration });

    Object.keys(data).forEach((p) => {
      data[p].sort((a, b) => a.time.localeCompare(b.time));
    });

    await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    closeModal();
    loadSchedule();

  } catch {
    alert("Erro ao salvar.");
  }
}

// ================= FECHAR MODAL =================
function closeModal() {
  modalContent.classList.add("scale-95", "opacity-0");
  setTimeout(() => modal.classList.add("hidden"), 200);
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {

  modal = document.getElementById("configModal");
  modalContent = document.getElementById("modalContent");

  updateClock();
  setInterval(updateClock, 1000);

  document.getElementById("filterPeriod")
    ?.addEventListener("change", loadSchedule);

  document.getElementById("configBtn")
    ?.addEventListener("click", () => {
      document.getElementById("editMode").value = "false";
      document.getElementById("modalTitle").innerHTML =
        `<i class="fas fa-plus text-blue-600"></i> Novo Horário`;

      document.getElementById("scheduleForm").reset();

      modal.classList.remove("hidden");
      setTimeout(() =>
        modalContent.classList.remove("scale-95", "opacity-0"), 50);
    });

  document.getElementById("cancelConfigBtn")
    ?.addEventListener("click", closeModal);

  document.getElementById("scheduleForm")
    ?.addEventListener("submit", saveSchedule);

  loadSchedule();
});