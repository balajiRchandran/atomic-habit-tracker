// src/components/ProgressPage.jsx
import { useState, useMemo } from 'react'
import { format, parseISO, subDays, startOfMonth } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid,
} from 'recharts'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Flame } from 'lucide-react'
import {
  computeStreak, computeWeeklyStreak, consistencyScore, weeklyConsistencyScore,
  computeAllStreaks, weeklyTrendData, computePerfectDays, computePerfectWeeks,
  monthCalendarData, isSuccess, todayStr, dateStr,
} from '../utils/dates'

export default function ProgressPage({ habits, logs }) {
  const [drillHabit, setDrillHabit] = useState(null)

  if (drillHabit) {
    const habit = habits.find(h => h.id === drillHabit)
    if (!habit) { setDrillHabit(null); return null }
    return <HabitDrillDown habit={habit} logs={logs} onBack={() => setDrillHabit(null)} />
  }

  return <Dashboard habits={habits} logs={logs} onDrill={setDrillHabit} />
}

// ── Level 1: Dashboard ───────────────────────────────────────
function Dashboard({ habits, logs, onDrill }) {
  const perfectDays  = useMemo(() => computePerfectDays(habits, logs),  [habits, logs])
  const perfectWeeks = useMemo(() => computePerfectWeeks(habits, logs), [habits, logs])
  const calData      = useMemo(() => monthCalendarData(habits, logs),   [habits, logs])

  const overallConsistency = useMemo(() => {
    if (habits.length === 0) return 0
    const scores = habits.map(h =>
      h.frequency === 'weekly' ? weeklyConsistencyScore(h, logs) : consistencyScore(h, logs)
    )
    return Math.round(scores.reduce((a,b) => a+b, 0) / scores.length)
  }, [habits, logs])

  const bestPerfectStreak = useMemo(() => {
    if (habits.length === 0) return 0
    // compute streak of consecutive perfect days
    const dailyHabits = habits.filter(h => h.frequency !== 'weekly')
    if (dailyHabits.length === 0) return 0
    const logMap = {}
    logs.forEach(l => {
      if (!logMap[l.date]) logMap[l.date] = {}
      logMap[l.date][l.habitId] = l
    })
    let streak = 0, best = 0
    let d = new Date()
    for (let i = 0; i < 365; i++) {
      const str = dateStr(subDays(d, i))
      const active = dailyHabits.filter(h => (h.startDate || todayStr()) <= str)
      if (active.length === 0) continue
      const perfect = active.every(h => isSuccess(h, logMap[str]?.[h.id]))
      if (perfect) { streak++; if (streak > best) best = streak }
      else streak = 0
    }
    return best
  }, [habits, logs])

  // Day-of-week offset for calendar grid
  const firstDayOfMonth = calData[0]?.date
  const startOffset = firstDayOfMonth ? (firstDayOfMonth.getDay()) : 0

  return (
    <div>
      {/* Top stats */}
      <div className="progress-stats" style={{ marginBottom:28 }}>
        <StatCard value={perfectDays.total}  label="Perfect days (all time)" color="var(--good)" sub={`${perfectDays.thisMonth} this month · ${perfectDays.lastMonth} last month`}/>
        <StatCard value={perfectWeeks.total} label="Perfect weeks (all time)" color="var(--streak)" sub={`${perfectWeeks.thisMonth} this month · ${perfectWeeks.lastMonth} last month`}/>
        <StatCard value={overallConsistency + '%'} label="Overall consistency" color="var(--accent)"/>
        <StatCard value={bestPerfectStreak} label="Best perfect day streak" color="var(--ink)"/>
      </div>

      {/* Monthly calendar */}
      <div className="card" style={{ padding:24, marginBottom:28 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', marginBottom:16 }}>
          {format(new Date(), 'MMMM yyyy')} — perfect days
        </div>
        {/* Day labels */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,36px)', gap:4, marginBottom:4 }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} style={{ textAlign:'center', fontSize:10, color:'var(--ink-muted)', fontWeight:700 }}>{d}</div>
          ))}
        </div>
        {/* Calendar grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,36px)', gap:4 }}>
          {Array.from({ length: startOffset }).map((_,i) => <div key={'e'+i}/>)}
          {calData.map(({ str, dayNum, status }) => (
            <div key={str} style={{
              aspectRatio:'1', borderRadius:6, display:'flex',
              alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:700,
              background:
                status === 'perfect'   ? 'var(--good)'    :
                status === 'missed'    ? 'var(--paper-3)'  :
                status === 'future'    ? 'transparent'     : 'var(--paper-2)',
              color:
                status === 'perfect'   ? 'white'          :
                status === 'future'    ? 'var(--ink-muted)' : 'var(--ink)',
              border: str === todayStr() ? '2px solid var(--accent)' : '2px solid transparent',
              opacity: status === 'future' ? 0.4 : 1,
            }}>{dayNum}</div>
          ))}
        </div>
        <div style={{ display:'flex', gap:16, marginTop:12, fontSize:11, color:'var(--ink-muted)' }}>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:10, height:10, background:'var(--good)', borderRadius:3, display:'inline-block' }}/> Perfect
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:10, height:10, background:'var(--paper-3)', borderRadius:3, display:'inline-block' }}/> Missed
          </span>
        </div>
      </div>

      {/* Per-habit list */}
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-muted)', marginBottom:12 }}>
        Habits — tap for details
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {habits.map(h => <HabitSummaryRow key={h.id} habit={h} logs={logs} onClick={() => onDrill(h.id)}/>)}
      </div>

      {habits.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">No habits yet</div>
          <div className="empty-state-sub">Add habits and start tracking to see progress here.</div>
        </div>
      )}
    </div>
  )
}

function StatCard({ value, label, color, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--ink-muted)', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

function HabitSummaryRow({ habit, logs, onClick }) {
  const streak      = habit.frequency === 'weekly' ? computeWeeklyStreak(habit, logs) : computeStreak(habit, logs)
  const allStreaks   = computeAllStreaks(habit, logs)
  const bestStreak  = allStreaks.reduce((b, s) => s.length > b ? s.length : b, 0)
  const consistency = habit.frequency === 'weekly' ? weeklyConsistencyScore(habit, logs) : consistencyScore(habit, logs)

  const trendData = weeklyTrendData(habit, logs).slice(-4)
  const trend = trendData.length >= 2
    ? trendData[trendData.length-1].score - trendData[0].score
    : 0
  const TrendIcon = trend > 5 ? TrendingUp : trend < -5 ? TrendingDown : Minus
  const trendColor = trend > 5 ? 'var(--good)' : trend < -5 ? 'var(--bad)' : 'var(--ink-muted)'

  // Measured stats
  const habitLogs = logs.filter(l => l.habitId === habit.id && l.value != null)
  const values    = habitLogs.map(l => Number(l.value)).filter(v => !isNaN(v))
  const avg = values.length ? (values.reduce((a,b)=>a+b,0)/values.length).toFixed(1) : null
  const best = values.length ? (habit.goalDirection === 'atmost' ? Math.min(...values) : Math.max(...values)) : null

  return (
    <div onClick={onClick} style={{
      background:'white', border:'1px solid var(--paper-3)',
      borderRadius:'var(--radius-lg)', padding:'16px 20px',
      boxShadow:'var(--shadow)', cursor:'pointer',
      transition:'all 0.15s', display:'flex', alignItems:'center', gap:16,
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
    onMouseLeave={e => e.currentTarget.style.borderColor='var(--paper-3)'}
    >
      <span style={{ fontSize:24, flexShrink:0 }}>{habit.emoji}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:14, color:'var(--ink)', marginBottom:4 }}>{habit.name}</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          {streak > 0 && (
            <span className="streak-badge">
              <Flame size={10}/> {streak}{habit.frequency==='weekly'?'w':'d'}
            </span>
          )}
          {bestStreak > 0 && (
            <span style={{ fontSize:11, color:'var(--ink-muted)' }}>best: {bestStreak}{habit.frequency==='weekly'?'w':'d'}</span>
          )}
          {habit.isMeasured && avg && (
            <span style={{ fontSize:11, color:'var(--ink-muted)', fontFamily:'var(--font-mono)' }}>
              avg {avg} {habit.unit}
            </span>
          )}
          {habit.isMeasured && best != null && (
            <span style={{ fontSize:11, color:'var(--streak)', fontFamily:'var(--font-mono)' }}>
              🏆 {best} {habit.unit}
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:22, fontFamily:'var(--font-display)', color:'var(--accent)', lineHeight:1 }}>
          {consistency}%
        </div>
        <div style={{ fontSize:11, color:'var(--ink-muted)', marginTop:2 }}>consistency</div>
        <TrendIcon size={14} style={{ color: trendColor, marginTop:4 }}/>
      </div>
    </div>
  )
}

// ── Level 3: Drill-down ──────────────────────────────────────
function HabitDrillDown({ habit, logs, onBack }) {
  const streak      = habit.frequency === 'weekly' ? computeWeeklyStreak(habit, logs) : computeStreak(habit, logs)
  const consistency = habit.frequency === 'weekly' ? weeklyConsistencyScore(habit, logs) : consistencyScore(habit, logs)
  const allStreaks   = computeAllStreaks(habit, logs)
  const bestStreak  = allStreaks.reduce((b, s) => s.length > b ? s.length : b, 0)
  const trendData   = weeklyTrendData(habit, logs)

  const habitLogs = logs
    .filter(l => l.habitId === habit.id)
    .sort((a,b) => a.date.localeCompare(b.date))

  const values = habitLogs.filter(l => l.value != null).map(l => ({
    date: format(parseISO(l.date), 'MMM d'),
    value: Number(l.value),
    met: isSuccess(habit, l),
  }))

  const avg  = values.length ? (values.reduce((a,b)=>a+b.value,0)/values.length).toFixed(1) : null
  const best = values.length ? (habit.goalDirection === 'atmost' ? Math.min(...values.map(v=>v.value)) : Math.max(...values.map(v=>v.value))) : null
  const worst = values.length ? (habit.goalDirection === 'atmost' ? Math.max(...values.map(v=>v.value)) : Math.min(...values.map(v=>v.value))) : null
  const metCount = values.filter(v => v.met).length

  const noteLogs = habitLogs.filter(l => l.note && l.note.trim())

  return (
    <div>
      <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom:24 }}>
        <ArrowLeft size={14}/> All habits
      </button>

      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
        <span style={{ fontSize:36 }}>{habit.emoji}</span>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, color:'var(--ink)', marginBottom:2 }}>{habit.name}</h2>
          {habit.identity && <div style={{ fontStyle:'italic', color:'var(--ink-muted)', fontSize:13 }}>"{habit.identity}"</div>}
          <div style={{ fontSize:12, color:'var(--ink-muted)', marginTop:4 }}>
            Started {habit.startDate ? format(parseISO(habit.startDate), 'MMM d, yyyy') : '—'}
            {habit.frequency === 'weekly'
              ? ` · ${habit.weeklyDays?.length ? habit.weeklyDays.length + ' fixed days/week' : (habit.weeklyCount||1) + 'x/week'}`
              : ' · daily'}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="progress-stats" style={{ marginBottom:28 }}>
        <StatCard value={consistency+'%'} label="Consistency" color="var(--accent)"/>
        <StatCard value={streak + (habit.frequency==='weekly'?'w':'d')} label="Current streak" color="var(--streak)"/>
        <StatCard value={bestStreak + (habit.frequency==='weekly'?'w':'d')} label="Best streak" color="var(--ink)"/>
        {habit.isMeasured && avg && <StatCard value={avg + ' ' + habit.unit} label="Average" color="var(--good)"/>}
        {habit.isMeasured && best != null && <StatCard value={best + ' ' + habit.unit} label={habit.goalDirection==='atmost'?'Best (lowest)':'Best (highest)'} color="var(--streak)"/>}
        {habit.isMeasured && <StatCard value={metCount} label="Days goal met" color="var(--good)"/>}
      </div>

      {/* Week-by-week trend */}
      {trendData.length > 1 && (
        <div className="card" style={{ padding:24, marginBottom:24 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'var(--ink)', marginBottom:16 }}>
            Week-by-week consistency %
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trendData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-3)"/>
              <XAxis dataKey="label" tick={{ fontSize:11, fill:'var(--ink-muted)' }} tickLine={false} axisLine={false}/>
              <YAxis domain={[0,100]} tick={{ fontSize:11, fill:'var(--ink-muted)' }} tickLine={false} axisLine={false}/>
              <Tooltip
                contentStyle={{ background:'white', border:'1px solid var(--paper-3)', borderRadius:8, fontSize:12 }}
                formatter={v => [v+'%', 'Consistency']}
              />
              <ReferenceLine y={consistency} stroke="var(--accent)" strokeDasharray="4 4" strokeWidth={1}/>
              <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2}
                dot={{ fill:'var(--accent)', r:3 }} activeDot={{ r:5 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Measurement line chart */}
      {habit.isMeasured && values.length > 1 && (
        <div className="card" style={{ padding:24, marginBottom:24 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'var(--ink)', marginBottom:4 }}>
            {habit.unit} over time
          </div>
          <div style={{ fontSize:12, color:'var(--ink-muted)', marginBottom:16 }}>
            Goal: {habit.goalDirection === 'atleast' ? '≥' : '≤'} {habit.goal} {habit.unit}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={values.slice(-60)} margin={{ top:5, right:10, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--paper-3)"/>
              <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--ink-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
              <YAxis tick={{ fontSize:11, fill:'var(--ink-muted)' }} tickLine={false} axisLine={false}/>
              <Tooltip
                contentStyle={{ background:'white', border:'1px solid var(--paper-3)', borderRadius:8, fontSize:12 }}
                formatter={(v, _, props) => [v + ' ' + habit.unit, props.payload.met ? '✓ Goal met' : '✗ Goal missed']}
              />
              {habit.goal != null && (
                <ReferenceLine y={habit.goal} stroke="var(--good)" strokeDasharray="4 4" strokeWidth={1.5}
                  label={{ value:'goal', position:'insideTopRight', fontSize:10, fill:'var(--good)' }}/>
              )}
              <Line type="monotone" dataKey="value" stroke="var(--accent-2)" strokeWidth={2}
                dot={(props) => {
                  const met = props.payload?.met
                  return <circle key={props.key} cx={props.cx} cy={props.cy} r={3}
                    fill={met ? 'var(--good)' : 'var(--bad)'} stroke="none"/>
                }}
                activeDot={{ r:5 }}/>
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', gap:16, marginTop:8, fontSize:11, color:'var(--ink-muted)' }}>
            <span><span style={{ color:'var(--good)' }}>●</span> Goal met</span>
            <span><span style={{ color:'var(--bad)' }}>●</span> Goal missed</span>
            <span style={{ color:'var(--ink-muted)' }}>avg: {avg} · best: {best} · worst: {worst}</span>
          </div>
        </div>
      )}

      {/* Streak history */}
      {allStreaks.length > 0 && (
        <div className="card" style={{ padding:24, marginBottom:24 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'var(--ink)', marginBottom:16 }}>Streak history</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {allStreaks.slice(0,10).map((s, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 14px', background:'var(--paper-2)',
                borderRadius:'var(--radius)',
              }}>
                <span style={{ fontSize:18 }}>{i===0 ? '🔥' : '📅'}</span>
                <div style={{ flex:1 }}>
                  <span style={{ fontWeight:700, fontSize:13, color:'var(--ink)' }}>
                    {s.length} {habit.frequency==='weekly'?'week':'day'}{s.length!==1?'s':''}
                  </span>
                  <span style={{ fontSize:12, color:'var(--ink-muted)', marginLeft:8 }}>
                    {format(parseISO(s.start),'MMM d')} – {format(parseISO(s.end),'MMM d, yyyy')}
                  </span>
                </div>
                {i === 0 && <span style={{ fontSize:11, color:'var(--good)', fontWeight:700 }}>latest</span>}
                {s.length === allStreaks.reduce((b,x) => x.length>b?x.length:b, 0) && (
                  <span style={{ fontSize:11, color:'var(--streak)', fontWeight:700 }}>🏆 best</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {noteLogs.length > 0 && (
        <div className="card" style={{ padding:24 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'var(--ink)', marginBottom:16 }}>Notes</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {noteLogs.reverse().map((l, i) => (
              <div key={i} style={{
                padding:'12px 16px', background:'var(--paper-2)',
                borderRadius:'var(--radius)', borderLeft:'3px solid var(--accent)',
              }}>
                <div style={{ fontSize:11, color:'var(--ink-muted)', fontWeight:700, marginBottom:4 }}>
                  {format(parseISO(l.date), 'EEE, MMM d yyyy')}
                </div>
                <div style={{ fontSize:13, color:'var(--ink)', lineHeight:1.5 }}>{l.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
