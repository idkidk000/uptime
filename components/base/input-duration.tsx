import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import { InputNumber } from '@/components/base/input-number';
import { Select2 } from '@/components/base/select';

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

export function InputDuration({
  value,
  onValueChange,
  mode = 'seconds',
  ...props
}: ComponentProps<typeof InputNumber> & {
  onValueChange: (value: number) => void;
  placeholder: string;
  value: number;
  mode?: 'seconds' | 'millis';
}) {
  const baseMultiplier = mode === 'millis' ? 1000 : 1;
  const bestPeriod =
    periods.toReversed().find((item) => Number.isInteger(value / baseMultiplier / item.multiplier)) ?? periods[0];
  const [period, setPeriod] = useState(bestPeriod);
  const [periodValue, setPeriodValue] = useState(value / baseMultiplier / bestPeriod.multiplier);
  const state = useRef({ period, periodValue });

  // quite jank honestly
  useEffect(() => {
    if (state.current.periodValue * state.current.period.multiplier * baseMultiplier === value) return;
    const bestPeriod = periods.toReversed().find((item) => Number.isInteger(value / item.multiplier)) ?? periods[0];
    setPeriod(bestPeriod);
    setPeriodValue(value / baseMultiplier / bestPeriod.multiplier);
    state.current.period = bestPeriod;
    state.current.periodValue = value / baseMultiplier / bestPeriod.multiplier;
  }, [value, baseMultiplier]);

  const handlePeriodValueChange = useCallback(
    (value: number) => {
      setPeriodValue(value);
      state.current.periodValue = value;
      onValueChange(state.current.period.multiplier * value * baseMultiplier);
    },
    [onValueChange, baseMultiplier]
  );

  const handlePeriodChange = useCallback(
    (value: number) => {
      const period = periods.find((item) => item.multiplier === value);
      if (!period) throw new Error(`invalid period: ${value}`);
      setPeriod(period);
      state.current.period = period;
      onValueChange(period.multiplier * state.current.periodValue * baseMultiplier);
    },
    [onValueChange, baseMultiplier]
  );

  return (
    <div className='grid grid-cols-2 gap-2'>
      <InputNumber onValueChange={handlePeriodValueChange} value={periodValue} withButtons {...props} />
      <Select2
        mode='number'
        options={periods.map(({ label, multiplier }) => ({ label, value: multiplier }))}
        onValueChange={handlePeriodChange}
        value={period.multiplier}
        placeholder='Period'
      />
    </div>
  );
}
