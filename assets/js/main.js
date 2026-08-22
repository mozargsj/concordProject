document.getElementById("year").textContent = new Date().getFullYear();

const form = document.getElementById("alpha-form");
const note = document.getElementById("alpha-note");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = new FormData(form).get("email");
  if (!email) return;

  note.textContent = `Beleza — vamos avisar ${email} quando a alpha abrir.`;
  form.reset();
});
