import twilio from 'twilio';

export default async (req, res) => {
  if (req.method === 'POST') {
    console.log('Environment Variables:');
    console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID);
    console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'Exists' : 'Missing');
    console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);
    console.log('PREPARER_PHONE_NUMBER:', process.env.PREPARER_PHONE_NUMBER);

    const { mealName, mealTime } = req.body;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const preparerPhoneNumber = process.env.PREPARER_PHONE_NUMBER;

    try {
      const client = twilio(accountSid, authToken);

      const message = await client.messages.create({
        from: twilioPhoneNumber,
        to: preparerPhoneNumber,
        body: `New Order Received:\n- Meal: ${mealName}\n- Preparation Time: ${mealTime}`,
      });

      console.log(`SMS sent: ${message.sid}`);
      res.status(200).json({ message: 'SMS sent successfully!' });
    } catch (error) {
      console.error('Error sending SMS:', error.message);
      res.status(500).json({ error: 'Failed to send SMS', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};
