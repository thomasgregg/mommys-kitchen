import React, { useState } from 'react';
import { Bell } from 'lucide-react';

const meals = [
  { id: 1, name: 'Spaghetti & Meatballs', image: '/images/spaghetti.jpg', time: '30 min' },
  { id: 2, name: 'Mac & Cheese', image: '/images/maccheese.jpg', time: '20 min' },
  { id: 3, name: 'Chicken Nuggets', image: '/images/chickennuggets.jpg', time: '25 min' },
  { id: 4, name: 'Pizza', image: '/images/pizza.jpg', time: '15 min' }
];

const App = () => {
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [ordered, setOrdered] = useState(false);

  // Function to send SMS via the backend
  const sendSms = async (meal) => {
    try {
      const response = await fetch('https://mommys-kitchen.vercel.app/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mealName: meal.name,
          mealTime: meal.time,
        }),
      });

      if (response.ok) {
        console.log('SMS sent successfully!');
      } else {
        console.error('Failed to send SMS');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
    }
  };

  // Handle meal selection
  const handleMealSelection = (meal) => {
    setSelectedMeal(meal);
    setConfirmationStep(true); // Show the confirmation dialog
  };

  // Confirm the order
  const confirmOrder = async () => {
    setOrdered(true);
    setConfirmationStep(false); // Exit confirmation step
    console.log(`Order confirmed for: ${selectedMeal.name}`);
    await sendSms(selectedMeal); // Send SMS after confirmation
  };

  // Cancel the order
  const cancelOrder = () => {
    setSelectedMeal(null);
    setConfirmationStep(false); // Reset to allow another selection
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-purple-600">Mommy's Kitchen</h1>
        <p className="text-gray-600">What would you like to eat?</p>
      </header>

      {ordered ? (
        <div className="text-center p-6 bg-green-100 rounded-lg">
          <Bell className="mx-auto mb-4" size={48} />
          <h2 className="text-xl font-semibold mb-2">Order Sent!</h2>
          <p>Mom will prepare {selectedMeal.name} for you.</p>
          <button
            onClick={() => setOrdered(false)}
            className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-full"
          >
            Order Something Else
          </button>
        </div>
      ) : confirmationStep ? (
        <div className="text-center p-6 bg-yellow-100 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Confirm Your Order</h2>
          <p>Are you sure you want to order {selectedMeal.name}?</p>
          <div className="mt-4 flex justify-center gap-4">
            <button
              onClick={confirmOrder}
              className="bg-green-600 text-white px-6 py-2 rounded-full"
            >
              Confirm
            </button>
            <button
              onClick={cancelOrder}
              className="bg-red-600 text-white px-6 py-2 rounded-full"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {meals.map((meal) => (
            <button
              key={meal.id}
              onClick={() => handleMealSelection(meal)}
              className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <img
                src={meal.image}
                alt={meal.name}
                className="w-full rounded-lg mb-2"
              />
              <h3 className="font-semibold text-gray-800">{meal.name}</h3>
              <p className="text-sm text-gray-500">{meal.time}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
