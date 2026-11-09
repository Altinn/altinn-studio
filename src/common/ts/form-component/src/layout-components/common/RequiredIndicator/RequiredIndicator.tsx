import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { IndicatorTag } from '@app/form-component/layout-components/common/IndicatorTag';

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
    <IndicatorTag color='warning'>
      {langAsNonProcessedString('form_filler.required_label')}
    </IndicatorTag>
  );
};
