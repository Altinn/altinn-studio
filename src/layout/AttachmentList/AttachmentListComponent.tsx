import React from 'react';

import { Grid, Typography } from '@material-ui/core';

import { AltinnAttachment } from 'src/components/atoms/AltinnAttachment';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import { selectAttachments, selectDataTypesByIds } from 'src/selectors/dataTypes';
import type { PropsFromGenericComponent } from 'src/layout';

export type IAttachmentListProps = PropsFromGenericComponent<'AttachmentList'>;

export function AttachmentListComponent({ node }: IAttachmentListProps) {
  const { dataTypeIds, includePDF } = node.item;
  const { lang } = useLanguage();
  const dataForTask = useAppSelector(selectDataTypesByIds(dataTypeIds));
  const attachments = useAppSelector(selectAttachments(includePDF, dataForTask));

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
