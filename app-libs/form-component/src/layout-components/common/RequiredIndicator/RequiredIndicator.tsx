import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';

export interface IRequiredIndicatorProps {
  required?: boolean;
}

export const RequiredIndicator = ({ required }: IRequiredIndicatorProps) => {
  const { langAsNonProcessedString } = useTranslation();
  if (!required) {
    return null;
  }

  return <span> {langAsNonProcessedString('form_filler.required_label')}</span>;
};
