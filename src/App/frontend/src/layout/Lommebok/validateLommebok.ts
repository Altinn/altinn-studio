import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import type { ComponentValidation } from 'src/features/validation';
import type { ComponentValidationContext } from 'src/layout';

/**
 * Validates the Lommebok component configuration against application metadata.
 * Ensures that:
 * 1. saveToDataType references valid data types with correct settings
 * 2. alternativeUploadToDataType references valid data types that allow PDF uploads
 * 3. issue documents reference a urlField
 */
export function validateLommebokForNode(ctx: ComponentValidationContext<'Lommebok'>): ComponentValidation[] {
  const applicationMetadata = getApplicationMetadata();
  const { component } = ctx;

  const validations: ComponentValidation[] = [];

  // Validate each requested document
  component.request?.forEach((doc) => {
    // Validate saveToDataType if specified
    if (doc.saveToDataType) {
      const dataType = applicationMetadata.dataTypes.find((dt) => dt.id === doc.saveToDataType);

      if (!dataType) {
        validations.push({
          message: {
            key: 'config_error.lommebok_datatype_not_found',
            params: [doc.saveToDataType, doc.type],
          },
          severity: 'error',
          source: FrontendValidationSource.Component,
          category: ValidationMask.Required,
        });
      } else {
        // Check data type settings
        const errors: string[] = [];
        const autoCreate = dataType.appLogic?.autoCreate ?? false;
        const disallowUserCreate = dataType.appLogic?.disallowUserCreate ?? false;

        if (autoCreate !== true) {
          errors.push('autoCreate should be true');
        }
        if (disallowUserCreate !== false) {
          errors.push('allowUserCreate should be true (disallowUserCreate should be false)');
        }
        if (dataType.maxCount !== 1) {
          errors.push('maxCount should be 1');
        }
        if (dataType.minCount !== 1) {
          errors.push('minCount should be 1');
        }

        if (errors.length > 0) {
          validations.push({
            message: {
              key: 'config_error.lommebok_datatype_invalid_settings',
              params: [doc.saveToDataType, doc.type, errors.join(', ')],
            },
            severity: 'error',
            source: FrontendValidationSource.Component,
            category: ValidationMask.Required,
          });
        }
      }
    }

    // Validate alternativeUploadToDataType if specified
    if (doc.alternativeUploadToDataType) {
      const dataType = applicationMetadata.dataTypes.find((dt) => dt.id === doc.alternativeUploadToDataType);

      if (!dataType) {
        validations.push({
          message: {
            key: 'config_error.lommebok_upload_datatype_not_found',
            params: [doc.alternativeUploadToDataType, doc.type],
          },
          severity: 'error',
          source: FrontendValidationSource.Component,
          category: ValidationMask.Required,
        });
      } else {
        // Check if PDF mime type is allowed
        const allowedContentTypes = dataType.allowedContentTypes || [];
        const allowsPdf = allowedContentTypes.includes('application/pdf');

        if (!allowsPdf) {
          validations.push({
            message: {
              key: 'config_error.lommebok_upload_datatype_invalid_mimetype',
              params: [doc.alternativeUploadToDataType, doc.type],
            },
            severity: 'error',
            source: FrontendValidationSource.Component,
            category: ValidationMask.Required,
          });
        }
      }
    }
  });

  // Validate each issuable document
  component.issue?.forEach((doc) => {
    // Validate urlDataType if specified
    if (doc.urlDataType) {
      const dataType = applicationMetadata.dataTypes.find((dt) => dt.id === doc.urlDataType);

      if (!dataType) {
        validations.push({
          message: {
            key: 'config_error.lommebok_issue_datatype_not_found',
            params: [doc.urlDataType, doc.type],
          },
          severity: 'error',
          source: FrontendValidationSource.Component,
          category: ValidationMask.Required,
        });
      }
    }

    // Validate that urlField is specified
    if (!doc.urlField || doc.urlField.trim().length === 0) {
      validations.push({
        message: {
          key: 'config_error.lommebok_issue_missing_url_field',
          params: [doc.type],
        },
        severity: 'error',
        source: FrontendValidationSource.Component,
        category: ValidationMask.Required,
      });
    }
  });

  return validations;
}
