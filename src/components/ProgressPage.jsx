// src/components/ProgressPage.jsx
import { useMemo, useState } from 'react'
import { format, subDays, parseISO } from 'date-fns'
import { Flame, TrendingUp, CheckCircle, XCircle } from 'lucide-react'
import { dateStr, last90Days, computeStreak, todayStr } from '../utils/dates'

export default function ProgressPage({ habits, logs }) {
  const [range, setRange] = useState(30)

  const today = todayStr()

  const days = useMemo(() => {
    return Array.from({ length: range }, (_, i) => {
      const d = subDays(new Date(), range - 1 - i)
      return { date: d, str: dateStr(d) }
    })
  }, [range])

  // Overall stats
  const stats = useMemo(() => {
    let totalPossible = 0, totalDone = 0, longestStreak = 0

    habits.forEach(h => {
      const streak = computeStreak(h.id, h.type, logs)
      if (streak > longestStreak) longestStreak = streak
    })

    days.forEach(({ str }) => {
      habits.forEach(h => {
        totalPossible++
        const log = logs.find(l => l.habitId === h.id && l.date === str)
        const done = h.type === 'good' ? log?.done : !log?.done
        if (done) totalDone++
      })
    })

    const rate = totalPossible ? Math.round((totalDone / totalPossible) * 100) : 0
    return { rate, totalDone, totalPossible, longestStreak }
  }, [habits, logs, days])

  const cal90 = useMemo(() => last90Days(), [])

  return (
    <div>
      {/* Range selector */}
      <div style={{ display:'flex', gap:8, marginBottom:28 }}>
        {[7,30,90].map(r => (
          <button
            key={r}
            className={`btn ${range === r ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setRange(r)}
          >Last {r} days</button>
        ))}
      </div>

      {/* Overall stats */}
      <div className="progress-stats">
        <div className="stat-card">
          <div className="stat-value" style={{ color:'var(--accent)' }}>{stats.rate}%</div>
          <div className="stat-label">Completion rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color:'var(--streak)' }}>{stats.longestStreak}</div>
          <div className="stat-label">Best streak (days)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{habits.length}</div>
          <div className="stat-label">Total habits</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color:'var(--good)' }}>{habits.filter(h=>h.type==='good').length}</div>
          <div className="stat-label">Building</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color:'var(--bad)' }}>{habits.filter(h=>h.type==='bad').length}</div>
          <div className="stat-label">Breaking</div>
        </div>
      </div>

      {/* Per-habit cards */}
      {habits.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">No data yet</div>
          <div className="empty-state-sub">Add habits and start tracking to see your progress here.</div>
        </div>
      )}

      <div className="habit-chart-grid">
        {habits.map(h => (
          <HabitCard key={h.id} habit={h} logs={logs} days={days} cal90={cal90} />
        ))}
      </div>
    </div>
  )
}

function HabitCard({ habit, logs, days, cal90 }) {
  const [view, setView] = useState('calendar') // 'calendar' | 'chart'

  const logMap = useMemo(() => {
    const m = {}
    logs.filter(l => l.habitId === habit.id).forEach(l => { m[l.date] = l })
    return m
  }, [logs, habit.id])

  const streak = computeStreak(habit.id, habit.type, logs)
  const today = todayStr()

  const daysData = useMemo(() =>
    days.map(({ date, str }) => {
      const log = logMap[str]
      const done = habit.type === 'good' ? !!log?.done : !log?.done
      return { str, date, done, value: log?.value ?? null, isFuture: str > today }
    }), [days, logMap, habit.type, today])

  const completedCount = daysData.filter(d => !d.isFuture && d.done).length
  const possibleCount  = daysData.filter(d => !d.isFuture).length
  const rate = possibleCount ? Math.round((completedCount / possibleCount) * 100) : 0

  // Bar chart data (for measured habits)
  const barData = useMemo(() => {
    if (!habit.isMeasured) return null
    return days.map(({ str, date }) => ({
      str, label: format(date, 'd'),
      value: logMap[str]?.value ?? 0,
      max: habit.goal || 1,
    }))
  }, [days, logMap, habit])

  // Calendar view: last 90 days in 7-col grid
  const calData = useMemo(() =>
    cal90.map(({ str, date }) => {
      const log = logMap[str]
      const done = habit.type === 'good' ? !!log?.done : !log?.done
      const isFuture = str > today
      const hasData = !!log
      return { str, date, done, isFuture, hasData }
    }), [cal90, logMap, habit.type, today])

  return (
    <div className="habit-chart-card">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4 }}>
        <div>
          <div className="habit-chart-name">{habit.emoji} {habit.name}</div>
          {habit.identity && (
            <div className="habit-chart-identity">"{habit.identity}"</div>
          )}
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:20, fontFamily:'var(--font-display)', color:'var(--accent)' }}>{rate}%</div>
          {streak > 0 && (
            <div style={{ fontSize:11, color:'var(--streak)', fontWeight:700 }}>
              🔥 {streak}d streak
            </div>
          )}
        </div>
      </div>

      {/* Toggle view */}
      <div style={{ display:'flex', gap:6, marginBottom:12 }}>
        <button
          className={`btn btn-sm ${view === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setView('calendar')}>Calendar</button>
        {habit.isMeasured && (
          <button
            className={`btn btn-sm ${view === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView('chart')}>Chart</button>
        )}
      </div>

      {/* Calendar heatmap */}
      {view === 'calendar' && (
        <>
          <div style={{ fontSize:9, color:'var(--ink-muted)', marginBottom:4, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
            Last 90 days
          </div>
          <div className="mini-calendar">
            {calData.map(({ str, done, isFuture, hasData, date }) => (
              <div
                key={str}
                className={`cal-cell ${isFuture ? 'future' : hasData ? (done ? 'done' : 'missed') : ''} ${str === todayStr() ? 'today' : ''}`}
                title={`${format(date, 'MMM d')} — ${isFuture ? 'future' : done ? '✓ Done' : hasData ? '✗ Missed' : 'No data'}`}
              />
            ))}
          </div>
          <div style={{ display:'flex', gap:12, marginTop:8, fontSize:10, color:'var(--ink-muted)' }}>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:10, height:10, background:'var(--good)', borderRadius:2, display:'inline-block' }}/> Done
            </span>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:10, height:10, background:'var(--paper-3)', borderRadius:2, display:'inline-block' }}/> Missed
            </span>
          </div>
        </>
      )}

      {/* Bar chart */}
      {view === 'chart' && barData && (
        <>
          <div style={{ fontSize:9, color:'var(--ink-muted)', marginBottom:8, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
            {habit.unit} per day {habit.goal ? `(goal: ${habit.goal})` : ''}
          </div>
          <div className="chart-bar-wrap">
            {barData.map(({ str, label, value, max }) => {
              const pct = max ? Math.min((value / max) * 100, 100) : 0
              return (
                <div
                  key={str}
                  className={`chart-bar ${value === 0 ? 'no-data' : ''}`}
                  title={`${label}: ${value} ${habit.unit}`}
                >
                  <div className="bar-fill" style={{ height: pct + '%' }} />
                </div>
              )
            })}
          </div>
          {habit.goal && (
            <div style={{ fontSize:10, color:'var(--ink-muted)', marginTop:4 }}>
              Daily avg: {Math.round(barData.reduce((a,b) => a + b.value, 0) / barData.filter(b=>b.value>0).length) || 0} {habit.unit}
            </div>
          )}
        </>
      )}
    </div>
  )
}
