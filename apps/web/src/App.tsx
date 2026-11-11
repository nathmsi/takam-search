import { Route, Routes } from 'react-router';
import { AppLayout } from './components/AppLayout/AppLayout';
import { BrowsePage } from './pages/BrowsePage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';

/** The routes: the home page, the search (with an instruction selected or not), and a page for any other address. */
export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="documents" element={<BrowsePage />} />
        <Route path="documents/:codeText" element={<BrowsePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
