// src/components/HabitModal.jsx
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const EMOJI_OPTIONS = ['💪', '🏃', '📚', '🧘', '💧', '🥗', '😴', '✍️', '🎯', '🧠', '🚴', '🏋️', '🚭', '📵', '🍷', '🍬']

export default function HabitModal({ habit, onSave, onClose }) {
  const editing = !!habit?.id

  const [form, setForm] = useState({
    name: '',
    type: 'good',
    identity: '',
    emoji: '💪',
    isMeasured: false,
    unit: '',
    goal: '',
    cue: '',
    reward: '',
    ...habit,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.name.trim()) return
    onSave({
      name: form.name.trim(),
      type: form.type,
      identity: form.identity.trim(),
      emoji: form.emoji,
      isMeasured: form.isMeasured,
      unit: form.unit.trim(),
      goal: form.goal ? Number(form.goal) : null,
      cue: form.cue.trim(),
      reward: form.reward.trim(),
    })
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
          <h2 className="modal-title" style={{ marginBottom:0 }}>
            {editing ? 'Edit habit' : 'New habit'}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Type toggle */}
        <div className="form-group">
          <label className="form-label">Habit type</label>
          <div className="type-toggle">
            <button
              className={`type-btn good ${form.type === 'good' ? 'active' : ''}`}
              onClick={() => set('type', 'good')}
            >✓ Build (good habit)</button>
            <button
              className={`type-btn bad ${form.type === 'bad' ? 'active' : ''}`}
              onClick={() => set('type', 'bad')}
            >✕ Break (bad habit)</button>
          </div>
        </div>

        {/* Emoji picker */}
        <div className="form-group">
          <label className="form-label">Icon</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                onClick={() => set('emoji', e)}
                style={{
                  fontSize:22, padding:'4px 6px', border: '2px solid',
                  borderColor: form.emoji === e ? 'var(--accent)' : 'var(--paper-3)',
                  borderRadius: 8, background: form.emoji === e ? '#fff3ee' : 'white',
                  cursor:'pointer',
                }}
              >{e}</button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="form-group">
          <label className="form-label">Habit name *</label>
          <input
            className="form-input"
            placeholder={form.type === 'good' ? 'e.g. Read 20 minutes' : 'e.g. No social media after 9pm'}
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />
        </div>

        {/* Identity */}
        <div className="form-group">
          <label className="form-label">Identity reminder <span style={{fontWeight:400,textTransform:'none',letterSpacing:0,color:'var(--ink-muted)'}}>(Who are you becoming?)</span></label>
          <input
            className="form-input"
            placeholder='e.g. "I am someone who prioritises health"'
            value={form.identity}
            onChange={e => set('identity', e.target.value)}
          />
        </div>

        {/* Measurement */}
        <div className="form-group">
          <label className="form-label" style={{display:'flex',alignItems:'center',gap:8}}>
            <input
              type="checkbox"
              checked={form.isMeasured}
              onChange={e => set('isMeasured', e.target.checked)}
              style={{width:14,height:14}}
            />
            Track a measurement (e.g. km, mins, pages)
          </label>
        </div>

        {form.isMeasured && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Unit</label>
              <input
                className="form-input"
                placeholder="km / mins / pages…"
                value={form.unit}
                onChange={e => set('unit', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Daily goal</label>
              <input
                className="form-input"
                type="number" min="0"
                placeholder="e.g. 30"
                value={form.goal}
                onChange={e => set('goal', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Cue & Reward */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Cue / trigger</label>
            <input
              className="form-input"
              placeholder='e.g. "After morning coffee"'
              value={form.cue}
              onChange={e => set('cue', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Reward</label>
            <input
              className="form-input"
              placeholder='e.g. "Check off + 5 min phone"'
              value={form.reward}
              onChange={e => set('reward', e.target.value)}
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {editing ? 'Save changes' : 'Add habit'}
          </button>
        </div>
      </div>
    </div>
  )
}
