export interface AutoLockOption {
  value: number;
  label: string;
}

export const AUTO_LOCK_OPTIONS: AutoLockOption[] = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 0, label: 'Never' },
];

export const DEFAULT_AUTO_LOCK_MINUTES = 15;

export function formatAutoLockLabel(options: AutoLockOption[], minutes: number): string {
  const option = options.find((item) => item.value === minutes);
  return option ? option.label : `${String(minutes)} minutes`;
}
