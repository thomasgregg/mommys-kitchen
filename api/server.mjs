import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Twilio credentials and phone numbers from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const preparerPhoneNumber = process.env.PREPARER_PHONE_NUMBER;

// Twilio client
import twilio from 'twilio';
const client = twilio(accountSid, authToken);

// Endpoint to handle SMS sending
app.post('/send-sms', (req, res) => {
  const { mealName, mealTime } = req.body;

  // Construct the SMS message
  const message = `New Order Received:\n- Meal: ${mealName}\n- Preparation Time: ${mealTime}`;

  // Send the SMS using Twilio
  client.messages
    .create({
      from: twilioPhoneNumber,
      to: preparerPhoneNumber,
      body: message,
    })
    .then((message) => {
      console.log(`SMS sent: ${message.sid}`);
      res.status(200).send('SMS sent successfully!');
    })
    .catch((error) => {
      console.error('Error sending SMS:', error);
      res.status(500).send('Failed to send SMS');
    });
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
