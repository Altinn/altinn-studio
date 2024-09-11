import React from 'react';
import { List, Link, Accordion } from '@digdir/designsystemet-react';
import { repositoryPath } from 'app-shared/api/paths';
import { useTranslation } from 'react-i18next';
import classes from './ManualCodelistUploadSteps.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const ManualCodelistUploadSteps = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  return (
    <Accordion>
      <Accordion.Item>
        <Accordion.Header>{t('ux_editor.options.codelist_upload_info.heading')}</Accordion.Header>
        <Accordion.Content>
          <List.Root className={classes.configWarningList} size='small'>
            <List.Ordered>
              <List.Item>
                <Link href={repositoryPath(org, app)} target='_blank'>
                  {t('ux_editor.options.codelist_upload_info.step1')}
                </Link>
              </List.Item>
              <List.Item>{t('ux_editor.options.codelist_upload_info.step2')}</List.Item>
              <List.Item>{t('ux_editor.options.codelist_upload_info.step3')}</List.Item>
              <List.Item>{t('ux_editor.options.codelist_upload_info.step4')}</List.Item>
              <List.Item>{t('ux_editor.options.codelist_upload_info.step5')}</List.Item>
            </List.Ordered>
          </List.Root>
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item>
        <Accordion.Header>{t('ux_editor.options.codelist_create_info.heading')}</Accordion.Header>
        <Accordion.Content>
          <List.Root className={classes.configWarningList} size='small'>
            <List.Ordered>
              <List.Item>
                <Link href={repositoryPath(org, app)} target='_blank'>
                  {t('ux_editor.options.codelist_create_info.step1')}
                </Link>
              </List.Item>
              <List.Item>{t('ux_editor.options.codelist_create_info.step2')}</List.Item>
              <List.Item>{t('ux_editor.options.codelist_create_info.step3')}</List.Item>
              <List.Item>{t('ux_editor.options.codelist_create_info.step4')}</List.Item>
              <List.Item>{t('ux_editor.options.codelist_create_info.step5')}</List.Item>
              <List.Item>{t('ux_editor.options.codelist_create_info.step6')}</List.Item>
            </List.Ordered>
          </List.Root>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
};
