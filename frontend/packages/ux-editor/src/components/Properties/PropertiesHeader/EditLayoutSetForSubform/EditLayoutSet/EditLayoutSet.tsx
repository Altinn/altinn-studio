import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { SelectLayoutSet } from './SelectLayoutSet/SelectLayoutSet';
import {
  StudioButton,
  StudioIconTextfield,
  StudioNativeSelect,
  StudioProperty,
  StudioRecommendedNextAction,
} from '@studio/components';
import { Paragraph } from '@digdir/designsystemet-react';
import { CheckmarkIcon, ClipboardIcon, PlusIcon } from '@studio/icons';
import classes from './EditLayoutSet.module.css';

type EditLayoutSetProps = {
  existingLayoutSetForSubform: string;
  onUpdateLayoutSet: (layoutSetId: string) => void;
};

export const EditLayoutSet = ({
  existingLayoutSetForSubform,
  onUpdateLayoutSet,
}: EditLayoutSetProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isLayoutSetSelectorVisible, setIsLayoutSetSelectorVisible] = useState<boolean>(false);

  if (isLayoutSetSelectorVisible) {
    return (
      <SelectLayoutSet
        existingLayoutSetForSubForm={existingLayoutSetForSubform}
        onUpdateLayoutSet={onUpdateLayoutSet}
        onSetLayoutSetSelectorVisible={setIsLayoutSetSelectorVisible}
        showButtons={true}
      />
    );
  }

  const layoutSetIsUndefined = !existingLayoutSetForSubform;
  if (layoutSetIsUndefined) {
    return (
      <>
        <StudioRecommendedNextAction
          title={t('ux_editor.component_properties.subform.choose_layout_set_header')}
          description={t('ux_editor.component_properties.subform.choose_layout_set_description')}
          hideSaveButton={true}
          hideSkipButton={true}
        >
          <Paragraph size='sm'>
            {t('ux_editor.component_properties.subform.create_layout_set_description')}
          </Paragraph>
          <SelectLayoutSet
            existingLayoutSetForSubForm={existingLayoutSetForSubform}
            onUpdateLayoutSet={onUpdateLayoutSet}
            onSetLayoutSetSelectorVisible={setIsLayoutSetSelectorVisible}
            showButtons={false}
          />
          {/* TODO: add functionalty */}
          <StudioProperty.Button
            className={classes.button}
            property={t('ux_editor.component_properties.subform.create_layout_set_button')}
            icon={<PlusIcon />}
            onClick={undefined}
          />
        </StudioRecommendedNextAction>

        {/* TODO:  - Fix align for all  */}
        <StudioRecommendedNextAction hideSaveButton={true} hideSkipButton={true}>
          <ClipboardIcon />
          {/* TODO:  - extract text   -  add functionalty */}
          <StudioIconTextfield
            error={undefined}
            icon={undefined}
            size='sm'
            label={t('ux_editor.component_properties.subform.created_layout_set_name')}
            onChange={undefined}
            value={undefined}
          />
          {/* TODO:  - Add seelctor for datmodell*/}

          <StudioNativeSelect
            id={undefined}
            label={t('ux_editor.component_properties.subform.datamodell_binding_layout_set_name')}
            onChange={undefined}
            value={undefined}
            size='sm'
          />

          {/* TODO:  - extract text   -  add functionalty */}
          <StudioButton
            className={classes.savelayoutSetButton}
            icon={<CheckmarkIcon />}
            onClick={undefined}
            title={'Lagreeeeeeeee'}
            variant='tertiary'
            color='success'
          />
        </StudioRecommendedNextAction>
      </>
    );
  }

  return (
    <DefinedLayoutSet
      existingLayoutSetForSubForm={existingLayoutSetForSubform}
      onClick={() => setIsLayoutSetSelectorVisible(true)}
    />
  );
};
