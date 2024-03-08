import React from 'react';
import classes from './EditPageId.module.css';
import { KeyVerticalIcon } from '@navikt/aksel-icons';
import { getPageNameErrorKey } from '../../../utils/designViewUtils';
import { deepCopy } from 'app-shared/pure';
import { useUpdateLayoutNameMutation } from '../../../hooks/mutations/useUpdateLayoutNameMutation';
import { StudioToggleableTextfield } from '@studio/components';
import { useSearchParams } from 'react-router-dom';
import type { TextResourceIdMutation } from '@altinn/text-editor/src/types';
import { useTextIdMutation } from 'app-development/hooks/mutations';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../../hooks/useAppContext';
import { useText } from '../../../hooks';
import { useFormLayoutSettingsQuery } from '../../../hooks/queries/useFormLayoutSettingsQuery';

export interface EditPageIdProps {
  layoutName: string;
}
export const EditPageId = ({ layoutName }: EditPageIdProps) => {
  const { app, org } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  const { mutate: textIdMutation } = useTextIdMutation(org, app);
  const { mutate: updateLayoutName } = useUpdateLayoutNameMutation(org, app, selectedLayoutSet);
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const [searchParams, setSearchParams] = useSearchParams();
  const t = useText();

  const layoutOrder = formLayoutSettings?.pages?.order;

  const handleSaveNewName = (newName: string) => {
    if (newName === layoutName) return;
    updateLayoutName({ oldName: layoutName, newName });
    setSearchParams({ ...deepCopy(searchParams), layout: newName });
    updateTextId({ oldId: layoutName, newId: newName });
  };

  const updateTextId = ({ oldId, newId }: TextResourceIdMutation) => {
    try {
      textIdMutation([{ oldId, newId }]);
    } catch (e: unknown) {
      console.error('Renaming text-id failed:\n', e);
    }
  };

  return (
    <div className={classes.changePageId}>
      <StudioToggleableTextfield
        viewProps={{
          children: `ID: ${layoutName}`,
          variant: 'tertiary',
          fullWidth: true,
        }}
        inputProps={{
          icon: <KeyVerticalIcon />,
          value: layoutName,
          onBlur: (event) => handleSaveNewName(event.target.value),
          label: t('ux_editor.modal_properties_textResourceBindings_page_id'),
          size: 'small',
          className: classes.idInput,
        }}
        customValidation={(value: string) => {
          const validationResult = getPageNameErrorKey(value, layoutName, layoutOrder);
          return validationResult ? t(validationResult) : undefined;
        }}
      />
    </div>
  );
};
