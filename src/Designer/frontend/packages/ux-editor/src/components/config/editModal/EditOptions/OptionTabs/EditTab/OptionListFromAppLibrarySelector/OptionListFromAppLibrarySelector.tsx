import React, { createRef } from 'react';
import { ErrorMessage } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import { useOptionListIdsQuery } from '../../../../../../../hooks/queries/useOptionListIdsQuery';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components-legacy';
import { StudioButton, StudioDialog, StudioHeading } from '@studio/components';
import { BookIcon } from '@studio/icons';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { handleOptionsChange, updateComponentOptionsId } from '../../utils/optionsUtils';
import classes from './OptionListFromAppLibrarySelector.module.css';

type OptionListSelectorProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function OptionListFromAppLibrarySelector({
  component,
  handleComponentChange,
}: OptionListSelectorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIdsFromLibrary, status, error } = useOptionListIdsQuery(org, app);

  switch (status) {
    case 'pending':
      return (
        <StudioSpinner
          showSpinnerTitle={false}
          spinnerTitle={t('ux_editor.modal_properties_loading')}
        />
      );
    case 'error':
      return (
        <ErrorMessage>
          {error instanceof Error
            ? error.message
            : t('ux_editor.modal_properties_fetch_option_list_ids_error_message')}
        </ErrorMessage>
      );
    case 'success':
      return (
        <OptionListSelectorWithData
          optionListIdsFromLibrary={optionListIdsFromLibrary}
          component={component}
          handleComponentChange={handleComponentChange}
        />
      );
  }
}

type OptionListSelectorWithDataProps = {
  optionListIdsFromLibrary: string[];
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

function OptionListSelectorWithData({
  component,
  handleComponentChange,
  optionListIdsFromLibrary,
}: OptionListSelectorWithDataProps): React.ReactNode {
  const { t } = useTranslation();
  const modalRef = createRef<HTMLDialogElement>();

  const handleClick = () => {
    modalRef.current?.showModal();
  };

  if (!optionListIdsFromLibrary.length) return null;
  return (
    <>
      <StudioButton onClick={handleClick} variant={'secondary'}>
        {t('ux_editor.modal_properties_code_list')}
      </StudioButton>
      <StudioDialog ref={modalRef} className={classes.modal} closedby='any'>
        <StudioDialog.Block>
          <div className={classes.headingWithIcon}>
            <BookIcon />
            <StudioHeading level={2}>
              {t('ux_editor.options.modal_header_select_library_code_list')}
            </StudioHeading>
          </div>
        </StudioDialog.Block>
        <StudioDialog.Block className={classes.modalContent}>
          <ModalContent
            optionListIdsFromLibrary={optionListIdsFromLibrary}
            component={component}
            handleComponentChange={handleComponentChange}
            modalRef={modalRef}
          />
        </StudioDialog.Block>
      </StudioDialog>
    </>
  );
}

type ModalContentProps = OptionListSelectorWithDataProps & {
  modalRef: React.RefObject<HTMLDialogElement>;
};

function ModalContent({
  optionListIdsFromLibrary,
  component,
  handleComponentChange,
  modalRef,
}: ModalContentProps): React.ReactNode {
  const handleClick = (optionsId: string) => {
    const updatedComponent = updateComponentOptionsId(component, optionsId);
    handleOptionsChange(updatedComponent, handleComponentChange);
    modalRef.current?.close();
  };

  return (
    <>
      {optionListIdsFromLibrary.map((optionsId: string) => (
        <StudioButton
          key={optionsId}
          className={classes.codeListButton}
          variant='secondary'
          onClick={() => handleClick(optionsId)}
        >
          {optionsId}
        </StudioButton>
      ))}
    </>
  );
}
