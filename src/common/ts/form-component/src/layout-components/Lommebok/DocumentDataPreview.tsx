import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';

import classes from './DocumentDataPreview.module.css';
import { PresentationValue } from './PresentationValue';
import type { PresentationField } from './PresentationValue';

export interface DocumentDataPreviewProps {
  fields: PresentationField[];
}

/**
 * Shared grid layout for presentation fields, used both in the success dialog and in the saved
 * document view.
 */
export function DocumentDataPreview({ fields }: DocumentDataPreviewProps) {
  const { lang } = useTranslation();

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className={classes.dataPreview}>
      {fields.map((field, index) => (
        <div key={index} className={classes.dataPreviewItem}>
          <dt className={classes.dataPreviewLabel}>{lang(field.title)}</dt>
          <dd className={classes.dataPreviewValue}>
            <PresentationValue value={field.value} displayType={field.displayType} />
          </dd>
        </div>
      ))}
    </div>
  );
}
