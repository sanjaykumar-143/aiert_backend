require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const { ACCOUNT_SID, AUTH_TOKEN, TWILIO_PHONE, EXOTEL_SID, EXOTEL_TOKEN, EXOTEL_VIRTUAL_NUMBER } = process.env;

if (!ACCOUNT_SID || !AUTH_TOKEN || !TWILIO_PHONE || !EXOTEL_SID || !EXOTEL_TOKEN || !EXOTEL_VIRTUAL_NUMBER) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

const twilioClient = twilio(ACCOUNT_SID, AUTH_TOKEN);

app.post('/send-sos', async (req, res) => {
  const { contacts, location } = req.body;

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid contacts list' });
  }

  if (!location || !location.latitude || !location.longitude) {
    return res.status(400).json({ success: false, message: 'Invalid location data' });
  }

  const message = `🚨 EMERGENCY! HELP NEEDED 🚨\nLocation: https://maps.google.com/?q=${location.latitude},${location.longitude}`;

  try {
    // Send WhatsApp messages
    await Promise.all(contacts.map((number) =>
      twilioClient.messages.create({
        body: message,
        from: `whatsapp:${TWILIO_PHONE}`,
        to: `whatsapp:${number}`
      })
    ));
    console.log('✅ WhatsApp messages sent!');

    // Trigger voice calls via Exotel
    await Promise.all(contacts.map(async (number) => {
      const url = `https://api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/connect`;
      const auth = { username: EXOTEL_SID, password: EXOTEL_TOKEN };
      const callData = new URLSearchParams({
        From: number,
        To: EXOTEL_VIRTUAL_NUMBER,
        CallerId: EXOTEL_VIRTUAL_NUMBER,
        Url: `http://my-server.com/exotel-call-xml` // Your XML file for call content
      });
      await axios.post(url, callData, { auth });
    }));
    console.log('✅ Emergency voice calls initiated!');

    res.json({ success: true, message: 'SOS sent via WhatsApp & voice calls!' });
  } catch (error) {
    console.error('❌ Error sending SOS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log(`🚀 Server running...`));
