import React, { useMemo } from 'react';

import { AltinnAttachment } from 'src/components/atoms/AltinnAttachment';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { DataTypeReference, filterDisplayPdfAttachments, getDisplayAttachments } from 'src/utils/attachmentsUtils';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IData, IDataType } from 'src/types/shared';

export type IAttachmentListProps = PropsFromGenericComponent<'AttachmentList'>;

const emptyDataArray: IData[] = [];
const emptyDataTypeArray: IDataType[] = [];

export function AttachmentListComponent({ node }: IAttachmentListProps) {
  const instanceData = useLaxInstanceData()?.data ?? emptyDataArray;
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const dataTypes = useApplicationMetadata().dataTypes ?? emptyDataTypeArray;

  const attachments = useMemo(() => {
    const allowedTypes = new Set(node.item.dataTypeIds ?? []);
    const includePdf =
      allowedTypes.has(DataTypeReference.RefDataAsPdf) || allowedTypes.has(DataTypeReference.IncludeAll);
    const pdfAttachments = includePdf ? filterDisplayPdfAttachments(instanceData) : [];

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

    const otherAttachments = getDisplayAttachments(attachments);
    return [...pdfAttachments, ...otherAttachments];
  }, [currentTaskId, dataTypes, instanceData, node.item.dataTypeIds]);

  return (
    <ComponentStructureWrapper node={node}>
      <AltinnAttachment
        attachments={attachments}
        title={node.item.textResourceBindings?.title}
      />
    </ComponentStructureWrapper>
  );
}
