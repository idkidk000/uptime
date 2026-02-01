import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import { InputNumber } from '@/components/input/input-number';
import { Select } from '@/components/input/select';

export type DurationValue<AllowEmpty extends boolean> = number | (AllowEmpty extends true ? undefined : never);

const periods = [
  { label: 'Milli', multiplier: 0.001 },
  { label: 'Second', multiplier: 1 },
  { label: 'Minute', multiplier: 60 },
  { label: 'Hour', multiplier: 3600 },
  { label: 'Day', multiplier: 86400 },
  { label: 'Week', multiplier: 604800 },
  { label: 'Month', multiplier: 2592000 },
  { label: 'Year', multiplier: 31536000 },
];

export function InputDuration<AllowEmpty extends boolean>({
  value,
  onValueChange,
  mode = 'seconds',
  allowEmpty,
  ...props
}: Omit<ComponentProps<typeof InputNumber<AllowEmpty>>, 'value' | 'onValueChange'> & {
  onValueChange: (value: DurationValue<AllowEmpty>) => void;
  placeholder: string;
  value: DurationValue<AllowEmpty>;
  mode?: 'seconds' | 'millis';
}) {
  const baseMultiplier = mode === 'millis' ? 1000 : 1;
  const bestPeriod =
    typeof value === 'undefined'
      ? undefined
      : (periods.toReversed().find((item) => Number.isInteger(value / baseMultiplier / item.multiplier)) ?? periods[0]);
  const [period, setPeriod] = useState(bestPeriod);
  const [periodValue, setPeriodValue] = useState(
    typeof value === 'undefined' || typeof bestPeriod === 'undefined'
      ? undefined
      : value / baseMultiplier / bestPeriod.multiplier
  );
  const state = useRef({ period, periodValue });

  // quite jank honestly
  useEffect(() => {
    if (typeof value === 'undefined') {
      if (typeof state.current.period !== 'undefined') {
        setPeriod(undefined);
        state.current.period = undefined;
      }
      if (typeof state.current.periodValue !== 'undefined') {
        setPeriodValue(undefined);
        state.current.periodValue = undefined;
      }
      return;
    }
    if (
      typeof state.current.periodValue !== 'undefined' &&
      typeof state.current.period !== 'undefined' &&
      state.current.periodValue * state.current.period.multiplier * baseMultiplier === value
    )
      return;
    const bestPeriod = periods.toReversed().find((item) => Number.isInteger(value / item.multiplier)) ?? periods[0];
    setPeriod(bestPeriod);
    setPeriodValue(value / baseMultiplier / bestPeriod.multiplier);
    state.current.period = bestPeriod;
    state.current.periodValue = value / baseMultiplier / bestPeriod.multiplier;
  }, [value, baseMultiplier]);

  // biome-ignore format: no
  const handlePeriodValueChange = useCallback((value: number | undefined) => {
    setPeriodValue(value);
    state.current.periodValue = value;
    if (typeof value === 'number' && typeof state.current.period === 'undefined') {
      const period = periods[0];
      setPeriod(period);
      state.current.period = period;
    }
    onValueChange(
      (typeof value === 'undefined' || typeof state.current.period === 'undefined'
        ? undefined
        : state.current.period.multiplier * value * baseMultiplier) as DurationValue<AllowEmpty>
    );
  }, [onValueChange, baseMultiplier]);

  // biome-ignore format: no
  const handlePeriodChange = useCallback((value: number | undefined) => {
    const period = periods.find((item) => item.multiplier === value);
    setPeriod(period);
    state.current.period = period;
    if (typeof period !== 'undefined' && typeof state.current.periodValue === 'undefined') {
      setPeriodValue(0);
      state.current.periodValue = 0;
    }
    onValueChange(
      (typeof period === 'undefined' || typeof state.current.periodValue === 'undefined'
        ? undefined
        : period.multiplier * state.current.periodValue * baseMultiplier) as DurationValue<AllowEmpty>
    );
  }, [onValueChange, baseMultiplier]);

  return (
    <div className='flex'>
      <InputNumber
        onValueChange={handlePeriodValueChange}
        value={periodValue as DurationValue<AllowEmpty>}
        // withButtons
        allowEmpty={allowEmpty}
        className='rounded-e-none border-e'
        {...props}
      />
      <Select<number, AllowEmpty>
        mode='number'
        options={periods.map(({ label, multiplier }) => ({ label, value: multiplier }))}
        onValueChange={handlePeriodChange}
        value={period?.multiplier as DurationValue<AllowEmpty>}
        allowEmpty={allowEmpty}
        placeholder='Period'
        className='rounded-s-none border-s'
        alignment='left'
      />
    </div>
  );
}
