import dot from 'dot-object';
import { v4 as uuidv4 } from 'uuid';

import { FD } from 'src/features/formData/FormDataWrite';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import type { IDataModelBindingsForGroupCheckbox } from 'src/layout/Checkboxes/config.generated';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { IDataModelBindingsForList } from 'src/layout/List/config.generated';
import type { IDataModelBindingsForGroupMultiselect } from 'src/layout/MultipleSelect/config.generated';

type Row = Record<string, unknown>;

interface Bindings {
  group?: IDataModelReference;
  checked?: IDataModelReference;
  values: Record<string, IDataModelReference>;
}

export function toRelativePath(group: IDataModelReference | undefined, binding: IDataModelReference | undefined) {
  if (group && binding && binding.field.startsWith(`${group.field}.`)) {
    return binding.field.substring(group.field.length + 1);
  }
  return undefined;
}

function isEqual({ group, values }: Bindings, source: Row, formDataRow: Row) {
  for (const key in values) {
    const path = toRelativePath(group, values[key]);

    if (path && source[key] != dot.pick(path, formDataRow)) {
      return false;
    }
  }

  return true;
}

function findRowInFormData(
  bindings: Bindings,
  row: Row,
  formData: Row[] | undefined,
): [number | undefined, Row | undefined] {
  for (const [index, formDataRow] of formData?.entries() ?? []) {
    if (isEqual(bindings, row, formDataRow)) {
      return [index, formDataRow];
    }
  }

  return [undefined, undefined];
}

function useSaveToGroup(bindings: Bindings) {
  const { group, checked, values } = bindings;
  const formDataSelector = FD.useCurrentSelector();
  const setLeafValue = FD.useSetLeafValue();
  const appendToList = FD.useAppendToList();
  const removeFromList = FD.useRemoveFromListCallback();
  const checkedPath = toRelativePath(group, checked);

  function toggle(row: Row): void {
    if (!group) {
      return;
    }

    const formData = formDataSelector(group) as Row[] | undefined;
    const [index, formDataRow] = findRowInFormData(bindings, row, formData);
    const isChecked = !!(checkedPath ? dot.pick(checkedPath, formDataRow) : index !== undefined && index !== -1);

    if (isChecked) {
      if (checked && checkedPath) {
        const field = `${group.field}[${index}].${checkedPath}`;
        setLeafValue({ reference: { ...checked, field }, newValue: false });
      } else if (index !== undefined) {
        removeFromList({
          reference: group,
          startAtIndex: index,
          callback: (compare) => compare[ALTINN_ROW_ID] === formDataRow?.[ALTINN_ROW_ID],
        });
      }
    } else {
      if (checked && checkedPath && index !== undefined) {
        const field = `${group.field}[${index}].${checkedPath}`;
        setLeafValue({ reference: { ...checked, field }, newValue: true });
      } else {
        const uuid = uuidv4();
        const newRow: Row = { [ALTINN_ROW_ID]: uuid };
        if (checkedPath) {
          dot.str(checkedPath, true, newRow);
        }
        for (const key in values) {
          const path = toRelativePath(group, values[key]);
          if (path) {
            dot.str(path, row[key], newRow);
          }
        }
        appendToList({ reference: group, newValue: newRow });
      }
    }
  }

  return { toggle, checkedPath, enabled: !!group };
}

/**
 * Hook used to store List-component objects (rows from the DataList API) to a repeating group
 * structure in the data model (aka object[])
 */
export function useSaveObjectToGroup(listBindings: IDataModelBindingsForList) {
  const values: Record<string, IDataModelReference> = {};
  for (const key in listBindings) {
    const binding = listBindings[key];
    if (key !== 'group' && key !== 'checked' && binding) {
      values[key] = binding;
    }
  }
  const bindings: Bindings = { group: listBindings.group, checked: listBindings.checked, values };
  const formDataSelector = FD.useCurrentSelector();
  const { enabled, toggle, checkedPath } = useSaveToGroup(bindings);

  function isChecked(row: Row): boolean {
    if (!enabled || !bindings.group) {
      return false;
    }
    const formData = formDataSelector(bindings.group) as Row[] | undefined;
    if (!formData) {
      return false;
    }
    const [index, formDataRow] = findRowInFormData(bindings, row, formData);
    if (checkedPath) {
      return !!(formDataRow && dot.pick(checkedPath, formDataRow));
    }
    return index !== undefined && index !== -1;
  }

  return { toggle, isChecked, enabled };
}

/**
 * Hook used to store simple values to a repeating group structure in the data model (aka. object[])
 */
export function useSaveValueToGroup(
  bindings: IDataModelBindingsForGroupCheckbox | IDataModelBindingsForGroupMultiselect,
) {
  const { enabled, toggle, checkedPath } = useSaveToGroup({
    group: bindings.group,
    checked: bindings.checked,
    values: bindings.simpleBinding ? { value: bindings.simpleBinding } : {},
  });
  const valuePath = toRelativePath(bindings.group, bindings.simpleBinding);

  const formData = FD.useFreshBindings(bindings.group ? { group: bindings.group } : {}, 'raw').group as
    | Row[]
    | undefined;

  const selectedValues =
    valuePath && enabled && formData
      ? formData
          .filter((row) => (checkedPath ? dot.pick(checkedPath, row) : true))
          .map((row) => `${dot.pick(valuePath, row)}`)
      : [];

  function toggleValue(value: string) {
    enabled && toggle({ value });
  }

  function setCheckedValues(values: string[]) {
    if (!enabled) {
      return;
    }

    const valuesToSet = values.filter((value) => !selectedValues.includes(value));
    const valuesToRemove = selectedValues.filter((value) => !values.includes(value));
    const valuesToToggle = [...valuesToSet, ...valuesToRemove];

    for (const value of valuesToToggle) {
      toggle({ value });
    }
  }

  return { selectedValues, toggleValue, setCheckedValues, enabled };
}
