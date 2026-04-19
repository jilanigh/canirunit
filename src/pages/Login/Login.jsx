import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Login.module.css';

export default function Login() {
  const { login, user } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Registration Fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    confirmEmail: '',
    password: '',
    confirmPassword: '',
    birthDate: ''
  });

  const navigate = useNavigate();

  if (user) {
    navigate('/');
    return null;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    // Basic Confirmation Checks
    if (isRegistering) {
      if (formData.email !== formData.confirmEmail) return alert("Emails do not match!");
      if (formData.password !== formData.confirmPassword) return alert("Passwords do not match!");
    }

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegistering ? formData : { username: formData.username, password: formData.password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      if (isRegistering) {
        alert("Account created! You can now sign in.");
        setIsRegistering(false);
      } else {
        // Login success
        login({ credential: data.token, isManual: true, userData: data.user });
        navigate('/');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const onSuccess = (response) => {
    login(response);
    navigate('/');
  };

  return (
    <div className={styles.container}>
      <div className={styles.overlay} />
      
      <motion.div 
        className={`${styles.card} ${isRegistering ? styles.cardLarge : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className={styles.logo}>
          <span className={styles.accent}>CY</span>RI
        </div>
        
        <h1 className={styles.title}>
          {isRegistering ? 'Create Account' : 'Welcome Back'}
        </h1>
        
        <form className={styles.form} onSubmit={handleEmailSubmit}>
          {isRegistering ? (
            <>
              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <input name="firstName" placeholder="First Name" onChange={handleChange} required />
                </div>
                <div className={styles.inputGroup}>
                  <input name="lastName" placeholder="Last Name" onChange={handleChange} required />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <input name="username" placeholder="Username" onChange={handleChange} required />
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
                </div>
                <div className={styles.inputGroup}>
                  <input type="email" name="confirmEmail" placeholder="Confirm Email" onChange={handleChange} required />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
                </div>
                <div className={styles.inputGroup}>
                  <input type="password" name="confirmPassword" placeholder="Confirm Password" onChange={handleChange} required />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Date of Birth</label>
                <input type="date" name="birthDate" onChange={handleChange} required />
              </div>
            </>
          ) : (
            <>
              <div className={styles.inputGroup}>
                <input name="username" placeholder="Username" onChange={handleChange} required />
              </div>
              <div className={styles.inputGroup}>
                <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
              </div>
            </>
          )}
          
          <button type="submit" className={styles.submitBtn}>
            {isRegistering ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className={styles.toggleText}>
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? 'Sign In' : 'Register Now'}
          </span>
        </div>

        <div className={styles.divider}>
          <span>OR</span>
        </div>

        <div className={styles.loginWrapper}>
          <GoogleLogin
            onSuccess={onSuccess}
            onError={() => console.log('Login Failed')}
            text={isRegistering ? 'signup_with' : 'signin_with'}
            theme="filled_black"
            shape="pill"
            width="320"
          />
        </div>
      </motion.div>
    </div>
  );
}
