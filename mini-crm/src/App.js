import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AuthSuccessPage from './pages/AuthSuccessPage';
import CampaignHistoryPage from './pages/CampaignHistoryPage';
import CreateCampaignPage from './pages/CreateCampaignPage';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth-success" element={<AuthSuccessPage />} />
            <Route path="/" element={<CampaignHistoryPage />} />
            <Route path="/create-campaign" element={<CreateCampaignPage />} />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;