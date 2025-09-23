/**
 * This enum is used to distinguish purely presentational components
 * from interactive form components that can have formData etc.
 *
 * These must have values that are equal to their keys, as code generation will use the enum value to generate
 * code that have to match the keys.
 */
export enum CompCategory {
  Presentation = 'Presentation',
  Form = 'Form',
  Action = 'Action',
  Container = 'Container',
}
