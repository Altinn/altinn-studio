import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { type JsonSchema } from '../../types/JSONSchema';

export class JsonSchemaValidator {
  private readonly jsonSchema: JsonSchema = null;
  private JSONValidator: Ajv = new Ajv({
    allErrors: true,
    strict: false,
  });

  constructor(schema: JsonSchema) {
    if (!schema) return;

    addFormats(this.JSONValidator);
    this.jsonSchema = schema;
    this.addSchemaToValidator(schema);
  }

  public isPropertyRequired(propertyPath: string): boolean {
    if (!this.jsonSchema || !propertyPath) return false;
    const parent = this.getPropertyByPath(
      propertyPath.substring(0, propertyPath.lastIndexOf('/properties')),
    );
    return parent?.required?.includes(propertyPath.split('/').pop());
  }

  public validateProperty(propertyId: string, value: any): string | null {
    const JSONSchemaValidationErrors = this.validate(propertyId, value);
    const firstError = JSONSchemaValidationErrors?.[0];
    const isCurrentComponentError = firstError?.instancePath === '';
    return isCurrentComponentError ? firstError?.keyword : null;
  }

  private addSchemaToValidator(schema: JsonSchema): void {
    const validate = this.JSONValidator.getSchema(schema?.$id);
    if (!validate) {
      this.JSONValidator.addSchema(schema);
    }
  }

  private getPropertyByPath(path: string) {
    return { ...path.split('/').reduce((o, p) => (o || {})[p], this.jsonSchema) };
  }

  private validate(schemaId: string, data: any): ErrorObject[] | null {
    const validateJsonSchema = this.JSONValidator.getSchema(schemaId);
    if (validateJsonSchema) {
      validateJsonSchema(data);

      if ('errors' in validateJsonSchema) {
        return validateJsonSchema.errors;
      }
    }
    return null;
  }
}
