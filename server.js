require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(express.json());

const { ACCOUNT_SID, AUTH_TOKEN, TWILIO_PHONE, TWILIO_WHATSAPP } = process.env;

if (!ACCOUNT_SID || !AUTH_TOKEN || !TWILIO_PHONE || !TWILIO_WHATSAPP) {
  console.error('❌ Missing Twilio environment variables!');
  process.exit(1);
}

const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

app.post('/send-sos', async (req, res) => {
  const { contacts, location } = req.body;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid contacts list' });
  }

  if (!location || !location.latitude || !location.longitude) {
    return res.status(400).json({ success: false, message: 'Invalid location data' });
  }

  const message = `🚨 Emergency! Help needed. Location: https://maps.google.com/?q=${location.latitude},${location.longitude}`;

  try {
    await Promise.all(
      contacts.map((number) =>
        client.messages.create({ body: message, from: TWILIO_PHONE, to: number })
      )
    );

    await Promise.all(
      contacts.map((number) =>
        client.messages.create({
          body: message,
          from: `whatsapp:${TWILIO_WHATSAPP}`,
          to: `whatsapp:${number}`,
        })
      )
    );

    res.json({ success: true, message: 'SMS and WhatsApp messages sent successfully!' });
  } catch (error) {
    console.error('❌ Error sending messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log(`🚀 Server running...`));
