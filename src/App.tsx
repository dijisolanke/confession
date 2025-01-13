import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Lobby from "./components/Lobby";
import VideoChat from "./components/VideoChat";

export default function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/chat/:roomId" element={<VideoChat />} />
        </Routes>
      </div>
    </Router>
  );
}
