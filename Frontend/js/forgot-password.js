
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgot-password-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    if (window.showToast) {
      window.showToast(
        "Email validated. No reset email was sent because the backend is not connected."
      );
    } else {
      alert("Frontend validation passed. No reset email was sent.");
    }
  });
});
