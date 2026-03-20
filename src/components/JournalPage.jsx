// src/components/JournalPage.jsx
import { useState, useMemo } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { dateStr, todayStr } from '../utils/dates'

export default function JournalPage({ habits, logs }) {
  const [view, setView] = useState('day')       // 'day' | 'habit'
  const [selectedHabit, setSelectedHabit] = useState(null)

  const noteLogs = useMemo(() =>
    logs.filter(l => l.note && l.note.trim())
        .sort((a,b) => b.date.localeCompare(a.date)),
    [logs]
  )

  const habitMap = useMemo(() => {
    const m = {}
    habits.forEach(h => { m[h.id] = h })
    return m
  }, [habits])

  // Group by day
  const byDay = useMemo(() => {
    const m = {}
    noteLogs.forEach(l => {
      if (!m[l.date]) m[l.date] = []
      m[l.date].push(l)
    })
    return Object.entries(m).sort((a,b) => b[0].localeCompare(a[0]))
  }, [noteLogs])

  // Group by habit
  const byHabit = useMemo(() => {
    const m = {}
    noteLogs.forEach(l => {
      if (!m[l.habitId]) m[l.habitId] = []
      m[l.habitId].push(l)
    })
    return Object.entries(m).sort((a,b) => {
      const ha = habitMap[a[0]]?.name || ''
      const hb = habitMap[b[0]]?.name || ''
      return ha.localeCompare(hb)
    })
  }, [noteLogs, habitMap])

  return (
    <div>
      {/* View toggle */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        <button className={`btn ${view==='day'  ?'btn-primary':'btn-secondary'} btn-sm`} onClick={() => { setView('day');   setSelectedHabit(null) }}>By day</button>
        <button className={`btn ${view==='habit'?'btn-primary':'btn-secondary'} btn-sm`} onClick={() => { setView('habit'); setSelectedHabit(null) }}>By habit</button>
      </div>

      {noteLogs.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">No notes yet</div>
          <div className="empty-state-sub">Tap the 💬 icon on any habit in Today to add a note.</div>
        </div>
      )}

      {/* By day */}
      {view === 'day' && byDay.map(([date, entries]) => (
        <div key={date} style={{ marginBottom:24 }}>
          <div style={{ fontSize:12, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase',
            color:'var(--ink-muted)', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:24, height:1, background:'var(--paper-3)', display:'inline-block' }}/>
            {date === todayStr() ? 'Today' : format(parseISO(date), 'EEE, MMM d yyyy')}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {entries.map((l, i) => {
              const habit = habitMap[l.habitId]
              if (!habit) return null
              return (
                <div key={i} style={{
                  background:'white', border:'1px solid var(--paper-3)',
                  borderRadius:'var(--radius-lg)', padding:'14px 18px',
                  boxShadow:'var(--shadow)', borderLeft:'4px solid var(--accent)',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:18 }}>{habit.emoji}</span>
                    <span style={{ fontWeight:700, fontSize:13, color:'var(--ink)' }}>{habit.name}</span>
                  </div>
                  <div style={{ fontSize:14, color:'var(--ink)', lineHeight:1.6 }}>{l.note}</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* By habit — list first, then drill into one */}
      {view === 'habit' && !selectedHabit && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {byHabit.map(([habitId, entries]) => {
            const habit = habitMap[habitId]
            if (!habit) return null
            return (
              <div key={habitId} onClick={() => setSelectedHabit(habitId)} style={{
                background:'white', border:'1px solid var(--paper-3)',
                borderRadius:'var(--radius-lg)', padding:'16px 20px',
                boxShadow:'var(--shadow)', cursor:'pointer',
                display:'flex', alignItems:'center', gap:14,
                transition:'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--paper-3)'}
              >
                <span style={{ fontSize:24 }}>{habit.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'var(--ink)' }}>{habit.name}</div>
                  <div style={{ fontSize:12, color:'var(--ink-muted)', marginTop:2 }}>
                    {entries.length} note{entries.length!==1?'s':''} · latest: {format(parseISO(entries[0].date), 'MMM d')}
                  </div>
                </div>
                <span style={{ fontSize:18 }}>→</span>
              </div>
            )
          })}
        </div>
      )}

      {/* By habit — drill-down */}
      {view === 'habit' && selectedHabit && (() => {
        const habit   = habitMap[selectedHabit]
        const entries = byHabit.find(([id]) => id === selectedHabit)?.[1] || []
        return (
          <div>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedHabit(null)} style={{ marginBottom:20 }}>
              ← All habits
            </button>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <span style={{ fontSize:28 }}>{habit?.emoji}</span>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--ink)' }}>{habit?.name}</h3>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {entries.map((l, i) => (
                <div key={i} style={{
                  padding:'14px 18px', background:'white',
                  border:'1px solid var(--paper-3)', borderRadius:'var(--radius-lg)',
                  boxShadow:'var(--shadow)', borderLeft:'4px solid var(--accent)',
                }}>
                  <div style={{ fontSize:11, color:'var(--ink-muted)', fontWeight:700, marginBottom:6 }}>
                    {format(parseISO(l.date), 'EEE, MMM d yyyy')}
                  </div>
                  <div style={{ fontSize:14, color:'var(--ink)', lineHeight:1.6 }}>{l.note}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
