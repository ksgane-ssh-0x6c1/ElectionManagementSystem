(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const roleSelect = document.querySelector("#login-role");
    const loginForm = document.querySelector("#login-form");
    if (!roleSelect || !loginForm) return;

    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!loginForm.reportValidity()) return;
      const role = roleSelect.value;
      const destinations = {
        Voter: "voter.html",
        Party: "party.html",
        Candidate: "candidate.html",
        BLO: "blo.html",
        "Election Officer": "election-officer.html"
      };
      if (window.showToast) window.showToast("Demo only: authentication is not connected yet.");
      // This intentionally does not authenticate or redirect. A real backend must verify credentials.
    });
  });
})();
