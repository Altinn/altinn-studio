import React from 'react';
import { useParams } from 'react-router';

import { AppTable, Description, HelpTextContainer } from '@app/form-component';
import { Heading, Link } from '@digdir/designsystemet-react';
import { DownloadIcon } from '@navikt/aksel-icons';

import captionClasses from 'src/components/form/caption/Caption.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getFileEnding, removeFileEnding } from 'src/layout/FileUpload/utils/fileEndings';
import classes from 'src/layout/SigneeList/SigneeListComponent.module.css';
import { useDocumentList } from 'src/layout/SigningDocumentList/api';
import downloadClasses from 'src/layout/SigningDocumentList/SigningDocumentListComponent.module.css';
import { SigningDocumentListError } from 'src/layout/SigningDocumentList/SigningDocumentListError';
import utilClasses from 'src/styles/utils.module.css';
import { getSizeWithUnit } from 'src/utils/attachmentsUtils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import type { ITextResourceBindings } from 'src/layout/layout';

export function SigningDocumentListComponent({
  baseComponentId,
  textResourceBindings,
}: {
  baseComponentId: string;
  textResourceBindings: ITextResourceBindings<'SigningDocumentList'>;
}) {
  const { instanceOwnerPartyId, instanceGuid } = useParams();
  const { langAsString } = useLanguage();
  const { data, isLoading, error } = useDocumentList(instanceOwnerPartyId, instanceGuid);
  const componentId = useIndexedId(baseComponentId);

  if (error) {
    return <SigningDocumentListError error={error} />;
  }

  return (
    <>
      {textResourceBindings?.title && (
        <div className={captionClasses.tableCaption}>
          <Heading
            level={3}
            data-size='sm'
          >
            <Lang id={textResourceBindings.title} />
          </Heading>
          {textResourceBindings.description && (
            <Description
              className={captionClasses.description}
              componentId={componentId}
              description={<Lang id={textResourceBindings.description} />}
            />
          )}
          {textResourceBindings.help && (
            <HelpTextContainer
              id={componentId}
              helpText={<Lang id={textResourceBindings.help} />}
            />
          )}
        </div>
      )}
      <AppTable
        size='md'
        isLoading={isLoading}
        headerClassName={classes.header}
        tableClassName={classes.table}
        tableTestId={baseComponentId}
        ariaLabel={textResourceBindings?.title ? langAsString(textResourceBindings.title) : undefined}
        data={data ?? []}
        emptyText={langAsString('general.empty_table')}
        columns={[
          {
            header: langAsString('signing_document_list.header_filename'),
            accessors: [],
            renderCell: (_, rowData) => (
              <Link
                href={rowData.url}
                rel='noopener noreferrer'
                title={rowData.filename}
              >
                <span className={classes.nameWrapper}>
                  <span className={classes.truncate}>{removeFileEnding(rowData.filename)}</span>
                  <span className={classes.extension}>{getFileEnding(rowData.filename)}</span>
                </span>
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
            header: (
              <span className={utilClasses.visuallyHidden}>{langAsString('signing_document_list.download')}</span>
            ),
            accessors: [],
            renderCell: (_, rowData) => (
              <Link
                href={rowData.url}
                className={downloadClasses.downloadLink}
                download
              >
                {langAsString('signing_document_list.download')}
                <DownloadIcon fontSize='1.5rem' />
              </Link>
            ),
          },
        ]}
      />
    </>
  );
}
