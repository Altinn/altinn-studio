import React from 'react';

import { SingleValueSummaryLayout } from '@app/form-component';

import { AppLanguageTranslatorProvider } from 'src/AppLanguageTranslatorProvider';
import { ValidationMessageList } from 'src/features/validation/ValidationMessageList';
import { useFormComponentCtx } from 'src/layout/FormComponentContext';
import { EditButton } from 'src/layout/Summary2/CommonSummaryComponents/EditButton';
import classes from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary.module.css';
import { useSummaryLabelText } from 'src/layout/Summary2/CommonSummaryComponents/useSummaryLabelText';
import type { BaseValidation } from 'src/features/validation';

type SingleValueSummaryProps = {
  title: string | undefined;
  errors?: BaseValidation[];
  targetBaseComponentId: string;
  displayData?: string | React.ReactNode;
  hideEditButton?: boolean;
  multiline?: boolean;
  isCompact: boolean | undefined;
  emptyFieldText: string | undefined;
  showLabelMetadata?: boolean;
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
  showLabelMetadata = true,
}: SingleValueSummaryProps) => {
  const { description, help } = useSummaryLabelText(targetBaseComponentId);
  const { overrideDisplay } = useFormComponentCtx() ?? {};

  // The texts are resolved here, in the data model location of the summarized component (such as a row
  // in a repeating group), not where the summary component itself sits.
  return (
    <AppLanguageTranslatorProvider>
      <SingleValueSummaryLayout
        title={title}
        description={description}
        help={help}
        value={displayData}
        emptyFieldText={emptyFieldText}
        compact={isCompact}
        multiline={multiline}
        hasErrors={!!errors && errors.length > 0}
        showLabelMetadata={showLabelMetadata}
        renderLabel={overrideDisplay?.renderLabel}
        editButton={
          hideEditButton ? undefined : (
            <EditButton
              className={classes.editButton}
              targetBaseComponentId={targetBaseComponentId}
            />
          )
        }
        validationMessages={
          <ValidationMessageList
            validations={errors}
            size='sm'
          />
        }
      />
    </AppLanguageTranslatorProvider>
  );
};
