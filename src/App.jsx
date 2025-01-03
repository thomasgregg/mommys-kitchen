import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Confetti from 'react-confetti';
import { FaWhatsapp, FaSms } from 'react-icons/fa';

const meals = [
  { id: 1, name: 'Spaghetti & Meatballs', image: '/images/spaghetti.jpg', time: '30 min' },
  { id: 2, name: 'Mac & Cheese', image: '/images/maccheese.jpg', time: '20 min' },
  { id: 3, name: 'Chicken Nuggets', image: '/images/chickennuggets.jpg', time: '25 min' },
  { id: 4, name: 'Pizza', image: '/images/pizza.jpg', time: '15 min' }
];

// Header component
const Header = () => {
  const navigate = useNavigate();

  const goToHome = () => {
    navigate('/');
  };

  return (
    <header className="text-center mb-8">
      <div 
        className="flex items-center justify-center cursor-pointer" 
        onClick={goToHome}
      >
        <img 
          src="/icons/web-app-manifest-512x512.png" 
          alt="Mommy's Kitchen Icon" 
          className="w-12 h-12 mr-2"
        />
        <h1 className="text-3xl font-bold text-fuchsia-600">Mommy's Kitchen</h1>
      </div>
      <p 
        className="text-gray-600 -mt-1 cursor-pointer" 
        onClick={goToHome}
      >
        What would you like to eat?
      </p>
    </header>
  );
};

// MealSelection component
const MealSelection = ({ onSelectMeal }) => {
  const navigate = useNavigate();

  const handleMealSelection = (meal) => {
    onSelectMeal(meal);
    navigate('/confirm');
  };

  const generateShareLink = (meal) => {
    const appUrl = "https://mommys-kitchen.vercel.app"; // Replace with your actual app URL
    return `${appUrl}/meal/${meal.id}`;
  };

  const encodeText = (text) => encodeURIComponent(text);

  return (
    <div className="grid grid-cols-2 gap-4">
      {meals.map((meal) => (
        <div key={meal.id} className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
          <button
            onClick={() => handleMealSelection(meal)}
            className="w-full text-center"
          >
            <img
              src={meal.image}
              alt={meal.name}
              className="w-full rounded-lg mb-2"
            />
            <h3 className="text-base font-medium text-gray-800">{meal.name}</h3> {/* Adjusted size */}
          </button>
          <div className="mt-2 flex justify-between items-center text-gray-500 text-xs">
            {/* Meal time */}
            <span>{meal.time}</span>
            <span className="text-gray-300">|</span>
            {/* Icons */}
            <div className="flex space-x-2">
              {/* Share via iMessage */}
              <a
                href={`sms:&body=${encodeText(
                  `Check out this recipe: ${meal.name}! Here's the link: ${generateShareLink(meal)}`
                )}`}
                className="text-blue-600"
                aria-label="Share via iMessage"
              >
                <FaSms size={16} />
              </a>
              {/* Share via WhatsApp */}
              <a
                href={`https://wa.me/?text=${encodeText(
                  `Check out this recipe: ${meal.name}! Here's the link: ${generateShareLink(meal)}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500"
                aria-label="Share via WhatsApp"
              >
                <FaWhatsapp size={16} />
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Remaining components remain unchanged
const Confirmation = ({ selectedMeal, onConfirm }) => {
  const navigate = useNavigate();

  if (!selectedMeal) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="text-center p-6 bg-yellow-100 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Confirm Your Order</h2>
      <p>Are you sure you want to order {selectedMeal.name}?</p>
      <div className="mt-4 flex justify-center gap-4">
        <button
          onClick={() => {
            onConfirm(selectedMeal);
            navigate('/success');
          }}
          className="bg-green-600 text-white px-6 py-2 rounded-full"
        >
          Confirm
        </button>
        <button
          onClick={() => navigate('/')}
          className="bg-red-600 text-white px-6 py-2 rounded-full"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const OrderSuccess = ({ selectedMeal }) => {
  const navigate = useNavigate();

  if (!selectedMeal) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Confetti
        width={window.innerWidth}
        height={window.innerHeight}
        recycle={false}
        numberOfPieces={400}
        colors={['#d946ef', '#f0abfc', '#fae8ff', '#fff']}
      />
      <div className="text-center p-6 bg-green-100 rounded-lg">
        <Bell className="mx-auto mb-4" size={48} />
        <h2 className="text-xl font-semibold mb-2">Order Sent!</h2>
        <p>Mom will prepare {selectedMeal.name} for you.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-fuchsia-600 text-white px-6 py-2 rounded-full"
        >
          Order Something Else
        </button>
      </div>
    </>
  );
};

const App = () => {
  const [selectedMeal, setSelectedMeal] = useState(null);

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

  const handleConfirmOrder = async (meal) => {
    await sendSms(meal);
  };

  return (
    <BrowserRouter>
      <div className="max-w-lg mx-auto p-4">
        <Header />
        <Routes>
          <Route 
            path="/" 
            element={<MealSelection onSelectMeal={setSelectedMeal} />} 
          />
          <Route 
            path="/confirm" 
            element={
              <Confirmation 
                selectedMeal={selectedMeal} 
                onConfirm={handleConfirmOrder}
              />
            } 
          />
          <Route 
            path="/success" 
            element={<OrderSuccess selectedMeal={selectedMeal} />} 
          />
        </Routes>
        <SpeedInsights />
      </div>
    </BrowserRouter>
  );
};

export default App;
