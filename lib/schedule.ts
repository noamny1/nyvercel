export function slideIsOn(slide: { active: boolean; weekdays: string }, now = new Date()) {
  if (!slide.active) return false;
  if (!slide.weekdays) return true;
  return slide.weekdays.includes(String(now.getDay()));
}
