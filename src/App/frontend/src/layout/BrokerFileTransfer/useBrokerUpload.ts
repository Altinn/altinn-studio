import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useQuery } from 'src/core/queries/reactQuery';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { brokerQueries } from 'src/layout/BrokerFileTransfer/api';
import { isReceivedStatus } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import {
  forgetUploads,
  getUploadController,
  reportUploadGone,
  useUploadsKey,
} from 'src/layout/BrokerFileTransfer/brokerUploads';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpressionDictionary } from 'src/utils/layout/useEvalExpression';
import type { ResumableTransfer } from 'src/layout/BrokerFileTransfer/brokerClient/upload/interruptedTransfer';
import type { UploadController } from 'src/layout/BrokerFileTransfer/brokerClient/upload/uploadController';
import type { ReadySetup } from 'src/layout/BrokerFileTransfer/useBrokerSetup';

type InterruptedState = { kind: 'checking' } | { kind: 'unknown' } | ({ kind: 'resumable' } & ResumableTransfer);

export function useBrokerUpload(baseComponentId: string, setup: ReadySetup) {
  const { baseUrl, instanceId, resourceId, sender, recipients, disableVirusScan } = setup;
  const uploadsKey = useUploadsKey(baseComponentId);
  const controller = useMemo(() => getUploadController(baseUrl, uploadsKey), [baseUrl, uploadsKey]);
  const active = useSyncExternalStore(controller.subscribe, controller.getActive);
  const progress = useSyncExternalStore(controller.subscribe, controller.getProgress);
  const [sendError, setSendError] = useState<unknown>(null);

  const propertyList = usePropertyList(baseComponentId);

  useRecordedTransfer(baseComponentId, uploadsKey, controller, setup);

  // Pause rather than abort, so nothing is left locked on the server
  const hasActive = active !== null;
  useEffect(() => (hasActive ? controller.pause : undefined), [controller, hasActive]);

  const interrupted = useInterruptedTransfer(baseComponentId, controller, setup, hasActive);

  const send = useCallback(
    async (file: File) => {
      setSendError(null);
      try {
        await controller.start({
          resourceId,
          sender,
          recipients,
          file,
          reference: instanceId,
          disableVirusScan,
          propertyList,
        });
      } catch (error) {
        window.logError('Could not send the file with Broker:\n', error);
        setSendError(error);
      }
    },
    [controller, disableVirusScan, instanceId, propertyList, recipients, resourceId, sender],
  );

  const { state: interruptedState, fileTransferId: interruptedId } = interrupted;
  const continueInterrupted = useCallback(
    async (file: File) => {
      if (interruptedState?.kind !== 'resumable') {
        return;
      }
      setSendError(null);
      try {
        await controller.continueTransfer({
          resourceId,
          sender,
          fileTransferId: interruptedId,
          file,
          plan: interruptedState.plan,
          uploaded: interruptedState.uploaded,
        });
      } catch (error) {
        window.logError('Could not continue the Broker upload:\n', error);
        setSendError(error);
      }
    },
    [controller, interruptedId, interruptedState, resourceId, sender],
  );

  return {
    active,
    progress,
    sendError,
    interrupted: interruptedState,
    send,
    continueInterrupted,
    discardInterrupted: interrupted.discard,
    pause: controller.pause,
    resume: controller.resume,
    cancel: controller.cancel,
  };
}

function usePropertyList(baseComponentId: string): Record<string, string> {
  const { metadata } = useComponentConfig(baseComponentId, 'BrokerFileTransfer');
  const values = useEvalExpressionDictionary(metadata, Expressions.BrokerFileTransfer.metadata.additionalProperties);
  return useMemo(
    () => Object.fromEntries(Object.entries(values ?? {}).filter(([, value]) => value.trim() !== '')),
    [values],
  );
}

// The form records the transfer, also when it changed while the user was on another page
function useRecordedTransfer(
  baseComponentId: string,
  uploadsKey: string,
  controller: UploadController,
  { resourceId, sender }: ReadySetup,
) {
  const transfer = useSyncExternalStore(controller.subscribe, controller.getTransfer);
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'BrokerFileTransfer');
  const { formData, setValues } = useDataModelBindings(dataModelBindings);
  const hasFileNameBinding = !!dataModelBindings.fileName;

  useEffect(() => {
    if (transfer?.resourceId !== resourceId || transfer.sender !== sender) {
      return;
    }
    if (transfer.status === null) {
      if (formData.fileTransferId === transfer.fileTransferId) {
        const cleared = { fileTransferId: undefined, fileTransferStatus: undefined };
        setValues(hasFileNameBinding ? { ...cleared, fileName: undefined } : cleared);
      }
      return;
    }
    if (formData.fileTransferId !== transfer.fileTransferId || formData.fileTransferStatus !== transfer.status) {
      const recorded = { fileTransferId: transfer.fileTransferId, fileTransferStatus: transfer.status };
      setValues(hasFileNameBinding ? { ...recorded, fileName: transfer.fileName } : recorded);
    }
    if (isReceivedStatus(transfer.status)) {
      forgetUploads(uploadsKey);
    }
  }, [
    formData.fileTransferId,
    formData.fileTransferStatus,
    hasFileNameBinding,
    resourceId,
    sender,
    setValues,
    transfer,
    uploadsKey,
  ]);
}

function useInterruptedTransfer(
  baseComponentId: string,
  controller: UploadController,
  { baseUrl, resourceId, sender }: ReadySetup,
  hasActive: boolean,
) {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'BrokerFileTransfer');
  const { formData } = useDataModelBindings(dataModelBindings);
  const { fileTransferId, fileName } = formData;
  const isInterrupted = !!fileTransferId && !isReceivedStatus(formData.fileTransferStatus) && !hasActive;
  const check = useQuery(brokerQueries.interruptedTransfer(baseUrl, isInterrupted ? fileTransferId : null));

  useEffect(() => {
    if (!isInterrupted || !check.data) {
      return;
    }
    if (check.data.status === 'received') {
      controller.markReceived(
        { resourceId, sender, fileTransferId, fileName: check.data.fileName },
        check.data.fileTransferStatus,
      );
    } else if (check.data.status === 'gone') {
      controller.discard({ resourceId, sender, fileTransferId, fileName: fileName ?? '' }, null);
      reportUploadGone();
    }
  }, [check.data, controller, fileName, fileTransferId, isInterrupted, resourceId, sender]);

  useEffect(() => {
    if (check.error) {
      window.logError('Could not check the interrupted Broker upload:\n', check.error);
    }
  }, [check.error]);

  const discard = useCallback(() => {
    const plan = check.data?.status === 'resumable' ? check.data.plan : null;
    controller.discard({ resourceId, sender, fileTransferId, fileName: fileName ?? '' }, plan);
  }, [check.data, controller, fileName, fileTransferId, resourceId, sender]);

  let state: InterruptedState | null = null;
  if (isInterrupted && check.data?.status === 'resumable') {
    const { fileName: resumableName, plan, uploaded } = check.data;
    state = { kind: 'resumable', fileName: resumableName, plan, uploaded };
  } else if (isInterrupted) {
    // Also while a received or gone transfer is being recorded
    state = check.isError ? { kind: 'unknown' } : { kind: 'checking' };
  }

  return { state, fileTransferId, discard };
}
