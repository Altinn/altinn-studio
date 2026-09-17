import React from 'react';

import { AttachmentList } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { useInstanceDataElements } from 'src/features/instance/InstanceContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import {
  DataTypeReference,
  filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes,
  getAttachmentsWithDataType,
  getRefAsPdfAttachments,
  toDisplayAttachments,
  toRenderableAttachments,
} from 'src/utils/attachmentsUtils';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataType } from 'src/types/shared';

const emptyDataTypeArray: IDataType[] = [];

export function AttachmentListComponent({ baseComponentId }: PropsFromGenericComponent<'AttachmentList'>) {
  const config = useComponentConfig(baseComponentId, 'AttachmentList');
  const title = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.AttachmentList.textResourceBindings.title,
  );

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  const allowedAttachmentTypes = new Set(config.dataTypeIds ?? []);
  const groupAttachments = config.groupByDataTypeGrouping ?? false;
  const showDescription = config.showDataTypeDescriptions ?? false;

  const dataElements = useInstanceDataElements(undefined);
  const currentTaskId = useProcessQuery().data?.currentTask?.elementId;
  const appMetadataDataTypes = getApplicationMetadata().dataTypes ?? emptyDataTypeArray;
  const dataTypeIdsInCurrentTask = appMetadataDataTypes.filter((it) => it.taskId === currentTaskId).map((it) => it.id);

  const attachmentsWithDataType = getAttachmentsWithDataType({
    attachments: dataElements ?? [],
    appMetadataDataTypes,
  });

  const relevantAttachments = filterOutDataModelRefDataAsPdfAndAppOwnedDataTypes(attachmentsWithDataType);
  const filteredAttachments = relevantAttachments.filter((el) => {
    if (el.dataType === undefined) {
      return false;
    }

    if (allowedAttachmentTypes.has(DataTypeReference.IncludeAll) || allowedAttachmentTypes.size === 0) {
      return true;
    }

    if (allowedAttachmentTypes.has(el.dataType.id)) {
      return true;
    }

    if (allowedAttachmentTypes.has(DataTypeReference.FromTask)) {
      return dataTypeIdsInCurrentTask.includes(el.dataType.id);
    }

    return false;
  });

  const includePdf =
    allowedAttachmentTypes.has(DataTypeReference.RefDataAsPdf) ||
    allowedAttachmentTypes.has(DataTypeReference.IncludeAll);
  const pdfAttachments = includePdf ? getRefAsPdfAttachments(attachmentsWithDataType) : [];

  const displayAttachments = toRenderableAttachments(toDisplayAttachments([...pdfAttachments, ...filteredAttachments]));

  return (
    <AttachmentList
      componentId={componentId}
      attachments={displayAttachments}
      title={config.textResourceBindings?.title === undefined ? undefined : title}
      groupByDataTypeGrouping={groupAttachments}
      showLinks={config.links}
      showDescription={showDescription}
      innerGrid={innerGrid}
    />
  );
}
