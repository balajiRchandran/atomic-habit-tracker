// src/components/SettingsPage.jsx
import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { setProfile, getProfile } from '../db'
import { LogOut, Save } from 'lucide-react'

export default function SettingsPage({ uid, user, habits, onEdit, onDelete }) {
  const [identity, setIdentity] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getProfile(uid).then(p => { if (p.identity) setIdentity(p.identity) })
  }, [uid])

  const saveIdentity = async () => {
    await setProfile(uid, { identity })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      {/* Identity */}
      <section style={{ marginBottom:40 }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, marginBottom:6 }}>Your identity</h3>
        <p style={{ fontSize:13, color:'var(--ink-muted)', marginBottom:16, lineHeight:1.6 }}>
          In <em>Atomic Habits</em>, Clear argues that lasting change comes from identity, not outcomes. Who are you becoming?
        </p>
        <div className="form-group">
          <label className="form-label">Complete the sentence: "I am someone who…"</label>
          <textarea
            className="form-textarea"
            value={identity}
            onChange={e => setIdentity(e.target.value)}
            placeholder='e.g. "...prioritises health, learns every day, and shows up consistently."'
            rows={3}
          />
        </div>
        <button className="btn btn-primary" onClick={saveIdentity}>
          <Save size={14} /> {saved ? 'Saved!' : 'Save identity'}
        </button>
      </section>

      {/* All habits list */}
      <section style={{ marginBottom:40 }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, marginBottom:16 }}>All habits</h3>
        {habits.length === 0 && (
          <p style={{ color:'var(--ink-muted)', fontSize:14 }}>No habits yet. Add one from the Today page.</p>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {habits.map(h => (
            <div key={h.id} style={{
              display:'flex', alignItems:'center', gap:12,
              background:'white', border:'1px solid var(--paper-3)',
              borderRadius:'var(--radius-lg)', padding:'14px 18px',
              boxShadow:'var(--shadow)'
            }}>
              <span style={{ fontSize:20 }}>{h.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700 }}>{h.name}</div>
                {h.identity && <div style={{ fontSize:12, color:'var(--ink-muted)', fontStyle:'italic' }}>"{h.identity}"</div>}
                <div style={{ display:'flex', gap:8, marginTop:4 }}>
                  <span className={`habit-type-pill ${h.type}`}>{h.type === 'good' ? 'build' : 'break'}</span>
                  {h.isMeasured && <span style={{ fontSize:10, color:'var(--ink-muted)' }}>📏 {h.unit}</span>}
                  {h.cue && <span style={{ fontSize:10, color:'var(--ink-muted)' }}>📍 {h.cue}</span>}
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => onEdit(h)}>Edit</button>
                <button className="btn btn-sm" style={{ background:'var(--bad-bg)', color:'var(--bad)', border:'none' }} onClick={() => onDelete(h)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Account */}
      <section>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, marginBottom:12 }}>Account</h3>
        <div style={{ background:'white', border:'1px solid var(--paper-3)', borderRadius:'var(--radius-lg)', padding:20 }}>
          <div style={{ fontSize:13, color:'var(--ink-muted)', marginBottom:16 }}>
            Signed in as <strong style={{ color:'var(--ink)' }}>{user?.email || user?.uid?.slice(0,10) + '…'}</strong>
            {user?.isAnonymous && (
              <span style={{ marginLeft:8, fontSize:11, background:'var(--paper-2)', padding:'2px 7px', borderRadius:20 }}>
                Anonymous — data may be lost if you clear browser
              </span>
            )}
          </div>
          <button className="btn btn-secondary" onClick={() => signOut(auth)}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </section>
    </div>
  )
}
