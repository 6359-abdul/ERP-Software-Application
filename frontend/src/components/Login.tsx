import React, { useState } from 'react';
import axios from "axios";
import { API_URL } from "../config";
import { auth } from '../api';
import Learnspacelogo from '../images/Learnspacelogo.png';
import HifzAcademyLogo from '../images/HifzAcademylogo.png';
import LoginBg from '../images/LoginBg.png';
import DeLogo from '../images/DE LOGO.png';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

type ViewState = 'login' | 'forgot-email' | 'forgot-otp' | 'forgot-reset';

/* ──────────────────────────────────────────────────────────────────────
   Inline styles are used so this component has zero external CSS deps.
   ────────────────────────────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  /* ── Outer wrapper ── */
  root: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    overflow: 'hidden',
    position: 'relative',
  },

  leftPanel: {
    flex: '0 0 42%',
    backgroundImage: `url(${LoginBg})`,
    backgroundSize: '100%',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    backgroundColor: '#ffffff',
    height: '100vh',
    position: 'relative',
  },

  /* ── Right login panel ── */
  rightPanel: {
    flex: '0 0 60%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '600px 48px 70px 56px', /* 1. Slightly reduced top padding and increased bottom padding to nudge contents up */
    position: 'relative',
    overflow: 'visible',
    height: '100vh',
    marginLeft: '-32px',
    zIndex: 2,
  },

  /* ── Logo block ── */
  logoBlock: {
    textAlign: 'center',
    marginBottom: '30px', /* 2. Reduced from 40px to pull the inputs closer to the logo */
  },

  /* decorative green/blue wave at bottom-right */
  waveDecor: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '300px',
    height: '160px',
    pointerEvents: 'none',
    zIndex: 0,
  },

  curvedBgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none',
  },
  gradientCurve: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100px',
    height: '100%',
  },
  whiteCurve: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100px',
    height: '100%',
    filter: 'drop-shadow(-8px 0 8px rgba(170, 21, 21, 0.08))',
  },
  solidWhiteBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgb(255, 255, 255)',
  },

  /* ── Content block inside right panel ── */
  formWrapper: {
    width: '100%',
    maxWidth: '400px',
    zIndex: 1,
  },

  /* ── Logo block ──
  logoBlock: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  logoImg: {
    width: '500px',
    objectFit: 'contain',
  }, */

  /* ── Input field row ── */
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #2d75d3ff',
    borderRadius: '18px',
    padding: '16px 20px',
    gap: '14px',
    marginBottom: '20px',
    backgroundColor: '#fff',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  inputIcon: {
    color: '#94a3b8',
    fontSize: '20px',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    color: '#1e293b',
    backgroundColor: 'transparent',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  eyeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: 0,
    lineHeight: 1,
  },

  /* ── Login button ── */
  loginBtn: {
    width: '100%',
    padding: '17px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(90deg, #1a3c8f 0%, #1e6fd9 55%, #22c55e 100%)',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '8px',
    transition: 'opacity 0.2s, transform 0.15s',
    boxShadow: '0 4px 16px rgba(26,60,143,0.25)',
  },
  loginBtnDisabled: {
    opacity: 0.65,
    cursor: 'not-allowed',
  },

  /* ── Forgot password link ── */
  forgotLink: {
    display: 'block',
    textAlign: 'center',
    marginTop: '20px',
    color: '#1a3c8f',
    fontWeight: 700,
    fontSize: '15px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    textDecoration: 'none',
  },

  /* ── Misc ── */
  errorMsg: {
    color: '#dc2626',
    fontSize: '13px',
    textAlign: 'center',
    marginBottom: '10px',
  },
  successMsg: {
    color: '#16a34a',
    fontSize: '13px',
    textAlign: 'center',
    marginBottom: '10px',
  },
  subTitle: {
    color: '#64748b',
    fontSize: '13.5px',
    textAlign: 'center',
    marginBottom: '20px',
  },
  smallLink: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    fontSize: '13px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    textDecoration: 'underline',
  },
  smallLinkBlue: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#1a3c8f',
    fontSize: '13px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    textDecoration: 'underline',
  },
  rowBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '14px',
  },

  /* ── DE logo bottom-right of right panel ── 
  deLogoWrapper: {
    position: 'absolute',
    bottom: '80px',
    right: '24px',
    zIndex: 2,
  },
  deLogoImg: {
    height: '52px',
    objectFit: 'contain',
    opacity: 1,
  },*/

  /* ── dots decoration top-right ── 
  dotsDecor: {
    position: 'absolute',
    top: '28px',
    right: '28px',
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 8px)',
    gap: '6px',
    zIndex: 0,
  },*/
};

/* ── SVG icons ─────────────────────────────────────────────────────── */
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a3c8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const EmailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const KeyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

/* ── Decorative dots ───────────────────────────────────────────────── */
const DotsDecor = () => (
  <div style={styles.dotsDecor}>
    {Array.from({ length: 25 }).map((_, i) => (
      <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
    ))}
  </div>
);

/* ── Curved Divider on left edge of white background ────────────────── */
const CurvedDivider = () => (
  <div style={styles.curvedBgContainer}>
    {/* Gradient border curve behind */}
    <svg style={styles.gradientCurve} viewBox="0 0 120 1000" preserveAspectRatio="none">
      <path
        d="M 120 0 
           C 60 180, 0 420, 50 650 
           C 85 820, 30 920, 120 1000 
           L 120 1000 Z"
        fill="url(#borderGradient)"
      />
      <defs>
        <linearGradient id="borderGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a3c8f" />
          <stop offset="50%" stopColor="#1e6fd9" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
    </svg>
    {/* White background curve in front */}
    <svg style={styles.whiteCurve} viewBox="0 0 120 1000" preserveAspectRatio="none">
      <path
        d="M 120 0 
           C 68 180, 8 420, 58 650 
           C 93 820, 38 920, 120 1000 
           L 120 1000 Z"
        fill="#ffffff"
      />
    </svg>
    {/* Solid white area filling the rest of the right panel */}
    <div style={styles.solidWhiteBg} />
  </div>
);

/* ── Wave SVG at bottom right ──────────────────────────────────────── */
const WaveDecor = () => (
  <svg style={styles.waveDecor} viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M 0 160 Q 120 50 300 90 L 300 160 Z"
      fill="url(#wg2)"
      opacity="0.9"
    />
    <path
      d="M 30 160 Q 150 70 300 110 L 300 160 Z"
      fill="url(#wg1)"
    />
    {/* Grid of dots at the bottom right 
    <g opacity="0.3">
      {Array.from({ length: 5 }).map((_, col) =>
        Array.from({ length: 4 }).map((_, row) => (
          <circle
            key={`${col}-${row}`}
            cx={200 + col * 18}
            cy={100 + row * 18 - col * 6}
            r="2.5"
            fill="#ffffff"
          />
        ))
      )}
    </g>*/}
    <defs>
      <linearGradient id="wg1" x1="0" y1="160" x2="300" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1a3c8f" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
      <linearGradient id="wg2" x1="0" y1="160" x2="300" y2="90" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1e6fd9" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
    </defs>
  </svg>
);

/* ════════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════════ */
const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<ViewState>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Login states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Forgot Password states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const resetMessages = () => { setError(''); setMessage(''); };

  /* ── Login ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      localStorage.removeItem('branch');
      localStorage.removeItem('location');
      localStorage.removeItem('academicYear');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      localStorage.removeItem('currentBranch');
      localStorage.removeItem('currentBranchId');
      localStorage.removeItem('currentSchool');
      localStorage.removeItem('currentSchoolId');
      localStorage.removeItem('currentLocation');

      const response = await axios.post(`${API_URL}/users/login`, { username, password });
      console.log('Login successful:', response.data);

      try {
        if (response.data.token) {
          auth.setToken(response.data.token);
        }
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        try {
          const yearsRes = await axios.get(`${API_URL}/org/academic-years`, {
            headers: { Authorization: `Bearer ${response.data.token}` },
          });
          const yearsList = yearsRes.data.academic_years || [];
          if (yearsList.length > 0) {
            const targetYear = '2026-2027';
            const hasTarget = yearsList.some((y: any) => y.name === targetYear);
            localStorage.setItem('academicYear', hasTarget ? targetYear : yearsList[0].name);
          }
        } catch (err) {
          console.warn('Could not fetch academic years during login', err);
        }
      } catch (ex) {
        console.warn('Could not persist to localStorage', ex);
      }

      onLoginSuccess(response.data.user);
      setLoading(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Invalid username or password';
      setError(msg);
      setLoading(false);
    }
  };

  /* ── Forgot password – request OTP ── */
  const requestOtp = async () => {
    resetMessages();
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/users/forgot-password`, { email });
      setMessage(response.data.message || 'OTP has been sent to your email.');
      setView('forgot-otp');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestOtp();
  };

  /* ── Verify OTP ── */
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/users/verify-otp`, { email, otp });
      setMessage('OTP verified. Please set a new password.');
      setView('forgot-reset');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Reset password ── */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/users/reset-password`, {
        email,
        otp,
        new_password: newPassword,
      });
      setMessage(response.data.message || 'Password successfully reset! You can now login.');
      setTimeout(() => {
        setView('login');
        setEmail('');
        setOtp('');
        setNewPassword('');
        setPassword('');
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Input focus handlers for border highlight ── */
  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = '#1a3c8f';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,60,143,0.12)';
  };
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = '#e2e8f0';
    e.currentTarget.style.boxShadow = 'none';
  };

  /* ══════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════ */
  return (
    <div style={styles.root}>
      {/* ── LEFT PANEL ── */}
      <div style={styles.leftPanel} aria-hidden="true" />

      {/* ── RIGHT PANEL ── */}
      <div style={styles.rightPanel}>
        <CurvedDivider />
        <WaveDecor />
        {/*Branch}
        {/* ── Logo ── */}
        <div style={{ ...styles.formWrapper, marginBottom: 5 }}>
          <div style={styles.logoBlock}>
            <img src={HifzAcademyLogo} alt="Hifz Academy" style={styles.logoImg} />
          </div>
        </div>
        <div style={{ ...styles.formWrapper, marginBottom: 10 }}>
          <div style={styles.logoBlock}>
            <img src={Learnspacelogo} alt="MS LearnSpace" style={styles.logoImg} />
          </div>

          {/* ════ LOGIN VIEW ════ */}
          {view === 'login' && (
            <form onSubmit={handleLogin} noValidate>
              {/* Username */}
              <div
                style={styles.inputRow}
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                <span style={styles.inputIcon}><UserIcon /></span>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={styles.input}
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div
                style={styles.inputRow}
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                <span style={styles.inputIcon}><LockIcon /></span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {error && <p style={styles.errorMsg}>{error}</p>}
              {message && <p style={styles.successMsg}>{message}</p>}

              {/* Login button */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                style={{
                  ...styles.loginBtn,
                  ...(loading ? styles.loginBtnDisabled : {}),
                }}
                onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                title="Login to your account"
              >
                {loading ? 'Logging in…' : <>Login <ArrowIcon /></>}
              </button>

              {/* Forgot password */}
              <button
                type="button"
                style={styles.forgotLink}
                onClick={() => { setView('forgot-email'); resetMessages(); }}
              >
                Forgot Password?
              </button>
            </form>
          )}

          {/* ════ FORGOT PASSWORD – EMAIL VIEW ════ */}
          {view === 'forgot-email' && (
            <form onSubmit={handleForgotPassword} noValidate>
              <p style={styles.subTitle}>
                Enter your registered email address to receive an OTP.
              </p>

              <div
                style={styles.inputRow}
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                <span style={styles.inputIcon}><EmailIcon /></span>
                <input
                  id="forgot-email-input"
                  type="email"
                  placeholder="Email Address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  autoComplete="email"
                />
              </div>

              {error && <p style={styles.errorMsg}>{error}</p>}

              <button
                id="forgot-send-otp"
                type="submit"
                disabled={loading}
                style={{ ...styles.loginBtn, ...(loading ? styles.loginBtnDisabled : {}) }}
              >
                {loading ? 'Sending OTP…' : <>Send OTP <ArrowIcon /></>}
              </button>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button type="button" style={styles.smallLink} onClick={() => { setView('login'); resetMessages(); }}>
                  ← Back to Login
                </button>
              </div>
            </form>
          )}

          {/* ════ FORGOT PASSWORD – OTP VIEW ════ */}
          {view === 'forgot-otp' && (
            <form onSubmit={handleVerifyOTP} noValidate>
              <p style={styles.subTitle}>
                We've sent a 6-digit OTP to <strong>{email}</strong>
              </p>

              <div
                style={styles.inputRow}
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                <span style={styles.inputIcon}><KeyIcon /></span>
                <input
                  id="forgot-otp-input"
                  type="text"
                  placeholder="Enter OTP"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={{ ...styles.input, letterSpacing: '4px', textAlign: 'center' }}
                />
              </div>

              {error && <p style={styles.errorMsg}>{error}</p>}
              {message && <p style={styles.successMsg}>{message}</p>}

              <button
                id="forgot-verify-otp"
                type="submit"
                disabled={loading}
                style={{ ...styles.loginBtn, ...(loading ? styles.loginBtnDisabled : {}) }}
              >
                {loading ? 'Verifying…' : <>Verify OTP <ArrowIcon /></>}
              </button>

              <div style={styles.rowBetween}>
                <button type="button" style={styles.smallLink} onClick={() => { setView('forgot-email'); resetMessages(); }}>
                  Change Email
                </button>
                <button type="button" style={styles.smallLinkBlue} onClick={() => requestOtp()} disabled={loading}>
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          {/* ════ FORGOT PASSWORD – RESET VIEW ════ */}
          {view === 'forgot-reset' && (
            <form onSubmit={handleResetPassword} noValidate>
              <p style={styles.subTitle}>
                OTP verified! Please enter your new password below.
              </p>

              <div
                style={styles.inputRow}
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                <span style={styles.inputIcon}><LockIcon /></span>
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New Password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {error && <p style={styles.errorMsg}>{error}</p>}
              {message && <p style={styles.successMsg}>{message}</p>}

              <button
                id="reset-submit"
                type="submit"
                disabled={loading}
                style={{ ...styles.loginBtn, ...(loading ? styles.loginBtnDisabled : {}) }}
              >
                {loading ? 'Resetting…' : <>Set New Password <ArrowIcon /></>}
              </button>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button type="button" style={styles.smallLink} onClick={() => { setView('login'); resetMessages(); }}>
                  Cancel & Back to Login
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── DE Logo watermark (bottom right) ── */}
        <div style={styles.deLogoWrapper}>
          <img src={DeLogo} alt="DE" style={styles.deLogoImg} />
        </div>
      </div>
    </div>
  );
};

export default Login;
