import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { IndicatorTag } from '@app/form-component/layout-components/common/IndicatorTag';

export type OptionalIndicatorProps = {
  readOnly?: boolean;
  /**
   * Whether the field is required. The optional marking is only shown when this is explicitly `false`:
   * an `undefined` value means the component has no notion of being required (it takes no user input),
   * and such components should not be marked as optional either.
   */
  required?: boolean;
  /** Set to `false` to hide the optional marking (`labelSettings.optionalIndicator`). Defaults to shown. */
  showOptionalMarking?: boolean;
};

/**
 * Marks an optional field with a "Valgfritt" tag after its label. Designsystemet recommends that every
 * field is marked as either required or optional, so the marking is shown by default and can be turned
 * off per component. The text comes from the `general.optional` text resource.
 */
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
