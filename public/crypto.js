let savedPaymentReference = null;
const tab1 = document.getElementById("tab1");
const tab2 = document.getElementById("tab2");
const btn1 = document.getElementById("tabBtn1");
const btn2 = document.getElementById("tabBtn2");
function switchTab(tabNumber) {
  if (tabNumber === 1) {
    tab1.classList.remove("hidden");
    tab2.classList.add("hidden");
    btn1.classList.add("active");
    btn2.classList.remove("active");
  } else if (!btn2.disabled) {
    tab1.classList.add("hidden");
    tab2.classList.remove("hidden");
    btn1.classList.remove("active");
    btn2.classList.add("active");
  }
}
function showError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.classList.add("error-show");
  clearTimeout(el.dataset.timeout);
  el.dataset.timeout = setTimeout(() => {
    el.classList.remove("error-show");
  }, 3000);
}
function hideError(id) {
  const el = document.getElementById(id);
  el.classList.remove("error-show");
}
function copyLink() {
  const input = document.getElementById("generatedLink");
  const msg = document.getElementById("copiedMsg");
  input.select();
  document.execCommand("copy");
  msg.style.display = "block";
  setTimeout(() => (msg.style.display = "none"), 2000);
}
async function sendEmail() {
  const emailButton = document.getElementById("emailSendBtn");
  const emailSuccess = document.getElementById("emailSentMsg");
  if (!savedPaymentReference) {
    showErrorDialog("Email Error", "Missing payment reference");
    return;
  }
  try {
    const res = await fetch("/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentReference: savedPaymentReference }),
    });
    const result = await res.json();
    if (res.ok && result.success) {
      emailButton.classList.add("hidden");
      emailSuccess.classList.remove("hidden");
    } else {
      showErrorDialog("Email Error", result.error || "Email send failed");
    }
  } catch (err) {
    console.error("Email API Error:", err);
    showErrorDialog("Email Error", "Unexpected error while sending email");
  }
}
function resetForm() {
  document.getElementById("paymentRequestForm").reset();
  document.getElementById("merchant").value = "kickstart";
  document.getElementById("currency").value = "AED";
  [
    "merchantError",
    "emailError",
    "refError",
    "amountError",
    "descError",
  ].forEach(hideError);
  document.getElementById("emailSendBtn").classList.remove("hidden");
  document.getElementById("emailSentMsg").classList.add("hidden");
  savedPaymentReference = null;
  switchTab(1);
}
function showErrorDialog(path, message) {
  const dialog = document.getElementById("errorDialog");
  const msg = `${path.replace(/_/g, " ")} ${message}`.trim();
  document.getElementById("errorMessage").textContent = msg;
  dialog.classList.remove("hidden");
}
function closeErrorDialog() {
  document.getElementById("errorDialog").classList.add("hidden");
}
document
  .getElementById("paymentRequestForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();
    let valid = true;
    const merchant = document.getElementById("merchant");
    const email = document.getElementById("payerEmail");
    const ref = document.getElementById("invoiceRef");
    const desc = document.getElementById("description");
    const payerName = document.getElementById("payerName").value;
    const amountInput = document.getElementById("amount");
    const currency = document.getElementById("currency").value;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const amount = parseFloat(amountInput.value);
    if (merchant.value === "") {
      showError("merchantError", "Please select a merchant");
      valid = false;
    } else hideError("merchantError");
    if (!email.value || !emailPattern.test(email.value)) {
      showError("emailError", "Enter a valid email address");
      valid = false;
    } else hideError("emailError");
    if (!desc.value.trim()) {
      showError("descError", "Description is required");
      valid = false;
    } else hideError("descError");
    if (!ref.value.trim()) {
      showError("refError", "Invoice reference is required");
      valid = false;
    } else hideError("refError");
    if (isNaN(amount) || amount < 1) {
      showError("amountError", "Amount must be at least 1.00");
      valid = false;
    } else hideError("amountError");
    if (!valid) return;
    try {
      const response = await fetch("/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerEmail: email.value,
          payerName: payerName,
          reference: ref.value,
          description: desc.value,
          amount: amount,
          currency: currency,
        }),
      });
      const result = await response.json();
      if (response.ok && result.hostedUrl) {
        savedPaymentReference = result.paymentReference;
        document.getElementById("generatedLink").value = result.hostedUrl;
        btn2.disabled = false;
        switchTab(2);
      } else {
        const err = result.error || {
          path: "Server",
          message: "Unexpected error",
        };
        showErrorDialog(err.path || "Error", err.message || "Failed");
      }
    } catch (err) {
      console.error("Payment Error:", err);
      showErrorDialog("Network", "Request failed");
    }
  });
