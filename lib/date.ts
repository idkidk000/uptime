export const MILLI_SECONDS = 0.001;
export const SECOND_MILLIS = 1000;
export const MINUTE_SECONDS = 60;
export const MINUTE_MILLIS = MINUTE_SECONDS * 1000;
export const HOUR_MINUTES = 60;
export const HOUR_SECONDS = 3600;
export const HOUR_MILLIS = HOUR_SECONDS * 1000;
export const DAY_SECONDS = 86400;
export const DAY_MILLIS = DAY_SECONDS * 1000;
export const WEEK_DAYS = 7;
export const WEEK_SECONDS = WEEK_DAYS * DAY_SECONDS;
export const WEEK_MILLIS = WEEK_DAYS * DAY_MILLIS;
export const MONTH_DAYS = 30;
export const MONTH_MILLIS = MONTH_DAYS * DAY_MILLIS;
export const YEAR_DAYS = 365;
export const YEAR_MILLIS = YEAR_DAYS * DAY_MILLIS;
export const SECOND_MICROS = 1_000_000;

export const toDuration = (millis: number) => {
  if (Math.abs(millis) > YEAR_MILLIS * 3) return `${Math.round(millis / YEAR_MILLIS)} years`;
  if (Math.abs(millis) > MONTH_MILLIS * 3) return `${Math.round(millis / MONTH_MILLIS)} months`;
  if (Math.abs(millis) > WEEK_MILLIS * 3) return `${Math.round(millis / WEEK_MILLIS)} weeks`;
  if (Math.abs(millis) > DAY_MILLIS * 3) return `${Math.round(millis / DAY_MILLIS)} days`;
  if (Math.abs(millis) > HOUR_MILLIS * 3) return `${Math.round(millis / HOUR_MILLIS)} hours`;
  if (Math.abs(millis) > MINUTE_MILLIS * 3) return `${Math.round(millis / MINUTE_MILLIS)} minutes`;
  return `${Math.round(millis / SECOND_MILLIS)} seconds`;
};

export const dateAdd = (
  {
    days,
    hours,
    millis,
    minutes,
    months,
    seconds,
    years,
  }: {
    millis?: number;
    seconds?: number;
    minutes?: number;
    hours?: number;
    days?: number;
    months?: number;
    years?: number;
  },
  date?: Date | number | string
) => {
  const dt = date ? new Date(date) : new Date();
  if (days) dt.setDate(dt.getDate() + days);
  if (hours) dt.setHours(dt.getHours() + hours);
  if (millis) dt.setMilliseconds(dt.getMilliseconds() + millis);
  if (minutes) dt.setMinutes(dt.getMinutes() + minutes);
  if (months) dt.setMonth(dt.getMonth() + months);
  if (seconds) dt.setSeconds(dt.getSeconds() + seconds);
  if (years) dt.setFullYear(dt.getFullYear() + years);
  return dt;
};

/** a-b. difference in ms */
export const dateDiff = (a: Date | number | string, b: Date | number | string = Date.now()) => {
  const dtA = new Date(a);
  const dtB = new Date(b);
  return dtA.getTime() - dtB.getTime();
};

export const toLocalIso = (
  date: Date | number | string = new Date(),
  { endAt = 'd', showDate = true }: { endAt?: 'd' | 'h' | 'm' | 's' | 'n'; showDate?: boolean | 'auto' } = {}
) => {
  const dt = new Date(date);
  const datePart = [
    dt.getFullYear().toString().padStart(4, '0'),
    (dt.getMonth() + 1).toString().padStart(2, '0'),
    dt.getDate().toString().padStart(2, '0'),
  ].join('-');
  const timeParts: string[] = [];
  if (endAt !== 'd') {
    timeParts.push(dt.getHours().toString().padStart(2, '0'));
    if (endAt !== 'h') {
      timeParts.push(dt.getMinutes().toString().padStart(2, '0'));
      if (endAt === 's') {
        timeParts.push(dt.getSeconds().toString().padStart(2, '0'));
      } else if (endAt === 'n') {
        timeParts.push(
          `${dt.getSeconds().toString().padStart(2, '0')}.${dt.getMilliseconds().toString().padStart(3, '0')}`
        );
      }
    }
  }
  const localShowDate =
    typeof showDate === 'boolean'
      ? showDate
      : (() => {
          const now = new Date();
          return (
            now.getFullYear() !== dt.getFullYear() || now.getMonth() !== dt.getMonth() || now.getDate() !== dt.getDate()
          );
        })();

  if (timeParts.length) return `${localShowDate ? `${datePart} ` : ''}${timeParts.join(':')}`;
  return datePart;
};

export const toRelative = (date: Date | number | string | undefined) => {
  if (typeof date === 'undefined') return '';
  const ts = new Date(date).getTime();
  const now = Date.now();
  const totalMillis = Math.abs(now - ts);
  const make = (unit: string, mod: number, div: number) => {
    const value = Math.floor((mod ? totalMillis % mod : totalMillis) / div);
    return {
      string: `${value.toLocaleString()}${unit}`,
      value,
    };
  };
  const years = make('y', 0, YEAR_MILLIS);
  const months = make('mo', YEAR_MILLIS, MONTH_MILLIS);
  const days = make('d', MONTH_MILLIS, DAY_MILLIS);
  const hours = make('h', DAY_MILLIS, HOUR_MILLIS);
  const minutes = make('m', HOUR_MILLIS, MINUTE_MILLIS);
  const parts =
    years.value >= 3
      ? [years]
      : years.value >= 1
        ? [years, months]
        : months.value >= 1
          ? [months, days]
          : days.value >= 3
            ? [days]
            : days.value >= 1
              ? [days, hours]
              : hours.value >= 12
                ? [hours]
                : hours.value >= 1
                  ? [hours, minutes]
                  : [minutes];
  const formatted = `${ts > now ? 'In ' : ''}${parts.map(({ string }) => string).join(', ')}${ts < now ? ' ago' : ''}`;
  return formatted;
};
