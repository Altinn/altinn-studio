import React, { useEffect, useRef, useState } from 'react';
import type { MonthCaption } from 'react-day-picker';

import { Button, Dialog } from '@digdir/designsystemet-react';
import { v4 as uuidv4 } from 'uuid';
import type { JSONSchema7 } from 'json-schema';

import { DynamicForm } from 'src/app-components/DynamicForm/DynamicForm';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { DropdownCaption } from 'src/layout/Datepicker/DropdownCaption';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import type { FormDataObject } from 'src/app-components/DynamicForm/DynamicForm';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelReference } from 'src/layout/common.generated';

export function isJSONSchema7Definition(obj: unknown): obj is JSONSchema7 {
  if (typeof obj === 'boolean') {
    return true;
  }

  if (typeof obj === 'object' && obj !== null) {
    const schema = obj as Record<string, unknown>;
    if (
      Object.prototype.hasOwnProperty.call(schema, 'type') ||
      Object.prototype.hasOwnProperty.call(schema, 'properties')
    ) {
      return true;
    }
  }
  return false;
}

interface ModalDynamicFormProps {
  dataModelReference: IDataModelReference;
  onChange: (data: FormDataObject) => void;
  initialData?: FormDataObject; // Added to receive existing item
  locale?: string;
  backdropClose?: boolean;
  onClose?: () => void;
  modalRef?: React.RefObject<HTMLDialogElement | null>;
  DropdownCaption: typeof MonthCaption;
}

export function AddToListModal({
  onChange,
  initialData,
  dataModelReference,
  onClose,
  modalRef,
  DropdownCaption,
}: ModalDynamicFormProps) {
  const appendToList = FD.useAppendToList();
  let addToListModalRef = useRef<HTMLDialogElement | null>(null);
  addToListModalRef = modalRef ?? addToListModalRef;

  const { schemaLookup } = DataModels.useFullStateRef().current;

  const schema = schemaLookup[dataModelReference.dataType].getSchemaForPath(dataModelReference.field)[0];

  const [tempFormData, setTempFormData] = useState<FormDataObject | undefined>(initialData);

  const { langAsString } = useLanguage();

  useEffect(() => {
    if (!initialData) {
      const uuid = uuidv4();
      appendToList({
        reference: dataModelReference,
        newValue: { [ALTINN_ROW_ID]: uuid },
      });
    }
  }, [appendToList, dataModelReference, initialData]);

  const onFormDataUpdate = (updatedData: FormDataObject) => {
    setTempFormData(updatedData);
  };

  if (!schema?.items) {
    return null;
  }
  if (!isJSONSchema7Definition(schema?.items)) {
    return null;
  }
  return (
    <Dialog
      ref={addToListModalRef}
      style={{ padding: 'var(--ds-size-3)' }}
      closedby='any'
      modal={true}
      onClose={onClose}
    >
      <Dialog.Block>
        <DynamicForm
          schema={schema?.items}
          onChange={onFormDataUpdate}
          initialData={tempFormData}
          DropdownCaption={DropdownCaption}
          buttonAriaLabel={langAsString('date_picker.aria_label_icon')}
          calendarIconTitle={langAsString('date_picker.aria_label_icon')}
        />
      </Dialog.Block>
      <Dialog.Block>
        <Button
          data-size='md'
          variant='primary'
          onClick={() => {
            if (tempFormData) {
              onChange(tempFormData);
            }
          }}
        >
          Lagre
        </Button>
      </Dialog.Block>
    </Dialog>
  );
}

export function AddToListComponent({ baseComponentId }: PropsFromGenericComponent<'AddToList'>) {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'AddToList');
  const { formData } = useDataModelBindings(dataModelBindings, 1, 'raw');
  const setMultiLeafValues = FD.useSetMultiLeafValues();

  const modalRef = useRef<HTMLDialogElement>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      {showForm && (
        <AddToListModal
          dataModelReference={dataModelBindings.data}
          modalRef={modalRef}
          onChange={(formProps) => {
            const changes = Object.entries(formProps).map((entry) => ({
              reference: {
                dataType: dataModelBindings.data.dataType,
                field: `${dataModelBindings.data.field}[${(formData.data as []).length - 1}].${entry[0]}`,
              },
              newValue: `${entry[1]}`,
            }));
            setMultiLeafValues({ changes });
            setShowForm(false);
          }}
          backdropClose={true}
          DropdownCaption={DropdownCaption}
        />
      )}

      <Button
        data-size='md'
        variant='primary'
        onClick={() => modalRef.current?.showModal()} // Call onChange when button is clicked
      >
        Legg til
      </Button>
    </div>
  );
}
