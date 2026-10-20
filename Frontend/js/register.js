
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  if (!form) return;

  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");

  function checkPasswords() {
    confirmPassword.setCustomValidity(
      password.value === confirmPassword.value
        ? ""
        : "Passwords do not match."
    );
  }

  password.addEventListener("input", checkPasswords);
  confirmPassword.addEventListener("input", checkPasswords);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    checkPasswords();

    if (!form.reportValidity()) return;

    if (window.showToast) {
      window.showToast(
        "Registration form validated. No account was created because the backend is not connected."
      );
    } else {
      alert("Frontend validation passed. No account was created.");
    }
  });
});
