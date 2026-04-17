import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Marketplace } from './pages/Marketplace';
import Converter from './pages/Converter';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Marketplace />} />
        <Route path="/converter" element={<Converter />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
