import React, { createRef } from 'react';
import { ErrorMessage } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import { useOptionListIdsQuery } from '../../../../../../../hooks/queries/useOptionListIdsQuery';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioModal, StudioSpinner } from '@studio/components-legacy';
import { BookIcon } from 'libs/studio-icons/src';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { handleOptionsChange, updateComponentOptionsId } from '../../utils/optionsUtils';
import classes from './OptionListSelector.module.css';

type OptionListSelectorProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function OptionListSelector({
  component,
  handleComponentChange,
}: OptionListSelectorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds, status, error } = useOptionListIdsQuery(org, app);

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
          optionListIds={optionListIds}
          component={component}
          handleComponentChange={handleComponentChange}
        />
      );
  }
}

type OptionListSelectorWithDataProps = {
  optionListIds: string[];
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

function OptionListSelectorWithData({
  component,
  handleComponentChange,
  optionListIds,
}: OptionListSelectorWithDataProps): React.ReactNode {
  const { t } = useTranslation();
  const modalRef = createRef<HTMLDialogElement>();

  const handleClick = () => {
    modalRef.current?.showModal();
  };

  if (!optionListIds.length) return null;
  return (
    <>
      <StudioButton onClick={handleClick} variant={'secondary'}>
        {t('ux_editor.modal_properties_code_list')}
      </StudioButton>
      <StudioModal.Dialog
        ref={modalRef}
        className={classes.modal}
        contentClassName={classes.modalContent}
        closeButtonTitle={t('general.close')}
        heading={t('ux_editor.options.modal_header_select_library_code_list')}
        icon={<BookIcon />}
      >
        <ModalContent
          optionListIds={optionListIds}
          component={component}
          handleComponentChange={handleComponentChange}
        />
      </StudioModal.Dialog>
    </>
  );
}

type ModalContentProps = OptionListSelectorWithDataProps;

function ModalContent({
  optionListIds,
  component,
  handleComponentChange,
}: ModalContentProps): React.ReactNode {
  const handleClick = (optionsId: string) => {
    const updatedComponent = updateComponentOptionsId(component, optionsId);
    handleOptionsChange(updatedComponent, handleComponentChange);
  };

  return (
    <>
      {optionListIds.map((optionsId: string) => (
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
