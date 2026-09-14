import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { IndicatorTag } from '@app/form-component/layout-components/common/IndicatorTag';

export interface IRequiredIndicatorProps {
  required?: boolean;
}

/**
 * Marks a required field with a "Må fylles ut" tag after its label. The text comes from the
 * `form_filler.required_label` text resource, so apps can still override the wording.
 */
export const RequiredIndicator = ({ required }: IRequiredIndicatorProps) => {
  const { langAsNonProcessedString } = useTranslation();
  if (!required) {
    return null;
  }

  return (
    <IndicatorTag color='warning'>
      {langAsNonProcessedString('form_filler.required_label')}
    </IndicatorTag>
  );
};
