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
  const [ordered, setOrdered] = useState(false);

  const sendSms = async (meal) => {
    const mealName = meal.name;
    const mealTime = meal.time;

    try {
      const response = await fetch('http://localhost:3001/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mealName, mealTime }),
      });

      if (response.ok) {
        console.log('SMS sent successfully to the preparer!');
      } else {
        console.error('Failed to send SMS');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleOrder = async (meal) => {
    setSelectedMeal(meal);
    setOrdered(true);
    console.log(`Ordered: ${meal.name}`);

    // Notify the preparer via SMS
    await sendSms(meal);
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
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {meals.map((meal) => (
            <button
              key={meal.id}
              onClick={() => handleOrder(meal)}
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
