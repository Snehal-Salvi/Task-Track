// Due dates are plain YYYY-MM-DD strings, so "today" must come from the local clock.
// toISOString() would use UTC and be a day behind in India until 5:30 am.
export function localToday(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00`);

export function formatDue(iso: string, today: string): string {
  const days = Math.round((toDate(iso).getTime() - toDate(today).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  const date = toDate(iso);
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
