// src/components/TodayPage.jsx
import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { Check, Flame, Pencil, Trash2 } from 'lucide-react'
import { setLog } from '../db'
import { dateStr, friendlyDate, computeStreak, todayStr } from '../utils/dates'

const DAYS_STRIP = 7

function buildDayStrip() {
  return Array.from({ length: DAYS_STRIP }, (_, i) => {
    const d = subDays(new Date(), DAYS_STRIP - 1 - i)
    return { date: d, str: dateStr(d) }
  })
}

export default function TodayPage({ uid, habits, logs, onEdit, onDelete }) {
  const [selectedDay, setSelectedDay] = useState(todayStr())
  const isToday = selectedDay === todayStr()
  const dayStrip = useMemo(buildDayStrip, [])

  // Build a quick lookup: habitId → log for selected day
  const logMap = useMemo(() => {
    const m = {}
    logs.forEach(l => { if (l.date === selectedDay) m[l.habitId] = l })
    return m
  }, [logs, selectedDay])

  const streakMap = useMemo(() => {
    const m = {}
    habits.forEach(h => { m[h.id] = computeStreak(h.id, h.type, logs) })
    return m
  }, [habits, logs])

  const toggle = async (habit) => {
    if (!isToday) return // only allow logging today
    const current = logMap[habit.id]
    const done = !current?.done
    await setLog(uid, habit.id, selectedDay, { done, value: current?.value ?? null })
  }

  const setMeasure = async (habit, value) => {
    if (!isToday) return
    const current = logMap[habit.id]
    await setLog(uid, habit.id, selectedDay, { done: value > 0, value: Number(value) })
  }

  const goodHabits = habits.filter(h => h.type === 'good')
  const badHabits  = habits.filter(h => h.type === 'bad')
  const doneCount  = habits.filter(h => logMap[h.id]?.done).length
  const pct        = habits.length ? Math.round((doneCount / habits.length) * 100) : 0

  return (
    <div>
      {/* Day strip */}
      <div className="date-strip">
        {dayStrip.map(({ date, str }) => (
          <div
            key={str}
            className={`date-chip ${selectedDay === str ? 'active' : ''}`}
            onClick={() => setSelectedDay(str)}
          >
            <span className="day-num">{format(date, 'd')}</span>
            <span>{format(date, 'EEE')}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div style={{
          background:'white', border:'1px solid var(--paper-3)',
          borderRadius:'var(--radius-lg)', padding:'20px 24px',
          marginBottom:24, boxShadow:'var(--shadow)',
          display:'flex', alignItems:'center', gap:20
        }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>
                {friendlyDate(new Date(selectedDay + 'T12:00:00'))} — {doneCount} / {habits.length} complete
              </span>
              <span style={{ fontSize:13, fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--accent)' }}>
                {pct}%
              </span>
            </div>
            <div style={{ height:8, background:'var(--paper-2)', borderRadius:4, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:4,
                background: pct === 100 ? 'var(--good)' : 'var(--accent)',
                width: pct + '%', transition:'width 0.4s'
              }}/>
            </div>
          </div>
        </div>
      )}

      {/* Good habits */}
      {goodHabits.length > 0 && (
        <>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-muted)', marginBottom:10 }}>
            Build
          </div>
          <div className="habits-list" style={{ marginBottom:24 }}>
            {goodHabits.map(h => (
              <HabitRow
                key={h.id}
                habit={h}
                log={logMap[h.id]}
                streak={streakMap[h.id] ?? 0}
                isToday={isToday}
                onToggle={() => toggle(h)}
                onMeasure={v => setMeasure(h, v)}
                onEdit={() => onEdit(h)}
                onDelete={() => onDelete(h)}
              />
            ))}
          </div>
        </>
      )}

      {/* Bad habits */}
      {badHabits.length > 0 && (
        <>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-muted)', marginBottom:10 }}>
            Break
          </div>
          <div className="habits-list">
            {badHabits.map(h => (
              <HabitRow
                key={h.id}
                habit={h}
                log={logMap[h.id]}
                streak={streakMap[h.id] ?? 0}
                isToday={isToday}
                onToggle={() => toggle(h)}
                onMeasure={v => setMeasure(h, v)}
                onEdit={() => onEdit(h)}
                onDelete={() => onDelete(h)}
              />
            ))}
          </div>
        </>
      )}

      {habits.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">No habits yet</div>
          <div className="empty-state-sub">Add your first habit using the button above.</div>
        </div>
      )}
    </div>
  )
}

function HabitRow({ habit, log, streak, isToday, onToggle, onMeasure, onEdit, onDelete }) {
  const done = !!log?.done
  const isBad = habit.type === 'bad'
  // For bad habits, "done" means they slipped up → show as negative
  const checkClass = done ? (isBad ? 'checked-bad' : 'checked') : ''

  return (
    <div className={`habit-row type-${habit.type} ${done ? 'completed' : ''}`}>
      <div
        className={`habit-check ${checkClass}`}
        onClick={isToday ? onToggle : undefined}
        style={{ cursor: isToday ? 'pointer' : 'default' }}
        title={isToday ? (done ? 'Mark undone' : 'Mark done') : 'Cannot edit past days'}
      >
        {done && <Check size={14} color="white" strokeWidth={3} />}
      </div>

      <div className="habit-info">
        <div className="habit-name">{habit.emoji} {habit.name}</div>
        <div className="habit-meta">
          {habit.identity && (
            <span className="habit-identity">"{habit.identity}"</span>
          )}
          {streak > 0 && (
            <span className="streak-badge">
              <Flame size={10} /> {streak}d
            </span>
          )}
          <span className={`habit-type-pill ${habit.type}`}>
            {isBad ? 'break' : 'build'}
          </span>
        </div>
        {habit.cue && (
          <div style={{ fontSize:11, color:'var(--ink-muted)', marginTop:2 }}>
            📍 {habit.cue}
          </div>
        )}
      </div>

      {/* Measurement input */}
      {habit.isMeasured && isToday && (
        <div className="measurement-input-wrap">
          <input
            className="measurement-input"
            type="number" min="0"
            value={log?.value ?? ''}
            placeholder="0"
            onChange={e => onMeasure(e.target.value)}
          />
          <span className="measurement-unit">{habit.unit}</span>
          {habit.goal && (
            <span style={{ fontSize:10, color:'var(--ink-muted)' }}>/{habit.goal}</span>
          )}
        </div>
      )}

      {habit.isMeasured && !isToday && log?.value != null && (
        <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--ink-muted)' }}>
          {log.value} {habit.unit}
        </span>
      )}

      {/* Actions */}
      <div className="habit-actions">
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} title="Edit">
          <Pencil size={14} />
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onDelete} title="Delete"
          style={{ color:'var(--bad)' }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
