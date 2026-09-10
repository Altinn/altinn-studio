import { queryOptions, skipToken } from '@tanstack/react-query';
import slugify from 'slugify';
import type { RequestedDocument } from '@app/layout-contract/generated/components/Lommebok/config.generated';
import type { AxiosRequestConfig } from 'axios';

import credentialOptions from 'src/layout/Lommebok/options.json';
import { credentialTypes } from 'src/layout/Lommebok/types';
import { getFileContentType } from 'src/utils/attachmentsUtils';
import { httpGet, httpPost } from 'src/utils/network/networking';
import { appPath, getFileUploadUrl } from 'src/utils/urls/appUrlHelper';
import { customEncodeURI } from 'src/utils/urls/urlHelper';
import type { IData } from 'src/types/shared';

// TypeScript interfaces for API responses
export interface VerificationStartResponse {
  verifier_transaction_id: string;
  authorization_request: string;
}

export interface VerificationStatusResponse {
  status: 'PENDING' | 'AVAILABLE' | 'FAILED';
}

export interface VerificationResultResponse {
  claims: Record<string, unknown>;
}

// URL helper functions
export const getWalletVerificationStartUrl = () => `${appPath}/api/wallet/verify/start`;

export const getWalletVerificationStatusUrl = (verificationId: string) =>
  `${appPath}/api/wallet/verify/status/${verificationId}`;

export const getWalletVerificationResultUrl = (verificationId: string) =>
  `${appPath}/api/wallet/verify/result/${verificationId}`;

type Keys = RequestedDocument['type'];

// Generate validRequests from options.json
const validRequests = Object.entries(credentialOptions.credential_configurations_supported).reduce(
  (acc, [credentialId, config]) => {
    // Use the first Norwegian locale display name and slugify it
    const displayName = config.display.find((d) => d.locale === 'no')?.name || credentialId;
    const key = slugify(displayName, { lower: true, strict: true, locale: 'nb' });

    // Determine type and value based on format
    let type: 'vct' | 'doctype';
    let value: string;

    if ('doctype' in config) {
      type = 'doctype';
      value = config.doctype;
    } else if ('vct' in config) {
      type = 'vct';
      value = config.vct;
    } else {
      // Fallback - shouldn't happen with valid data
      throw new Error(`Unknown credential format for ${credentialId}`);
    }

    acc[key] = {
      name: displayName,
      type,
      value,
    };

    return acc;
  },
  {} as Record<Keys, { type: 'vct' | 'doctype'; value: string; name: string }>,
);

// Helper function to get document display name
export const getDocumentDisplayName = (docType: Keys): string =>
  validRequests[docType]?.name || `Not in known types: ${credentialTypes.join(', ')}`;

// Helper function to get credential configuration from document type
export const getCredentialConfig = (docType: Keys) =>
  Object.entries(credentialOptions.credential_configurations_supported).find(([_, config]) => {
    const displayName = config.display.find((d) => d.locale === 'no')?.name || '';
    const key = slugify(displayName, { lower: true, strict: true, locale: 'nb' });
    return key === docType;
  });

// Helper function to get claims for a document type
export const getDocumentClaims = (docType: Keys): Array<{ name: string; mandatory: boolean }> => {
  const credentialEntry = getCredentialConfig(docType);

  if (!credentialEntry) {
    return [];
  }

  const [, config] = credentialEntry;
  return (
    config.claims?.map((claim) => ({
      name: claim.display.find((d) => d.locale === 'no')?.name || claim.path[claim.path.length - 1],
      mandatory: claim.mandatory,
    })) || []
  );
};

// API functions
export const startWalletVerification = async (request: Keys): Promise<VerificationStartResponse> => {
  const url = getWalletVerificationStartUrl();

  const requestBody = {
    credential_issuer: credentialOptions.credential_issuer,
    vct: validRequests[request].type === 'vct' ? validRequests[request].value : undefined,
    doctype: validRequests[request].type === 'doctype' ? validRequests[request].value : undefined,
  };

  const response = await httpPost<VerificationStartResponse>(url, {}, requestBody);
  return response.data;
};

export const fetchWalletStatus = async (verificationId: string): Promise<VerificationStatusResponse> => {
  const url = getWalletVerificationStatusUrl(verificationId);
  const response = await httpGet<VerificationStatusResponse>(url);
  if (!response) {
    throw new Error('Failed to fetch wallet status');
  }
  return response;
};

export const fetchWalletResult = async (verificationId: string): Promise<VerificationResultResponse> => {
  const url = getWalletVerificationResultUrl(verificationId);
  const response = await httpGet<VerificationResultResponse>(url);
  if (!response) {
    throw new Error('Failed to fetch wallet result');
  }
  return response;
};

// Query key factory
export const walletQueries = {
  all: () => ['wallet'] as const,

  statusKey: (verificationId: string | null) => [...walletQueries.all(), 'status', verificationId] as const,

  status: (verificationId: string | null) =>
    queryOptions({
      queryKey: walletQueries.statusKey(verificationId),
      queryFn: verificationId ? () => fetchWalletStatus(verificationId) : skipToken,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        // Stop polling when status is AVAILABLE or FAILED
        if (status === 'AVAILABLE' || status === 'FAILED') {
          return false;
        }
        // Poll every 5 seconds while PENDING
        return 5000;
      },
      retry: false, // Don't retry failed requests while polling
    }),

  resultKey: (verificationId: string | null) => [...walletQueries.all(), 'result', verificationId] as const,

  result: (verificationId: string | null) =>
    queryOptions({
      queryKey: walletQueries.resultKey(verificationId),
      queryFn: verificationId ? () => fetchWalletResult(verificationId) : skipToken,
      enabled: !!verificationId,
      staleTime: Infinity, // Claims data doesn't change once fetched
    }),
} as const;

/**
 * Upload a PDF file as an alternative to wallet verification
 * @param instanceId - The instance ID
 * @param dataType - The attachment data type ID
 * @param language - The current language
 * @param file - The PDF file to upload
 * @returns The created data element
 */
export const doLommebokPdfUpload = async (
  instanceId: string,
  dataType: string,
  language: string,
  file: File,
): Promise<IData> => {
  const url = getFileUploadUrl(instanceId, dataType, language);
  const contentType = getFileContentType(file);

  const config: AxiosRequestConfig = {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename=${customEncodeURI(file.name)}`,
    },
  };

  const response = await httpPost<IData>(url, config, file);
  if (response.status >= 300) {
    throw new Error('Failed to upload lommebok PDF');
  }
  return response.data;
};
