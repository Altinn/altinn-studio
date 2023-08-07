import React from 'react';

import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/FileUpload/FileUploadTable/FileTableComponent.module.css';
import { FileTableRow } from 'src/layout/FileUpload/FileUploadTable/FileTableRow';
import { EditWindowComponent } from 'src/layout/FileUploadWithTag/EditWindowComponent';
import { atleastOneTagExists } from 'src/utils/formComponentUtils';
import type { IAttachment } from 'src/features/attachments';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IOption, IRuntimeState } from 'src/types';

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
  const dispatch = useAppDispatch();
  const { lang } = useLanguage();
  const { id, baseComponentId, textResourceBindings, type } = node.item;
  const hasTag = type === 'FileUploadWithTag';

  const editIndex = useAppSelector((state: IRuntimeState) => {
    const fileUploadersWithTag = state.formLayout.uiConfig.fileUploadersWithTag;
    return fileUploadersWithTag?.[id]?.editIndex ?? -1;
  });

  if (!attachments || attachments.length === 0) {
    return null;
  }
  const tagTitle =
    (textResourceBindings && 'tagTitle' in textResourceBindings && textResourceBindings?.tagTitle) || undefined;
  const renderRow = (attachment: IAttachment, index: number) =>
    !hasTag || (attachment.tags !== undefined && attachment.tags.length > 0 && editIndex !== index);
  const label = (attachment: IAttachment) => {
    const firstTag = attachment.tags && attachment.tags[0];
    return options?.find((option) => option.value === firstTag)?.label;
  };

  const setEditIndex = (index: number) => {
    dispatch(
      FormLayoutActions.updateFileUploaderWithTagEditIndex({
        componentId: id,
        baseComponentId: baseComponentId || id,
        index,
      }),
    );
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
            {hasTag ? <th>{tagTitle}</th> : null}
            {!(hasTag && mobileView) ? <th>{lang('form_filler.file_uploader_list_header_status')}</th> : null}
            <th>
              <p className='sr-only'>{lang('form_filler.file_uploader_list_header_delete_sr')}</p>
            </th>
          </tr>
        </thead>
      )}
      <tbody className={classes.tableBody}>
        {attachments.map((attachment, index: number) =>
          // Check if filter is applied and includes specified index.
          renderRow(attachment, index) ? (
            <FileTableRow
              key={`altinn-file-list-row-${attachment.id}`}
              node={node}
              attachment={attachment}
              mobileView={mobileView}
              index={index}
              editIndex={editIndex}
              setEditIndex={setEditIndex}
              tagLabel={label(attachment)}
            />
          ) : (
            <tr key={`altinn-unchosen-option-attachment-row-${index}`}>
              <td
                className={mobileView ? classes.fullGrid : ''}
                colSpan={!mobileView ? 5 : 3}
              >
                {
                  <EditWindowComponent
                    node={node as PropsFromGenericComponent<'FileUploadWithTag'>['node']}
                    index={index}
                    attachment={attachment}
                    attachmentValidations={[
                      ...new Map(attachmentValidations?.map((validation) => [validation['id'], validation])).values(),
                    ]}
                    mobileView={mobileView}
                    options={options}
                    editIndex={editIndex}
                    setEditIndex={setEditIndex}
                    validationsWithTag={validationsWithTag ?? []}
                    setValidationsWithTag={setValidationsWithTag ?? (() => {})}
                  />
                }
              </td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
