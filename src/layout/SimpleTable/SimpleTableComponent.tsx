import React, { useState } from 'react';

import { Link } from '@digdir/designsystemet-react';
import { Delete as DeleteIcon, Edit as EditIcon } from '@navikt/ds-icons';
import { pick } from 'dot-object';

import { FieldRenderer } from 'src/app-components/DynamicForm/DynamicForm';
import { AppTable } from 'src/app-components/Table/Table';
import { Caption } from 'src/components/form/caption/Caption';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import { AddToListModal } from 'src/layout/AddToList/AddToList';
import { DropdownCaption } from 'src/layout/Datepicker/DropdownCaption';
import { isFormDataObjectArray, isValidItemsSchema } from 'src/layout/SimpleTable/typeguards';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { FormDataObject } from 'src/app-components/DynamicForm/DynamicForm';
import type { TableActionButton } from 'src/app-components/Table/Table';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IDataModelBindingsForTable } from 'src/layout/SimpleTable/config.generated';

interface TableComponentProps extends PropsFromGenericComponent<'SimpleTable'> {
  dataModelBindings: IDataModelBindingsForTable;
}

export function SimpleTableComponent({ node, dataModelBindings }: TableComponentProps) {
  const item = useNodeItem(node);
  const { formData } = useDataModelBindings(dataModelBindings, 1, 'raw');
  const removeFromList = FD.useRemoveFromListCallback();
  const { title, description, help } = item.textResourceBindings ?? {};
  const { elementAsString } = useLanguage();
  const accessibleTitle = elementAsString(title);
  const isMobile = useIsMobile();
  const data = formData.tableData;
  const { schemaLookup } = DataModels.useFullStateRef().current;
  const [showEdit, setShowEdit] = useState(false);
  const [editItemIndex, setEditItemIndex] = useState<number>(-1);
  const setMultiLeafValues = FD.useSetMultiLeafValues();
  const languageLocale = useCurrentLanguage();
  const { langAsString } = useLanguage();

  const schema = schemaLookup[dataModelBindings.tableData.dataType].getSchemaForPath(
    dataModelBindings.tableData.field,
  )[0];

  const actionButtons: TableActionButton[] = [];

  if (item.enableDelete) {
    actionButtons.push({
      onClick: (idx) => {
        removeFromList({
          startAtIndex: idx,
          reference: {
            dataType: dataModelBindings.tableData.dataType,
            field: dataModelBindings.tableData.field,
          },
          callback: (_) => true,
        });
      },
      buttonText: <Lang id='general.delete' />,
      icon: <DeleteIcon />,
      color: 'danger',
    });
  }

  if (item.enableEdit) {
    actionButtons.push({
      onClick: (idx, _) => {
        setEditItemIndex(idx);
        setShowEdit(true);
      },
      buttonText: <Lang id='general.edit' />,
      icon: <EditIcon />,
      variant: 'tertiary',
      color: 'second',
    });
  }

  function handleChange(formProps, itemIndex: number) {
    if (!isFormDataObjectArray(formData.tableData)) {
      return;
    }

    const existingData = formData.tableData as FormDataObject[];

    const changes = Object.entries(formProps)
      .filter(([key, value]) => {
        const originalValue = existingData[itemIndex]?.[key];
        return originalValue !== value;
      })
      .map(([key, value]) => ({
        reference: {
          dataType: dataModelBindings.tableData.dataType,
          field: `${dataModelBindings.tableData.field}[${itemIndex}].${key}`,
        },
        newValue: `${value}`,
      }));

    if (changes.length > 0) {
      setMultiLeafValues({ changes });
    }
  }

  if (!Array.isArray(data)) {
    return null;
  }

  if (data.length < 1) {
    return null;
  }

  if (!isValidItemsSchema(schema?.items)) {
    return null;
  }

  const itemSchema = schema.items;

  return (
    <>
      {showEdit && editItemIndex > -1 && formData.tableData && formData.tableData[editItemIndex] && (
        <AddToListModal
          dataModelReference={dataModelBindings.tableData}
          initialData={formData.tableData[editItemIndex]}
          onChange={(formProps) => {
            handleChange(formProps, editItemIndex);
            setEditItemIndex(-1);
            setShowEdit(false);
          }}
          onInteractOutside={() => {
            setShowEdit(false);
          }}
          DropdownCaption={DropdownCaption}
        />
      )}

      <AppTable
        zebra={item.zebra}
        size={item.size}
        schema={schema}
        mobile={isMobile}
        actionButtons={actionButtons}
        actionButtonHeader={<Lang id='general.action' />}
        caption={
          title && (
            <Caption
              title={<Lang id={title} />}
              description={description && <Lang id={description} />}
              helpText={help ? { text: <Lang id={help} />, accessibleTitle } : undefined}
            />
          )
        }
        data={data}
        stickyHeader={true}
        columns={item.columns.map((config) => {
          const { component } = config;
          const header = <Lang id={config.header} />;
          let renderCell;
          if (component) {
            renderCell = (_, __, rowIndex) => {
              const rowData = data[rowIndex];
              if (component.type === 'link') {
                const href = pick(component.hrefPath, rowData);
                const text = pick(component.textPath, rowData);
                return <Link href={href}>{text}</Link>;
              }

              return (
                <FieldRenderer
                  locale={languageLocale}
                  rowIndex={rowIndex}
                  fieldKey={config.accessors[0]}
                  fieldSchema={itemSchema.properties[config.accessors[0]]}
                  formData={data[rowIndex]}
                  component={{
                    ...component,
                    options:
                      component.type === 'radio'
                        ? component.options?.map((option) => ({
                            ...option,
                            label: langAsString(option.label),
                          }))
                        : undefined,
                  }}
                  handleChange={(fieldName, value) => {
                    const valueToUpdate = data.find((_, idx) => idx === rowIndex);
                    const nextValue = { ...valueToUpdate, [`${fieldName}`]: value };
                    handleChange(nextValue, rowIndex);
                  }}
                  schema={schema}
                  DropdownCaption={DropdownCaption}
                  buttonAriaLabel={langAsString('date_picker.aria_label_icon')}
                  calendarIconTitle={langAsString('date_picker.aria_label_icon')}
                />
              );
            };
          }

          return {
            ...config,
            header,
            renderCell,
          };
        })}
      />
    </>
  );
}
