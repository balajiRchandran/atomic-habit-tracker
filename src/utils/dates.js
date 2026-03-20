// src/utils/dates.js
import { format, subDays, startOfDay, parseISO, isToday, isBefore, differenceInCalendarDays } from 'date-fns'

export const todayStr = () => format(new Date(), 'yyyy-MM-dd')

export const dateStr = (d) => format(d, 'yyyy-MM-dd')

export const last7Days = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return { date: d, str: dateStr(d) }
  })

export const last30Days = () =>
  Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i)
    return { date: d, str: dateStr(d) }
  })

export const last90Days = () =>
  Array.from({ length: 90 }, (_, i) => {
    const d = subDays(new Date(), 89 - i)
    return { date: d, str: dateStr(d) }
  })

// Compute current streak for a habit given set of completed date strings
// For good habits: streak = consecutive days ending today where done=true
// For bad habits: streak = consecutive days ending today where done=false (avoiding)
export const computeStreak = (habitId, habitType, logs) => {
  const logMap = {}
  logs.forEach(l => {
    if (l.habitId === habitId) logMap[l.date] = l
  })

  let streak = 0
  let d = new Date()

  while (true) {
    const str = dateStr(d)
    const log = logMap[str]
    const future = isBefore(new Date(), startOfDay(d)) // shouldn't happen but guard

    if (future) { d = subDays(d, 1); continue }

    if (habitType === 'good') {
      if (log?.done) { streak++; d = subDays(d, 1) }
      else if (str === todayStr()) { d = subDays(d, 1); continue } // today not yet checked — don't break
      else break
    } else {
      // bad habit: streak = days successfully avoided
      if (!log?.done) { streak++; d = subDays(d, 1) }
      else if (str === todayStr()) { d = subDays(d, 1); continue }
      else break
    }

    if (streak > 3650) break // safety
  }

  return streak
}

export const friendlyDate = (d) => {
  if (isToday(d)) return 'Today'
  return format(d, 'EEE d')
}
