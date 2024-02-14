import type Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ErrorObject } from 'ajv';

class StudioSchemaUtils {
  private ajv: Ajv;

  constructor(ajvInstance: Ajv) {
    this.ajv = ajvInstance;

    addFormats(this.ajv);
  }

  public getSchema($id: string) {
    return this.ajv.getSchema($id);
  }

  public getPropertyByPath(schema: any, path: string) {
    return { ...path.split('/').reduce((o, p) => (o || {})[p], schema) };
  }

  public isPropertyRequired(schema: any, propertyPath: string): boolean {
    if (!schema || !propertyPath) return false;
    const parent = this.getPropertyByPath(
      schema,
      propertyPath.substring(0, propertyPath.lastIndexOf('/properties')),
    );
    return parent?.required?.includes(propertyPath.split('/').pop());
  }

  public validate(schemaId: string, data: any): ErrorObject[] | null {
    const ajvValidate = this.ajv.getSchema(schemaId);
    if (ajvValidate) ajvValidate(data);
    return ajvValidate?.errors;
  }

  public validateProperty(propertyId: string, value: any): string {
    const ajvValidateErrors = this.validate(propertyId, value);
    const firstError = ajvValidateErrors?.[0];
    const isCurrentComponentError = firstError?.instancePath === '';
    return isCurrentComponentError ? firstError?.keyword : null;
  }
}

export default StudioSchemaUtils;
