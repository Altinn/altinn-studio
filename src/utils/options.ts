import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

/**
 * Fast method for removing duplicate option values
 */
export function filterDuplicateOptions(options: IOptionInternal[]): IOptionInternal[] {
  const seen = new Set<string>();
  const out: IOptionInternal[] = [];
  let j = 0;
  for (let i = 0; i < options.length; i++) {
    if (!seen.has(options[i].value)) {
      seen.add(options[i].value);
      out[j++] = options[i];
    }
  }
  return out;
}
