import type { ReactNode } from 'react';
import React, { useRef, useState } from 'react';
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
import {
  getPartyTypesAllowedOptions,
  initialPartyTypes,
} from '../../../utils/tabUtils/accessControlTabUtils';
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
  const [checkedCheckboxes, setCheckedCheckboxes] = useState<string[]>([]);
  const modalRef = useRef<HTMLDialogElement>(null);

  const {
    status: appMetadataStatus,
    data: appMetadata,
    error: appMetadataError,
  } = useAppMetadataQuery(org, app);

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const handleChange = (
    newPartyTypes: string[],
    currentPartyTypesAllowed: PartyTypesAllowed,
    value: string,
  ) => {
    const updatedCheckboxes = checkedCheckboxes.includes(value)
      ? checkedCheckboxes.filter((checkbox) => checkbox !== value)
      : [...checkedCheckboxes, value];
    if (updatedCheckboxes.length === 0 && checkedCheckboxes.length === 1) {
      modalRef.current?.showModal();
      return;
    }
    setCheckedCheckboxes(updatedCheckboxes);

    const newPartyTypesAllowed = { ...currentPartyTypesAllowed };

    Object.keys(currentPartyTypesAllowed).forEach((key) => {
      newPartyTypesAllowed[key] = newPartyTypes.includes(key);
    });
    updateAppMetadataMutation({ ...appMetadata, partyTypesAllowed: newPartyTypesAllowed });
  };

  const isAnyCheckboxChecked = checkedCheckboxes.length > 0;

  const areAllCheckboxesChecked = checkedCheckboxes.length === getPartyTypesAllowedOptions().length;

  const tableHeaderCheckboxState = isAnyCheckboxChecked
    ? areAllCheckboxesChecked
      ? CheckboxState.Checked
      : CheckboxState.Indeterminate
    : CheckboxState.Unchecked;

  const handleTableHeaderCheckboxChange = () => {
    if (tableHeaderCheckboxState === CheckboxState.Checked) {
      setCheckedCheckboxes([]);
    } else {
      const updatedCheckboxes = getPartyTypesAllowedOptions().map((option) => option.value);
      setCheckedCheckboxes(updatedCheckboxes);
    }
  };
  const renderModal = () => {
    return (
      <Modal ref={modalRef}>
        <Modal.Header />
        <Modal.Content>
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
        const currentPartyTypesAllowed = appMetadata?.partyTypesAllowed ?? initialPartyTypes;

        return (
          <>
            <TabHeader
              text={t('settings_modal.access_control_tab_checkbox_legend_label')}
            ></TabHeader>
            <Paragraph size='medium'>
              <span>{t('settings_modal.access_control_tab_checkbox_description')}</span>
            </Paragraph>

            <Table className={classes.tableContent}>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell className={classes.header}>
                    <Checkbox
                      indeterminate={tableHeaderCheckboxState === CheckboxState.Indeterminate}
                      checked={tableHeaderCheckboxState === CheckboxState.Checked}
                      onChange={handleTableHeaderCheckboxChange}
                      size='small'
                      value='all'
                    />
                  </Table.HeaderCell>
                  <Table.HeaderCell className={classes.header}>
                    {t('settings_modal.access_control_tab_option_all_type_partner')}
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Head>

              <Table.Body>
                {getPartyTypesAllowedOptions().map((option, key) => (
                  <Table.Row key={option.value}>
                    <Table.Cell className={classes.checkboxContent}>
                      <Checkbox
                        key={key}
                        onChange={() =>
                          handleChange(checkedCheckboxes, currentPartyTypesAllowed, option.value)
                        }
                        size='small'
                        value={option.value}
                        checked={checkedCheckboxes.includes(option.value)}
                      />
                      {renderModal()}
                    </Table.Cell>
                    <Table.Cell>{t(option.label)}</Table.Cell>
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
        <HelpText title={'helptext'}>
          {t('settings_modal.access_control_tab_help_text_heading')}
        </HelpText>
      </div>
      {displayContent()}
      <span className={classes.docsLinkText}>
        {t('settings_modal.access_control_tab_option_access_control_docs_link_text')}
      </span>
      <div className={classes.docsLink}>
        <Trans i18nKey={'settings_modal.access_control_tab_option_access_control_docs_link'}>
          <Link>documantation</Link>
        </Trans>
      </div>
    </TabContent>
  );
};
