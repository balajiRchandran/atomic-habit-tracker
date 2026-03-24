// src/App.jsx
import { useState, useEffect, useMemo } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { subscribeHabits, subscribeLogs, addHabit, updateHabit, deleteHabit, getProfile } from './db'
import AuthScreen from './components/AuthScreen'
import TodayPage from './components/TodayPage'
import ProgressPage from './components/ProgressPage'
import SettingsPage from './components/SettingsPage'
import JournalPage from './components/JournalPage'
import HabitModal from './components/HabitModal'
import { CalendarCheck, BarChart2, Settings, Plus, BookOpen } from 'lucide-react'
import { todayStr } from './utils/dates'
import { isSuccess, isFailed } from './utils/dates'

const NAV = [
  { id: 'today', label: 'Today', Icon: CalendarCheck },
  { id: 'progress', label: 'Progress', Icon: BarChart2 },
  { id: 'journal', label: 'Journal', Icon: BookOpen },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

export default function App() {
  const [user, setUser] = useState(undefined)
  const [page, setPage] = useState('today')
  const [habits, setHabits] = useState([])
  const [logs, setLogs] = useState([])
  const [identity, setIdentity] = useState('')
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)
  // Lift selectedDay so nav badge stays in sync
  const [selectedDay, setSelectedDay] = useState(todayStr())

  useEffect(() => onAuthStateChanged(auth, u => setUser(u)), [])

  useEffect(() => {
    if (!user) return
    const unsub1 = subscribeHabits(user.uid, raw => {
      const sorted = [...raw].sort((a, b) => {
        if (a.order != null && b.order != null) return a.order - b.order
        if (a.order != null) return -1
        if (b.order != null) return 1
        return a.createdAt - b.createdAt
      })
      setHabits(sorted)
    })
    const unsub2 = subscribeLogs(user.uid, setLogs)
    getProfile(user.uid).then(p => { if (p.identity) setIdentity(p.identity) })
    return () => { unsub1(); unsub2() }
  }, [user])

  const handleSaveHabit = async (data) => {
    if (modal?.habit?.id) {
      await updateHabit(user.uid, modal.habit.id, data)
    } else {
      await addHabit(user.uid, { ...data, order: habits.length })
    }
    setModal(null)
  }

  const handleDeleteHabit = (habit) => {
    if (confirm?.id === habit.id) {
      deleteHabit(user.uid, habit.id)
      setConfirm(null)
    } else {
      setConfirm(habit)
      setTimeout(() => setConfirm(c => c?.id === habit.id ? null : c), 3000)
    }
  }

  // Badge count: untracked habits on selectedDay
  const badgeCount = useMemo(() => {
    const activeHabits = habits.filter(h => (h.startDate || todayStr()) <= selectedDay)
    const dayLogs = {}
    logs.forEach(l => { if (l.date === selectedDay) dayLogs[l.habitId] = l })
    return activeHabits.filter(h => !isSuccess(h, dayLogs[h.id]) && !isFailed(h, dayLogs[h.id])).length
  }, [habits, logs, selectedDay])

  if (user === undefined) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <AuthScreen />

  const pageTitle = { today: 'Today', progress: 'Progress', journal: 'Journal', settings: 'Settings' }[page]

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo"><em>Atomic</em> Habits</div>
          {identity && (
            <>
              <div className="sidebar-identity">Your identity</div>
              <div className="sidebar-identity-text">"{identity}"</div>
            </>
          )}
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {NAV.map(({ id, label, Icon }) => (
            <div key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id)}
            >
              <Icon size={16} /> {label}
              {id === 'today' && badgeCount > 0 && (
                <span className="nav-badge">{badgeCount}</span>
              )}
            </div>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: 16 }}>Quick add</div>
          <div className="nav-item" onClick={() => setModal({})} style={{ color: 'var(--accent-2)' }}>
            <Plus size={16} /> New habit
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-avatar">
              {(user.displayName?.[0] || user.email?.[0] || '?').toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName || user.email || 'Anonymous'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-muted)' }}>
                {habits.length} habit{habits.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">{pageTitle}</h1>
            <p className="page-subtitle">
              {page === 'today' && (selectedDay === todayStr() ? "Check in on your habits" : `Viewing ${selectedDay}`)}
              {page === 'progress' && 'Your consistency over time'}
              {page === 'journal' && 'Your habit notes & memories'}
              {page === 'settings' && 'Manage habits and account'}
            </p>
          </div>
          {page === 'today' && (
            <button className="btn btn-primary" onClick={() => setModal({})}>
              <Plus size={15} /> Add habit
            </button>
          )}
        </div>

        {confirm && (
          <div style={{
            background: 'var(--bad)', color: 'white', borderRadius: 'var(--radius)',
            padding: '12px 20px', marginBottom: 16, fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>Click Delete again to confirm removing "{confirm.name}"</span>
            <button onClick={() => setConfirm(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        )}

        {page === 'today' && (
          <TodayPage
            uid={user.uid} habits={habits} logs={logs}
            identity={identity}
            onEdit={h => setModal({ habit: h })}
            onDelete={handleDeleteHabit}
            selectedDay={selectedDay}
            onDayChange={setSelectedDay}
          />
        )}
        {page === 'progress' && <ProgressPage habits={habits} logs={logs} />}
        {page === 'journal' && <JournalPage habits={habits} logs={logs} />}
        {page === 'settings' && (
          <SettingsPage uid={user.uid} user={user} habits={habits}
            onEdit={h => setModal({ habit: h })}
            onDelete={handleDeleteHabit}
            onIdentityChange={setIdentity} />
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {NAV.map(({ id, label, Icon }) => (
          <div key={id}
            className={`mobile-nav-item ${page === id ? 'active' : ''}`}
            onClick={() => setPage(id)}
          >
            <Icon size={20} />
            <span style={{ position: 'relative' }}>
              {label}
              {id === 'today' && badgeCount > 0 && (
                <span style={{
                  position: 'absolute', top: -8, right: -10,
                  background: 'var(--accent)', color: 'white',
                  fontSize: 9, fontWeight: 700, padding: '1px 4px',
                  borderRadius: 8, fontFamily: 'var(--font-mono)',
                }}>
                  {badgeCount}
                </span>
              )}
            </span>
          </div>
        ))}
        <div className="mobile-nav-item" onClick={() => setModal({})} style={{ color: 'var(--accent-2)' }}>
          <Plus size={20} /> Add
        </div>
      </nav>

      {modal && (
        <HabitModal habit={modal.habit} onSave={handleSaveHabit} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
