import React from 'react';

import { Grid, Typography } from '@material-ui/core';

import { AltinnAttachment } from 'src/components/atoms/AltinnAttachment';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import { selectAttachments, selectDataTypesByIds } from 'src/selectors/dataTypes';
import { DataTypeReference } from 'src/utils/attachmentsUtils';
import type { PropsFromGenericComponent } from 'src/layout';

export type IAttachmentListProps = PropsFromGenericComponent<'AttachmentList'>;

export function AttachmentListComponent({ node }: IAttachmentListProps) {
  const { lang } = useLanguage();
  const instance = useLaxInstanceData();
  const process = useLaxProcessData();
  const dataForTask = useAppSelector(selectDataTypesByIds(node.item.dataTypeIds, instance, process));

  const includePdf =
    node.item.dataTypeIds?.some((id) =>
      [DataTypeReference.RefDataAsPdf, DataTypeReference.IncludeAll].includes(id as DataTypeReference),
    ) ?? false;
  const attachments = useAppSelector(selectAttachments(dataForTask, includePdf, process));

  return (
    <Grid
      item={true}
      xs={12}
    >
      <Typography variant='h2'>{lang(node.item.textResourceBindings?.title)}</Typography>
      <AltinnAttachment attachments={attachments} />
    </Grid>
  );
}
