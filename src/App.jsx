// src/App.jsx
import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
// Email/password auth — no Google dependency
import { subscribeHabits, subscribeLogs, addHabit, updateHabit, deleteHabit } from './db'
import AuthScreen    from './components/AuthScreen'
import TodayPage     from './components/TodayPage'
import ProgressPage  from './components/ProgressPage'
import SettingsPage  from './components/SettingsPage'
import HabitModal    from './components/HabitModal'
import { CalendarCheck, BarChart2, Settings, Plus } from 'lucide-react'

const NAV = [
  { id: 'today',    label: 'Today',    Icon: CalendarCheck },
  { id: 'progress', label: 'Progress', Icon: BarChart2 },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

const IS_DEMO = import.meta.env.VITE_FIREBASE_API_KEY === undefined ||
  (typeof window !== 'undefined' && window.__FIREBASE_UNCONFIGURED__)

export default function App() {
  const [user,    setUser]    = useState(undefined)  // undefined = loading
  const [page,    setPage]    = useState('today')
  const [habits,  setHabits]  = useState([])
  const [logs,    setLogs]    = useState([])
  const [modal,   setModal]   = useState(null) // null | { habit?: existing }
  const [confirm, setConfirm] = useState(null) // habit to delete

  // Auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u))
  }, [])

  // Firestore subscriptions
  useEffect(() => {
    if (!user) return
    const unsub1 = subscribeHabits(user.uid, setHabits)
    const unsub2 = subscribeLogs(user.uid, setLogs)
    return () => { unsub1(); unsub2() }
  }, [user])

  // ── Handlers ──────────────────────────────────────────────
  const handleSaveHabit = async (data) => {
    if (modal?.habit?.id) {
      await updateHabit(user.uid, modal.habit.id, data)
    } else {
      await addHabit(user.uid, data)
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

  // ── Loading ────────────────────────────────────────────────
  if (user === undefined) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  // ── Not signed in ──────────────────────────────────────────
  if (!user) return <AuthScreen />

  const pageTitle = { today: 'Today', progress: 'Progress', settings: 'Settings' }[page]

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo"><em>Atomic</em> Habits</div>
          <div className="sidebar-identity">Your identity</div>
          <div className="sidebar-identity-text">
            "I am someone who shows up every day."
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {NAV.map(({ id, label, Icon }) => (
            <div
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id)}
            >
              <Icon size={16} />
              {label}
              {id === 'today' && habits.length > 0 && (
                <span className="nav-badge">{habits.length}</span>
              )}
            </div>
          ))}

          <div className="sidebar-section-label" style={{ marginTop:16 }}>Quick add</div>
          <div
            className="nav-item"
            onClick={() => setModal({})}
            style={{ color:'var(--accent-2)' }}
          >
            <Plus size={16} /> New habit
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-pill">
            <div className="user-avatar">
              {(user.displayName?.[0] || user.email?.[0] || '?').toUpperCase()}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user.displayName || user.email || 'Anonymous'}
              </div>
              <div style={{ fontSize:10, color:'var(--ink-muted)' }}>
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
              {page === 'today'    && 'Check in on your habits for today'}
              {page === 'progress' && 'Your consistency over time'}
              {page === 'settings' && 'Manage habits and account'}
            </p>
          </div>
          {page === 'today' && (
            <button className="btn btn-primary" onClick={() => setModal({})}>
              <Plus size={15} /> Add habit
            </button>
          )}
        </div>

        {/* Delete confirm toast */}
        {confirm && (
          <div style={{
            background:'var(--bad)', color:'white', borderRadius:'var(--radius)',
            padding:'12px 20px', marginBottom:16, fontSize:13, fontWeight:600,
            display:'flex', alignItems:'center', justifyContent:'space-between'
          }}>
            <span>Click Delete again to confirm removing "{confirm.name}"</span>
            <button onClick={() => setConfirm(null)} style={{ background:'none', border:'none', color:'white', cursor:'pointer', fontSize:16 }}>✕</button>
          </div>
        )}

        {page === 'today' && (
          <TodayPage
            uid={user.uid}
            habits={habits}
            logs={logs}
            onEdit={h => setModal({ habit: h })}
            onDelete={handleDeleteHabit}
          />
        )}
        {page === 'progress' && (
          <ProgressPage habits={habits} logs={logs} />
        )}
        {page === 'settings' && (
          <SettingsPage
            uid={user.uid}
            user={user}
            habits={habits}
            onEdit={h => setModal({ habit: h })}
            onDelete={handleDeleteHabit}
          />
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        {NAV.map(({ id, label, Icon }) => (
          <div
            key={id}
            className={`mobile-nav-item ${page === id ? 'active' : ''}`}
            onClick={() => setPage(id)}
          >
            <Icon size={20} />
            {label}
          </div>
        ))}
        <div
          className={`mobile-nav-item`}
          onClick={() => setModal({})}
          style={{ color:'var(--accent-2)' }}
        >
          <Plus size={20} />
          Add
        </div>
      </nav>

      {/* Habit modal */}
      {modal && (
        <HabitModal
          habit={modal.habit}
          onSave={handleSaveHabit}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
