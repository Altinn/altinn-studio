import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { IndicatorTag } from '@app/form-component/layout-components/common/IndicatorTag';

export type OptionalIndicatorProps = {
  readOnly?: boolean;
  /**
   * Whether the field is required.
   */
  required?: boolean;
  /** Set to `false` to hide the optional marking (`labelSettings.optionalIndicator`). Defaults to shown. */
  showOptionalMarking?: boolean;
};

export const OptionalIndicator = ({
  readOnly,
  required,
  showOptionalMarking = true,
}: OptionalIndicatorProps) => {
  const { langAsString } = useTranslation();
  const shouldShowOptionalMarking = required === false && showOptionalMarking && !readOnly;
  if (!shouldShowOptionalMarking) {
    return null;
  }

  return <IndicatorTag color='info'>{langAsString('general.optional')}</IndicatorTag>;
};
