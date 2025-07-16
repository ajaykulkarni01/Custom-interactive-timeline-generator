import logo from './logo.svg';
import './App.css';
import TimelineUploader from './TimelineUploader';
import TimelineJS from './TimelineJS';
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  const handleTimelineReady = (timelineData) => {
    navigate('/output', { state: { timelineData } });
  };
  return (
    <>
      <header className="main-header">
        <img src={logo} className="header-logo" alt="logo" />
        <h1>Interactive Timeline Generator</h1>
        <p className="subtitle">Create beautiful timelines from your Excel files</p>
      </header>
      <main>
        <TimelineUploader fancyButton onTimelineReady={handleTimelineReady} />
      </main>
      <footer className="main-footer">
        <span>© {new Date().getFullYear()} Timeline Generator. Made with ❤️ for Bootcamp.</span>
      </footer>
    </>
  );
}

function Output() {
  const location = useLocation();
  const timelineData = location.state?.timelineData;
  if (!timelineData) {
    return <div style={{textAlign: 'center', marginTop: '3rem'}}>No timeline data found. Please upload a file from the home page.</div>;
  }
  return <TimelineJS data={timelineData} />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/output" element={<Output />} />
      </Routes>
    </Router>
  );
}

export default App;
