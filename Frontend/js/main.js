(() => {
  const toast = (message) => {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => el.classList.remove("show"), 3200);
  };
  window.showToast = toast;

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-demo]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        toast(button.dataset.demo || "This is a frontend demo. Connect the backend to enable this action.");
      });
    });

    document.querySelectorAll("form[data-demo-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const message = form.dataset.success || "Form validated in the frontend demo. No data has been saved.";
        toast(message);
        if (form.dataset.reset === "true") form.reset();
      });
    });

    document.querySelectorAll("[data-current-year]").forEach((el) => {
      el.textContent = new Date().getFullYear();
    });

    const currentPage = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a").forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (href.endsWith(currentPage)) link.classList.add("active");
    });
  });
})();
