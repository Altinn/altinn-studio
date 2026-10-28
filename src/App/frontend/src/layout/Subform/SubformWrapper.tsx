import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { TaskOverrides } from 'src/core/contexts/TaskOverrides';
import { Loader } from 'src/core/loading/Loader';
import { FormProvider } from 'src/features/form/FormProvider';
import { getDefaultDataTypeFromUiFolder } from 'src/features/form/ui';
import { PdfFromLayout } from 'src/features/pdf/PdfFromLayout';
import { useNavigationParam } from 'src/hooks/navigation';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { useNavigateToPage } from 'src/hooks/useNavigatePage';
import { useComponentConfig } from 'src/utils/layout/hooks';

export function SubformWrapper({ baseComponentId, children }: PropsWithChildren<{ baseComponentId: string }>) {
  const dataElementId = useNavigationParam('dataElementId');
  const config = useComponentConfig(baseComponentId, 'Subform');

  if (!config.layoutSet || !dataElementId) {
    return null;
  }

  return (
    <SubformEntryForm
      uiFolder={config.layoutSet}
      dataElementId={dataElementId}
    >
      {children}
    </SubformEntryForm>
  );
}

interface SubformEntryFormProps {
  uiFolder: string;
  dataElementId: string;
  readOnly?: boolean;
}

/**
 * The form of one subform entry: the subform's UI folder, with the entry's data element as its data in the folder's
 * defaultDataType. The subform route renders an entry with it, and so does the PDF of a subform entry.
 */
export function SubformEntryForm({
  uiFolder,
  dataElementId,
  readOnly,
  children,
}: PropsWithChildren<SubformEntryFormProps>) {
  const dataType = getDefaultDataTypeFromUiFolder(uiFolder);
  if (!dataType) {
    throw new Error(`Unable to find the data type of the subform UI folder '${uiFolder}'`);
  }

  return (
    <TaskOverrides
      dataModelType={dataType}
      dataModelElementId={dataElementId}
      uiFolder={uiFolder}
    >
      <FormProvider
        uiFolderOverride={uiFolder}
        dataElementIdOverride={dataElementId}
        readOnly={readOnly}
      >
        {children}
      </FormProvider>
    </TaskOverrides>
  );
}

/**
 * A subform entry's page, or in PDF mode the entry's PDF, which the task route leaves to this route (see getPdfSource).
 */
export function SubformForm() {
  const isPdf = useIsPdf();
  if (isPdf) {
    return <PdfFromLayout />;
  }

  return (
    <PresentationComponent>
      <Form />
    </PresentationComponent>
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
