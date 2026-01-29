import React, { useState } from 'react';
import axios from "axios";
import { API_URL } from "../config";


interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Clear legacy/Header keys (Hard Reset)
      localStorage.removeItem("branch");
      localStorage.removeItem("location");
      localStorage.removeItem("academicYear");
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("currentBranch");
      localStorage.removeItem("currentLocation");

      const response = await axios.post(`${API_URL}/users/login`, {
        username,
        password
      });

      console.log("Login successful:", response.data);

      console.log("Login successful:", response.data);

      try {
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          console.log("Token saved to localStorage");
        } else {
          console.warn("No token found in login response");
        }

        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          console.log("User saved to localStorage");
        }
      } catch (ex) {
        console.warn('Could not persist to localStorage', ex);
      }

      // send user info to parent (App.tsx)
      onLoginSuccess(response.data.user);
      setLoading(false);

    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.error || err?.message || 'Invalid username or password';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-sm mx-auto bg-white rounded-lg shadow-md">
        <div className="p-8">
          <div className="text-center space-y-4 mb-8">
            <img src="https://www.mshifzacademy.com/assets/images/ms-logo.jpg"
              alt="MS Education Academy Logo"
              className="mx-auto h-12 object-contain" />
            <p className="text-gray-500">Admin Login</p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="border border-gray-300 rounded-md">
              <div className="px-3 py-2 border-b border-gray-300">
                <label className="block text-xs font-medium text-gray-500">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full p-0 border-0 bg-transparent focus:ring-0 sm:text-sm"
                />
              </div>

              <div className="px-3 py-2">
                <label className="block text-xs font-medium text-gray-500">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full p-0 border-0 bg-transparent focus:ring-0 sm:text-sm"
                />
              </div>
            </div>

            {error && (
              <p className="text-center text-sm text-red-600 pt-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
