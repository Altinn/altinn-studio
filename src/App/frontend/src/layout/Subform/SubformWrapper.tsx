import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { TaskOverrides } from 'src/core/contexts/TaskOverrides';
import { Loader } from 'src/core/loading/Loader';
import { FormProvider } from 'src/features/form/FormContext';
import { useDataTypeFromLayoutSet } from 'src/features/form/layout/LayoutsContext';
import { PdfWrapper } from 'src/features/pdf/PdfWrapper';
import { useNavigationParam } from 'src/hooks/navigation';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

export function SubformWrapper({ baseComponentId, children }: PropsWithChildren<{ baseComponentId: string }>) {
  return (
    <SubformOverrideWrapper baseComponentId={baseComponentId}>
      <FormProvider>{children}</FormProvider>
    </SubformOverrideWrapper>
  );
}

export function SubformForm() {
  return (
    <PdfWrapper>
      <PresentationComponent>
        <Form />
      </PresentationComponent>
    </PdfWrapper>
  );
}

export const RedirectBackToMainForm = () => {
  const mainPageKey = useNavigationParam('mainPageKey');
  const { navigateToPage } = useNavigatePage();

  useEffect(() => {
    navigateToPage(mainPageKey);
  }, [navigateToPage, mainPageKey]);

  return <Loader reason='navigate-to-mainform' />;
};

export function SubformOverrideWrapper({
  baseComponentId,
  providedDataElementId,
  children,
}: PropsWithChildren<{
  baseComponentId: string;
  providedDataElementId?: string;
}>) {
  const dataElementId = useNavigationParam('dataElementId');
  const actualDataElementId = providedDataElementId ? providedDataElementId : dataElementId;
  const { layoutSet, id } = useItemWhenType(baseComponentId, 'Subform');
  const dataType = useDataTypeFromLayoutSet(layoutSet);

  if (!dataType) {
    throw new Error(`Unable to find data type for subform with id ${id}`);
  }

  return (
    <TaskOverrides
      dataModelType={dataType}
      dataModelElementId={actualDataElementId}
      layoutSetId={layoutSet}
    >
      {children}
    </TaskOverrides>
  );
}
