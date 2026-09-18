import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';

export interface IRequiredIndicatorProps {
  required?: boolean;
}

export const RequiredIndicator = ({ required }: IRequiredIndicatorProps) => {
  const { langAsString, langAsNonProcessedString } = useTranslation();
  if (!required) {
    return null;
  }

  return (
    <span aria-label={langAsString('general.required')}>
      {' '}
      {langAsNonProcessedString('form_filler.required_label')}
    </span>
  );
};
