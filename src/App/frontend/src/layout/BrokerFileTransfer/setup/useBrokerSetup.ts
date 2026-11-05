import { useCallback, useEffect, useMemo } from 'react';
import { useNavigation } from 'react-router';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import type { IDataModelReference } from '@app/layout-contract/generated/common.generated';

import { useQuery } from 'src/core/queries/reactQuery';
import { FormStore } from 'src/features/form/FormContext';
import { useCurrentUiFolderSettings } from 'src/features/form/ui/hooks';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useInstanceDataQuery, useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { GlobalData } from 'src/GlobalData';
import { useIsSubformPage } from 'src/hooks/navigation';
import { brokerQueries } from 'src/layout/BrokerFileTransfer/api';
import { ApiError } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { toOrgNumber } from 'src/layout/BrokerFileTransfer/brokerClient/orgIdentifier';
import { effectiveMaxFileTransferSize } from 'src/layout/BrokerFileTransfer/brokerClient/resourceConfiguration';
import { brokerProblem, unauthorizedMessage } from 'src/layout/BrokerFileTransfer/messages';
import { configProblems, invalidRecipients, splitRecipients } from 'src/layout/BrokerFileTransfer/setup/configProblems';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalExpressionDictionary } from 'src/utils/layout/useEvalExpression';
import type { Message } from 'src/layout/BrokerFileTransfer/messages';

export type ReadySetup = {
  baseUrl: string;
  instanceId: string;
  resourceId: string;
  sender: string;
  recipients: string[];
  // Why a new file transfer can't be sent to the recipients yet, such as a field the user hasn't filled in
  recipientsProblem: Message | undefined;
  // In lower case, or undefined to let Broker calculate it after upload
  checksum: string | undefined;
  checksumProblem: Message | undefined;
  propertyList: Record<string, string>;
  metadataProblem: Message | undefined;
  disableVirusScan: boolean;
  maxFileSize: number | null;
};

type BrokerSetup =
  | { kind: 'loading' }
  | { kind: 'problem'; message: Message }
  | { kind: 'misconfigured'; errors: string[] }
  | { kind: 'unavailable'; maxFileSize: number | null }
  | ({ kind: 'ready' } & ReadySetup);

const BYTES_IN_MB = 1000 * 1000;

// MD5 or SHA256, the algorithms Broker accepts
const CHECKSUM_PATTERN = /^([0-9a-f]{32}|[0-9a-f]{64})$/;

export function getBrokerApiBaseUrl(): string | undefined {
  return GlobalData.platformFrontendSettings.brokerApiBaseUrl || undefined;
}

/** Works out whether the component can send, and with which Broker settings and recipients */
export function useBrokerSetup(baseComponentId: string): BrokerSetup {
  const config = useComponentConfig(baseComponentId, 'BrokerFileTransfer');
  const { resourceId, disableVirusScan = false, maxFileTransferSizeInMB } = config;
  const componentMaxFileSize = maxFileTransferSizeInMB ? maxFileTransferSizeInMB * BYTES_IN_MB : null;
  const isInRepeatingGroup = useIndexedId(baseComponentId) !== baseComponentId;
  const isSubformPage = useIsSubformPage();
  const navigation = useNavigation();
  const { langAsString } = useLanguage();
  const baseUrl = getBrokerApiBaseUrl();
  const instanceId = useLaxInstanceId();
  const owner = useInstanceDataQuery({ select: (instance) => instance.instanceOwner }).data;
  const configuredRecipients = useConfiguredRecipients(baseComponentId);
  const isRequired = useIsRequiredInDataModel();
  const checksum = useChecksum(baseComponentId, isRequired);
  const metadata = useMetadata(baseComponentId, isRequired);
  const resource = useQuery(brokerQueries.resourceConfiguration(baseUrl, resourceId));

  useEffect(() => {
    if (resource.error) {
      window.logError(`Could not read the Broker resource '${resourceId}':\n`, resource.error);
    }
  }, [resource.error, resourceId]);

  const translate = (problems: Message[]) => problems.map(({ key, params }) => langAsString(key, params));

  // Uploads and chosen files are kept per component ID, which holds the row number in a repeating group
  if (isInRepeatingGroup) {
    return { kind: 'misconfigured', errors: ['BrokerFileTransfer cannot be used in a repeating group.'] };
  }
  // Every subform entry has the same component IDs, so they would share one upload
  if (isSubformPage && navigation.state !== 'loading') {
    return { kind: 'misconfigured', errors: ['BrokerFileTransfer cannot be used in a subform.'] };
  }
  // The layout validator reports these too, but layout validation doesn't run in production
  const staticProblems = configProblems(config);
  if (staticProblems.length > 0) {
    return { kind: 'misconfigured', errors: translate(staticProblems) };
  }
  if (!instanceId) {
    return {
      kind: 'misconfigured',
      errors: ['BrokerFileTransfer sends on behalf of the instance owner, so it needs an instance.'],
    };
  }
  if (!baseUrl) {
    return {
      kind: 'unavailable',
      maxFileSize: lowerLimit(effectiveMaxFileTransferSize(null, !disableVirusScan), componentMaxFileSize),
    };
  }
  if (!owner) {
    return { kind: 'loading' };
  }
  const sender = toOrgNumber(owner.organisationNumber ?? '');
  if (!sender) {
    return { kind: 'problem', message: { key: 'broker_file_transfer.sender_not_organization' } };
  }
  // A failed refresh keeps the settings read before, so a running upload isn't replaced by an error
  if (!resource.data) {
    return resource.isError ? resourceProblem(resource.error, resourceId) : { kind: 'loading' };
  }
  if (disableVirusScan && !resource.data.approvedForDisabledVirusScan) {
    return {
      kind: 'misconfigured',
      errors: [
        `disableVirusScan is set, but the Broker resource '${resourceId}' is not approved for sending without virus scan.`,
      ],
    };
  }

  const requiredParty = resource.data.requiredParty ? toOrgNumber(resource.data.requiredParty) : null;
  const recipients = configuredRecipients ?? (requiredParty ? [requiredParty] : null);
  if (!recipients) {
    return {
      kind: 'misconfigured',
      errors: ['No recipients: set hasCustomRecipients and recipients, or give the Broker resource a required party.'],
    };
  }

  return {
    kind: 'ready',
    baseUrl,
    instanceId,
    resourceId,
    sender,
    recipients: recipients.map((recipient) => toOrgNumber(recipient) ?? recipient),
    recipientsProblem: recipientsProblem(recipients),
    checksum: checksum.value,
    checksumProblem: checksum.problem,
    propertyList: metadata.propertyList,
    metadataProblem: metadata.problem,
    disableVirusScan,
    maxFileSize: lowerLimit(
      effectiveMaxFileTransferSize(resource.data.maxFileTransferSize, !disableVirusScan),
      componentMaxFileSize,
    ),
  };
}

// Broker refuses a resource that isn't registered or set up with 403 or 400, which the app developer has to fix
function resourceProblem(error: Error, resourceId: string): BrokerSetup {
  if (error instanceof ApiError && error.status === 401) {
    return { kind: 'problem', message: unauthorizedMessage(error) };
  }
  if (error instanceof ApiError && (error.status === 400 || error.status === 403)) {
    const reason = brokerProblem(error).detail ?? `Broker answered ${error.status}.`;
    return { kind: 'misconfigured', errors: [`Altinn Broker cannot send on the resource '${resourceId}': ${reason}`] };
  }
  return { kind: 'problem', message: { key: 'broker_file_transfer.resource_unavailable' } };
}

// Fixed recipients were checked with the configuration, so these come from an expression, such as a form field
function recipientsProblem(recipients: string[]): Message | undefined {
  if (recipients.length === 0) {
    return { key: 'broker_file_transfer.error_no_recipients' };
  }
  const invalid = invalidRecipients(recipients);
  return invalid.length > 0
    ? { key: 'broker_file_transfer.error_invalid_recipients', params: [invalid.join(', ')] }
    : undefined;
}

function lowerLimit(limit: number | null, otherLimit: number | null): number | null {
  if (limit === null || otherLimit === null) {
    return limit ?? otherLimit;
  }
  return Math.min(limit, otherLimit);
}

export function useAllowedFileEndings(baseComponentId: string): string[] | null {
  const { hasCustomFileEndings, validFileEndings } = useComponentConfig(baseComponentId, 'BrokerFileTransfer');
  if (!hasCustomFileEndings || validFileEndings === undefined) {
    return null;
  }
  const endings = (Array.isArray(validFileEndings) ? validFileEndings : validFileEndings.split(','))
    .map((ending) => ending.trim())
    .filter(Boolean);
  return endings.length > 0 ? endings : null;
}

function useConfiguredRecipients(baseComponentId: string): string[] | null {
  const { hasCustomRecipients, recipients } = useComponentConfig(baseComponentId, 'BrokerFileTransfer');
  const evaluated = useEvalExpression(recipients, Expressions.BrokerFileTransfer.recipients);
  return useMemo(() => (hasCustomRecipients ? splitRecipients(evaluated) : null), [evaluated, hasCustomRecipients]);
}

function useChecksum(baseComponentId: string, isRequired: IsRequired): { value?: string; problem?: Message } {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'BrokerFileTransfer');
  const { formData } = useDataModelBindings(dataModelBindings);
  const required = isRequired(dataModelBindings.checksum);

  const value = typeof formData.checksum === 'string' ? formData.checksum.trim().toLowerCase() : '';
  if (!value) {
    return required
      ? {
          problem: {
            key: 'form_filler.error_required',
            params: [{ key: 'form_filler.checksum', makeLowerCase: true }],
          },
        }
      : {};
  }
  return CHECKSUM_PATTERN.test(value) ? { value } : { problem: { key: 'broker_file_transfer.error_checksum_invalid' } };
}

// Entries without a value are left out of the property list
function useMetadata(
  baseComponentId: string,
  isRequired: IsRequired,
): { propertyList: Record<string, string>; problem?: Message } {
  const { metadata } = useComponentConfig(baseComponentId, 'BrokerFileTransfer');
  const values = useEvalExpressionDictionary(metadata, Expressions.BrokerFileTransfer.metadata.additionalProperties);
  const defaultDataType = useCurrentUiFolderSettings()?.defaultDataType;
  return useMemo(() => {
    const propertyList = Object.fromEntries(Object.entries(values ?? {}).filter(([, value]) => value.trim() !== ''));
    const requiredMissing = Object.entries(metadata ?? {}).some(
      ([key, value]) => !(key in propertyList) && isRequired(dataModelReference(value, defaultDataType)),
    );
    return requiredMissing
      ? { propertyList, problem: { key: 'broker_file_transfer.error_metadata_required' } }
      : { propertyList };
  }, [defaultDataType, isRequired, metadata, values]);
}

function dataModelReference(value: unknown, defaultDataType: string | undefined): IDataModelReference | undefined {
  if (!Array.isArray(value) || value[0] !== 'dataModel' || typeof value[1] !== 'string') {
    return undefined;
  }
  const dataType = typeof value[2] === 'string' ? value[2] : defaultDataType;
  return dataType ? { dataType, field: value[1] } : undefined;
}

type IsRequired = (reference: IDataModelReference | undefined) => boolean;

// The data model schema lists a required field on the object that holds it
function useIsRequiredInDataModel(): IsRequired {
  const lookupBinding = FormStore.bootstrap.useLookupBinding();
  return useCallback(
    (reference) => {
      if (!reference || !lookupBinding) {
        return false;
      }
      const path = reference.field.split('.');
      const field = path.pop();
      const [parent] = lookupBinding({ ...reference, field: path.join('.') });
      return !!field && !!parent?.required?.includes(field);
    },
    [lookupBinding],
  );
}
