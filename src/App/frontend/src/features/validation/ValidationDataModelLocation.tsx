import type { PropsWithChildren } from 'react';

import {
  DataModelLocationProviderFromNode,
  NestedDataModelLocationProviders,
} from 'src/utils/layout/DataModelLocation';
import { getRowDataModelReference } from 'src/utils/layout/rowContext';
import type { NodeRefValidation } from 'src/features/validation';

/**
 * Renders a validation's text in the data model location it belongs to, so row-relative text variables resolve.
 * A row-object message carries its repeating group's node id, so only its row context names the row.
 */
export function ValidationDataModelLocation({
  validation,
  children,
}: PropsWithChildren<{ validation: Pick<NodeRefValidation, 'nodeId' | 'repeatingGroupRow'> }>) {
  if (validation.repeatingGroupRow) {
    return (
      <NestedDataModelLocationProviders reference={getRowDataModelReference(validation.repeatingGroupRow)}>
        {children}
      </NestedDataModelLocationProviders>
    );
  }
  return <DataModelLocationProviderFromNode nodeId={validation.nodeId}>{children}</DataModelLocationProviderFromNode>;
}
