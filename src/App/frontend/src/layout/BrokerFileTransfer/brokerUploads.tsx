import React from 'react';
import { toast } from 'react-toastify';

import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { Lang } from 'src/features/language/Lang';
import { GlobalData } from 'src/GlobalData';
import { configureBrokerClient } from 'src/layout/BrokerFileTransfer/brokerClient/config';
import { isUploadGone } from 'src/layout/BrokerFileTransfer/brokerClient/tus/tusUpload';
import { createUploadController } from 'src/layout/BrokerFileTransfer/brokerClient/upload/uploadController';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import type { UploadController } from 'src/layout/BrokerFileTransfer/brokerClient/upload/uploadController';
import type { Message } from 'src/layout/BrokerFileTransfer/messages';

// brokerClient/ is BrokerBox's upload code (Altinn/altinn-broker), but resumes from the form, not session storage

type FilePick = { file: File | null; pickError: Message | null };

export const noPick: FilePick = { file: null, pickError: null };

type ComponentUploads = { controller: UploadController | null; pick: FilePick };

// Kept outside the component, so an upload and the chosen file survive the user leaving the page
const uploadsByComponent = new Map<string, ComponentUploads>();
const pickListeners = new Set<() => void>();

export function useUploadsKey(baseComponentId: string): string {
  return `${useLaxInstanceId()}/${useIndexedId(baseComponentId)}`;
}

function uploadsFor(key: string): ComponentUploads {
  const existing = uploadsByComponent.get(key);
  if (existing) {
    return existing;
  }
  const created: ComponentUploads = { controller: null, pick: noPick };
  uploadsByComponent.set(key, created);
  return created;
}

export function getBrokerApiBaseUrl(): string | undefined {
  return GlobalData.platformFrontendSettings.brokerApiBaseUrl || undefined;
}

export function getUploadController(baseUrl: string, key: string): UploadController {
  configureBrokerClient({ baseUrl });
  const uploads = uploadsFor(key);
  uploads.controller ??= createUploadController({ onFailed: reportFailure });
  return uploads.controller;
}

export function getFilePick(key: string): FilePick {
  return uploadsByComponent.get(key)?.pick ?? noPick;
}

export function setFilePick(key: string, pick: FilePick) {
  uploadsFor(key).pick = pick;
  pickListeners.forEach((listener) => listener());
}

export function subscribeToFilePicks(listener: () => void) {
  pickListeners.add(listener);
  return () => {
    pickListeners.delete(listener);
  };
}

export function forgetUploads(key: string) {
  if (uploadsByComponent.delete(key)) {
    pickListeners.forEach((listener) => listener());
  }
}

export function reportUploadGone() {
  toast(<Lang id='broker_file_transfer.error_upload_gone' />, { type: 'error' });
}

function reportFailure(error: unknown) {
  window.logError('Broker file transfer upload failed:\n', error);
  if (isUploadGone(error)) {
    reportUploadGone();
  }
}
