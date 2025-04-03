import React from 'react';
import {
  StudioButton,
  StudioCard,
  StudioHeading,
  StudioNativeSelect,
  StudioTabs,
  StudioTextfield,
} from '@studio/components-legacy';
import { PlusIcon } from '@navikt/aksel-icons';
import classes from './AddSubformCard.module.css';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

enum Tabs {
  Choose = 'choose',
  Create = 'create',
}

type AddSubformCardProps = {
  isSubformInEditMode: boolean;
  setIsSubformInEditMode: (isSubformInEditMode: boolean) => void;
};

export const AddSubformCard = ({
  setIsSubformInEditMode,
  isSubformInEditMode,
}: AddSubformCardProps) => {
  const { t } = useTranslation();

  const handleCreateSubform = () => {
    setIsSubformInEditMode(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCreateSubform();
    }
  };

  if (isSubformInEditMode) {
    return (
      <StudioCard className={classes.card}>
        <div className={classes.createSubformContent}>
          <StudioTextfield
            label={'Navn på underskjema'}
            // label={t('ux_editor.task_card_subform_name')}
            size='small'
            className={classes.textField}
          />

          <StudioTabs defaultValue={Tabs.Choose}>
            <StudioTabs.List>
              <StudioTabs.Tab value={Tabs.Choose}>Velg</StudioTabs.Tab>
              <StudioTabs.Tab value={Tabs.Create}>Lag ny</StudioTabs.Tab>
            </StudioTabs.List>
            <StudioTabs.Content value={Tabs.Choose}>
              <StudioNativeSelect
                label='Velg datamodellknytning'
                size='small'
                className={classes.select}
                // options={[]}
                // onChange={handleSelectChange}
                // value={selectedOption}
              />
            </StudioTabs.Content>
            <StudioTabs.Content value={Tabs.Create}>
              <StudioTextfield
                label={'Navn på datamodell'}
                size='small'
                className={classes.textField}
              />
            </StudioTabs.Content>
          </StudioTabs>
          <div className={classes.buttonContainer}>
            <StudioButton
              variant='primary'
              className={classes.button}
              onClick={() => setIsSubformInEditMode(false)}
            >
              {t('general.save')}
            </StudioButton>

            <StudioButton
              variant='secondary'
              className={classes.button}
              onClick={() => setIsSubformInEditMode(false)}
            >
              {t('general.cancel')}
            </StudioButton>
          </div>
        </div>
      </StudioCard>
    );
  }

  return (
    <StudioCard
      onClick={handleCreateSubform}
      className={cn(classes.card, classes.cardDefault)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role='button'
      aria-label={t('ux_editor.task_card_add_new_subform')}
    >
      <div className={classes.iconContainer}>{<PlusIcon />}</div>
      <div className={classes.content}>
        <StudioHeading size='2xs'>{t('ux_editor.task_card_add_new_subform')}</StudioHeading>
      </div>
    </StudioCard>
  );
};
