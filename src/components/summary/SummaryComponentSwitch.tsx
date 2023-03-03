import React from 'react';

import { SingleInputSummary } from 'src/components/summary/SingleInputSummary';
import { SummaryBoilerplate } from 'src/components/summary/SummaryBoilerplate';
import { SummaryGroupComponent } from 'src/components/summary/SummaryGroupComponent';
import { MultipleChoiceSummary } from 'src/layout/Checkboxes/MultipleChoiceSummary';
import { AttachmentSummaryComponent } from 'src/layout/FileUpload/AttachmentSummaryComponent';
import { AttachmentWithTagSummaryComponent } from 'src/layout/FileUploadWithTag/AttachmentWithTagSummaryComponent';
import { MapComponentSummary } from 'src/layout/Map/MapComponentSummary';
import type { ExprResolved } from 'src/features/expressions/types';
import type { ILayoutCompSummary } from 'src/layout/Summary/types';
import type { AnyItem } from 'src/utils/layout/hierarchy.types';

export interface ISummaryComponentSwitch extends Omit<ILayoutCompSummary, 'type'> {
  change: {
    onChangeClick: () => void;
    changeText: string | null;
  };
  formComponent?: ExprResolved<AnyItem>;
  hasValidationMessages?: boolean;
  label?: JSX.Element | JSX.Element[] | null | undefined;
  formData?: any;
  groupProps?: {
    pageRef?: string;
    largeGroup?: boolean;
  };
}

export function SummaryComponentSwitch({
  change,
  formComponent,
  label,
  componentRef,
  hasValidationMessages,
  formData,
  groupProps = {},
  display,
}: ISummaryComponentSwitch) {
  if (!formComponent) {
    return null;
  }

  const hasDataBindings = Object.keys(formComponent.dataModelBindings || {}).length === 0;

  if (hasDataBindings && formComponent.type === 'FileUpload' && componentRef) {
    return (
      <>
        <SummaryBoilerplate
          {...change}
          label={label}
          hasValidationMessages={hasValidationMessages}
          display={display}
        />
        <AttachmentSummaryComponent componentRef={componentRef} />
      </>
    );
  }

  if (hasDataBindings && formComponent.type === 'FileUploadWithTag' && componentRef) {
    return (
      <>
        <SummaryBoilerplate
          {...change}
          label={label}
          hasValidationMessages={hasValidationMessages}
          display={display}
        />
        <AttachmentWithTagSummaryComponent
          componentRef={componentRef}
          component={formComponent}
        />
      </>
    );
  }

  if (formComponent.type === 'Group') {
    return (
      <SummaryGroupComponent
        {...change}
        {...groupProps}
        componentRef={componentRef}
        display={display}
      />
    );
  }

  if (formComponent.type === 'Checkboxes' && typeof formData !== 'string') {
    return (
      <MultipleChoiceSummary
        {...change}
        label={label}
        hasValidationMessages={!!hasValidationMessages}
        formData={formData}
        readOnlyComponent={formComponent.readOnly}
        display={display}
      />
    );
  }

  if (formComponent.type === 'Map') {
    return (
      <>
        <SummaryBoilerplate
          {...change}
          label={label}
          hasValidationMessages={!!hasValidationMessages}
          display={display}
        />
        <MapComponentSummary
          component={formComponent}
          formData={formData}
        />
      </>
    );
  }

  return (
    <SingleInputSummary
      {...change}
      label={label}
      hasValidationMessages={!!hasValidationMessages}
      formData={formData}
      readOnlyComponent={formComponent.readOnly}
      display={display}
    />
  );
}
