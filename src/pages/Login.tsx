import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

interface LoginProps {
  onCreateAccount: () => void;
}

function Login({ onCreateAccount }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      setMessage(`Welcome back, ${userCredential.user.email}!`);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  return (
  <main className="auth-page">
    <section className="auth-card">
      <h1>Welcome Back</h1>
      <p>Sign in to continue to My Store.</p>

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <button className="form-button" type="submit">
          Sign In
        </button>
      </form>

      {message && <p className="message">{message}</p>}
   <p className="auth-switch">
  Don't have an account?{" "}
  <button
    type="button"
    className="auth-link"
    onClick={onCreateAccount}
  >
    Create Account
  </button>
</p>
    </section>
  </main>
);
}

export default Login;