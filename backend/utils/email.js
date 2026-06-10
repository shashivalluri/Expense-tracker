const sendEmail = async ({ to, subject, text, html }) => {
  const from = process.env.EMAIL_FROM || 'Budget Tracker Pro <no-reply@budgettrackerpro.app>';

  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] RESEND_API_KEY is not configured. Email content follows for local testing only.');
    console.log(`[Email] To: ${to}`);
    console.log(`[Email] Subject: ${subject}`);
    console.log(`[Email] ${text}`);
    return { delivered: false, provider: 'console' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email provider failed with status ${response.status}: ${body}`);
  }

  return response.json();
};

module.exports = { sendEmail };
