// api/waitlist.js (Vercel serverless)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method Not Allowed' });

  try {
    const { name, email, phone, country, sms } = req.body || {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ ok:false, error:'Invalid email' });

    // 1) Send to your automation (Zapier/Make webhook)
    const z = await fetch(process.env.ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ name, email, phone, country, sms })
    });
    if (!z.ok) throw new Error('Zapier/Make failed');

    // 2) Optional: fire an SMS via Twilio if consented
    if (sms && phone && process.env.TWILIO_AUTH_TOKEN) {
      const basic = Buffer.from(`${process.env.TWILIO_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const twBody = new URLSearchParams({
        To: phone,
        From: process.env.TWILIO_FROM,  // e.g. +61XXXX
        Body: `Thanks for joining Spirit, ${name || 'friend'} ✨`
      });
      const twilioResp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${basic}`, 'Content-Type':'application/x-www-form-urlencoded' },
        body: twBody
      });
      if (!twilioResp.ok) console.warn('Twilio SMS failed');
    }

    return res.status(200).json({ ok:true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, error:'Server error' });
  }
}
