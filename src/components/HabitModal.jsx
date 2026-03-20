// src/components/HabitModal.jsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { todayStr } from '../utils/dates'

const EMOJI_OPTIONS = ['💪','🏃','📚','🧘','💧','🥗','😴','✍️','🎯','🧠','🚴','🏋️','🚭','📵','🍷','🍬']
const DAYS_OF_WEEK  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function HabitModal({ habit, onSave, onClose }) {
  const editing = !!habit?.id

  const [form, setForm] = useState({
    name:          '',
    type:          'good',
    identity:      '',
    emoji:         '💪',
    isMeasured:    false,
    unit:          '',
    goal:          '',
    goalDirection: 'atleast',
    cue:           '',
    startDate:     todayStr(),
    frequency:     'daily',
    weeklyCount:   3,
    weeklyDays:    [],
    ...habit,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleWeekDay = (dayNum) => {
    const current = form.weeklyDays || []
    const next = current.includes(dayNum)
      ? current.filter(d => d !== dayNum)
      : [...current, dayNum].sort()
    set('weeklyDays', next)
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return
    onSave({
      name:          form.name.trim(),
      type:          form.type,
      identity:      form.identity.trim(),
      emoji:         form.emoji,
      isMeasured:    form.isMeasured,
      unit:          form.unit.trim(),
      goal:          form.goal !== '' ? Number(form.goal) : null,
      goalDirection: form.goalDirection,
      cue:           form.cue.trim(),
      startDate:     form.startDate || todayStr(),
      frequency:     form.frequency,
      weeklyCount:   form.frequency === 'weekly' ? Number(form.weeklyCount) : null,
      weeklyDays:    form.frequency === 'weekly' ? (form.weeklyDays || []) : [],
    })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <h2 className="modal-title" style={{ marginBottom:0 }}>{editing ? 'Edit habit' : 'New habit'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18}/></button>
        </div>

        {/* Type */}
        <div className="form-group">
          <label className="form-label">Habit type</label>
          <div className="type-toggle">
            <button className={`type-btn good ${form.type==='good'?'active':''}`} onClick={() => set('type','good')}>✓ Build (good habit)</button>
            <button className={`type-btn bad  ${form.type==='bad' ?'active':''}`} onClick={() => set('type','bad')} >✕ Break (bad habit)</button>
          </div>
        </div>

        {/* Emoji */}
        <div className="form-group">
          <label className="form-label">Icon</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {EMOJI_OPTIONS.map(e => (
              <button key={e} onClick={() => set('emoji', e)} style={{
                fontSize:22, padding:'4px 6px', border:'2px solid',
                borderColor: form.emoji===e ? 'var(--accent)' : 'var(--paper-3)',
                borderRadius:8, background: form.emoji===e ? '#fff3ee' : 'white', cursor:'pointer',
              }}>{e}</button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="form-group">
          <label className="form-label">Habit name *</label>
          <input className="form-input"
            placeholder={form.type==='good' ? 'e.g. Read 20 minutes' : 'e.g. No junk food'}
            value={form.name} onChange={e => set('name', e.target.value)}/>
        </div>

        {/* Identity */}
        <div className="form-group">
          <label className="form-label">Identity reminder <span style={{fontWeight:400,textTransform:'none',letterSpacing:0,color:'var(--ink-muted)'}}>— who are you becoming?</span></label>
          <input className="form-input"
            placeholder='"I am someone who prioritises health"'
            value={form.identity} onChange={e => set('identity', e.target.value)}/>
        </div>

        {/* Start date + Cue */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start date</label>
            <input className="form-input" type="date"
              value={form.startDate} onChange={e => set('startDate', e.target.value)}/>
          </div>
          <div className="form-group">
            <label className="form-label">Cue / trigger</label>
            <input className="form-input"
              placeholder='"After morning coffee"'
              value={form.cue} onChange={e => set('cue', e.target.value)}/>
          </div>
        </div>

        {/* Frequency */}
        <div className="form-group">
          <label className="form-label">Frequency</label>
          <div className="type-toggle">
            <button className={`type-btn good ${form.frequency==='daily'  ?'active':''}`} onClick={() => set('frequency','daily')  }>Every day</button>
            <button className={`type-btn good ${form.frequency==='weekly' ?'active':''}`} onClick={() => set('frequency','weekly') }>Weekly target</button>
          </div>
        </div>

        {form.frequency === 'weekly' && (
          <div className="form-group" style={{ background:'var(--paper-2)', borderRadius:'var(--radius)', padding:14 }}>
            <label className="form-label" style={{ marginBottom:10 }}>Days per week (flexible)</label>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <input className="form-input" type="number" min={1} max={6}
                value={form.weeklyCount}
                onChange={e => set('weeklyCount', e.target.value)}
                style={{ width:64 }}/>
              <span style={{ fontSize:13, color:'var(--ink-muted)' }}>days / week</span>
            </div>
            <label className="form-label" style={{ marginBottom:8 }}>Or fix specific days (optional)</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {DAYS_OF_WEEK.map((day, i) => (
                <button key={i} onClick={() => toggleWeekDay(i)} style={{
                  padding:'5px 10px', borderRadius:20, fontSize:12, fontWeight:700,
                  border:'2px solid',
                  borderColor: (form.weeklyDays||[]).includes(i) ? 'var(--good)' : 'var(--paper-3)',
                  background:  (form.weeklyDays||[]).includes(i) ? 'var(--good-bg)' : 'white',
                  color:       (form.weeklyDays||[]).includes(i) ? 'var(--good)' : 'var(--ink-muted)',
                  cursor:'pointer',
                }}>{day}</button>
              ))}
            </div>
          </div>
        )}

        {/* Measurement */}
        <div className="form-group" style={{ marginTop:4 }}>
          <label className="form-label" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="checkbox" checked={form.isMeasured}
              onChange={e => set('isMeasured', e.target.checked)} style={{ width:14, height:14 }}/>
            Track a measurement (km, mins, hrs, pages…)
          </label>
        </div>

        {form.isMeasured && (
          <div style={{ background:'var(--paper-2)', borderRadius:'var(--radius)', padding:14, marginBottom:16 }}>
            <div className="form-row" style={{ marginBottom:0 }}>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Unit</label>
                <input className="form-input" placeholder="km / hrs / pages…"
                  value={form.unit} onChange={e => set('unit', e.target.value)}/>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Goal direction</label>
                <select className="form-select" value={form.goalDirection}
                  onChange={e => set('goalDirection', e.target.value)}>
                  <option value="atleast">At least ≥</option>
                  <option value="atmost">At most ≤</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Goal value</label>
                <input className="form-input" type="number" min="0" placeholder="e.g. 7"
                  value={form.goal} onChange={e => set('goal', e.target.value)}/>
              </div>
            </div>
            {form.goal !== '' && (
              <div style={{ fontSize:12, color:'var(--ink-muted)', marginTop:10 }}>
                ✓ Success = log value {form.goalDirection === 'atleast' ? '≥' : '≤'} {form.goal} {form.unit}
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{editing ? 'Save changes' : 'Add habit'}</button>
        </div>
      </div>
    </div>
  )
}
