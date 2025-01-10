import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

const socket = io("https://server-0w31.onrender.com"); // Replace with your server URL

const Lobby: React.FC = () => {
  const [alias, setAlias] = useState("");
  const [waitingUsers, setWaitingUsers] = useState<string[]>([]);
  const navigate = useNavigate();
  const [buttonState, setButtonState] = useState(false);

  useEffect(() => {
    try {
      navigator.mediaDevices
        .getUserMedia({ audio: false, video: false })
        .catch(() => console.log("Permissions reset"));
    } catch (err) {
      console.log("Could not reset permissions");
    }
    socket.on("waitingUsersUpdate", (users: string[]) => {
      setWaitingUsers(users);
    });

    socket.on("paired", ({ partnerAlias, roomId, isInitiator }) => {
      navigate(`/chat/${roomId}`, { state: { partnerAlias, isInitiator } });
    });

    return () => {
      socket.off("waitingUsersUpdate");
      socket.off("paired");
    };
  }, [navigate]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (alias) {
      socket.emit("setAlias", alias);
      //disable button on click
      setButtonState(true);
    }
  };

  return (
    <div>
      <h1>Welcome to the Anonymous Chat</h1>
      <form onSubmit={handleJoin}>
        <input
          type="text"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Enter your alias"
          required
          disabled={buttonState}
        />
        <button type="submit" disabled={buttonState}>
          Join Chat
        </button>
      </form>
      <h2>Waiting Users:</h2>
      <ul>
        {waitingUsers.map((user, index) => (
          <li key={index}>{user}</li>
        ))}
      </ul>
    </div>
  );
};

export default Lobby;
