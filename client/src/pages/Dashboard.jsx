import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth';

export default function Dashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const load = useCallback(async () => {
    const [p, a] = await Promise.all([api.get('/patients'), api.get('/alerts?acknowledged=false')]);
    setPatients(p.data); setAlerts(a.data);
  }, []);
  useEffect(() => { if (user.role === 'patient') return; load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load, user.role]);

  if (user.role === 'patient') return <Navigate to={`/patients/${user._id}`} replace />;
  const ack = async (id) => { await api.put(`/alerts/${id}/ack`); load(); };
  const color = (p) => (p == null ? 'grey' : p >= 85 ? 'green' : p >= 60 ? 'amber' : 'red');

  return (
    <div className="grid2">
      <section>
        <h2>My patients</h2>
        {!patients.length && <p className="muted">No patients linked yet. Patients can register with your email as their doctor.</p>}
        <div className="cards">
          {patients.map((p) => (
            <Link key={p._id} to={`/patients/${p._id}`} className="card patient">
              <b>{p.name}</b>
              <span className="muted small">{p.profile.age ? `${p.profile.age} yrs · ` : ''}{p.profile.conditions.join(', ')}</span>
              <div className="row">
                <span className={`pill ${color(p.adherence)}`}>{p.adherence == null ? 'No data' : `${p.adherence}% adherence (7d)`}</span>
                {p.openAlerts > 0 && <span className="pill red">{p.openAlerts} alert{p.openAlerts > 1 ? 's' : ''}</span>}
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2>Active alerts</h2>
        {!alerts.length && <p className="muted">All clear ✅</p>}
        {alerts.map((a) => (
          <div key={a._id} className={`card alert ${a.severity}`}>
            <div><b>{a.type.replace('_', ' ')}</b> · <span className="muted small">{new Date(a.createdAt).toLocaleString()}</span></div>
            <div>{a.message}</div>
            <button className="btn small" onClick={() => ack(a._id)}>Acknowledge</button>
          </div>
        ))}
      </section>
    </div>
  );
}
