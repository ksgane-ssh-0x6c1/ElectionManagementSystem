
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("delete-account-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const confirmed = window.confirm(
      "This is a demo. No account will actually be deleted. Continue?"
    );

    if (!confirmed) return;

    if (window.showToast) {
      window.showToast(
        "Deletion request form validated. Connect the backend to process a real request."
      );
    } else {
      alert("Demo only. No account was deleted.");
    }

    form.reset();
  });
});
