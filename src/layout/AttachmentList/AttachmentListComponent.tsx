import React from 'react';

import { AltinnAttachments } from 'src/components/atoms/AltinnAttachments';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { DataTypeReference, getRefAsPdfDisplayAttachments, toDisplayAttachments } from 'src/utils/attachmentsUtils';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataType } from 'src/types/shared';

export type IAttachmentListProps = PropsFromGenericComponent<'AttachmentList'>;

const emptyDataTypeArray: IDataType[] = [];

export function AttachmentListComponent({ node }: IAttachmentListProps) {
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const dataTypes = useApplicationMetadata().dataTypes ?? emptyDataTypeArray;
  const dataTypeIds = useNodeItem(node, (i) => i.dataTypeIds);
  const textResourceBindings = useNodeItem(node, (i) => i.textResourceBindings);
  const links = useNodeItem(node, (i) => i.links);

  const attachments = useLaxInstanceData((data) => {
    const instanceData = data.data ?? [];
    const allowedTypes = new Set(dataTypeIds ?? []);
    const includePdf =
      allowedTypes.has(DataTypeReference.RefDataAsPdf) || allowedTypes.has(DataTypeReference.IncludeAll);
    const pdfAttachments = includePdf ? getRefAsPdfDisplayAttachments(instanceData) : [];

    // These are the data types that are marked as available in the current task
    const dataTypesInTask = new Set(dataTypes.filter((type) => type.taskId === currentTaskId).map((type) => type.id));

    // This is a list of data types that are clearly data models. We don't show those when listing attachments.
    const dataModelTypes = new Set(dataTypes.filter((dataType) => dataType.appLogic?.classRef).map((type) => type.id));

    // This filter function takes all the instance data and filters down to only the attachments
    // we're interested in showing here.
    const attachments = instanceData.filter((el) => {
      if (el.dataType === DataTypeReference.RefDataAsPdf || dataModelTypes.has(el.dataType)) {
        return false;
      }

      if (allowedTypes.has(DataTypeReference.IncludeAll) || allowedTypes.has(el.dataType)) {
        return true;
      }

      if (allowedTypes.has(DataTypeReference.FromTask)) {
        // if only data types from current task are allowed, we check if the data type is in the task
        return dataTypesInTask.has(el.dataType);
      }

      // if no data types are specified, we show all data types
      return allowedTypes.size === 0;
    });

    const otherAttachments = toDisplayAttachments(attachments);
    return [...pdfAttachments, ...otherAttachments];
  });

  return (
    <ComponentStructureWrapper node={node}>
      <AltinnAttachments
        attachments={attachments}
        title={textResourceBindings?.title}
        links={links}
      />
    </ComponentStructureWrapper>
  );
}
