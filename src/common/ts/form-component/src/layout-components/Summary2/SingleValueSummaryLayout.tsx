import { useId } from 'react';
import type { ReactNode } from 'react';

import { Label, Paragraph } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { useTranslation } from '../../LanguageTranslatorProvider';
import { Description } from '../common/Description';
import { HelpTextContainer } from '../common/HelpTextContainer';
import classes from './SingleValueSummaryLayout.module.css';

export interface SingleValueSummaryLayoutProps {
  /** Text-resource key for the label of the summarized field. */
  title?: string;
  /** Text-resource key for the field's description, shown under the label. */
  description?: string;
  /** Text-resource key for the field's help text. */
  help?: string;
  /** The value to show. When empty, `emptyFieldText` shows instead. */
  value?: ReactNode;
  /** Text-resource key shown when there is no value. Defaults to `general.empty_summary`. */
  emptyFieldText?: string;
  /** Puts the label and the value on one line, with a colon after the label. */
  compact?: boolean;
  /** Keeps the line breaks in the value. */
  multiline?: boolean;
  /** Underlines the value to show that the field has errors. */
  hasErrors?: boolean;
  /** Set to `false` to show only the label text, without help text and description. Defaults to `true`. */
  showLabelMetadata?: boolean;
  /** Set to `false` to leave out the label with its help text and description. Has no effect when `showLabelMetadata` is `false`. */
  renderLabel?: boolean;
  /** The button that takes the user to the field, such as a {@link SummaryEditButton}. */
  editButton?: ReactNode;
  /** Validation messages to show under the row. */
  validationMessages?: ReactNode;
}

/**
 * One row in a summary: the label of a field, its value or a text saying it is empty, and a button to change it.
 */
export function SingleValueSummaryLayout({
  title,
  description,
  help,
  value,
  emptyFieldText,
  compact,
  multiline,
  hasErrors,
  showLabelMetadata = true,
  renderLabel,
  editButton,
  validationMessages,
}: SingleValueSummaryLayoutProps) {
  const { lang, langAsString } = useTranslation();
  const id = useId();

  const label = (
    <Label weight='regular'>
      {title && lang(title)}
      {!!title && compact && ':'}
    </Label>
  );

  return (
    <div className={classes.summaryItemWrapper} data-testid='summary-single-value-component'>
      <div className={classes.summaryItem}>
        <div className={cn(classes.labelValueWrapper, compact && classes.compact)}>
          {showLabelMetadata
            ? renderLabel !== false && (
                <div className={classes.labelWrapper}>
                  <div className={classes.labelContainer}>
                    <div className={classes.labelContent}>{label}</div>
                    {help && (
                      <HelpTextContainer
                        id={id}
                        helpText={lang(help)}
                        // Named after the label text as it reads, colon included
                        title={title ? `${langAsString(title)}${compact ? ':' : ''}` : undefined}
                      />
                    )}
                  </div>
                  {description && (
                    <Description
                      className={classes.description}
                      componentId={id}
                      description={lang(description)}
                    />
                  )}
                </div>
              )
            : label}
          <Paragraph
            asChild
            className={cn(
              {
                [classes.error]: hasErrors,
                [classes.emptyValue]: !value,
                [classes.formValue]: value,
                [classes.multiline]: multiline,
              },
              classes.summaryValue,
            )}
          >
            <span>
              {!value && lang(emptyFieldText ?? 'general.empty_summary')}
              {value}
            </span>
          </Paragraph>
        </div>
        {editButton}
      </div>
      {validationMessages}
    </div>
  );
}
