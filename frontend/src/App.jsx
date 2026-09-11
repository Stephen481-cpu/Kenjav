import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Storefront from './pages/Storefront';
import OrderTracking from './pages/OrderTracking';
import AdminApp from './admin/AdminApp';
import { PrivacyPolicy, TermsOfService } from './pages/LegalPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/order/:code" element={<OrderTracking />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
    </BrowserRouter>
  );
}
