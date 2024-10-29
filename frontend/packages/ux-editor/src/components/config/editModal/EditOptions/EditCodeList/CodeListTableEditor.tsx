import React, { useEffect, useState } from 'react';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { SelectionComponentType } from '@altinn/ux-editor/types/FormComponent';
import type { CodeListItem } from '@studio/components';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';
import { StudioCodeListEditor, StudioModal } from '@studio/components';
import { TableIcon } from '@studio/icons';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateOptionListMutation } from '../../../../../hooks/mutations/useUpdateOptionListMutation';
import { useOptionListsQuery } from '../../../../../hooks/queries/useOptionListsQuery';
import {
  convertCodeListItemListToOptionsList,
  convertOptionsListToCodeListItemList,
} from './utils/conversionUtils';
import { useCodeListEditorTexts } from './hooks/useCodeListEditorTexts';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import classes from './CodeListTableEditor.module.css';

export type CodeListTableEditorProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component'
>;

export function CodeListTableEditor({ component }: CodeListTableEditorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { doReloadPreview } = usePreviewContext();
  const { data: optionsListMap, isFetching } = useOptionListsQuery(org, app);
  const { mutate: uploadOptionList } = useUpdateOptionListMutation(org, app, {
    hideDefaultError: true,
  });
  const [codeListItemList, setCodeListItemList] = useState<CodeListItem[]>([]);
  const editorTexts = useCodeListEditorTexts();

  useEffect(() => {
    if (isFetching) return;
    handleOptionsChange(optionsListMap[component.optionsId]);
  }, [optionsListMap, component.optionsId, isFetching]);

  const handleOptionsChange = (options: Option[]) => {
    const convertedList = convertOptionsListToCodeListItemList(options);
    setCodeListItemList(convertedList);
  };

  const handleClose = () => {
    const optionsListLocal = convertCodeListItemListToOptionsList(codeListItemList);
    uploadOptionList({ optionListId: component.optionsId, optionsList: optionsListLocal });
    doReloadPreview();
  };

  if (component.optionsId === undefined || isFetching) return;
  return (
    <StudioModal.Root>
      <StudioModal.Trigger
        className={classes.modalTrigger}
        variant='secondary'
        icon={<TableIcon />}
      >
        {t('ux_editor.modal_properties_code_list_open_editor')}
      </StudioModal.Trigger>
      <StudioModal.Dialog
        className={classes.manualTabModal}
        closeButtonTitle={t('general.close')}
        heading={t('ux_editor.modal_add_options_codelist')}
        onBeforeClose={handleClose}
      >
        <StudioCodeListEditor
          codeList={codeListItemList}
          onChange={handleOptionsChange}
          texts={editorTexts}
        />
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}
