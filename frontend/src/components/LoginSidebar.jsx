import React, { useState } from 'react';
import { api } from '../services/api.js';

const LoginSidebar = ({ user, chatHistory, onLoginSuccess, onGuestLogin, onLogout }) => {
  const [view, setView] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (view === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      let session;
      if (view === 'login') {
        session = await api.login({ email: email.toLowerCase().trim(), password });
      } else {
        session = await api.signup({
          fullName: name.trim(),
          email: email.toLowerCase().trim(),
          password
        });
      }
      onLoginSuccess(session.user || session);
    } catch (err) {
      setError(err.message || (view === 'login' ? 'Login failed' : 'Account creation failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    setError('');
    try {
      const session = await api.guest({});
      onGuestLogin(session);
    } catch (err) {
      setError(err.message || 'Guest access failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  if (user) {
    return (
      <div className="login-panel">
        <div>
          <h3 className="font-bold text-primary">Welcome {user.name || user.email}</h3>
          <p className="text-sm text-muted">{user.type === 'guest' ? 'Guest session' : 'Member account'}</p>
        </div>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          <h4 className="font-semibold text-sm text-primary">Previous Chats ({chatHistory.length})</h4>
          {chatHistory.length === 0 ? (
            <p className="text-xs text-secondary">No saved chats yet</p>
          ) : (
            chatHistory.map((chat, i) => (
              <div key={i} className="login-history-item">
                <p className="font-medium">{chat.query || 'Chat session'}</p>
                <p className="text-secondary line-clamp-2">{chat.answer}</p>
              </div>
            ))
          )}
        </div>

        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-full p-3 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all font-medium login-submit"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="login-panel">
      <h3 className="font-bold text-primary text-lg">
        {view === 'login' ? 'Login to save chats' : 'Create account'}
      </h3>
      
      {error && (
        <div className="login-error">
          {error}
        </div>
      )}

      <div className="flex space-x-2 mb-4 login-switch">
        <button
          type="button"
          className={`flex-1 ${view === 'login' ? 'is-active' : ''}`}
          onClick={() => setView('login')}
          disabled={loading}
        >
          Login
        </button>
        <button
          type="button"
          className={`flex-1 ${view === 'signup' ? 'is-active' : ''}`}
          onClick={() => setView('signup')}
          disabled={loading}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {view === 'signup' && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
        {view === 'signup' && (
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />
        )}
        <button
          type="submit"
          disabled={loading || !email || !password || (view === 'signup' && (!name || password !== confirmPassword))}
          className="login-submit"
        >
          {loading ? 'Processing...' : view === 'login' ? 'Login' : 'Create account'}
        </button>
      </form>

      <div className="text-center py-3 text-xs text-secondary border-t border-border-subtle">
        or
      </div>

      <button
        type="button"
        onClick={handleGuest}
        disabled={loading}
        className="login-guest"
      >
        {loading ? 'Starting guest...' : 'Continue as Guest'}
      </button>
    </div>
  );
};

export default LoginSidebar;

