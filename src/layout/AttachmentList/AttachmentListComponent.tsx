import React from 'react';

import { AltinnAttachments } from 'src/components/atoms/AltinnAttachments';
import { AttachmentGroupings } from 'src/components/organisms/AttachmentGroupings';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import {
  DataTypeReference,
  filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes,
  getAttachmentsWithDataType,
  getRefAsPdfAttachments,
  toDisplayAttachments,
} from 'src/utils/attachmentsUtils';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataType } from 'src/types/shared';

const emptyDataTypeArray: IDataType[] = [];

export function AttachmentListComponent({ baseComponentId }: PropsFromGenericComponent<'AttachmentList'>) {
  const item = useItemWhenType(baseComponentId, 'AttachmentList');
  const textResourceBindings = item.textResourceBindings;
  const showLinks = item.links;
  const allowedAttachmentTypes = new Set(item.dataTypeIds ?? []);
  const groupAttachments = item.groupByDataTypeGrouping ?? false;
  const showDescription = item.showDataTypeDescriptions ?? false;

  const instanceData = useLaxInstanceData((data) => data.data) ?? [];
  const currentTaskId = useProcessQuery().data?.currentTask?.elementId;
  const appMetadataDataTypes = useApplicationMetadata().dataTypes ?? emptyDataTypeArray;
  const dataTypeIdsInCurrentTask = appMetadataDataTypes.filter((it) => it.taskId === currentTaskId).map((it) => it.id);

  const attachmentsWithDataType = getAttachmentsWithDataType({
    attachments: instanceData ?? [],
    appMetadataDataTypes,
  });

  const relevantAttachments = filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes(attachmentsWithDataType);
  const filteredAttachments = relevantAttachments.filter((el) => {
    if (el.dataType === undefined) {
      return false; // Skip attachments without a data type
    }

    if (allowedAttachmentTypes.has(DataTypeReference.IncludeAll) || allowedAttachmentTypes.size === 0) {
      return true;
    }

    if (allowedAttachmentTypes.has(el.dataType.id)) {
      return true;
    }

    if (allowedAttachmentTypes.has(DataTypeReference.FromTask)) {
      // if only data types from current task are allowed, we check if the data type is in the task
      return dataTypeIdsInCurrentTask.includes(el.dataType.id);
    }

    return false;
  });

  const includePdf =
    allowedAttachmentTypes.has(DataTypeReference.RefDataAsPdf) ||
    allowedAttachmentTypes.has(DataTypeReference.IncludeAll);
  const pdfAttachments = includePdf ? getRefAsPdfAttachments(attachmentsWithDataType) : [];

  const displayAttachments = toDisplayAttachments([...pdfAttachments, ...filteredAttachments]);

  const title = textResourceBindings?.title ? <Lang id={textResourceBindings?.title} /> : undefined;

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      {groupAttachments ? (
        <AttachmentGroupings
          attachments={displayAttachments}
          title={title}
          hideCollapsibleCount={true}
          showLinks={showLinks}
          showDescription={showDescription}
        />
      ) : (
        <AltinnAttachments
          attachments={displayAttachments}
          title={title}
          showLinks={showLinks}
          showDescription={showDescription}
        />
      )}
    </ComponentStructureWrapper>
  );
}
