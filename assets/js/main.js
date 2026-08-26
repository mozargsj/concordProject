document.getElementById("year").textContent = new Date().getFullYear();

const qrTrigger = document.getElementById("qr-trigger");
const qrLightbox = document.getElementById("qr-lightbox");

qrTrigger.addEventListener("click", () => {
  qrLightbox.hidden = false;
});

qrLightbox.addEventListener("click", () => {
  qrLightbox.hidden = true;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !qrLightbox.hidden) {
    qrLightbox.hidden = true;
  }
});

const downloadLink = document.querySelector(".hero__download");
const downloadModal = document.getElementById("download-modal");
const downloadModalClose = document.getElementById("download-modal-close");

downloadLink.addEventListener("click", () => {
  downloadModal.hidden = false;
});

downloadModalClose.addEventListener("click", () => {
  downloadModal.hidden = true;
});

downloadModal.addEventListener("click", (event) => {
  if (event.target === downloadModal) {
    downloadModal.hidden = true;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !downloadModal.hidden) {
    downloadModal.hidden = true;
  }
});

const form = document.getElementById("alpha-form");
const note = document.getElementById("alpha-note");
const ALPHA_FORM_ENDPOINT = "https://form.undersoft.tec.br/";

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = new FormData(form).get("email");
  if (!email) return;

  const button = form.querySelector("button");
  button.disabled = true;
  note.textContent = "Enviando...";

  try {
    const response = await fetch(ALPHA_FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) throw new Error("request failed");

    note.textContent = `Beleza — vamos avisar ${email} quando a alpha abrir.`;
    form.reset();
  } catch (err) {
    note.textContent = "Deu ruim ao enviar. Tenta de novo em instantes.";
  } finally {
    button.disabled = false;
  }
});
