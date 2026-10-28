import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { validateEmptyFieldOnlyOneBinding } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { readDataFromState } from 'src/features/validation/nodeValidation/readDataFromState';
import { isTransferSent } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import { BrokerFileTransferComponent } from 'src/layout/BrokerFileTransfer/BrokerFileTransferComponent';
import { BrokerFileTransferLayoutValidator } from 'src/layout/BrokerFileTransfer/BrokerFileTransferLayoutValidator';
import { BrokerFileTransferSummary } from 'src/layout/BrokerFileTransfer/BrokerFileTransferSummary';
import { BrokerFileTransferDef } from 'src/layout/BrokerFileTransfer/config.def.generated';
import { SummaryItemSimple } from 'src/layout/Summary/SummaryItemSimple';
import { useNodeFormDataWhenType } from 'src/utils/layout/useFormData';
import { validateDataModelBindingsAny } from 'src/utils/layout/validation/utils';
import type { ComponentValidation } from 'src/features/validation';
import type {
  ComponentValidationContext,
  DataModelBindingValidationContext,
  PropsFromGenericComponent,
} from 'src/layout';
import type { ComponentLayoutValidationProps, IDataModelBindings } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class BrokerFileTransfer extends BrokerFileTransferDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'BrokerFileTransfer'>>(
    function LayoutComponentBrokerFileTransferRender(props, _): JSX.Element | null {
      return <BrokerFileTransferComponent {...props} />;
    },
  );

  useDisplayData(baseComponentId: string): string {
    const formData = useNodeFormDataWhenType(baseComponentId, 'BrokerFileTransfer');
    if (!formData || !isTransferSent(formData)) {
      return '';
    }
    return asString(formData.fileName) || asString(formData.fileTransferId);
  }

  renderSummary({ targetBaseComponentId }: SummaryRendererProps): JSX.Element | null {
    const displayData = useDisplayData(targetBaseComponentId);
    return <SummaryItemSimple formDataAsString={displayData} />;
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <BrokerFileTransferSummary {...props} />;
  }

  renderLayoutValidators(props: ComponentLayoutValidationProps<'BrokerFileTransfer'>): JSX.Element | null {
    return <BrokerFileTransferLayoutValidator {...props} />;
  }

  validateEmptyField(ctx: ComponentValidationContext<'BrokerFileTransfer'>): ComponentValidation[] {
    return validateEmptyFieldOnlyOneBinding(ctx, 'fileTransferId', 'broker_file_transfer.error_required');
  }

  validateComponent(ctx: ComponentValidationContext<'BrokerFileTransfer'>): ComponentValidation[] {
    const bindings = ctx.component.dataModelBindings;
    const fileTransferId = readDataFromState(ctx.formState, bindings?.fileTransferId);
    const fileTransferStatus = readDataFromState(ctx.formState, bindings?.fileTransferStatus);
    if (!fileTransferId || isTransferSent({ fileTransferId, fileTransferStatus })) {
      return [];
    }

    return [
      {
        message: { key: 'broker_file_transfer.error_not_sent' },
        severity: 'error',
        source: FrontendValidationSource.Component,
        // Shown like a required field, so it does not appear while the file uploads
        category: ValidationMask.Required,
      },
    ];
  }

  validateDataModelBindings(
    baseComponentId: string,
    bindings: IDataModelBindings<'BrokerFileTransfer'>,
    { lookupBinding, layoutLookups }: DataModelBindingValidationContext,
  ): string[] {
    const [fileTransferIdErrors] = validateDataModelBindingsAny(
      baseComponentId,
      bindings,
      lookupBinding,
      layoutLookups,
      'fileTransferId',
      ['string'],
    );
    const [fileTransferStatusErrors] = validateDataModelBindingsAny(
      baseComponentId,
      bindings,
      lookupBinding,
      layoutLookups,
      'fileTransferStatus',
      ['string'],
    );
    const [fileNameErrors] = validateDataModelBindingsAny(
      baseComponentId,
      bindings,
      lookupBinding,
      layoutLookups,
      'fileName',
      ['string'],
      false,
    );
    return [...(fileTransferIdErrors ?? []), ...(fileTransferStatusErrors ?? []), ...(fileNameErrors ?? [])];
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
