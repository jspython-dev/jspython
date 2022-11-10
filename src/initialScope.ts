import { parseDatetimeOrNull } from './common/utils';

export const INITIAL_SCOPE = {
  jsPython(): string {
    return `JSPython v2.1.10 (c) 2022 FalconSoft Ltd. All rights reserved.`;
  },
  dateTime: (str: number | string | unknown = null): Date =>
    parseDatetimeOrNull(str as string) || new Date(),
  range: range,
  print: (...args: unknown[]): unknown => {
    console.log(...args);
    return args.length > 0 ? args[0] : null;
  },
  isNull: (v: unknown, defValue: unknown = null): boolean | unknown =>
    defValue === null ? v === null : v || defValue,
  isDate: (d: unknown): boolean => d instanceof Date,
  isFunction: (v: unknown): boolean => typeof v === 'function',
  isString: (v: unknown): boolean => typeof v === 'string',
  deleteProperty: (obj: Record<string, unknown>, propName: string): boolean => delete obj[propName],
  Math: Math,
  Object: Object,
  Array: Array,
  JSON: JSON,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  printExecutionContext: (): void => {}, // will be overriden at runtime
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  getExecutionContext: (): Record<string, unknown> => ({}) // will be overriden at runtime
};

/**
 * This interface needs to be replaced
 */
export interface PackageToImport {
  name: string;
  properties?: { name: string; as?: string }[];
  as?: string;
}

function range(start: number, stop = NaN, step = 1): number[] {
  const arr: number[] = [];
  const isStopNaN = isNaN(stop);
  stop = isStopNaN ? start : stop;
  start = isStopNaN ? 0 : start;
  let i = start;
  while (i < stop) {
    arr.push(i);
    i += step;
  }
  return arr;
}
