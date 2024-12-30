# Mommy's Kitchen

Mommy's Kitchen is a React-based web application that allows users to order meals from a predefined menu. Upon confirmation of an order, the app sends an SMS notification to the preparer with the details of the selected meal and preparation time. The app is designed to be simple, responsive, and fully functional on both desktop and mobile devices.

---

## Features

- **Responsive Menu Display**: Users can browse a list of meals with accompanying images and preparation times.
- **Confirmation Step**: Before an order is finalized, users must confirm their selection, preventing accidental orders.
- **SMS Notification**: Once confirmed, the app sends an SMS to the preparer with the order details.
- **Mobile-Friendly**: The layout is optimized for smaller devices, ensuring smooth usability on iPhones and other smartphones.

---

## How It Works

1. Users select a meal from the menu.
2. A confirmation dialog appears, asking the user to confirm or cancel the order.
3. Once confirmed:
   - The app sends an SMS with the meal details to the designated preparer.
   - The user sees an order confirmation screen.
4. If canceled, the user is returned to the menu to make another selection.

---

## Installation

To run this app locally, follow these steps:

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/mommys-kitchen.git
cd mommys-kitchen
```

### 2. Install Dependencies
Make sure you have Node.js and npm installed, then run:
```bash
npm install
```

### 3. Set Up Backend
The app relies on a backend to send SMS notifications via Twilio. Ensure you have a Twilio account and configure the environment variables.

#### Environment Variables:
Create a `.env` file in the project root with the following:
```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
PREPARER_PHONE_NUMBER=recipient_phone_number
```

### 4. Run the App Locally
Start the development server:
```bash
npm start
```

The app will be available at `http://localhost:3000`.

---

## Deployment

The app is deployed on [Vercel](https://vercel.com). To deploy it yourself:

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Set up environment variables in the Vercel dashboard:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `PREPARER_PHONE_NUMBER`
4. Vercel will automatically build and deploy your app.

---

## Configuration

### Adding New Meals
To update the menu, edit the `meals` array in `App.js`:
```javascript
const meals = [
  { id: 1, name: 'Spaghetti & Meatballs', image: 'images/spaghetti.jpg', time: '30 min' },
  { id: 2, name: 'Mac & Cheese', image: 'images/maccheese.jpg', time: '20 min' },
  { id: 3, name: 'Chicken Nuggets', image: 'images/chickennuggets.jpg', time: '25 min' },
  { id: 4, name: 'Pizza', image: 'images/pizza.jpg', time: '15 min' }
];
```

Add new meals by appending items to this array.

### Updating Images
Place new images in the `/public/images` folder and reference them in the `meals` array.

### Customizing SMS
To customize the SMS message, modify the body in the `/api/send-sms.js` backend function:
```javascript
const message = `New Order Received:\n- Meal: ${mealName}\n- Preparation Time: ${mealTime}`;
```

---

## Technology Stack

- **Frontend**: React.js with Tailwind CSS for styling.
- **Backend**: Node.js serverless functions (deployed on Vercel).
- **Messaging Service**: Twilio API for sending SMS notifications.

---

## Limitations

- **Twilio Trial Accounts**: If you're using a trial Twilio account, only verified phone numbers can receive SMS.
- **Fixed Preparer Phone Number**: The phone number for the preparer is hardcoded in the environment variables.

---

## Future Improvements

- Add user authentication for personalized orders.
- Allow dynamic input of the preparer's phone number.
- Include an order history feature.

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). Feel free to use, modify, and distribute as needed.
