import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { Loader } from 'src/core/loading/Loader';
import { FormProvider } from 'src/features/form/FormContext';
import { useDataTypeFromLayoutSet } from 'src/features/form/layout/LayoutsContext';
import { useNavigationParam } from 'src/hooks/navigation';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { ProcessTaskType } from 'src/types';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

export function SubformWrapper({ baseComponentId, children }: PropsWithChildren<{ baseComponentId: string }>) {
  const isDone = useDoOverride(baseComponentId);

  if (!isDone) {
    return <Loader reason='subform-taskstore' />;
  }

  return <FormProvider>{children}</FormProvider>;
}

export function SubformForm() {
  return (
    <PresentationComponent type={ProcessTaskType.Data}>
      <Form />
    </PresentationComponent>
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

export const useDoOverrideSummary = (dataElementId: string, layoutSet: string, dataType: string) => {
  const setOverriddenLayoutSetId = useTaskStore((state) => state.setOverriddenLayoutSetId);
  const setOverriddenDataModelType = useTaskStore((state) => state.setOverriddenDataModelType);
  const setOverriddenDataModelDataElementId = useTaskStore((state) => state.setOverriddenDataModelDataElementId);

  const isDone = useTaskStore(
    (s) =>
      s.overriddenDataModelType === dataType &&
      s.overriddenDataElementId === dataElementId &&
      s.overriddenLayoutSetId === layoutSet,
  );

  useEffect(() => {
    setOverriddenLayoutSetId?.(layoutSet);
    setOverriddenDataModelType?.(dataType);
    setOverriddenDataModelDataElementId?.(dataElementId!);
  }, [
    dataElementId,
    dataType,
    layoutSet,
    setOverriddenDataModelType,
    setOverriddenDataModelDataElementId,
    setOverriddenLayoutSetId,
  ]);

  return isDone;
};

export const useDoOverride = (baseComponentId: string, providedDataElementId?: string) => {
  const dataElementId = useNavigationParam('dataElementId');
  const actualDataElementId = providedDataElementId ? providedDataElementId : dataElementId;
  const { layoutSet, id } = useItemWhenType(baseComponentId, 'Subform');
  const dataType = useDataTypeFromLayoutSet(layoutSet);

  if (!dataType) {
    throw new Error(`Unable to find data type for subform with id ${id}`);
  }

  const setOverriddenLayoutSetId = useTaskStore((state) => state.setOverriddenLayoutSetId);
  const setOverriddenDataModelType = useTaskStore((state) => state.setOverriddenDataModelType);
  const setOverriddenDataModelDataElementId = useTaskStore((state) => state.setOverriddenDataModelDataElementId);
  const isDone = useTaskStore(
    (s) =>
      s.overriddenDataModelType === dataType &&
      s.overriddenDataElementId === actualDataElementId &&
      s.overriddenLayoutSetId === layoutSet,
  );

  useEffect(() => {
    setOverriddenLayoutSetId?.(layoutSet);
    setOverriddenDataModelType?.(dataType);
    setOverriddenDataModelDataElementId?.(actualDataElementId!);
  }, [
    actualDataElementId,
    dataType,
    layoutSet,
    setOverriddenDataModelType,
    setOverriddenDataModelDataElementId,
    setOverriddenLayoutSetId,
  ]);

  return isDone;
};
