import type { FileRejection } from 'react-dropzone';

import { z } from 'zod';
import type { ValidLanguageKey } from '@app/language';

import { ApiError } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { FileChangedError } from 'src/layout/BrokerFileTransfer/brokerClient/tus/tusUpload';
import { UploadPlanError } from 'src/layout/BrokerFileTransfer/brokerClient/upload/uploadController';
import { formatFileSize } from 'src/layout/BrokerFileTransfer/formatting';
import type { ValidLangParam } from 'src/features/language/useLanguage';

// Texts for file problems and Broker errors

export type Message = { key: ValidLanguageKey; params?: ValidLangParam[] };

// Broker refuses longer file names
const MAX_FILE_NAME_LENGTH = 255;

// Broker's error code for NoAccessToResource
const NO_ACCESS_TO_RESOURCE = 6;

// Broker's error codes for RecipientNotInAccessList and InvalidRecipient, from its check against the access list
const RECIPIENTS_NOT_ALLOWED = new Set<number | undefined>([28, 31]);

const problemDetailsSchema = z.object({
  errorCode: z.number().nullish(),
  detail: z.string().nullish(),
  title: z.string().nullish(),
});

export function fileTypeProblem(rejected: FileRejection[], allowedFileEndings: string[] | null): Message | null {
  const wrongType = rejected.some((rejection) => rejection.errors.some((error) => error.code === 'file-invalid-type'));
  return wrongType && allowedFileEndings
    ? { key: 'broker_file_transfer.error_file_type', params: [allowedFileEndings.join(', ')] }
    : null;
}

export function fileProblem(file: File, maxFileSize: number | null, language: string): Message | undefined {
  if (file.size === 0) {
    return { key: 'broker_file_transfer.error_empty_file' };
  }
  if (file.name.length > MAX_FILE_NAME_LENGTH) {
    return { key: 'broker_file_transfer.error_file_name_too_long', params: [MAX_FILE_NAME_LENGTH] };
  }
  if (maxFileSize !== null && file.size > maxFileSize) {
    return {
      key: 'broker_file_transfer.error_file_too_large',
      params: [formatFileSize(file.size, language), formatFileSize(maxFileSize, language)],
    };
  }
  return undefined;
}

export function transferFailureMessage(statusText: string | undefined): Message {
  if (statusText?.startsWith('Checksum mismatch')) {
    return { key: 'broker_file_transfer.error_failed_checksum' };
  }
  if (statusText?.startsWith('Malware scan failed: Malicious')) {
    return { key: 'broker_file_transfer.error_failed_virus' };
  }
  return { key: 'broker_file_transfer.error_failed_other' };
}

export function sendErrorMessage(error: unknown): Message {
  if (error instanceof UploadPlanError) {
    return { key: 'broker_file_transfer.error_upload_not_prepared' };
  }
  if (error instanceof FileChangedError) {
    return { key: 'broker_file_transfer.error_file_changed' };
  }
  if (error instanceof ApiError && error.status === 401) {
    return unauthorizedMessage(error);
  }
  if (error instanceof ApiError && error.status === 403) {
    return { key: 'broker_file_transfer.error_not_set_up' };
  }
  if (error instanceof ApiError && RECIPIENTS_NOT_ALLOWED.has(brokerProblem(error).errorCode)) {
    return { key: 'broker_file_transfer.error_recipients_not_allowed' };
  }
  return { key: 'broker_file_transfer.error_send_failed' };
}

export function uploadErrorMessage(error: unknown): Message {
  if (error instanceof FileChangedError) {
    return { key: 'broker_file_transfer.error_file_changed_during_upload' };
  }
  if (error instanceof ApiError && error.status === 0) {
    return { key: 'broker_file_transfer.error_connection_lost' };
  }
  if (error instanceof ApiError && error.status === 401) {
    return unauthorizedMessage(error);
  }
  return { key: 'broker_file_transfer.error_upload_stopped' };
}

// Broker answers 401 both to a login it doesn't accept and, with this code, to a sender without rights on the resource
export function unauthorizedMessage(error: ApiError): Message {
  return brokerProblem(error).errorCode === NO_ACCESS_TO_RESOURCE
    ? { key: 'broker_file_transfer.error_no_access' }
    : { key: 'broker_file_transfer.error_login' };
}

export function brokerProblem(error: ApiError): { errorCode?: number; detail?: string } {
  const problem = problemDetailsSchema.safeParse(error.body);
  if (!problem.success) {
    return {};
  }
  return {
    errorCode: problem.data.errorCode ?? undefined,
    detail: problem.data.detail ?? problem.data.title ?? undefined,
  };
}
