import type { Ref } from 'react';

import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { Description } from '@app/form-component/layout-components/common/Description';
import { HelpTextContainer } from '@app/form-component/layout-components/common/HelpTextContainer';
import { OptionalIndicator } from '@app/form-component/layout-components/common/OptionalIndicator';
import { RequiredIndicator } from '@app/form-component/layout-components/common/RequiredIndicator';
import cn from 'classnames';

import classes from './LabelContent.module.css';

export interface LabelContentProps {
  /**
   * Id of the form element this label belongs to. Used to build the help text and description
   * element ids, so the control can reference the description via `aria-describedby`.
   */
  componentId: string;
  /** Text-resource key for the label text. */
  label?: string;
  /** Text-resource key for the description, rendered below the label text. */
  description?: string;
  /** Text-resource key for the help text, rendered as a tooltip next to the label text. */
  help?: string;
  required?: boolean;
  readOnly?: boolean;
  showOptionalMarking?: boolean;
  /** Whether to render at all. When `false`, nothing is rendered. Defaults to `true`. */
  renderLabel?: boolean;
  className?: string;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * The contents of a label: the label text with its required/optional indicators, an optional help
 * text tooltip and an optional description. Unlike {@link LabelComponent} it renders no `<label>`
 * element of its own, so it can be placed inside markup that provides the labelling element — e.g. a
 * `<fieldset>` legend for grouped inputs such as checkboxes and radio buttons.
 *
 * Takes only primitive props (text-resource keys + booleans) and resolves the text itself.
 */
export function LabelContent({
  componentId,
  label,
  description,
  required,
  readOnly,
  help,
  showOptionalMarking,
  renderLabel,
  className,
  ref,
}: LabelContentProps) {
  const { lang } = useTranslation();

  if (renderLabel === false) {
    return null;
  }

  return (
    <span className={cn(classes.labelWrapper, className)} ref={ref}>
      <span className={classes.labelContainer}>
        <span className={classes.labelContent}>
          {lang(label)}
          <RequiredIndicator required={required} />
          <OptionalIndicator
            readOnly={readOnly}
            required={required}
            showOptionalMarking={showOptionalMarking}
          />
        </span>
        {help && <HelpTextContainer id={componentId} helpText={lang(help)} title={label} />}
      </span>
      {description && (
        <Description
          className={classes.description}
          componentId={componentId}
          description={lang(description)}
        />
      )}
    </span>
  );
}
