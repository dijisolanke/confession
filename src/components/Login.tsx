import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState<string>("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    //TODO implement login
    navigate("/lobby");
  };

  return (
    <div>
      <h2>Enter the Confession Booth</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setUsername(e.target.value)
          }
          placeholder="Enter your ailias"
          required
        />
        <button type="submit">Enter</button>
      </form>
    </div>
  );
}
