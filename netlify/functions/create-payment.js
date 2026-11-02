exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { netPayout, description } = JSON.parse(event.body);

    // Calculate gross total to ensure host gets 100% net payout
    // Formula: (Base + 15) / (1 - 0.035) + 12% VAT on fees
    const baseAmount = parseFloat(netPayout) || 0;
    const fixedFee = 15;
    const rate = 0.035 * 1.12; // ~3.92% total rate
    const grossTotal = Math.ceil((baseAmount + fixedFee) / (1 - rate));
    const amountInCentavos = grossTotal * 100;

    // Encode PayMongo Secret Key in Basic Auth
    const secretKey = "sk_test_QLomitvAMVqxoSofHAHp1okQ";
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;

    // Call PayMongo Payment Links API (Corrected payload structure for /v1/payment_links)
    const response = await fetch("https://api.paymongo.com/v1/payment_links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: amountInCentavos,
        currency: "PHP",
        description: description || "Short-Term Rental Stay",
        remarks: "Host Pay PH - Netlify Test Link",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.errors }),
      };
    }

    // New API returns url directly at the root level of data object
    const paymentUrl = data.data.url;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        grossTotal: grossTotal,
        paymentUrl: paymentUrl,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
