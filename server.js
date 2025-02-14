require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Load environment variables from .env file
const { 
  EXOTEL_SID, EXOTEL_TOKEN, EXOTEL_VIRTUAL_NUMBER 
} = process.env;

// Ensure that required environment variables are loaded
if (!EXOTEL_SID || !EXOTEL_TOKEN || !EXOTEL_VIRTUAL_NUMBER) {
  console.error('❌ Missing required environment variables!');
  process.exit(1); // Exit the application if any variable is missing
}

// POST endpoint to send SOS via Voice Calls
app.post('/send-sos', async (req, res) => {
  const { contacts, location } = req.body;

  // Validate the contacts list
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid contacts list' });
  }

  // Validate the location data
  if (!location || !location.latitude || !location.longitude) {
    return res.status(400).json({ success: false, message: 'Invalid location data' });
  }

  try {
    // Exotel Authentication (Base64 encoded SID and Token)
    const authHeader = Buffer.from(`${EXOTEL_SID}:${EXOTEL_TOKEN}`).toString('base64');

    // Trigger emergency voice calls via Exotel
    await Promise.all(contacts.map(async (number) => {
      const url = `https://api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/connect`;

      // Data for initiating the voice call
      const callData = new URLSearchParams({
        From: EXOTEL_VIRTUAL_NUMBER,  // The Exotel number initiating the call
        To: number,  // Recipient number
        CallerId: EXOTEL_VIRTUAL_NUMBER,  // Caller ID, same Exotel number
        Url: `https://your-server.com/exotel-call-xml`  // Replace with your actual XML endpoint
      });

      // Send the POST request to Exotel API to trigger the call
      await axios.post(url, callData, {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    }));

    console.log('✅ Emergency voice calls initiated!');

    // Send a success response
    res.json({ success: true, message: 'SOS sent via voice calls!' });
  } catch (error) {
    // Handle any errors that occurred during the process
    console.error('❌ Error sending SOS:', error.response?.data || error.message);

    // Send an error response with the message from the error
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

// Start the Express server
app.listen(process.env.PORT || 3000, () => console.log('🚀 Server running on port 3000...'));
