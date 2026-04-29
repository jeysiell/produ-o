(() => {
  function ensureFeedbackHost() {
    let host = document.getElementById("feedbackHost");
    if (host) return host;

    host = document.createElement("div");
    host.id = "feedbackHost";
    host.className =
      "pointer-events-none fixed inset-x-0 top-4 z-[90] mx-auto flex w-full max-w-3xl flex-col items-end gap-2 px-4";
    document.body.appendChild(host);
    return host;
  }

  function guessNoticeType(message) {
    const text = String(message || "").toLowerCase();
    if (text.includes("erro") || text.includes("inval") || text.includes("falha")) return "error";
    if (text.includes("sucesso") || text.includes("aprovad") || text.includes("publicad")) return "success";
    if (text.includes("atenc") || text.includes("somente leitura") || text.includes("permissao")) return "warning";
    return "info";
  }

  function notice(message, options = {}) {
    const type = options.type || guessNoticeType(message);
    const durationMs = Number(options.durationMs || 4200);
    const host = ensureFeedbackHost();
    const item = document.createElement("div");
    const palettes = {
      info: "border-sky-300/70 bg-sky-900/90 text-sky-100",
      success: "border-emerald-300/70 bg-emerald-900/90 text-emerald-100",
      warning: "border-amber-300/70 bg-amber-900/90 text-amber-100",
      error: "border-rose-300/70 bg-rose-900/90 text-rose-100",
    };
    const palette = palettes[type] || palettes.info;
    item.className = `pointer-events-auto w-full max-w-xl rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${palette}`;
    item.innerHTML = `
      <div class="flex items-start gap-3">
        <i class="fas fa-circle-info mt-0.5 opacity-90"></i>
        <p class="flex-1 whitespace-pre-line">${String(message || "").trim() || "Atualizacao realizada."}</p>
      </div>
    `;
    host.appendChild(item);

    setTimeout(() => {
      item.classList.add("opacity-0", "translate-y-[-4px]", "transition", "duration-200");
      setTimeout(() => item.remove(), 220);
    }, durationMs);
  }

  function openDialog(options = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className =
        "fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm";

      const panel = document.createElement("div");
      panel.className =
        "w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl";

      const title = document.createElement("h3");
      title.className = "font-display text-xl font-bold";
      title.textContent = options.title || "SinalTech";
      panel.appendChild(title);

      const body = document.createElement("p");
      body.className = "mt-3 whitespace-pre-line text-sm text-slate-300";
      body.textContent = String(options.message || "");
      panel.appendChild(body);

      let input = null;
      if (options.withInput) {
        input = document.createElement("input");
        input.type = options.inputType || "text";
        input.placeholder = options.placeholder || "";
        input.className =
          "mt-4 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-600/40";
        panel.appendChild(input);
      }

      const actions = document.createElement("div");
      actions.className = "mt-6 flex justify-end gap-2";

      if (!options.hideCancel) {
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className =
          "rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700";
        cancelBtn.textContent = options.cancelText || "Cancelar";
        cancelBtn.addEventListener("click", () => {
          overlay.remove();
          resolve(null);
        });
        actions.appendChild(cancelBtn);
      }

      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = options.danger
        ? "rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
        : "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700";
      confirmBtn.textContent = options.confirmText || "OK";
      confirmBtn.addEventListener("click", () => {
        const value = input ? input.value : true;
        overlay.remove();
        resolve(value);
      });
      actions.appendChild(confirmBtn);

      panel.appendChild(actions);
      overlay.appendChild(panel);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          overlay.remove();
          resolve(null);
        }
      });

      document.body.appendChild(overlay);
      if (input) input.focus();
      else confirmBtn.focus();
    });
  }

  function alertMessage(message, options = {}) {
    const text = String(message || "");
    if (options.forceDialog || text.includes("\n") || text.length > 120) {
      openDialog({
        title: options.title || "SinalTech",
        message: text,
        confirmText: options.confirmText || "Entendi",
        hideCancel: true,
      });
      return;
    }
    notice(text, options);
  }

  async function confirmMessage(message, options = {}) {
    const result = await openDialog({
      title: options.title || "Confirmar acao",
      message,
      confirmText: options.confirmText || "Confirmar",
      cancelText: options.cancelText || "Cancelar",
      danger: options.danger === true,
    });
    return result === true;
  }

  async function promptMessage(message, options = {}) {
    const value = await openDialog({
      title: options.title || "Informe um valor",
      message,
      withInput: true,
      inputType: options.inputType || "text",
      placeholder: options.placeholder || "",
      confirmText: options.confirmText || "Salvar",
      cancelText: options.cancelText || "Cancelar",
      danger: options.danger === true,
    });
    if (value === null) return null;
    return String(value || "").trim();
  }

  window.feedbackUI = {
    notice,
    alert: alertMessage,
    confirm: confirmMessage,
    prompt: promptMessage,
  };
})();
