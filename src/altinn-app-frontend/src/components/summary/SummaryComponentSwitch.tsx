import * as React from 'react';

import { AttachmentSummaryComponent } from 'src/components/summary/AttachmentSummaryComponent';
import { AttachmentWithTagSummaryComponent } from 'src/components/summary/AttachmentWithTagSummaryComponent';
import MultipleChoiceSummary from 'src/components/summary/MultipleChoiceSummary';
import SingleInputSummary from 'src/components/summary/SingleInputSummary';
import SummaryBoilerplate from 'src/components/summary/SummaryBoilerplate';
import SummaryGroupComponent from 'src/components/summary/SummaryGroupComponent';
import type { ILayoutComponent, ILayoutGroup } from 'src/features/form/layout';

export interface ISummaryComponentSwitch {
  change: {
    onChangeClick: () => void;
    changeText: string;
  };
  formComponent: ILayoutComponent | ILayoutGroup;
  hasValidationMessages?: boolean;
  label?: any;
  formData?: any;
  componentRef?: string;
  groupProps?: {
    parentGroup?: string;
    pageRef?: string;
    largeGroup?: boolean;
    index?: number;
  };
}

export default function SummaryComponentSwitch({
  change,
  formComponent,
  label,
  componentRef,
  hasValidationMessages,
  formData,
  groupProps = {},
}: ISummaryComponentSwitch) {
  if (!formComponent) {
    return null;
  }

  const hasDataBindings =
    Object.keys(formComponent.dataModelBindings || {}).length === 0;

  if (hasDataBindings && formComponent.type === 'FileUpload') {
    return (
      <>
        <SummaryBoilerplate
          {...change}
          label={label}
          hasValidationMessages={hasValidationMessages}
        />
        <AttachmentSummaryComponent componentRef={componentRef} />
      </>
    );
  }

  if (hasDataBindings && formComponent.type === 'FileUploadWithTag') {
    return (
      <>
        <SummaryBoilerplate
          {...change}
          label={label}
          hasValidationMessages={hasValidationMessages}
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
      />
    );
  }

  if (formComponent.type === 'Checkboxes' && typeof formData !== 'string') {
    return (
      <MultipleChoiceSummary
        {...change}
        label={label}
        hasValidationMessages={hasValidationMessages}
        formData={formData}
        readOnlyComponent={(formComponent as ILayoutComponent).readOnly}
      />
    );
  }

  return (
    <SingleInputSummary
      {...change}
      label={label}
      hasValidationMessages={hasValidationMessages}
      formData={formData}
      readOnlyComponent={(formComponent as ILayoutComponent).readOnly}
    />
  );
}
