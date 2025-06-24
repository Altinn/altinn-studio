import React from 'react';
import { useParams } from 'react-router-dom';

import { Link } from '@digdir/designsystemet-react';
import { DownloadIcon } from '@navikt/aksel-icons';

import { AppTable } from 'src/app-components/Table/Table';
import { Caption } from 'src/components/form/caption/Caption';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/SigneeList/SigneeListComponent.module.css';
import { useDocumentList } from 'src/layout/SigningDocumentList/api';
import { SigningDocumentListError } from 'src/layout/SigningDocumentList/SigningDocumentListError';
import { getSizeWithUnit } from 'src/utils/attachmentsUtils';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeItemFromNode } from 'src/utils/layout/types';

export function SigningDocumentListComponent({
  textResourceBindings,
}: {
  textResourceBindings: NodeItemFromNode<LayoutNode<'SigningDocumentList'>>['textResourceBindings'];
}) {
  const { instanceOwnerPartyId, instanceGuid } = useParams();
  const { langAsString } = useLanguage();

  const { data, isLoading, error } = useDocumentList(instanceOwnerPartyId, instanceGuid);

  if (error) {
    return <SigningDocumentListError error={error} />;
  }

  return (
    <AppTable
      size='md'
      isLoading={isLoading}
      headerClassName={classes.header}
      tableClassName={classes.table}
      data={data ?? []}
      emptyText={<Lang id='general.empty_table' />}
      caption={
        textResourceBindings?.title ? (
          <Caption
            title={<Lang id={textResourceBindings?.title} />}
            description={textResourceBindings?.description && <Lang id={textResourceBindings?.description} />}
            helpText={textResourceBindings?.help ? { text: textResourceBindings?.help } : undefined}
            designSystemLabelProps={{ 'data-size': 'lg' }}
          />
        ) : undefined
      }
      columns={[
        {
          header: langAsString('signing_document_list.header_filename'),
          accessors: [],
          renderCell: (_, rowData) => (
            <Link
              href={rowData.url}
              rel='noopener noreferrer'
            >
              {rowData.filename}
            </Link>
          ),
        },
        {
          header: langAsString('signing_document_list.header_attachment_type'),
          accessors: [],
          renderCell: (_, rowData) => rowData.attachmentTypes.map((it) => langAsString(it)).join(', '),
        },
        {
          header: langAsString('signing_document_list.header_size'),
          accessors: [],
          renderCell: (_, rowData) => getSizeWithUnit(rowData.size),
        },
        {
          header: null,
          ariaLabel: langAsString('signing_document_list.download'),
          accessors: [],
          renderCell: (_, rowData) => (
            <Link
              href={rowData.url}
              style={{ display: 'flex', gap: '0.5rem', whiteSpace: 'nowrap', textDecoration: 'none' }}
              download
            >
              {langAsString('signing_document_list.download')}
              <DownloadIcon fontSize='1.5rem' />
            </Link>
          ),
        },
      ]}
    />
  );
}
