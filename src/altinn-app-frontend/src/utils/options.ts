import { IMapping } from "src/types";

export function getOptionLookupKey(id: string, mapping?: IMapping) {
  if (!mapping) {
    return id;
  }

  return JSON.stringify({ id, mapping });
}
