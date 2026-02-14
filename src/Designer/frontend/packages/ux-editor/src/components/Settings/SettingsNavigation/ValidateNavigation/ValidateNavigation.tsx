import React from 'react';
import { StudioHeading, StudioParagraph } from '@studio/components';
import classes from './ValidateNavigation.module.css';
import { useTranslation } from 'react-i18next';
import { ValidateNavigationConfig } from './ValidateNavigationConfig';
import { Scope } from './ValidateNavigationUtils';

export const ValidateNavigation = () => {
  const { t } = useTranslation();

  return (
    <div className={classes.validateContent}>
      <div>
        <StudioHeading level={3} data-size='xs' spacing>
          {t('ux_editor.settings.navigation_validation_header')}
        </StudioHeading>
        <StudioParagraph>
          {t('ux_editor.settings.navigation_validation_description')}
        </StudioParagraph>
      </div>
      <div>
        <StudioHeading level={4} data-size='2xs'>
          {t('ux_editor.settings.navigation_validation_all_tasks_header')}
        </StudioHeading>
        <StudioParagraph>
          {t('ux_editor.settings.navigation_validation_all_tasks_description')}
        </StudioParagraph>
        <ValidateNavigationConfig
          propertyLabel={t('ux_editor.settings.navigation_validation_button_label')}
          scope={Scope.AllTasks}
        />
      </div>
      <div>
        <StudioHeading level={4} data-size='2xs'>
          {t('ux_editor.settings.navigation_validation_specific_task_header')}
        </StudioHeading>
        <StudioParagraph>
          {t('ux_editor.settings.navigation_validation_specific_task_description')}
        </StudioParagraph>
        <ValidateNavigationConfig
          propertyLabel={t('ux_editor.settings.navigation_validation_button_label')}
          scope={Scope.SelectedTasks}
        />
      </div>
      <div>
        <StudioHeading level={4} data-size='2xs'>
          {t('ux_editor.settings.navigation_validation_specific_page_header')}
        </StudioHeading>
        <StudioParagraph>
          {t('ux_editor.settings.navigation_validation_specific_page_description')}
        </StudioParagraph>
        <ValidateNavigationConfig
          propertyLabel={t('ux_editor.settings.navigation_validation_button_label')}
          scope={Scope.SelectedPages}
        />
      </div>
    </div>
  );
};
