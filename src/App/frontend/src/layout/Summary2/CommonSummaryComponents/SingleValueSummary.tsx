import React from 'react';

import { Label, Paragraph, ValidationMessage } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Lang } from 'src/features/language/Lang';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import classes from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary.module.css';
import type { BaseValidation } from 'src/features/validation';

type SingleValueSummaryProps = {
  title: React.ReactNode;
  errors?: BaseValidation[];
  targetBaseComponentId: string;
  displayData?: string | React.ReactNode;
  hideEditButton?: boolean;
  multiline?: boolean;
  isCompact: boolean | undefined;
  emptyFieldText: string | undefined;
};

export const SingleValueSummary = ({
  title,
  errors,
  targetBaseComponentId,
  displayData,
  hideEditButton,
  multiline,
  isCompact,
  emptyFieldText,
}: SingleValueSummaryProps) => (
  <div
    className={classes.summaryItemWrapper}
    data-testid='summary-single-value-component'
  >
    <div className={classes.summaryItem}>
      <div className={cn(classes.labelValueWrapper, isCompact && classes.compact)}>
        <Label weight='regular'>
          {title}
          {!!title?.toString()?.length && isCompact && ':'}
        </Label>
        <Paragraph
          asChild
          className={cn(
            {
              [classes.error]: errors && errors?.length > 0,
              [classes.emptyValue]: !displayData,
              [classes.formValue]: displayData,
              [classes.multiline]: multiline,
            },
            classes.summaryValue,
          )}
        >
          <span>
            {!displayData && <Lang id={emptyFieldText ?? 'general.empty_summary'} />}
            {displayData}
          </span>
        </Paragraph>
      </div>
      {!hideEditButton && (
        <EditButton
          className={classes.editButton}
          targetBaseComponentId={targetBaseComponentId}
        />
      )}
    </div>

    {errors &&
      errors?.length > 0 &&
      errors?.map(({ message }) => (
        <ValidationMessage
          key={message.key}
          data-size='sm'
        >
          <Lang
            id={message.key}
            params={message.params}
          />
        </ValidationMessage>
      ))}
  </div>
);
