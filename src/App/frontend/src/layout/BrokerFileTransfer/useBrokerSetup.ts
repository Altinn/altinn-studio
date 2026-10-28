import { useEffect, useMemo } from 'react';
import { useNavigation } from 'react-router';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useQuery } from 'src/core/queries/reactQuery';
import { useInstanceDataQuery, useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsSubformPage } from 'src/hooks/navigation';
import { brokerQueries } from 'src/layout/BrokerFileTransfer/api';
import { ApiError } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { toOrgNumber } from 'src/layout/BrokerFileTransfer/brokerClient/orgIdentifier';
import { effectiveMaxFileTransferSize } from 'src/layout/BrokerFileTransfer/brokerClient/resourceConfiguration';
import { getBrokerApiBaseUrl } from 'src/layout/BrokerFileTransfer/brokerUploads';
import { configProblems, recipientProblems, splitRecipients } from 'src/layout/BrokerFileTransfer/configProblems';
import { brokerProblem, unauthorizedMessage } from 'src/layout/BrokerFileTransfer/messages';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { Message } from 'src/layout/BrokerFileTransfer/messages';

export type ReadySetup = {
  baseUrl: string;
  instanceId: string;
  resourceId: string;
  sender: string;
  recipients: string[];
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
  const recipientErrors = configuredRecipients ? recipientProblems(configuredRecipients) : [];
  if (recipientErrors.length > 0) {
    return { kind: 'misconfigured', errors: translate(recipientErrors) };
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
  if (resource.isPending) {
    return { kind: 'loading' };
  }
  if (resource.isError) {
    return resourceProblem(resource.error, resourceId);
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
  const recipients = configuredRecipients ?? (requiredParty ? [requiredParty] : []);
  if (recipients.length === 0) {
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
