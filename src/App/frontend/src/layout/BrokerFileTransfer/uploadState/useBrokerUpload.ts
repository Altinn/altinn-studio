import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import {
  useBrokerFileTransferOverviewQuery,
  useInterruptedBrokerTransferQuery,
} from 'src/core/queries/brokerFileTransfer';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import {
  FAILED_STATUS,
  isReceivedStatus,
  isSettledStatus,
  UPLOADED_STATUS,
} from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import { getBrokerApiBaseUrl } from 'src/layout/BrokerFileTransfer/setup/useBrokerSetup';
import {
  forgetUploads,
  getUploadController,
  reportUploadGone,
  useUploadsKey,
} from 'src/layout/BrokerFileTransfer/uploadState/uploadStore';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import type { ResumableTransfer } from 'src/layout/BrokerFileTransfer/brokerClient/upload/interruptedTransfer';
import type { UploadController } from 'src/layout/BrokerFileTransfer/brokerClient/upload/uploadController';
import type { ReadySetup } from 'src/layout/BrokerFileTransfer/setup/useBrokerSetup';

export type InterruptedState = { kind: 'checking' } | { kind: 'unknown' } | ({ kind: 'resumable' } & ResumableTransfer);

/** Starts, continues and follows the upload, and records the transfer in the form */
export function useBrokerUpload(baseComponentId: string, setup: ReadySetup) {
  const { baseUrl, instanceId, resourceId, sender, recipients, propertyList, disableVirusScan } = setup;
  const uploadsKey = useUploadsKey(baseComponentId);
  const controller = useMemo(() => getUploadController(baseUrl, uploadsKey), [baseUrl, uploadsKey]);
  const active = useSyncExternalStore(controller.subscribe, controller.getActive);
  const progress = useSyncExternalStore(controller.subscribe, controller.getProgress);
  const [sendError, setSendError] = useState<unknown>(null);

  useRecordedTransfer(baseComponentId, uploadsKey, controller, setup);

  // Leaving the page pauses rather than aborts, so the chunks already on their way finish instead of being sent again
  const hasActive = active !== null;
  useEffect(() => (hasActive ? controller.pause : undefined), [controller, hasActive]);

  const interrupted = useInterruptedTransfer(baseComponentId, controller, setup, hasActive);

  const send = useCallback(
    async (file: File, checksum: string | undefined) => {
      setSendError(null);
      try {
        await controller.start({
          resourceId,
          sender,
          recipients,
          file,
          reference: instanceId,
          checksum,
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
          checksum: interruptedState.checksum,
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
  const removeTransfer = useRemoveTransfer(baseComponentId);

  useEffect(() => {
    if (transfer?.resourceId !== resourceId || transfer.sender !== sender) {
      return;
    }
    if (transfer.status === null) {
      if (formData.fileTransferId === transfer.fileTransferId) {
        removeTransfer();
      }
      return;
    }
    if (formData.fileTransferId !== transfer.fileTransferId || formData.fileTransferStatus !== transfer.status) {
      const recorded = { fileTransferId: transfer.fileTransferId, fileTransferStatus: transfer.status };
      setValues(hasFileNameBinding ? { ...recorded, fileName: transfer.fileName } : recorded);
    }
    if (isReceivedStatus(transfer.status) || transfer.status === FAILED_STATUS) {
      forgetUploads(uploadsKey);
    }
  }, [
    formData.fileTransferId,
    formData.fileTransferStatus,
    hasFileNameBinding,
    removeTransfer,
    resourceId,
    sender,
    setValues,
    transfer,
    uploadsKey,
  ]);
}

/** Empties the component's fields in the form, so the user can send another file */
export function useRemoveTransfer(baseComponentId: string) {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'BrokerFileTransfer');
  const { setValues } = useDataModelBindings(dataModelBindings);
  const hasFileNameBinding = !!dataModelBindings.fileName;

  return useCallback(() => {
    const cleared = { fileTransferId: undefined, fileTransferStatus: undefined };
    setValues(hasFileNameBinding ? { ...cleared, fileName: undefined } : cleared);
  }, [hasFileNameBinding, setValues]);
}

export function useFollowReceivedTransfer(baseComponentId: string, enabled: boolean) {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'BrokerFileTransfer');
  const { formData, setValues } = useDataModelBindings(dataModelBindings);
  const isChecking = enabled && !!formData.fileTransferId && formData.fileTransferStatus === UPLOADED_STATUS;
  const overview = useBrokerFileTransferOverviewQuery(
    getBrokerApiBaseUrl(),
    isChecking ? formData.fileTransferId : undefined,
    { poll: true },
  );
  const status = overview.data?.fileTransferStatus;

  useEffect(() => {
    if (isChecking && status && isSettledStatus(status)) {
      setValues({ fileTransferStatus: status });
    }
  }, [isChecking, setValues, status]);
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
  const check = useInterruptedBrokerTransferQuery(baseUrl, isInterrupted ? fileTransferId : null);

  useEffect(() => {
    if (!isInterrupted || !check.data) {
      return;
    }
    if (check.data.status === 'ended') {
      controller.recordStatus(
        { resourceId, sender, fileTransferId, fileName: check.data.fileName },
        check.data.fileTransferStatus,
      );
    } else if (check.data.status === 'gone') {
      controller.discard({ resourceId, sender, fileTransferId, fileName: fileName ?? '' }, check.data.plan ?? null);
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
    const { fileName: resumableName, plan, uploaded, checksum } = check.data;
    state = { kind: 'resumable', fileName: resumableName, plan, uploaded, checksum };
  } else if (isInterrupted) {
    // Also while a received, failed or gone transfer is being recorded
    state = check.error ? { kind: 'unknown' } : { kind: 'checking' };
  }

  return { state, fileTransferId, discard };
}
