// src/utils/dates.js
import {
  format, subDays, startOfDay, isToday as dfIsToday,
  startOfWeek, endOfWeek, eachDayOfInterval, addDays,
  isBefore, isAfter, parseISO, differenceInCalendarWeeks,
  startOfMonth, endOfMonth, eachWeekOfInterval,
} from 'date-fns'

export const todayStr = () => format(new Date(), 'yyyy-MM-dd')
export const dateStr  = (d) => format(d, 'yyyy-MM-dd')

export const last7Days = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return { date: d, str: dateStr(d) }
  })

export const friendlyDate = (d) => {
  if (dfIsToday(d)) return 'Today'
  return format(d, 'EEE d')
}

// ── Goal success check ───────────────────────────────────────
// Returns true if a log entry counts as "success" for a habit
export const isSuccess = (habit, log) => {
  if (!log) return false
  if (!habit.isMeasured) {
    // simple checkbox — for bad habits, NOT done = success
    return log.done
  }
  // measured habit
  const val = log.value
  if (val == null || val === '') return false
  const goal = habit.goal
  if (goal == null) return Number(val) > 0
  const direction = habit.goalDirection || 'atleast'
  return direction === 'atleast' ? Number(val) >= goal : Number(val) <= goal
}

export const isFailed = (habit, log) => {
  if (!log) return false
  if (log.failed) return true  // explicit failed flag
  if (!habit.isMeasured) return false
  // measured: logged a value but didn't meet goal = failed
  const val = log.value
  if (val == null || val === '') return false
  const goal = habit.goal
  if (goal == null) return false
  const direction = habit.goalDirection || 'atleast'
  return direction === 'atleast' ? Number(val) < goal : Number(val) > goal
}

// ── Daily streak (for daily habits) ─────────────────────────
export const computeStreak = (habit, logs) => {
  const logMap = {}
  logs.forEach(l => { if (l.habitId === habit.id) logMap[l.date] = l })

  const startDate = habit.startDate || '2000-01-01'
  let streak = 0
  let d = new Date()

  while (true) {
    const str = dateStr(d)
    if (str < startDate) break

    const log = logMap[str]
    const success = isSuccess(habit, log)

    if (success) {
      streak++
    } else if (str === todayStr()) {
      // today not yet logged — don't break streak
    } else {
      break
    }

    d = subDays(d, 1)
    if (streak > 3650) break
  }

  return streak
}

// ── All streaks history (for drill-down) ────────────────────
export const computeAllStreaks = (habit, logs) => {
  const logMap = {}
  logs.forEach(l => { if (l.habitId === habit.id) logMap[l.date] = l })

  const startDate = habit.startDate || '2000-01-01'
  const streaks = []
  let current = null
  let d = parseISO(startDate)
  const today = new Date()

  while (!isAfter(d, today)) {
    const str = dateStr(d)
    const log = logMap[str]
    const success = isSuccess(habit, log)

    if (success) {
      if (!current) current = { start: str, end: str, length: 1 }
      else { current.end = str; current.length++ }
    } else {
      if (current) { streaks.push(current); current = null }
    }
    d = addDays(d, 1)
  }
  if (current) streaks.push(current)

  return streaks.reverse() // most recent first
}

// ── Consistency score (daily habit) ─────────────────────────
// % of days since startDate where goal was met (excluding today if not logged)
export const consistencyScore = (habit, logs) => {
  const logMap = {}
  logs.forEach(l => { if (l.habitId === habit.id) logMap[l.date] = l })

  const startDate = habit.startDate || todayStr()
  let d = parseISO(startDate)
  const today = new Date()
  let total = 0, met = 0

  while (!isAfter(d, today)) {
    const str = dateStr(d)
    total++
    if (isSuccess(habit, logMap[str])) met++
    d = addDays(d, 1)
  }

  return total === 0 ? 0 : Math.round((met / total) * 100)
}

// ── Weekly streak (for non-daily habits) ────────────────────
// A week is Mon–Sun. First partial week (if start is mid-week) is ignored.
export const computeWeeklyStreak = (habit, logs) => {
  const logMap = {}
  logs.forEach(l => { if (l.habitId === habit.id) logMap[l.date] = l })

  const startDate = habit.startDate || todayStr()
  const weeks = getFullWeeksSinceStart(startDate)
  let streak = 0

  for (let i = weeks.length - 1; i >= 0; i--) {
    const week = weeks[i]
    const isCurrent = week.some(d => dateStr(d) === todayStr())
    if (weekMet(habit, week, logMap)) {
      streak++
    } else if (isCurrent) {
      // current week still in progress — don't break
    } else {
      break
    }
  }

  return streak
}

// ── Weekly consistency score ─────────────────────────────────
export const weeklyConsistencyScore = (habit, logs) => {
  const logMap = {}
  logs.forEach(l => { if (l.habitId === habit.id) logMap[l.date] = l })

  const startDate = habit.startDate || todayStr()
  const weeks = getFullWeeksSinceStart(startDate)
  if (weeks.length === 0) return 0

  let met = 0
  weeks.forEach(week => { if (weekMet(habit, week, logMap)) met++ })
  return Math.round((met / weeks.length) * 100)
}

// ── Week-by-week data for trend chart ───────────────────────
export const weeklyTrendData = (habit, logs) => {
  const logMap = {}
  logs.forEach(l => { if (l.habitId === habit.id) logMap[l.date] = l })

  const startDate = habit.startDate || todayStr()
  const weeks = getFullWeeksSinceStart(startDate)

  return weeks.map(week => {
    const label = format(week[0], 'MMM d')
    if (habit.frequency === 'weekly') {
      const target = habit.weeklyDays?.length || habit.weeklyCount || 1
      const done = week.filter(d => {
        const str = dateStr(d)
        return !isAfter(parseISO(str), new Date()) && isSuccess(habit, logMap[str])
      }).length
      return { label, score: Math.round((done / target) * 100) }
    } else {
      // daily — % of days in week where goal met
      const past = week.filter(d => !isAfter(d, new Date()))
      const met  = past.filter(d => isSuccess(habit, logMap[dateStr(d)])).length
      return { label, score: past.length ? Math.round((met / past.length) * 100) : 0 }
    }
  })
}

// ── Perfect days ─────────────────────────────────────────────
// A perfect day = all daily habits (started on or before that day) met goals
export const computePerfectDays = (habits, logs) => {
  const dailyHabits = habits.filter(h => h.frequency !== 'weekly')
  if (dailyHabits.length === 0) return { total: 0, thisMonth: 0, lastMonth: 0 }

  const logMap = {}
  logs.forEach(l => {
    if (!logMap[l.date]) logMap[l.date] = {}
    logMap[l.date][l.habitId] = l
  })

  // Find earliest start date
  const earliest = dailyHabits.reduce((min, h) => {
    const s = h.startDate || todayStr()
    return s < min ? s : min
  }, todayStr())

  let d = parseISO(earliest)
  const today = new Date()
  let total = 0, thisMonth = 0, lastMonth = 0

  const nowMonth  = format(today, 'yyyy-MM')
  const prevMonth = format(subDays(startOfMonth(today), 1), 'yyyy-MM')

  while (!isAfter(d, today)) {
    const str = dateStr(d)
    const dayLogs = logMap[str] || {}

    // Only habits that have started by this day
    const activeHabits = dailyHabits.filter(h => (h.startDate || todayStr()) <= str)
    if (activeHabits.length === 0) { d = addDays(d, 1); continue }

    const perfect = activeHabits.every(h => isSuccess(h, dayLogs[h.id]))
    if (perfect) {
      total++
      const m = str.slice(0, 7)
      if (m === nowMonth)  thisMonth++
      if (m === prevMonth) lastMonth++
    }
    d = addDays(d, 1)
  }

  return { total, thisMonth, lastMonth }
}

// ── Perfect weeks ────────────────────────────────────────────
export const computePerfectWeeks = (habits, logs) => {
  const weeklyHabits = habits.filter(h => h.frequency === 'weekly')
  if (weeklyHabits.length === 0) return { total: 0, thisMonth: 0, lastMonth: 0 }

  const logMap = {}
  logs.forEach(l => {
    if (!logMap[l.date]) logMap[l.date] = {}
    logMap[l.date][l.habitId] = l
  })

  const earliest = weeklyHabits.reduce((min, h) => {
    const s = h.startDate || todayStr()
    return s < min ? s : min
  }, todayStr())

  const weeks = getFullWeeksSinceStart(earliest)
  const today = new Date()
  let total = 0, thisMonth = 0, lastMonth = 0

  const nowMonth  = format(today, 'yyyy-MM')
  const prevMonth = format(subDays(startOfMonth(today), 1), 'yyyy-MM')

  weeks.forEach(week => {
    const weekLogMap = {}
    week.forEach(d => {
      const str = dateStr(d)
      if (logMap[str]) Object.assign(weekLogMap, logMap[str])
    })

    const activeHabits = weeklyHabits.filter(h => {
      const s = h.startDate || todayStr()
      return s <= dateStr(week[week.length - 1])
    })
    if (activeHabits.length === 0) return

    const perfect = activeHabits.every(h => {
      const wlMap = {}
      week.forEach(d => { const str = dateStr(d); if (logMap[str]?.[h.id]) wlMap[str] = logMap[str][h.id] })
      return weekMet(h, week, wlMap)
    })

    if (perfect) {
      total++
      const m = dateStr(week[0]).slice(0, 7)
      if (m === nowMonth)  thisMonth++
      if (m === prevMonth) lastMonth++
    }
  })

  return { total, thisMonth, lastMonth }
}

// ── Monthly calendar data ────────────────────────────────────
export const monthCalendarData = (habits, logs) => {
  const dailyHabits = habits.filter(h => h.frequency !== 'weekly')
  const today = new Date()
  const start = startOfMonth(today)
  const end   = endOfMonth(today)

  const logMap = {}
  logs.forEach(l => {
    if (!logMap[l.date]) logMap[l.date] = {}
    logMap[l.date][l.habitId] = l
  })

  const days = eachDayOfInterval({ start, end })
  return days.map(d => {
    const str = dateStr(d)
    const isFuture = isAfter(d, today)
    const dayLogs = logMap[str] || {}
    const activeHabits = dailyHabits.filter(h => (h.startDate || todayStr()) <= str)

    let status = 'future'
    if (!isFuture) {
      if (activeHabits.length === 0) status = 'no-habits'
      else if (activeHabits.every(h => isSuccess(h, dayLogs[h.id]))) status = 'perfect'
      else status = 'missed'
    }

    return { date: d, str, status, dayNum: format(d, 'd'), dayName: format(d, 'EEE') }
  })
}

// ── Helpers ──────────────────────────────────────────────────
// Returns array of full Mon–Sun weeks since startDate (first partial week excluded)
function getFullWeeksSinceStart(startDate) {
  const start = parseISO(startDate)
  const today = new Date()

  // First Monday on or after startDate
  let firstMon = startOfWeek(start, { weekStartsOn: 1 })
  if (isBefore(firstMon, start)) firstMon = addDays(firstMon, 7)

  if (isAfter(firstMon, today)) return []

  const weeks = []
  let weekStart = firstMon

  while (!isAfter(weekStart, today)) {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    weeks.push(days)
    weekStart = addDays(weekStart, 7)
  }

  return weeks
}

function weekMet(habit, weekDays, logMap) {
  const past = weekDays.filter(d => !isAfter(d, new Date()))
  if (past.length === 0) return false

  if (habit.weeklyDays && habit.weeklyDays.length > 0) {
    // specific days mode — check only those days
    return habit.weeklyDays.every(dayNum => {
      const d = weekDays.find(wd => wd.getDay() === dayNum)
      if (!d) return true
      if (isAfter(d, new Date())) return true // future day in week
      return isSuccess(habit, logMap[dateStr(d)])
    })
  } else {
    // flexible — need weeklyCount days done in the week
    const target = habit.weeklyCount || 1
    const done = past.filter(d => isSuccess(habit, logMap[dateStr(d)])).length
    return done >= target
  }
}
