require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Load environment variables
const { 
  BREVO_API_KEY, EXOTEL_SID, EXOTEL_TOKEN, EXOTEL_VIRTUAL_NUMBER 
} = process.env;

// ❌ Check if any required environment variable is missing
if (!BREVO_API_KEY || !EXOTEL_SID || !EXOTEL_TOKEN || !EXOTEL_VIRTUAL_NUMBER) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

app.post('/send-sos', async (req, res) => {
  const { contacts, location } = req.body;

  // Validate contacts list
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid contacts list' });
  }

  // Validate location data
  if (!location || !location.latitude || !location.longitude) {
    return res.status(400).json({ success: false, message: 'Invalid location data' });
  }

  const message = `🚨 EMERGENCY! HELP NEEDED 🚨\nLocation: https://maps.google.com/?q=${location.latitude},${location.longitude}`;

  try {
    // ✅ Send SMS via Brevo API (without sender ID)
    const brevoAuth = `Bearer ${BREVO_API_KEY}`;
    
    await Promise.all(contacts.map(async (number) => {
      const smsData = {
        to: number, // Recipient's phone number
        content: message
      };

      await axios.post('https://api.brevo.com/v3/sms/send', smsData, {
        headers: {
          'Authorization': brevoAuth,
          'Content-Type': 'application/json'
        }
      });
    }));
    console.log('✅ SMS sent via Brevo API!');

    // ✅ Exotel Authentication (Basic Auth Header)
    const authHeader = Buffer.from(`${EXOTEL_SID}:${EXOTEL_TOKEN}`).toString('base64');

    // ✅ Trigger voice calls via Exotel
    await Promise.all(contacts.map(async (number) => {
      const url = `https://api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/connect`;
      const callData = new URLSearchParams({
        From: EXOTEL_VIRTUAL_NUMBER,  // The Exotel number initiating the call
        To: number,                   // Recipient number
        CallerId: EXOTEL_VIRTUAL_NUMBER,  // Same Exotel number for CallerId
        Url: `https://your-server.com/exotel-call-xml`  // Ensure this is a publicly accessible XML endpoint!
      });

      await axios.post(url, callData, {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    }));
    console.log('✅ Emergency voice calls initiated!');

    // Send success response
    res.json({ success: true, message: 'SOS sent via SMS & voice calls!' });
  } catch (error) {
    console.error('❌ Error sending SOS:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('🚀 Server running...'));
