import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';

import classes from './OptionalIndicator.module.css';

export type OptionalIndicatorProps = {
  readOnly?: boolean;
  required?: boolean;
  showOptionalMarking?: boolean;
};

export const OptionalIndicator = ({
  readOnly,
  required,
  showOptionalMarking,
}: OptionalIndicatorProps) => {
  const { langAsString } = useTranslation();
  const shouldShowOptionalMarking = !required && showOptionalMarking && !readOnly;
  if (shouldShowOptionalMarking) {
    return (
      <span className={classes.optionalIndicator}>{` (${langAsString('general.optional')})`}</span>
    );
  }
  return null;
};
