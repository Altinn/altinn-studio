import { type PropsWithChildren } from 'react';

import { Label } from '../../../app-components/Label';
import { useTranslation } from '../../../LanguageTranslatorProvider';
import { Description } from '../Description';
import { HelpTextContainer } from '../HelpTextContainer';
import { OptionalIndicator } from '../OptionalIndicator';
import { RequiredIndicator } from '../RequiredIndicator';
import type { IGridStyling } from '../../../app-components/Flex/Flex';

export interface ILabelComponentProps {
  /** Id for the rendered label element. */
  id?: string;
  /**
   * Id of the form element this label belongs to. Sets the label's `htmlFor` and is also used to
   * build the description element id (so the control can reference it via `aria-describedby`).
   */
  htmlFor?: string;
  /** Text-resource key for the label text. When undefined, only the children are rendered. */
  title?: string;
  /** Text-resource key for the help text. */
  help?: string;
  /** Text-resource key for the description. */
  description?: string;
  required?: boolean;
  readOnly?: boolean;
  showOptionalMarking?: boolean;
  grid?: IGridStyling;
}

/**
 * Smart label wrapper for form components. Takes only primitive props (text-resource keys + booleans),
 * translates them and builds the help text, description and required/optional indicators internally,
 * then delegates to the dumb {@link Label} app-component. Conceptually parallel to how
 * `HelpTextContainer` wraps `HelpText`.
 */
export function LabelComponent({
  id,
  htmlFor,
  title,
  help,
  description,
  required,
  readOnly,
  showOptionalMarking,
  grid,
  children,
}: PropsWithChildren<ILabelComponentProps>) {
  const { lang } = useTranslation();

  return (
    <Label
      id={id}
      htmlFor={htmlFor}
      label={title ? lang(title) : undefined}
      grid={grid}
      required={required}
      requiredIndicator={<RequiredIndicator required={required} readOnly={readOnly} />}
      optionalIndicator={
        <OptionalIndicator
          readOnly={readOnly}
          required={required}
          showOptionalMarking={showOptionalMarking}
        />
      }
      help={help ? <HelpTextContainer title={title} helpText={lang(help)} /> : undefined}
      description={
        description ? (
          <Description componentId={htmlFor} description={lang(description)} />
        ) : undefined
      }
    >
      {children}
    </Label>
  );
}
