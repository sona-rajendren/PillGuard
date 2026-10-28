import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { errMsg } from '../api';
import { useAuth } from '../auth';

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
const emptyDrug = { name: '', dose: '', times: '08:00' };

export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const isDoc = user.role === 'doctor';
  const [p, setP] = useState(null), [adh, setAdh] = useState(null), [gl, setGl] = useState([]), [bp, setBp] = useState([]);
  const [rx, setRx] = useState([]), [alerts, setAlerts] = useState([]), [err, setErr] = useState('');
  const [drugs, setDrugs] = useState([{ ...emptyDrug }]), [notes, setNotes] = useState(''), [end, setEnd] = useState('');
  const [msg, setMsg] = useState(''), [newMed, setNewMed] = useState(''), [ix, setIx] = useState(null), [cg, setCg] = useState('');
  const [th, setTh] = useState({});

  const load = useCallback(async () => {
    try {
      const [a, b, g, c, d, e] = await Promise.all([
        api.get(`/patients/${id}`), api.get(`/doses/adherence/${id}?range=30d`),
        api.get(`/vitals/${id}?type=glucose&days=30`), api.get(`/vitals/${id}?type=bp&days=30`),
        api.get(`/prescriptions?patientId=${id}`), api.get(`/alerts?patientId=${id}`),
      ]);
      setP(a.data); setTh((t) => (Object.keys(t).length ? t : a.data.thresholds)); setAdh(b.data);
      setGl(g.data.map((v) => ({ t: fmt(v.recordedAt), v: v.value })));
      setBp(c.data.map((v) => ({ t: fmt(v.recordedAt), sys: v.systolic, dia: v.diastolic })));
      setRx(d.data); setAlerts(e.data);
    } catch (e) { setErr(errMsg(e)); }
  }, [id]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };
  const issue = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const body = { patientId: id, notes, endDate: end || undefined,
        drugs: drugs.map((d) => ({ name: d.name, dose: d.dose, times: d.times.split(',').map((t) => t.trim()).filter(Boolean) })) };
      const { data } = await api.post('/prescriptions', body);
      setDrugs([{ ...emptyDrug }]); setNotes(''); setEnd('');
      flash(data.interaction ? `Issued. ⚠ ${data.interaction.summary}` : 'Prescription issued'); load();
    } catch (e) { setErr(errMsg(e)); }
  };
  const del = async (rid) => { if (confirm('Delete this prescription?')) { await api.delete(`/prescriptions/${rid}`); load(); } };
  const toggle = async (r) => { await api.put(`/prescriptions/${r._id}`, { status: r.status === 'active' ? 'completed' : 'active' }); load(); };
  const check = async () => {
    try {
      const existing = rx.filter((r) => r.status === 'active').flatMap((r) => r.drugs.map((d) => d.name));
      setIx((await api.post('/ai/interaction-check', { existingMeds: existing, newMed })).data);
    } catch (e) { setErr(errMsg(e)); }
  };
  const saveTh = async () => { try { await api.put(`/patients/${id}/thresholds`, th); flash('Thresholds saved'); } catch (e) { setErr(errMsg(e)); } };
  const addCg = async () => { try { await api.post(`/patients/${id}/caregivers`, { email: cg }); setCg(''); flash('Caregiver linked'); load(); } catch (e) { setErr(errMsg(e)); } };

  if (!p) return <p>{err || 'Loading…'}</p>;
  const t = p.thresholds;
  return (
    <div>
      <h2>{p.name} <span className="muted small">{p.age ? `${p.age} yrs · ` : ''}{p.conditions?.join(', ')}</span></h2>
      <p className="muted small">Doctor: {p.doctor?.name || '—'} · Caregivers: {p.caregivers?.map((c) => c.name).join(', ') || '—'}</p>
      {err && <div className="error" onClick={() => setErr('')}>{err}</div>}
      {msg && <div className="ok">{msg}</div>}

      <div className="grid2">
        <div className="card">
          <h3>Adherence — last 30 days {adh?.percent != null && <span className="pill green">{adh.percent}%</span>}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={adh?.days.map((d) => ({ ...d, date: d.date.slice(5) }))}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={10} /><YAxis allowDecimals={false} /><Tooltip /><Legend />
              <Bar dataKey="taken" stackId="a" fill="#2e9e6b" /><Bar dataKey="missed" stackId="a" fill="#d94b4b" /><Bar dataKey="skipped" stackId="a" fill="#e0a526" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Blood glucose (mg/dL)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={gl}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="t" fontSize={10} /><YAxis domain={['auto', 'auto']} /><Tooltip />
              <ReferenceLine y={t.glucoseMax} stroke="#d94b4b" strokeDasharray="4 4" /><ReferenceLine y={t.glucoseMin} stroke="#d94b4b" strokeDasharray="4 4" />
              <Line dataKey="v" stroke="#3b6fd4" dot /></LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Blood pressure (mmHg)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={bp}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="t" fontSize={10} /><YAxis domain={['auto', 'auto']} /><Tooltip /><Legend />
              <ReferenceLine y={t.sysMax} stroke="#d94b4b" strokeDasharray="4 4" />
              <Line dataKey="sys" name="Systolic" stroke="#d94b4b" /><Line dataKey="dia" name="Diastolic" stroke="#3b6fd4" /></LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Alerts</h3>
          {!alerts.length && <p className="muted">No alerts</p>}
          {alerts.slice(0, 8).map((a) => (
            <div key={a._id} className={`alert-line ${a.severity} ${a.acknowledged ? 'done' : ''}`}>
              <span>{a.message}</span>
              {!a.acknowledged && <button className="btn small" onClick={async () => { await api.put(`/alerts/${a._id}/ack`); load(); }}>Ack</button>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Prescriptions</h3>
          {!rx.length && <p className="muted">None yet</p>}
          {rx.map((r) => (
            <div key={r._id} className="rx">
              <div>{r.drugs.map((d) => <div key={d.name}><b>{d.name}</b> {d.dose} — {d.times.join(', ')}</div>)}
                <span className={`pill ${r.status === 'active' ? 'green' : 'grey'}`}>{r.status}</span> <span className="muted small">{r.notes}</span></div>
              {isDoc && <div className="row"><button className="btn small ghost" onClick={() => toggle(r)}>{r.status === 'active' ? 'Complete' : 'Reactivate'}</button>
                <button className="btn small danger" onClick={() => del(r._id)}>Delete</button></div>}
            </div>
          ))}
        </div>
        {isDoc ? (
          <form className="card" onSubmit={issue}>
            <h3>Issue digital prescription</h3>
            {drugs.map((d, i) => (
              <div className="row wrap" key={i}>
                <input placeholder="Drug" value={d.name} required onChange={(e) => setDrugs(drugs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <input placeholder="Dose (500 mg)" value={d.dose} onChange={(e) => setDrugs(drugs.map((x, j) => (j === i ? { ...x, dose: e.target.value } : x)))} />
                <input placeholder="Times 08:00,20:00" value={d.times} required onChange={(e) => setDrugs(drugs.map((x, j) => (j === i ? { ...x, times: e.target.value } : x)))} />
              </div>
            ))}
            <a className="link" onClick={() => setDrugs([...drugs, { ...emptyDrug }])}>+ add another drug</a>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} title="End date (optional)" />
            <input placeholder="Notes (e.g. after meals)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button className="btn">Issue prescription</button>
            <p className="muted small">New drugs are auto-screened against current medications.</p>
          </form>
        ) : (
          <div className="card"><h3>Link a caregiver</h3>
            <div className="row"><input placeholder="Caregiver email" value={cg} onChange={(e) => setCg(e.target.value)} /><button className="btn" onClick={addCg}>Link</button></div></div>
        )}
      </div>

      <div className="grid2">
        <div className="card">
          <h3>🤖 Drug interaction checker</h3>
          <div className="row"><input placeholder="New medicine name" value={newMed} onChange={(e) => setNewMed(e.target.value)} />
            <button className="btn" disabled={!newMed} onClick={check}>Check</button></div>
          {ix && <div className={`ix ${ix.severity}`}><b>Severity: {ix.severity}</b><p>{ix.summary}</p>
            <ul>{ix.details?.map((d, i) => <li key={i}>{d}</li>)}</ul><p className="muted small">{ix.disclaimer} · Source: {ix.source}</p></div>}
        </div>
        {isDoc && (
          <div className="card">
            <h3>Emergency thresholds</h3>
            <div className="row wrap">
              {[['glucoseMin', 'Glucose min'], ['glucoseMax', 'Glucose max'], ['sysMax', 'Systolic max'], ['diaMax', 'Diastolic max']].map(([k, l]) => (
                <label key={k} className="small">{l}<input type="number" value={th[k] ?? ''} onChange={(e) => setTh({ ...th, [k]: Number(e.target.value) })} /></label>))}
            </div>
            <button className="btn" onClick={saveTh}>Save thresholds</button>
          </div>
        )}
      </div>
    </div>
  );
}
