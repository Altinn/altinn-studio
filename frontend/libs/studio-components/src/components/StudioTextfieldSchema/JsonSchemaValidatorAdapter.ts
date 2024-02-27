export interface StudioJSONValidator {
  getSchema(id: string): (data: unknown) => StudioJSONValidatorErrorObject | null;
}

export interface StudioJSONValidatorErrorObject {
  instancePath: string;
  keyword: string;
}

export class JsonSchemaValidatorAdapter<
  T extends StudioJSONValidator,
  Error extends StudioJSONValidatorErrorObject,
> {
  private JSONValidator: StudioJSONValidator;

  constructor(jsonValidator: T) {
    this.JSONValidator = jsonValidator;
  }

  public isPropertyRequired(schema: any, propertyPath: string): boolean {
    if (!schema || !propertyPath) return false;
    const parent = this.getPropertyByPath(
      schema,
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

  private getPropertyByPath(schema: any, path: string) {
    return { ...path.split('/').reduce((o, p) => (o || {})[p], schema) };
  }

  private validate(schemaId: string, data: any): Error[] | null {
    const validateJsonSchema = this.JSONValidator.getSchema(schemaId);
    if (validateJsonSchema) {
      validateJsonSchema(data);

      if ('errors' in validateJsonSchema) {
        return validateJsonSchema.errors as Error[];
      }
    }
    return null;
  }
}
