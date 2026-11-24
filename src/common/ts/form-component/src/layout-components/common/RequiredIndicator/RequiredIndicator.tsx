import { useTranslation } from '../../../LanguageTranslatorProvider';
import { IndicatorTag } from '../IndicatorTag';

export interface IRequiredIndicatorProps {
  required?: boolean;
  readOnly?: boolean;
}

export const RequiredIndicator = ({ required, readOnly }: IRequiredIndicatorProps) => {
  const { langAsNonProcessedString } = useTranslation();
  if (!required || readOnly) {
    return null;
  }

  return (
    <IndicatorTag kind='required'>
      {langAsNonProcessedString('form_filler.required_label')}
    </IndicatorTag>
  );
};
