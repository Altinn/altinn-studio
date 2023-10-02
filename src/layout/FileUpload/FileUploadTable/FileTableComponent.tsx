import React from 'react';

import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/FileUpload/FileUploadTable/FileTableComponent.module.css';
import { FileTableRow } from 'src/layout/FileUpload/FileUploadTable/FileTableRow';
import { FileTableRowContextProvider } from 'src/layout/FileUpload/FileUploadTable/FileTableRowContext';
import { EditWindowComponent } from 'src/layout/FileUploadWithTag/EditWindowComponent';
import { atleastOneTagExists } from 'src/utils/formComponentUtils';
import type { IAttachment } from 'src/features/attachments';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IOption } from 'src/layout/common.generated';
import type { FileTableRowContext } from 'src/layout/FileUpload/FileUploadTable/FileTableRowContext';

export interface FileTableProps {
  node: PropsFromGenericComponent<'FileUpload' | 'FileUploadWithTag'>['node'];
  attachments: IAttachment[];
  mobileView: boolean;
  options?: IOption[];
  attachmentValidations?: {
    id: string;
    message: string;
  }[];
  validationsWithTag?: {
    id: string;
    message: string;
  }[];
  setValidationsWithTag?: (validationArray: { id: string; message: string }[]) => void;
}

export function FileTableComponent({
  attachments,
  mobileView,
  node,
  attachmentValidations,
  options,
  validationsWithTag,
  setValidationsWithTag,
}: FileTableProps): React.JSX.Element | null {
  const { lang } = useLanguage();
  const { textResourceBindings, type } = node.item;
  const hasTag = type === 'FileUploadWithTag';
  const [editIndex, setEditIndex] = React.useState<number>(-1);

  if (!attachments || attachments.length === 0) {
    return null;
  }
  const tagTitle =
    (textResourceBindings && 'tagTitle' in textResourceBindings && textResourceBindings?.tagTitle) || undefined;
  const label = (attachment: IAttachment) => {
    const firstTag = attachment.tags && attachment.tags[0];
    return options?.find((option) => option.value === firstTag)?.label;
  };

  return (
    <table
      className={!mobileView ? classes.table : classes.tableMobile}
      data-testid={hasTag ? 'tagFile' : 'file-upload-table'}
      id={hasTag ? 'tagFile' : 'file-upload-table'}
    >
      {(atleastOneTagExists(attachments) || !hasTag) && (
        <thead>
          <tr
            className={classes.blueUnderline}
            id='altinn-file-list-row-header'
          >
            <th>{lang('form_filler.file_uploader_list_header_name')}</th>
            {!mobileView ? <th>{lang('form_filler.file_uploader_list_header_file_size')}</th> : null}
            {hasTag ? <th>{lang(tagTitle)}</th> : null}
            {!(hasTag && mobileView) ? <th>{lang('form_filler.file_uploader_list_header_status')}</th> : null}
            <th>
              <p className='sr-only'>{lang('form_filler.file_uploader_list_header_delete_sr')}</p>
            </th>
          </tr>
        </thead>
      )}
      <tbody className={classes.tableBody}>
        {attachments.map((attachment, index: number) => {
          const canRenderRow =
            !hasTag || (attachment.tags !== undefined && attachment.tags.length > 0 && editIndex !== index);

          const ctx: FileTableRowContext = {
            setEditIndex,
            editIndex,
            index,
          };

          // Check if filter is applied and includes specified index.
          return canRenderRow ? (
            <FileTableRowContextProvider
              value={ctx}
              key={`altinn-file-list-row-${attachment.id}`}
            >
              <FileTableRow
                node={node}
                attachment={attachment}
                mobileView={mobileView}
                tagLabel={label(attachment)}
              />
            </FileTableRowContextProvider>
          ) : (
            <FileTableRowContextProvider
              value={ctx}
              key={`altinn-unchosen-option-attachment-row-${index}`}
            >
              <tr>
                <td
                  className={mobileView ? classes.fullGrid : ''}
                  colSpan={!mobileView ? 5 : 3}
                >
                  <EditWindowComponent
                    node={node as PropsFromGenericComponent<'FileUploadWithTag'>['node']}
                    attachment={attachment}
                    attachmentValidations={[
                      ...new Map(attachmentValidations?.map((validation) => [validation['id'], validation])).values(),
                    ]}
                    mobileView={mobileView}
                    options={options}
                    validationsWithTag={validationsWithTag ?? []}
                    setValidationsWithTag={setValidationsWithTag ?? (() => {})}
                  />
                </td>
              </tr>
            </FileTableRowContextProvider>
          );
        })}
      </tbody>
    </table>
  );
}
