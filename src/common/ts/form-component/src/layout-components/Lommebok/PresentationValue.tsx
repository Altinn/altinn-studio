import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { format } from 'date-fns';

export type PresentationDisplayType = 'string' | 'date' | 'image' | 'boolean';

export interface PresentationField {
  title: string;
  value: unknown;
  displayType?: PresentationDisplayType;
}

export interface PresentationValueProps {
  value: unknown;
  displayType?: PresentationDisplayType;
}

const truthyValues: unknown[] = ['true', '1', 'J', 'Y', 'True', 'TRUE', 1, true];

/**
 * Formats and renders a single presentation field value based on its display type.
 */
export function PresentationValue({ value, displayType }: PresentationValueProps) {
  const { langAsString } = useTranslation();

  if (value === null || value === undefined) {
    return null;
  }

  switch (displayType) {
    case 'date':
      // Assume ISO date string. The pattern is purely numeric, so no locale is needed.
      if (typeof value === 'string') {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          return format(date, 'dd.MM.yyyy');
        }
      }
      return String(value);

    case 'image':
      // Assume base64 string
      if (typeof value === 'string') {
        return (
          <img
            src={value.startsWith('data:') ? value : `data:image/png;base64,${value}`}
            alt={langAsString('wallet.image_alt')}
            style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '8px' }}
          />
        );
      }
      return null;

    case 'boolean':
      return truthyValues.includes(value) ? langAsString('wallet.yes') : langAsString('wallet.no');

    case 'string':
    default:
      return String(value);
  }
}
