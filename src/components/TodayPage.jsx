// src/components/TodayPage.jsx
import { useState, useMemo, useRef } from 'react'
import { format, subDays } from 'date-fns'
import { Check, Flame, Pencil, Trash2, GripVertical, MessageSquare, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { setLog, updateHabit } from '../db'
import { dateStr, friendlyDate, computeStreak, computeWeeklyStreak,
         consistencyScore, weeklyConsistencyScore, isSuccess,
         computePerfectDays, todayStr } from '../utils/dates'

function buildDayStrip() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return { date: d, str: dateStr(d) }
  })
}

export default function TodayPage({ uid, habits, logs, onEdit, onDelete, identity }) {
  const [selectedDay, setSelectedDay] = useState(todayStr())
  const dayStrip = useMemo(buildDayStrip, [])

  const logMap = useMemo(() => {
    const m = {}
    logs.forEach(l => { if (l.date === selectedDay) m[l.habitId] = l })
    return m
  }, [logs, selectedDay])

  const streakMap = useMemo(() => {
    const m = {}
    habits.forEach(h => {
      m[h.id] = h.frequency === 'weekly'
        ? computeWeeklyStreak(h, logs)
        : computeStreak(h, logs)
    })
    return m
  }, [habits, logs])

  const consistencyMap = useMemo(() => {
    const m = {}
    habits.forEach(h => {
      m[h.id] = h.frequency === 'weekly'
        ? weeklyConsistencyScore(h, logs)
        : consistencyScore(h, logs)
    })
    return m
  }, [habits, logs])

  const perfectDays = useMemo(() =>
    computePerfectDays(habits, logs), [habits, logs])

  const toggle = async (habit) => {
    const current = logMap[habit.id]
    const done = !current?.done
    await setLog(uid, habit.id, selectedDay, { done, value: current?.value ?? null, note: current?.note ?? '' })
  }

  const setMeasure = async (habit, value) => {
    const current = logMap[habit.id]
    const numVal = value === '' ? null : Number(value)
    const done = numVal != null && isSuccess(habit, { value: numVal })
    await setLog(uid, habit.id, selectedDay, { done, value: numVal, note: current?.note ?? '' })
  }

  const setNote = async (habit, note) => {
    const current = logMap[habit.id]
    await setLog(uid, habit.id, selectedDay, {
      done: current?.done ?? false,
      value: current?.value ?? null,
      note,
    })
  }

  // Drag to reorder
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  const handleDragStart = (idx) => { dragItem.current = idx }
  const handleDragEnter = (idx) => { dragOver.current = idx }
  const handleDragEnd   = async () => {
    const from = dragItem.current
    const to   = dragOver.current
    if (from === null || to === null || from === to) return

    const reordered = [...habits]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)

    // Save new order as `order` field
    await Promise.all(reordered.map((h, i) => updateHabit(uid, h.id, { order: i })))
    dragItem.current = null
    dragOver.current = null
  }

  const dailyHabits  = habits.filter(h => h.frequency !== 'weekly')
  const weeklyHabits = habits.filter(h => h.frequency === 'weekly')

  // For selected day's progress bar — only show habits active on that day
  const activeHabits = habits.filter(h => (h.startDate || todayStr()) <= selectedDay)
  const doneCount    = activeHabits.filter(h => isSuccess(h, logMap[h.id])).length
  const pct          = activeHabits.length ? Math.round((doneCount / activeHabits.length) * 100) : 0
  const isPerfect    = activeHabits.length > 0 && dailyHabits.filter(h => (h.startDate||todayStr()) <= selectedDay).every(h => isSuccess(h, logMap[h.id]))

  return (
    <div>
      {/* Identity banner */}
      {identity && (
        <div style={{
          background: 'var(--ink)', color: 'var(--paper)',
          borderRadius: 'var(--radius-lg)', padding: '14px 20px',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Star size={16} style={{ color: 'var(--accent-2)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15 }}>
            "I am someone who {identity}"
          </span>
        </div>
      )}

      {/* Perfect days banner */}
      {perfectDays.total > 0 && (
        <div style={{
          background: '#fffbf0', border: '1px solid var(--accent-2)',
          borderRadius: 'var(--radius-lg)', padding: '12px 20px',
          marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <span style={{ fontSize: 22 }}>🏆</span>
          <div>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
              {perfectDays.total} perfect day{perfectDays.total !== 1 ? 's' : ''}
            </span>
            {perfectDays.thisMonth > 0 && (
              <span style={{ fontSize: 12, color: 'var(--ink-muted)', marginLeft: 10 }}>
                {perfectDays.thisMonth} this month
              </span>
            )}
          </div>
        </div>
      )}

      {/* Day strip */}
      <div className="date-strip">
        {dayStrip.map(({ date, str }) => (
          <div key={str}
            className={`date-chip ${selectedDay === str ? 'active' : ''}`}
            onClick={() => setSelectedDay(str)}
          >
            <span className="day-num">{format(date, 'd')}</span>
            <span>{format(date, 'EEE')}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {activeHabits.length > 0 && (
        <div style={{
          background: 'white', border: '1px solid var(--paper-3)',
          borderRadius: 'var(--radius-lg)', padding: '16px 20px',
          marginBottom: 20, boxShadow: 'var(--shadow)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--ink)' }}>
              {friendlyDate(new Date(selectedDay + 'T12:00:00'))} — {doneCount} / {activeHabits.length} complete
              {isPerfect && <span style={{ marginLeft:8, color:'var(--good)' }}>✦ Perfect day!</span>}
            </span>
            <span style={{ fontSize:13, fontFamily:'var(--font-mono)', fontWeight:700, color: pct===100 ? 'var(--good)' : 'var(--accent)' }}>
              {pct}%
            </span>
          </div>
          <div style={{ height:8, background:'var(--paper-2)', borderRadius:4, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:4, transition:'width 0.4s',
              background: pct===100 ? 'var(--good)' : 'var(--accent)',
              width: pct + '%',
            }}/>
          </div>
        </div>
      )}

      {/* Daily habits */}
      {dailyHabits.length > 0 && (
        <>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-muted)', marginBottom:10 }}>
            Daily
          </div>
          <div className="habits-list" style={{ marginBottom:24 }}>
            {dailyHabits.map((h, idx) => (
              <HabitRow key={h.id} habit={h} log={logMap[h.id]}
                streak={streakMap[h.id] ?? 0}
                consistency={consistencyMap[h.id] ?? 0}
                selectedDay={selectedDay}
                onToggle={() => toggle(h)}
                onMeasure={v => setMeasure(h, v)}
                onNote={n => setNote(h, n)}
                onEdit={() => onEdit(h)}
                onDelete={() => onDelete(h)}
                dragIndex={idx}
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </>
      )}

      {/* Weekly habits */}
      {weeklyHabits.length > 0 && (
        <>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-muted)', marginBottom:10 }}>
            Weekly
          </div>
          <div className="habits-list">
            {weeklyHabits.map((h, idx) => (
              <HabitRow key={h.id} habit={h} log={logMap[h.id]}
                streak={streakMap[h.id] ?? 0}
                consistency={consistencyMap[h.id] ?? 0}
                selectedDay={selectedDay}
                onToggle={() => toggle(h)}
                onMeasure={v => setMeasure(h, v)}
                onNote={n => setNote(h, n)}
                onEdit={() => onEdit(h)}
                onDelete={() => onDelete(h)}
                dragIndex={dailyHabits.length + idx}
                onDragStart={() => handleDragStart(dailyHabits.length + idx)}
                onDragEnter={() => handleDragEnter(dailyHabits.length + idx)}
                onDragEnd={handleDragEnd}
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

function HabitRow({ habit, log, streak, consistency, selectedDay, onToggle, onMeasure, onNote, onEdit, onDelete, onDragStart, onDragEnter, onDragEnd }) {
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState(log?.note || '')

  // Sync note from log changes
  useMemo(() => { setNoteText(log?.note || '') }, [log?.note])

  const success = isSuccess(habit, log)
  const isBad   = habit.type === 'bad'
  const isActive = (habit.startDate || todayStr()) <= selectedDay

  // For checkbox habits: clicking toggles done
  // done means: good habit = did it, bad habit = slipped (red)
  const checkClass = log?.done ? (isBad ? 'checked-bad' : 'checked') : ''

  const handleNoteBlur = () => { onNote(noteText) }

  const goalHint = habit.isMeasured && habit.goal != null
    ? `${habit.goalDirection === 'atleast' ? '≥' : '≤'} ${habit.goal} ${habit.unit}`
    : null

  return (
    <div
      className={`habit-row type-${habit.type} ${success ? 'completed' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
    >
      {/* Drag handle */}
      <div style={{ cursor:'grab', color:'var(--paper-3)', flexShrink:0, paddingRight:2 }}>
        <GripVertical size={16}/>
      </div>


      {/* Info */}
      <div className="habit-info" style={{ flex:1, minWidth:0 }}>
        <div className="habit-name">{habit.emoji} {habit.name}</div>
        <div className="habit-meta">
          {habit.identity && <span className="habit-identity">"{habit.identity}"</span>}
          {streak > 0 && (
            <span className="streak-badge">
              <Flame size={10}/> {streak}{habit.frequency === 'weekly' ? 'w' : 'd'}
            </span>
          )}
          <span style={{ fontSize:11, color:'var(--ink-muted)', fontFamily:'var(--font-mono)' }}>
            {consistency}%
          </span>
          {goalHint && (
            <span style={{ fontSize:10, color:'var(--ink-muted)' }}>{goalHint}</span>
          )}
        </div>
        {habit.cue && (
          <div style={{ fontSize:11, color:'var(--ink-muted)', marginTop:2 }}>📍 {habit.cue}</div>
        )}

        {/* Inline note */}
        {showNote && (
          <textarea
            style={{
              marginTop:8, width:'100%', padding:'6px 10px',
              border:'1px solid var(--paper-3)', borderRadius:'var(--radius)',
              fontSize:12, fontFamily:'var(--font-ui)', color:'var(--ink)',
              background:'var(--paper)', resize:'vertical', minHeight:52,
            }}
            placeholder="Add a note for today…"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onBlur={handleNoteBlur}
          />
        )}
      </div>

      {/* Checkbox */}
      {!habit.isMeasured && (
        <div className={`habit-check ${checkClass}`}
          onClick={isActive ? onToggle : undefined}
          style={{ cursor: isActive ? 'pointer' : 'default', flexShrink:0 }}
          title={isActive ? (log?.done ? 'Mark undone' : 'Mark done') : 'Not started yet'}
        >
          {log?.done && <Check size={14} color="white" strokeWidth={3}/>}
        </div>
      )}

      {/* Measurement input */}
      {habit.isMeasured && isActive && (
        <div className="measurement-input-wrap">
          <div className={`habit-check ${success ? 'checked' : ''}`} style={{ cursor:'default', flexShrink:0 }}>
            {success && <Check size={14} color="white" strokeWidth={3}/>}
          </div>
          <input className="measurement-input" type="number" min="0" step="0.1"
            value={log?.value ?? ''}
            placeholder="0"
            onChange={e => onMeasure(e.target.value)}
          />
          <span className="measurement-unit">{habit.unit}</span>
        </div>
      )}

      {habit.isMeasured && !isActive && log?.value != null && (
        <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--ink-muted)' }}>
          {log.value} {habit.unit}
        </span>
      )}

      {/* Actions */}
      <div className="habit-actions">
        <button className="btn btn-ghost btn-icon btn-sm"
          onClick={() => setShowNote(s => !s)}
          title="Note"
          style={{ color: log?.note ? 'var(--accent)' : undefined }}
        >
          <MessageSquare size={14}/>
        </button>
        {/* <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} title="Edit">
          <Pencil size={14}/>
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onDelete} title="Delete"
          style={{ color:'var(--bad)' }}>
          <Trash2 size={14}/>
        </button> */}
      </div>
    </div>
  )
}
