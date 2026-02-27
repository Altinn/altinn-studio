import { useQuery } from '@tanstack/react-query';
import { activeInstancesQuery, useCreateInstance } from 'nextsrc/core/queries/instance/instance.queries';
import { extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId } from 'nextsrc/core/queries/instance/utils';

const useActiveInstances = ({
  instanceOwnerPartyId,
  sortDirection,
}: {
  instanceOwnerPartyId: number;
  sortDirection: 'desc' | 'asc';
}) =>
  useQuery({
    ...activeInstancesQuery(instanceOwnerPartyId),
    select: (instances) => (sortDirection === 'desc' ? [...instances].reverse() : instances),
  });

export {
  extractInstanceOwnerPartyIdAndInstanceGuidFromInstanceId,
  useCreateInstance,
  useActiveInstances,
  activeInstancesQuery,
};
