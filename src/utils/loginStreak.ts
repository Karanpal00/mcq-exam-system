/**
 * Utility to record and calculate daily login streaks in the user's local timezone.
 */

export function getLocalDateString(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Records the login for today if it hasn't been recorded yet.
 */
export function recordDailyLogin(): void {
  try {
    const todayStr = getLocalDateString();
    const datesJson = localStorage.getItem('login_streak_dates') || '[]';
    const dates: string[] = JSON.parse(datesJson);
    
    if (!dates.includes(todayStr)) {
      dates.push(todayStr);
      // Keep only last 365 days of records to prevent size bloat
      if (dates.length > 365) {
        dates.shift();
      }
      localStorage.setItem('login_streak_dates', JSON.stringify(dates));
    }
  } catch (e) {
    console.error('Failed to record daily login:', e);
  }
}

/**
 * Calculates the current consecutive login streak from recorded dates.
 */
export function calculateLoginStreak(loginDates: string[]): number {
  if (loginDates.length === 0) return 0;

  const uniqueDates = new Set(loginDates);
  const today = new Date();
  const todayStr = getLocalDateString(today);
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  let checkDate = new Date();
  
  // A streak is active if there is a login record for either today or yesterday.
  if (uniqueDates.has(todayStr)) {
    checkDate = today;
  } else if (uniqueDates.has(yesterdayStr)) {
    checkDate = yesterday;
  } else {
    // If no login recorded today or yesterday, the streak is broken (0).
    return 0;
  }

  let streak = 0;
  while (true) {
    const checkStr = getLocalDateString(checkDate);
    if (uniqueDates.has(checkStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
