const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
app.use(bodyParser.json());

// Twilio credentials
const accountSid = 'AC93cd45e711eee106b0d1df996fb931bd'; // Replace with your Twilio Account SID
const authToken = '8bc9e25f65115fd2fb06a5016ad436cd'; // Replace with your Twilio Auth Token
const client = twilio(accountSid, authToken);

// Predefined phone number for the preparer (chef or kitchen staff)
const preparerPhoneNumber = '+491741992215'; // Replace with the preparer's phone number

app.post('/send-sms', (req, res) => {
  const { mealName, mealTime } = req.body;

  // Construct the SMS message
  const message = `New Order Received:\n- Meal: ${mealName}\n- Preparation Time: ${mealTime}`;

  // Send SMS via Twilio
  client.messages
    .create({
      from: '+12535233196', // Replace with your Twilio phone number
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

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
