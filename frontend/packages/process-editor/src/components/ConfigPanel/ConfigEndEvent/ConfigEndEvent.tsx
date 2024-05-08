import React from 'react';
import { StudioLabelAsParagraph, StudioSectionHeader } from '@studio/components';
import { Link, Paragraph } from '@digdir/design-system-react';
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
        helpText={{
          // TODO - SKAL HJELPETEXT VÆRE DER?
          text: t('process_editor.configuration_panel_header_help_text_custom_receipt'),
          title: t('process_editor.configuration_panel_header_help_text_title'),
        }}
      />
      {/*<Accordion color='subtle'>
        <Accordion.Item>
          <Accordion.Header>Kvittering</Accordion.Header>
      <Accordion.Content>*/}
      <div className={classes.container}>
        <div className={classes.section}>
          <StudioLabelAsParagraph size='small' spacing>
            Standardkvittering
          </StudioLabelAsParagraph>
          <Paragraph size='small' className={classes.paragraph}>
            Det er automatisk satt opp en standardkvittering i appen.
          </Paragraph>
          <Link
            href='https://docs.altinn.studio/app/development/configuration/process/customize/#receipt'
            rel='noopener noreferrer'
            size='small'
          >
            Les mer om standardkvittering i dokumentasjonen
          </Link>
        </div>
        <div className={classes.section}>
          <StudioLabelAsParagraph size='small' spacing>
            Opprett din egen kvittering
          </StudioLabelAsParagraph>
          <Paragraph size='small'>
            Hvis du heller vil lage din egen kvittering, kan du opprette den her. Kvitteringen du
            lager selv vil overstyre standardkvitteringen.
          </Paragraph>
          <CustomReceiptContent />
        </div>
      </div>
      {/*</Accordion.Content>
        </Accordion.Item>
              </Accordion>*/}
    </>
  );
};
