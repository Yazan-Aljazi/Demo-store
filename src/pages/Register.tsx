import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

interface RegisterProps {
  onSignIn: () => void;
}

function Register({ onSignIn }: RegisterProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      setIsLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: userCredential.user.email,
        role: "customer",
        createdAt: serverTimestamp(),
      });

      setMessage(`Account created successfully for ${userCredential.user.email}.`);
    } catch (error) {
      const firebaseError = error as { code?: string };

      if (firebaseError.code === "auth/email-already-in-use") {
        setMessage("This email is already in use. Please sign in instead.");
      } else if (firebaseError.code === "auth/weak-password") {
        setMessage("Password must contain at least 6 characters.");
      } else {
        setMessage("Could not create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Welcome to DemoStore</p>
        <h1>Create Account</h1>
        <p>Create your account to start shopping.</p>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <button className="form-button" type="submit" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        <p className="auth-switch">
          Already have an account?{" "}
          <button type="button" className="auth-link" onClick={onSignIn}>
            Sign In
          </button>
        </p>
      </section>
    </main>
  );
}

export default Register;