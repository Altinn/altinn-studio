import React from 'react';

import { TaskOverrides } from 'src/core/contexts/TaskOverrides';
import { Loader } from 'src/core/loading/Loader';
import { FormProvider } from 'src/features/form/FormProvider';
import { getUiFolderSettings } from 'src/features/form/ui';
import { useInstanceDataQuery } from 'src/features/instance/InstanceContext';
import { PdfFromLayout } from 'src/features/pdf/PdfFromLayout';
import { useNavigationParam } from 'src/hooks/navigation';
import type { PdfRenderContext } from 'src/features/pdf/pdfRenderContext';

export function PdfRenderEntry({ uiFolder, dataElementId }: PdfRenderContext) {
  const taskId = useNavigationParam('taskId');
  const { data: instance } = useInstanceDataQuery();
  if (!instance) {
    return <Loader reason='pdf-instance' />;
  }

  const taskExists =
    taskId &&
    (instance.process?.currentTask?.elementId === taskId ||
      instance.process?.processTasks?.some((task) => task.elementId === taskId));
  if (!taskExists) {
    throw new Error(`PDF task '${taskId}' was not found in the instance process.`);
  }

  const dataType = getUiFolderSettings(uiFolder)?.defaultDataType;
  const dataElement = instance.data.find((element) => element.id.toLowerCase() === dataElementId);
  if (!dataType || !dataElement || dataElement.dataType !== dataType) {
    throw new Error(`PDF data element '${dataElementId}' does not match UI folder '${uiFolder}'.`);
  }

  return (
    <TaskOverrides
      taskId={taskId}
      uiFolder={uiFolder}
      dataModelElementId={dataElementId}
      dataModelType={dataType}
    >
      <FormProvider
        readOnly={true}
        uiFolderOverride={uiFolder}
        dataElementIdOverride={dataElementId}
      >
        <PdfFromLayout />
      </FormProvider>
    </TaskOverrides>
  );
}
