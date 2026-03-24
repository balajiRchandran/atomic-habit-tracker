// src/components/TodayPage.jsx
import { useState, useMemo, useRef } from 'react'
import { format, subDays } from 'date-fns'
import { Flame, GripVertical, MessageSquare, Star, ChevronRight } from 'lucide-react'
import { setLog, updateHabit } from '../db'
import {
  dateStr, friendlyDate, computeStreak, computeWeeklyStreak,
  consistencyScore, weeklyConsistencyScore, isSuccess,
  computePerfectDays, todayStr, isFailed,
} from '../utils/dates'

function buildDayStrip() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return { date: d, str: dateStr(d) }
  })
}

export default function TodayPage({ uid, habits, logs, onEdit, onDelete, identity, selectedDay, onDayChange }) {
  // fallback if not provided (for backwards compat)
  const [localDay, setLocalDay] = useState(todayStr())
  const activeDay = selectedDay ?? localDay
  const setActiveDay = onDayChange ?? setLocalDay
  const dayStrip = useMemo(buildDayStrip, [])

  const logMap = useMemo(() => {
    const m = {}
    logs.forEach(l => { if (l.date === activeDay) m[l.habitId] = l })
    return m
  }, [logs, activeDay])

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

  const perfectDays = useMemo(() => computePerfectDays(habits, logs), [habits, logs])

  // Cycle: pending → done → failed → pending
  const cycleState = async (habit) => {
    const current = logMap[habit.id]
    const currentlyDone = isSuccess(habit, current)
    const currentlyFailed = isFailed(habit, current)

    let newDone = false
    let newFailed = false

    if (!currentlyDone && !currentlyFailed) {
      // pending → done
      newDone = true
      newFailed = false
    } else if (currentlyDone) {
      // done → failed
      newDone = false
      newFailed = true
    } else {
      // failed → pending
      newDone = false
      newFailed = false
    }

    await setLog(uid, habit.id, activeDay, {
      done: newDone,
      value: current?.value ?? null,
      note: current?.note ?? '',
      failed: newFailed,
    })
  }

  const setMeasure = async (habit, value) => {
    const current = logMap[habit.id]
    const numVal = value === '' ? null : Number(value)
    const done = numVal != null && isSuccess(habit, { value: numVal })
    const failed = numVal != null && !done && habit.goal != null
    await setLog(uid, habit.id, activeDay, {
      done,
      value: numVal,
      note: current?.note ?? '',
      failed,
    })
  }

  const setNote = async (habit, note) => {
    const current = logMap[habit.id]
    await setLog(uid, habit.id, activeDay, {
      done: current?.done ?? false,
      value: current?.value ?? null,
      note,
      failed: current?.failed ?? false,
    })
  }

  // Drag to reorder
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  const handleDragStart = (idx) => { dragItem.current = idx }
  const handleDragEnter = (idx) => { dragOver.current = idx }
  const handleDragEnd = async () => {
    const from = dragItem.current
    const to = dragOver.current
    if (from === null || to === null || from === to) return
    const reordered = [...habits]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    await Promise.all(reordered.map((h, i) => updateHabit(uid, h.id, { order: i })))
    dragItem.current = null
    dragOver.current = null
  }

  const dailyHabits = habits.filter(h => h.frequency !== 'weekly' && (h.startDate || todayStr()) <= activeDay)
  const weeklyHabits = habits.filter(h => h.frequency === 'weekly' && (h.startDate || todayStr()) <= activeDay)
  const activeHabits = habits.filter(h => (h.startDate || todayStr()) <= activeDay)

  const doneCount = activeHabits.filter(h => isSuccess(h, logMap[h.id])).length
  const failedCount = activeHabits.filter(h => isFailed(h, logMap[h.id])).length
  const pendingCount = activeHabits.filter(h => !isSuccess(h, logMap[h.id]) && !isFailed(h, logMap[h.id])).length
  const pct = activeHabits.length ? Math.round((doneCount / activeHabits.length) * 100) : 0
  const isToday = activeDay === todayStr()

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
            "{identity}"
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
        {dayStrip.map(({ date, str }) => {
          const dayActive = habits.filter(h => (h.startDate || todayStr()) <= str)
          const dayLogs = {}
          logs.forEach(l => { if (l.date === str) dayLogs[l.habitId] = l })
          const dayDone = dayActive.filter(h => isSuccess(h, dayLogs[h.id])).length
          const dayFailed = dayActive.filter(h => isFailed(h, dayLogs[h.id])).length
          const isPast = str < todayStr()
          const allDone = dayActive.length > 0 && dayDone === dayActive.length

          return (
            <div key={str}
              className={`date-chip ${activeDay === str ? 'active' : ''}`}
              onClick={() => setActiveDay(str)}
            >
              <span className="day-num">{format(date, 'd')}</span>
              <span>{format(date, 'EEE')}</span>
              {/* Day indicator dots */}
              {dayActive.length > 0 && str !== todayStr() && (
                <span style={{
                  width: 5, height: 5, borderRadius: '50%', marginTop: 2,
                  background: allDone ? 'var(--good)' : dayFailed > 0 ? 'var(--bad)' : 'var(--paper-3)',
                  display: 'inline-block',
                  opacity: activeDay === str ? 0.7 : 1,
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar + stats */}
      {activeHabits.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {/* Progress bar */}
          <div style={{
            height: 6, background: 'var(--paper-3)',
            borderRadius: 3, marginBottom: 12, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: pct === 100 ? 'var(--good)' : 'var(--accent)',
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-muted)' }}>
              {pct}% complete
            </span>
            <div style={{ display: 'flex', gap: 14, marginLeft: 'auto' }}>
              {doneCount > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--good)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--good)', display: 'inline-block' }} />
                  {doneCount} done
                </span>
              )}
              {failedCount > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--bad)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--bad)', display: 'inline-block' }} />
                  {failedCount} failed
                </span>
              )}
              {pendingCount > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--paper-3)', display: 'inline-block' }} />
                  {pendingCount} pending
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toggle hint */}
      {activeHabits.length > 0 && (
        <div style={{
          fontSize: 11, color: 'var(--ink-muted)', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', background: 'var(--paper-2)',
          borderRadius: 20, width: 'fit-content',
        }}>
          <span>Tap circle:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--paper-3)', display: 'inline-block' }} />
            <span style={{ fontSize: 10 }}>→</span>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--good)', display: 'inline-block' }} />
            <span style={{ fontSize: 10 }}>→</span>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--bad)', display: 'inline-block' }} />
            <span style={{ fontSize: 10 }}>→ repeat</span>
          </span>
        </div>
      )}

      {/* Daily habits */}
      {dailyHabits.length > 0 && (
        <>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 10,
          }}>
            Daily
          </div>
          <div className="habits-list" style={{ marginBottom: 24 }}>
            {dailyHabits.map((h, idx) => (
              <HabitRow key={h.id} habit={h} log={logMap[h.id]}
                streak={streakMap[h.id] ?? 0}
                consistency={consistencyMap[h.id] ?? 0}
                selectedDay={activeDay}
                onCycle={() => cycleState(h)}
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
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 10,
          }}>
            Weekly
          </div>
          <div className="habits-list">
            {weeklyHabits.map((h, idx) => (
              <HabitRow key={h.id} habit={h} log={logMap[h.id]}
                streak={streakMap[h.id] ?? 0}
                consistency={consistencyMap[h.id] ?? 0}
                selectedDay={activeDay}
                onCycle={() => cycleState(h)}
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

function HabitRow({ habit, log, streak, consistency, selectedDay, onCycle, onMeasure, onNote, onEdit, onDelete, onDragStart, onDragEnter, onDragEnd }) {
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState(log?.note || '')

  useMemo(() => { setNoteText(log?.note || '') }, [log?.note])

  const success = isSuccess(habit, log)
  const failed = isFailed(habit, log)
  const isActive = (habit.startDate || todayStr()) <= selectedDay

  const goalHint = habit.isMeasured && habit.goal != null
    ? `${habit.goalDirection === 'atleast' ? '≥' : '≤'} ${habit.goal} ${habit.unit}`
    : null

  // Determine visual state
  const state = success ? 'done' : failed ? 'failed' : 'pending'

  const stateStyles = {
    done: {
      rowBg: '#f7fdf9',
      rowBorder: 'var(--paper-2)',
      leftBorder: 'var(--good)',
      checkBg: 'var(--good)',
      checkBorder: 'var(--good)',
      checkColor: 'white',
      boxShadow: 'var(--shadow)',
    },
    failed: {
      rowBg: '#fef5f4',
      rowBorder: '#f5c5be',
      leftBorder: 'var(--bad)',
      checkBg: 'var(--bad)',
      checkBorder: 'var(--bad)',
      checkColor: 'white',
      boxShadow: '0 2px 12px rgba(176,48,32,0.12)',
    },
    pending: {
      rowBg: 'white',
      rowBorder: 'var(--paper-3)',
      leftBorder: 'var(--paper-3)',
      checkBg: 'white',
      checkBorder: 'var(--paper-3)',
      checkColor: 'transparent',
      boxShadow: 'var(--shadow)',
    },
  }

  const s = stateStyles[state]

  return (
    <div
      className="habit-row"
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
      style={{
        background: s.rowBg,
        borderColor: s.rowBorder,
        borderLeft: `4px solid ${s.leftBorder}`,
        boxShadow: s.boxShadow,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Drag handle */}
      <div style={{ cursor: 'grab', color: 'var(--paper-3)', flexShrink: 0, paddingRight: 2 }}>
        <GripVertical size={16} />
      </div>

      {/* Info */}
      <div className="habit-info" style={{ flex: 1, minWidth: 0 }}>
        <div className="habit-name" style={{
          textDecorationLine: success ? 'line-through' : 'none',
          textDecorationColor: success ? 'var(--paper-3)' : undefined,
          color: success ? 'var(--ink-muted)' : failed ? 'var(--bad)' : 'var(--ink)',
        }}>
          {habit.emoji} {habit.name}
        </div>

        {/* Failed warning message */}
        {failed && (
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: 'var(--bad)',
            marginTop: 3,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span>⚠</span>
            <span>
              {habit.type === 'bad'
                ? 'You gave in — tomorrow is a new start'
                : 'Missed today — don\'t break the chain again'}
            </span>
          </div>
        )}

        <div className="habit-meta" style={{ marginTop: failed ? 4 : 3 }}>
          {habit.identity && !failed && <span className="habit-identity">"{habit.identity}"</span>}
          {streak > 0 && (
            <span className="streak-badge">
              <Flame size={10} /> {streak}{habit.frequency === 'weekly' ? 'w' : 'd'}
            </span>
          )}
          {!failed && (
            <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
              {consistency}%
            </span>
          )}
          {goalHint && !failed && (
            <span style={{ fontSize: 10, color: 'var(--ink-muted)' }}>{goalHint}</span>
          )}
        </div>

        {habit.cue && !failed && (
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>📍 {habit.cue}</div>
        )}

        {/* Inline note */}
        {showNote && (
          <textarea
            style={{
              marginTop: 8, width: '100%', padding: '6px 10px',
              border: '1px solid var(--paper-3)', borderRadius: 'var(--radius)',
              fontSize: 12, fontFamily: 'var(--font-ui)', color: 'var(--ink)',
              background: 'var(--paper)', resize: 'vertical', minHeight: 52,
            }}
            placeholder="Add a note for today…"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onBlur={() => onNote(noteText)}
            autoFocus
          />
        )}
      </div>

      {/* Checkbox / 3-state toggle for non-measured habits */}
      {!habit.isMeasured && isActive && (
        <button
          onClick={onCycle}
          title={state === 'pending' ? 'Mark done' : state === 'done' ? 'Mark failed' : 'Clear'}
          style={{
            width: 34, height: 34, flexShrink: 0,
            borderRadius: '50%',
            border: `2px solid ${s.checkBorder}`,
            background: s.checkBg,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, color: s.checkColor,
            transition: 'all 0.18s ease',
            transform: 'scale(1)',
            padding: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {state === 'done' && <span style={{ color: 'white', fontSize: 13, lineHeight: 1 }}>✓</span>}
          {state === 'failed' && <span style={{ color: 'white', fontSize: 13, lineHeight: 1 }}>✕</span>}
        </button>
      )}

      {/* Measurement input */}
      {habit.isMeasured && isActive && (
        <div className="measurement-input-wrap">
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: success ? 'var(--good)' : failed ? 'var(--bad)' : 'var(--paper-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: 'white', fontWeight: 700,
          }}>
            {success ? '✓' : failed ? '✕' : ''}
          </div>
          <input className="measurement-input" type="number" min="0" step="0.1"
            value={log?.value ?? ''}
            placeholder="0"
            onChange={e => onMeasure(e.target.value)}
          />
          <span className="measurement-unit">{habit.unit}</span>
        </div>
      )}

      {/* Actions */}
      <div className="habit-actions">
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => setShowNote(s => !s)}
          style={{ color: log?.note ? 'var(--accent)' : undefined }}
          title="Note"
        >
          <MessageSquare size={14} />
        </button>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => onEdit()}
          title="Edit"
          style={{ color: 'var(--ink-muted)' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
