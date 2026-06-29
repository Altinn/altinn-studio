import type { ReactNode } from 'react';

import { TextArea } from '@app/form-component/app-components/TextArea';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { LabelComponent } from '@app/form-component/layout-components/common/LabelComponent';
import { getDescriptionId } from '@app/form-component/layout-components/utils/labelIds';
import type { IGridStyling } from '@app/form-component/app-components/Flex';
import type { FieldCounterProps } from '@digdir/designsystemet-react';

export interface TextAreaLayoutProps {
  /** Component ID, used as the input's `id`, label's `htmlFor` and the form-content wrapper. */
  componentId: string;
  /** Current value of the textarea. */
  value: string;
  /** Called when the user changes the textarea value. */
  onChange?: (value: string) => void;
  /** Called on blur (used for debounce). */
  onBlur?: () => void;
  /** Whether the textarea is read-only. */
  readOnly?: boolean;
  /** Whether the field is required. */
  required?: boolean;
  /** Whether the field is in an invalid state (drives invalid styling and `aria-invalid`). */
  error?: boolean;
  /** Max character count. When set, renders a counter. */
  maxLength?: number;
  /** HTML autocomplete attribute value. */
  autoComplete?: string;
  /** Text-resource key for the label. */
  title?: string;
  /** Text-resource key for the description. */
  description?: string;
  /** Text-resource key for the help text. */
  help?: string;
  /** Whether to show the optional marking. */
  showOptionalMarking?: boolean;
  /** Grid sizing for the label area. */
  labelGrid?: IGridStyling;
  /** Grid sizing for the inner content area. */
  innerGrid?: IGridStyling;
  /** Grid sizing for the validation messages. */
  validationGrid?: IGridStyling;
  /** Rendered validation messages. */
  validationMessages?: ReactNode;
}

export function TextAreaLayout({
  componentId,
  value,
  onChange,
  onBlur,
  readOnly,
  required,
  error,
  maxLength,
  autoComplete,
  title,
  description,
  help,
  showOptionalMarking,
  labelGrid,
  innerGrid,
  validationGrid,
  validationMessages,
}: TextAreaLayoutProps) {
  const { langAsString } = useTranslation();

  const characterLimit: FieldCounterProps | undefined =
    maxLength !== undefined
      ? {
          limit: maxLength,
          under: langAsString('input_components.remaining_characters'),
          over: langAsString('input_components.exceeded_max_limit'),
        }
      : undefined;

  // Associate the description with the textarea only when there is a visible label, mirroring the
  // previous `buildAriaDescribedBy` gating on the presence of a title.
  const ariaDescribedBy = title && description ? getDescriptionId(componentId) : undefined;

  return (
    <LabelComponent
      htmlFor={componentId}
      title={title}
      help={help}
      description={description}
      required={required}
      readOnly={readOnly}
      showOptionalMarking={showOptionalMarking}
      grid={labelGrid}
    >
      <ComponentStructure
        componentId={componentId}
        innerGrid={innerGrid}
        validationGrid={validationGrid}
        validationMessages={validationMessages}
      >
        <TextArea
          id={componentId}
          value={value}
          onChange={(newValue) => onChange?.(newValue)}
          onBlur={onBlur}
          readOnly={readOnly}
          error={error}
          characterLimit={!readOnly ? characterLimit : undefined}
          dataTestId={componentId}
          ariaDescribedBy={ariaDescribedBy}
          autoComplete={autoComplete}
          style={{ minHeight: '150px', height: '150px', width: '100%' }}
        />
      </ComponentStructure>
    </LabelComponent>
  );
}
