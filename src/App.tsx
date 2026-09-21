import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';

/**
 * One day, so one page. The BMAI site this is built from has a page per
 * weekend, a calendar and office hours; none of that has anything to show for
 * a single Saturday, so every route lands on the home page.
 */
export default function App() {
  return (
    <div className="app">
      <Header />
      <main className="app__main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
