import React from 'react';
import { StudioLabelAsParagraph, StudioSectionHeader } from '@studio/components';
import { Link, Paragraph, Accordion } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import classes from './ConfigEndEvent.module.css';
import { ConfigIcon } from '../ConfigContent/ConfigIcon';
import { CustomReceiptContent } from './CustomReceiptContent';

export const ConfigEndEvent = () => {
  const { t } = useTranslation();

  return (
    <>
      <StudioSectionHeader
        icon={<ConfigIcon taskType={'endEvent'} />}
        heading={{
          text: t('process_editor.configuration_panel_end_event'),
          level: 2,
        }}
      />
      <Accordion color='neutral'>
        <Accordion.Item>
          <Accordion.Header>
            {t('process_editor.configuration_panel_custom_receipt_accordion_header')}
          </Accordion.Header>
          <Accordion.Content>
            <div className={classes.container}>
              <div>
                <StudioLabelAsParagraph size='small' spacing>
                  {t('process_editor.configuration_panel_custom_receipt_default_receipt_heading')}
                </StudioLabelAsParagraph>
                <Paragraph size='small' className={classes.paragraph}>
                  {t('process_editor.configuration_panel_custom_receipt_default_receipt_info')}
                </Paragraph>
                <Link
                  href='https://docs.altinn.studio/app/development/configuration/process/customize/#receipt'
                  rel='noopener noreferrer'
                  size='small'
                >
                  {t('process_editor.configuration_panel_custom_receipt_default_receipt_link')}
                </Link>
              </div>
              <div>
                <StudioLabelAsParagraph size='small' spacing>
                  {t('process_editor.configuration_panel_custom_receipt_heading')}
                </StudioLabelAsParagraph>
                <Paragraph size='small'>
                  {t('process_editor.configuration_panel_custom_receipt_info')}
                </Paragraph>
                <CustomReceiptContent />
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </>
  );
};
