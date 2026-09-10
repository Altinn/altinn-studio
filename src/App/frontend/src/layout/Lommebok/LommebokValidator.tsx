import { useEffect } from 'react';

import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { FormStore } from 'src/features/form/FormContext';
import { useLanguage } from 'src/features/language/useLanguage';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';

/**
 * Validator component that checks Lommebok configuration against application metadata.
 * This runs during development to catch configuration errors early.
 */
export function LommebokValidator({ externalItem }: ComponentLayoutValidationProps<'Lommebok'>) {
  const { langAsString } = useLanguage();
  const applicationMetadata = getApplicationMetadata();
  const addError = FormStore.layoutDiagnostics.useAddError();

  useEffect(() => {
    const errors: string[] = [];

    // Validate each requested document
    externalItem.request?.forEach((doc) => {
      // Validate saveToDataType if specified
      if (doc.saveToDataType) {
        const dataType = applicationMetadata.dataTypes.find((dt) => dt.id === doc.saveToDataType);
        if (!dataType) {
          const error = langAsString('config_error.lommebok_datatype_not_found', [doc.saveToDataType, doc.type]);
          errors.push(error);
        }
      }

      // Validate alternativeUploadToDataType if specified
      if (doc.alternativeUploadToDataType) {
        const dataType = applicationMetadata.dataTypes.find((dt) => dt.id === doc.alternativeUploadToDataType);

        if (!dataType) {
          const error = langAsString('config_error.lommebok_upload_datatype_not_found', [
            doc.alternativeUploadToDataType,
            doc.type,
          ]);
          errors.push(error);
        } else {
          // Check if PDF mime type is allowed
          const allowedContentTypes = dataType.allowedContentTypes || [];
          const allowsPdf = allowedContentTypes.includes('application/pdf');

          if (!allowsPdf) {
            const error = langAsString('config_error.lommebok_upload_datatype_invalid_mimetype', [
              doc.alternativeUploadToDataType,
              doc.type,
            ]);
            errors.push(error);
          }
        }
      }
    });

    // Add all errors
    errors.forEach((error) => {
      addError(error, externalItem.id, 'node');
      window.logErrorOnce(`Validation error for '${externalItem.id}': ${error}`);
    });
  }, [addError, applicationMetadata.dataTypes, externalItem, langAsString]);

  return null;
}
