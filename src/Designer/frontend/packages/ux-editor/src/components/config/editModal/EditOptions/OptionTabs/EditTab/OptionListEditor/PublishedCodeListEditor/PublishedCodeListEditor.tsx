import type { FormItem } from '../../../../../../../../types/FormItem';
import type { SelectionComponentType } from '../../../../../../../../types/FormComponent';
import React, { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { extractValuesFromPublishedCodeListReferenceString } from '../../../utils/published-code-list-reference-utils';
import { PublishedOptionListSelector } from '../../PublishedOptionListSelector';
import { Guard } from '@studio/guard';
import { StudioCodeFragment, StudioDeleteButton, StudioParagraph } from '@studio/components';
import { resetComponentOptions } from '../../../utils/optionsUtils';
import type { PublishedCodeListReferenceValues } from '../../../types/PublishedCodeListReferenceValues';
import classes from './PublishedCodeListEditor.module.css';
import { PencilIcon } from '@studio/icons';

export type PublishedCodeListEditorProps = {
  readonly component: FormItem<SelectionComponentType>;
  readonly handleComponentChange: (updatedComponent: FormItem<SelectionComponentType>) => void;
  readonly orgName: string;
};

export function PublishedCodeListEditor({
  component,
  handleComponentChange,
  orgName,
}: PublishedCodeListEditorProps): React.ReactElement {
  const { t } = useTranslation();

  const handleDelete = useCallback(() => {
    const updatedComponent = resetComponentOptions(component);
    handleComponentChange(updatedComponent);
  }, [component, handleComponentChange]);

  const { codeListName, version } = extractReferenceValues(component);

  return (
    <div className={classes.root}>
      <StudioParagraph className={classes.info}>
        <Trans
          components={{ code: <StudioCodeFragment /> }}
          i18nKey='ux_editor.options.published_code_list_in_use'
          values={{ codeListName, version }}
        />
      </StudioParagraph>
      <PublishedOptionListSelector
        component={component}
        handleComponentChange={handleComponentChange}
        orgName={orgName}
        triggerProps={{
          children: t('general.edit'),
          className: classes.editButton,
          icon: <PencilIcon />,
        }}
      />
      <StudioDeleteButton onDelete={handleDelete} className={classes.deleteButton}>
        {t('general.delete')}
      </StudioDeleteButton>
    </div>
  );
}

function extractReferenceValues(
  component: FormItem<SelectionComponentType>,
): PublishedCodeListReferenceValues {
  Guard.againstMissingProperty(component, 'optionsId');
  const referenceValues = extractValuesFromPublishedCodeListReferenceString(component.optionsId);
  Guard.againstNull(referenceValues);
  return referenceValues;
}
