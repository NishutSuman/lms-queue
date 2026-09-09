// Shared helper: convert a sheet date + time into the canonical value a native
// <input type="datetime-local"> accepts ("YYYY-MM-DDTHH:mm", 24-hour). This value
// is identical on every OS/browser locale, so date/time fields fill correctly
// whether the browser displays 12-hour (AM/PM) or 24-hour time. Typing the raw
// string broke on locales that render 12-hour time (e.g. en-IN on Mac).
//
// Accepts date as "DD-MM-YYYY", "DD/MM/YYYY", or "YYYY-MM-DD";
// time as "HH:mm" (24-hour) or "hh:mm AM/PM".
export function toDateTimeLocal(dateStr, timeStr) {
  const dParts = String(dateStr).trim().split(/[-/]/);
  let yyyy, mm, dd;
  if (dParts[0].length === 4) {
    [yyyy, mm, dd] = dParts; // YYYY-MM-DD
  } else {
    [dd, mm, yyyy] = dParts; // DD-MM-YYYY
  }

  const t = String(timeStr).trim();
  const isPM = /pm$/i.test(t);
  const isAM = /am$/i.test(t);
  let [hh, min] = t.replace(/\s*[ap]m\s*$/i, "").split(":");
  hh = parseInt(hh, 10) || 0;
  min = parseInt(min, 10) || 0;
  if (isPM && hh !== 12) hh += 12; // 1–11 PM → 13–23
  if (isAM && hh === 12) hh = 0; // 12 AM → 00

  const pad = (n) => String(n).padStart(2, "0");
  return `${yyyy}-${pad(mm)}-${pad(dd)}T${pad(hh)}:${pad(min)}`;
}
