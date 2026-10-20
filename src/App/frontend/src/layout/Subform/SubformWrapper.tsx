import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { TaskOverrides } from 'src/core/contexts/TaskOverrides';
import { Loader } from 'src/core/loading/Loader';
import { FormProvider } from 'src/features/form/FormProvider';
import { getDefaultDataTypeFromUiFolder } from 'src/features/form/ui';
import { PdfWrapper } from 'src/features/pdf/PdfWrapper';
import { useNavigationParam } from 'src/hooks/navigation';
import { useNavigateToPage } from 'src/hooks/useNavigatePage';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';

export function SubformWrapper({ baseComponentId, children }: PropsWithChildren<{ baseComponentId: string }>) {
  const dataElementId = useNavigationParam('dataElementId');
  const config = useComponentConfig(baseComponentId, 'Subform');

  if (!config.layoutSet || !dataElementId) {
    return null;
  }

  return (
    <SubformOverrideWrapper
      baseComponentId={baseComponentId}
      providedDataElementId={dataElementId}
    >
      <FormProvider
        uiFolderOverride={config.layoutSet}
        dataElementIdOverride={dataElementId}
      >
        {children}
      </FormProvider>
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
  const navigateToPage = useNavigateToPage();

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
  const config = useComponentConfig(baseComponentId, 'Subform');
  const id = useIndexedId(baseComponentId);
  const dataType = getDefaultDataTypeFromUiFolder(config.layoutSet);

  if (!dataType) {
    throw new Error(`Unable to find data type for subform with id ${id}`);
  }

  return (
    <TaskOverrides
      dataModelType={dataType}
      dataModelElementId={actualDataElementId}
      uiFolder={config.layoutSet}
    >
      {children}
    </TaskOverrides>
  );
}
