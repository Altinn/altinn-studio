/**
 * An app scaffold a new application can be created from, e.g. "v8" or "v9". Distinct from
 * CustomTemplate, which is a content overlay applied on top of the scaffold.
 */
export interface AppTemplate {
  id: string;
  displayName: string;
  description: string;
}
