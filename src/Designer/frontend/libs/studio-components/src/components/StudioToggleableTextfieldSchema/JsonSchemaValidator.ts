import Ajv, { type ErrorObject } from 'ajv';
import { type JsonSchema } from '../../types/JSONSchema';

export class JsonSchemaValidator {
  private readonly layoutSchema: JsonSchema | null = null;

  private JSONValidator: Ajv = new Ajv({
    allErrors: true,
    strict: false,
  });

  constructor(layoutSchema: JsonSchema, schemas: JsonSchema[]) {
    if (!layoutSchema) return;

    this.layoutSchema = layoutSchema;

    [...schemas, layoutSchema].forEach((schema: JsonSchema): void => {
      this.addSchemaToValidator(schema);
    });
  }

  public isPropertyRequired(propertyPath: string): boolean {
    if (!this.layoutSchema || !propertyPath) return false;
    const parent = this.getPropertyByPath(
      propertyPath.substring(0, propertyPath.lastIndexOf('/properties')),
    );

    return (
      Array.isArray(parent?.required) && parent.required.includes(propertyPath.split('/').pop())
    );
  }

  public validateProperty(propertyId: string, value: unknown): string | null {
    const JSONSchemaValidationErrors = this.validate(propertyId, value);
    const firstError = JSONSchemaValidationErrors?.[0];
    const isCurrentComponentError = firstError?.instancePath === '';
    return isCurrentComponentError ? firstError?.keyword : null;
  }

  private addSchemaToValidator(schema: JsonSchema): void {
    if (schema.$id) {
      const validate = this.JSONValidator.getSchema(schema.$id);
      if (!validate) {
        this.JSONValidator.addSchema(schema);
      }
    }
  }

  private getPropertyByPath(path: string): Record<string, unknown> {
    const result = path
      .split('/')
      .reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), this.layoutSchema);
    return result && typeof result === 'object' ? { ...result } : {};
  }

  private validate(schemaId: string, data: unknown): ErrorObject[] | null {
    const validateJsonSchema = this.JSONValidator.getSchema(schemaId);
    if (validateJsonSchema) {
      validateJsonSchema(data);

      if ('errors' in validateJsonSchema && validateJsonSchema.errors) {
        return validateJsonSchema.errors;
      }
    }
    return null;
  }
}
