import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import twilio from 'twilio';

// Hardcoded Twilio credentials and phone numbers
const accountSid = 'AC93cd45e711eee106b0d1df996fb931bd'; // Twilio Account SID
const authToken = '8bc9e25f65115fd2fb06a5016ad436cd'; // Twilio Auth Token
const twilioPhoneNumber = '+12535233196'; // Your Twilio phone number
const preparerPhoneNumber = '+491741992215'; // Preparer's phone number

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Twilio Client
const client = twilio(accountSid, authToken);

// Endpoint to handle SMS sending
app.post('/send-sms', (req, res) => {
  const { mealName, mealTime } = req.body;

  // Construct the SMS message
  const message = `New Order Received:\n- Meal: ${mealName}\n- Preparation Time: ${mealTime}`;

  // Send the SMS
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
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
