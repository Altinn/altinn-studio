import React from 'react';
import { StudioLabelAsParagraph, StudioSectionHeader } from 'libs/studio-components-legacy/src';
import { Accordion, Link, Paragraph } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './ConfigEndEvent.module.css';
import { ConfigIcon } from '../ConfigContent/ConfigIcon';
import { CustomReceiptContent } from './CustomReceiptContent';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';

export const ConfigEndEvent = () => {
  const { t } = useTranslation();

  return (
    <>
      <StudioSectionHeader
        icon={<ConfigIcon type={BpmnTypeEnum.EndEvent} />}
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
          <Accordion.Content className={classes.accordionContent}>
            <div className={classes.container}>
              <div className={classes.customReceiptText}>
                <StudioLabelAsParagraph size='small' spacing>
                  {t('process_editor.configuration_panel_custom_receipt_default_receipt_heading')}
                </StudioLabelAsParagraph>
                <Paragraph size='small' className={classes.paragraph}>
                  {t('process_editor.configuration_panel_custom_receipt_default_receipt_info')}
                </Paragraph>
                <Link
                  href={altinnDocsUrl({
                    relativeUrl:
                      'altinn-studio/reference/configuration/process/customize/#kvittering-receipt',
                  })}
                  rel='noopener noreferrer'
                  target='_newTab'
                >
                  {t('process_editor.configuration_panel_custom_receipt_default_receipt_link')}
                </Link>
              </div>
              <div>
                <div className={classes.customReceiptText}>
                  <StudioLabelAsParagraph size='small' spacing>
                    {t('process_editor.configuration_panel_custom_receipt_heading')}
                  </StudioLabelAsParagraph>
                  <Paragraph size='small'>
                    {t('process_editor.configuration_panel_custom_receipt_info')}
                  </Paragraph>
                </div>
                <CustomReceiptContent />
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </>
  );
};
