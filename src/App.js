import logo from './logo.svg';
import './App.css';
import TimelineUploader from './TimelineUploader';

function App() {
  return (
    <div className="App">
      <header className="main-header">
        <img src={logo} className="header-logo" alt="logo" />
        <h1>Interactive Timeline Generator</h1>
        <p className="subtitle">Create beautiful timelines from your Excel files</p>
      </header>
      <main>
        <TimelineUploader fancyButton />
      </main>
      <footer className="main-footer">
        <span>© {new Date().getFullYear()} Timeline Generator. Made with ❤️ for Bootcamp.</span>
      </footer>
    </div>
  );
}

export default App;
