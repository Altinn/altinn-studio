import React from 'react';
import { StudioDetails, StudioSectionHeader, StudioLabelAsParagraph } from '@studio/components';
import { Link, Paragraph } from '@digdir/designsystemet-react';
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
      <StudioDetails>
        <StudioDetails.Summary>
          {t('process_editor.configuration_panel_custom_receipt_accordion_header')}
        </StudioDetails.Summary>
        <StudioDetails.Content className={classes.detailsContent}>
          <div className={classes.container}>
            <div className={classes.customReceiptText}>
              <StudioLabelAsParagraph data-size='sm'>
                {t('process_editor.configuration_panel_custom_receipt_default_receipt_heading')}
              </StudioLabelAsParagraph>
              <Paragraph size='small' className={classes.paragraph}>
                {t('process_editor.configuration_panel_custom_receipt_default_receipt_info')}
              </Paragraph>
              <Link
                href={altinnDocsUrl({
                  relativeUrl:
                    'altinn-studio/v8/reference/configuration/process/customize/#kvittering-receipt',
                })}
                rel='noopener noreferrer'
                target='_newTab'
              >
                {t('process_editor.configuration_panel_custom_receipt_default_receipt_link')}
              </Link>
            </div>
            <div>
              <div className={classes.customReceiptText}>
                <StudioLabelAsParagraph data-size='sm'>
                  {t('process_editor.configuration_panel_custom_receipt_heading')}
                </StudioLabelAsParagraph>
                <Paragraph size='small'>
                  {t('process_editor.configuration_panel_custom_receipt_info')}
                </Paragraph>
              </div>
              <CustomReceiptContent />
            </div>
          </div>
        </StudioDetails.Content>
      </StudioDetails>
    </>
  );
};
