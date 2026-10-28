import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../auth';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'doctor', doctorEmail: '', age: '' });
  const [err, setErr] = useState('');
  const { login } = useAuth();
  const nav = useNavigate();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const body = mode === 'login' ? { email: f.email, password: f.password }
        : { ...f, age: f.age ? Number(f.age) : undefined, doctorEmail: f.role === 'patient' ? f.doctorEmail || undefined : undefined };
      const { data } = await api.post(`/auth/${mode}`, body);
      login(data); nav('/');
    } catch (e) { setErr(errMsg(e)); }
  };

  return (
    <form className="card auth" onSubmit={submit}>
      <h2>💊 PillGuard</h2>
      <p className="muted">Chronic care remote monitoring &amp; pill compliance</p>
      {mode === 'register' && <>
        <input placeholder="Full name" value={f.name} onChange={set('name')} required />
        <select value={f.role} onChange={set('role')}>
          <option value="doctor">Doctor</option><option value="patient">Patient</option><option value="caregiver">Caregiver</option>
        </select>
        {f.role === 'patient' && <>
          <input placeholder="Your doctor's email (optional)" value={f.doctorEmail} onChange={set('doctorEmail')} />
          <input type="number" placeholder="Age" value={f.age} onChange={set('age')} />
        </>}
      </>}
      <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
      <input type="password" placeholder="Password (min 6)" value={f.password} onChange={set('password')} required />
      {err && <div className="error">{err}</div>}
      <button className="btn">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <a className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
        {mode === 'login' ? 'New here? Register' : 'Have an account? Sign in'}
      </a>
      <p className="muted small">Demo: doctor@demo.com / patient@demo.com / caregiver@demo.com — password123</p>
    </form>
  );
}
