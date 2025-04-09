import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
let accessToken = null;
let tokenExpiry = 0;
async function getAccessToken() {
  const now = Date.now();
  if (accessToken && tokenExpiry > now) return accessToken;
  const response = await fetch("https://api.triple-a.io/api/v2/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.TRIPLE_A_CLIENT_ID,
      client_secret: process.env.TRIPLE_A_CLIENT_SECRET,
    }),
  });
  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = now + data.expires_in * 1000 - 5000;
  return accessToken;
}
app.post("/create-payment", async (req, res) => {
  try {
    const token = await getAccessToken();
    const { payerEmail, payerName, reference, description, amount, currency } =
      req.body;
    const payload = {
      type: "invoice",
      merchant_key: process.env.TRIPLE_A_MERCHANT_KEY,
      order_currency: currency,
      order_amount: amount,
      notify_email: payerEmail,
      invoice_desc: description,
      order_id: reference,
      sandbox: false,
      payer_email: payerEmail,
      payer_id: payerEmail,
      success_url: "https://kick-start.ae/",
      cancel_url: "https://www.triple-a.io/",
    };
    if (payerName && payerName.trim()) payload.payer_name = payerName;
    const response = await fetch("https://api.triple-a.io/api/v2/payment", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || result.message === "validation_error") {
      return res.status(400).json({ error: result.errors?.[0] });
    }
    res.json({
      hostedUrl: result.hosted_url,
      paymentReference: result.payment_reference,
    });
  } catch (err) {
    res.status(500).json({ error: "server_error", detail: err.message });
  }
});
app.post("/send-email", async (req, res) => {
  try {
    const token = await getAccessToken();
    const { paymentReference } = req.body;
    const response = await fetch(
      `https://api.triple-a.io/api/v1/dashboard/invoice/${paymentReference}/email`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json, application/xml",
          "Content-Type": "application/json",
        },
      }
    );
    const data = await response.json();
    if (!response.ok || !data.payment_reference) {
      return res.status(400).json({ error: "Failed to send email" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "server_error", detail: err.message });
  }
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
app.get("/", (req, res) => {
 res.sendFile("crypto payment.html", { root: "public" });
});
