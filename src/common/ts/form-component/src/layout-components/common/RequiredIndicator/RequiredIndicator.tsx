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
    <>
      <span aria-hidden='true'> {langAsNonProcessedString('form_filler.required_label')}</span>
      <span className='sr-only'> {langAsString('general.required')}</span>
    </>
  );
};
