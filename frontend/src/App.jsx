import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Workshop from './pages/Workshop';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workshop/:workshopId" element={<Workshop />} />
      </Routes>
    </Router>
  );
}

export default App;
