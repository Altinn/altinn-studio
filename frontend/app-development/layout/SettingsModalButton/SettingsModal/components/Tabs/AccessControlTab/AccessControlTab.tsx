import type { ReactNode } from 'react';
import React, { useRef } from 'react';
import classes from './AccessControlTab.module.css';
import { Trans, useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import {
  Button,
  Checkbox,
  ErrorMessage,
  HelpText,
  Link,
  Modal,
  Paragraph,
  Table,
} from '@digdir/design-system-react';
import type { PartyTypesAllowed } from 'app-shared/types/ApplicationMetadata';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import { getPartyTypesAllowedOptions } from '../../../utils/tabUtils/accessControlTabUtils';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { TabContent } from '../../TabContent';

enum CheckboxState {
  Checked = 'checked',
  Indeterminate = 'indeterminate',
  Unchecked = 'unchecked',
}
export type AccessControlTabProps = {
  org: string;
  app: string;
};
/**
 * @component
 *    Displays the tab rendering the access control for an app
 *
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const AccessControlTab = ({ org, app }: AccessControlTabProps): ReactNode => {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDialogElement>(null);

  const {
    status: appMetadataStatus,
    data: appMetadata,
    error: appMetadataError,
    refetch: refetchAppMetadata,
  } = useAppMetadataQuery(org, app);

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const handleAllowedPartyTypeChange = (
    newPartyTypes: string[],
    currentPartyTypesAllowed: PartyTypesAllowed,
    checkboxValue: string,
  ) => {
    const updatedPartyTypesAllowed = { ...currentPartyTypesAllowed };
    updatedPartyTypesAllowed[checkboxValue] = !currentPartyTypesAllowed[checkboxValue];

    const updatedCheckboxes = Object.values(updatedPartyTypesAllowed).filter((value) => value);

    if (updatedCheckboxes.length === 0) {
      modalRef.current?.showModal();
      return;
    }

    try {
      updateAppMetadataMutation({
        ...appMetadata,
        partyTypesAllowed: updatedPartyTypesAllowed,
      });
      refetchAppMetadata();
    } catch (error) {
      console.error('Error updating app metadata:', error);
    }
  };

  const isAnyCheckboxChecked = appMetadata
    ? Object.values(appMetadata.partyTypesAllowed).some((value) => value)
    : false;

  const areAllCheckboxesChecked = appMetadata
    ? Object.values(appMetadata.partyTypesAllowed).every((value) => value)
    : false;

  const tableHeaderCheckboxState = isAnyCheckboxChecked
    ? areAllCheckboxesChecked
      ? CheckboxState.Checked
      : CheckboxState.Indeterminate
    : CheckboxState.Unchecked;

  const handleTableHeaderCheckboxChange = () => {
    if (appMetadata) {
      const updatedPartyTypesAllowed = { ...appMetadata.partyTypesAllowed };
      const newValue = !areAllCheckboxesChecked;
      Object.keys(updatedPartyTypesAllowed).forEach((key) => {
        updatedPartyTypesAllowed[key] = newValue;
      });
      try {
        updateAppMetadataMutation({
          ...appMetadata,
          partyTypesAllowed: updatedPartyTypesAllowed,
        });
        refetchAppMetadata();
      } catch (error) {
        console.error('Error updating app metadata:', error);
      }
    }
  };
  const renderModal = () => {
    return (
      <Modal ref={modalRef}>
        <Modal.Content className={classes.modalContent}>
          {t('settings_modal.access_control_tab_option_choose_type_modal_message')}
        </Modal.Content>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => modalRef.current?.close()}>
            {t('general.close')}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };
  const displayContent = () => {
    switch (appMetadataStatus) {
      case 'pending': {
        return <LoadingTabData />;
      }
      case 'error': {
        return (
          <TabDataError>
            {appMetadataError && <ErrorMessage>{appMetadataError.message}</ErrorMessage>}
          </TabDataError>
        );
      }
      case 'success': {
        return (
          <>
            <TabHeader text={t('settings_modal.access_control_tab_checkbox_legend_label')} />
            <Paragraph size='medium'>
              <span>{t('settings_modal.access_control_tab_checkbox_description')}</span>
            </Paragraph>
            <Table className={classes.tableContent}>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell className={classes.header}>
                    <Checkbox
                      aria-label={t('settings_modal.access_control_tab_option_all_types')}
                      indeterminate={tableHeaderCheckboxState === CheckboxState.Indeterminate}
                      checked={tableHeaderCheckboxState === CheckboxState.Checked}
                      onChange={handleTableHeaderCheckboxChange}
                      aria-checked
                      size='small'
                      value='all'
                    />
                  </Table.HeaderCell>
                  <Table.HeaderCell className={classes.header} aria-hidden>
                    {t('settings_modal.access_control_tab_option_all_types')}
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {getPartyTypesAllowedOptions().map((mappedOption, key) => (
                  <Table.Row key={mappedOption.value}>
                    <Table.Cell className={classes.checkboxContent}>
                      <Checkbox
                        key={key}
                        onChange={() =>
                          handleAllowedPartyTypeChange(
                            getPartyTypesAllowedOptions().map((option) => option.value),
                            appMetadata.partyTypesAllowed,
                            mappedOption.value,
                          )
                        }
                        size='small'
                        value={mappedOption.value}
                        checked={appMetadata.partyTypesAllowed[mappedOption.value]}
                      />
                      {renderModal()}
                    </Table.Cell>
                    <Table.Cell>{t(mappedOption.label)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </>
        );
      }
    }
  };
  return (
    <TabContent>
      <div className={classes.tabHeaderContent}>
        <TabHeader text={t('settings_modal.access_control_tab_heading')} />
        <HelpText title={'helptext'} placement='top'>
          {t('settings_modal.access_control_tab_help_text_heading')}
        </HelpText>
      </div>
      {displayContent()}
      <span className={classes.docsLinkText}>
        {t('settings_modal.access_control_tab_option_access_control_docs_link_text')}
      </span>
      <div className={classes.docsLink}>
        <Trans i18nKey={'settings_modal.access_control_tab_option_access_control_docs_link'}>
          <Link>documentation</Link>
        </Trans>
      </div>
    </TabContent>
  );
};
