import type { CodeList } from './types/CodeList';
import type { ReactElement } from 'react';
import React, { useState, useId, useMemo, useRef, useCallback } from 'react';
import { StudioInputTable } from '../StudioInputTable';
import type { CodeListItem } from './types/CodeListItem';
import { StudioButton } from '../StudioButton';
import {
  removeCodeListItem,
  addNewCodeListItem,
  changeCodeListItem,
  isCodeListEmpty,
} from './utils';
import { StudioCodeListEditorRow } from './StudioCodeListEditorRow/StudioCodeListEditorRow';
import type { CodeListEditorTexts } from './types/CodeListEditorTexts';
import {
  StudioCodeListEditorContext,
  useStudioCodeListEditorContext,
} from './StudioCodeListEditorContext';
import classes from './StudioCodeListEditor.module.css';
import { PlusIcon } from '@studio/icons';
import { areThereCodeListErrors, findCodeListErrors, isCodeListValid } from './validation';
import type { ValueErrorMap } from './types/ValueErrorMap';
import { StudioFieldset } from '../StudioFieldset';
import { StudioErrorMessage } from '../StudioErrorMessage';
import type { TextResource } from '../../types/TextResource';
import { usePropState } from '@studio/hooks';
import type { Override } from '../../types/Override';
import type { StudioInputTableProps } from '../StudioInputTable/StudioInputTable';
import { StudioLabelAsParagraph } from '../StudioLabelAsParagraph';
import { StudioNativeSelect } from '../StudioNativeSelect';
import type { CodeListItemValueLiteral } from './types/CodeListItemValue';

export type StudioCodeListEditorProps = {
  codeList: CodeList;
  onAddOrDeleteItem?: (codeList: CodeList) => void;
  onBlurAny?: (codeList: CodeList) => void;
  onChange?: (codeList: CodeList) => void;
  onChangeTextResource?: (textResource: TextResource) => void;
  onInvalid?: () => void;
  textResources?: TextResource[];
  texts: CodeListEditorTexts;
};

export function StudioCodeListEditor({ texts, ...rest }: StudioCodeListEditorProps): ReactElement {
  return (
    <StudioCodeListEditorContext.Provider value={{ texts }}>
      <StatefulCodeListEditor {...rest} />
    </StudioCodeListEditorContext.Provider>
  );
}

type StatefulCodeListEditorProps = Omit<StudioCodeListEditorProps, 'texts'>;

function StatefulCodeListEditor({
  codeList: defaultCodeList,
  onAddOrDeleteItem,
  onBlurAny,
  onChange,
  onChangeTextResource,
  onInvalid,
  textResources,
}: StatefulCodeListEditorProps): ReactElement {
  const [codeList, setCodeList] = usePropState<CodeList>(defaultCodeList);

  const handleAddOrDeleteAny = useCallback(
    (newCodeList: CodeList) => {
      isCodeListValid(newCodeList) && onAddOrDeleteItem?.(newCodeList);
    },
    [onAddOrDeleteItem],
  );

  const handleBlurAny = useCallback(() => {
    isCodeListValid(codeList) && onBlurAny?.(codeList);
  }, [onBlurAny, codeList]);

  const handleChange = useCallback(
    (newCodeList: CodeList) => {
      setCodeList(newCodeList);
      isCodeListValid(newCodeList) ? onChange?.(newCodeList) : onInvalid?.();
    },
    [onChange, onInvalid, setCodeList],
  );

  return (
    <ControlledCodeListEditor
      codeList={codeList}
      onAddOrDeleteItem={handleAddOrDeleteAny}
      onBlurAny={handleBlurAny}
      onChange={handleChange}
      onChangeTextResource={onChangeTextResource}
      textResources={textResources}
    />
  );
}

type ControlledCodeListEditorProps = Override<
  Pick<StudioInputTableProps, 'onBlurAny'>,
  Omit<StatefulCodeListEditorProps, 'onInvalid'>
>;

function ControlledCodeListEditor({
  codeList,
  onAddOrDeleteItem,
  onBlurAny,
  onChange,
  onChangeTextResource,
  textResources,
}: ControlledCodeListEditorProps): ReactElement {
  const { texts } = useStudioCodeListEditorContext();
  const [valueType, setValueType] = useState<CodeListItemValueLiteral>('string');
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);

  const errorMap = useMemo<ValueErrorMap>(() => findCodeListErrors(codeList), [codeList]);
  const isFirstItem = !codeList || isCodeListEmpty(codeList);

  const handleAddButtonClick = useCallback(() => {
    const updatedCodeList = isFirstItem
      ? addNewCodeListItem(codeList, valueType)
      : addNewCodeListItem(codeList);
    onChange(updatedCodeList);
    onAddOrDeleteItem?.(updatedCodeList);
  }, [isFirstItem, codeList, valueType, onChange, onAddOrDeleteItem]);

  return (
    <StudioFieldset legend={texts.codeList} className={classes.codeListEditor} ref={fieldsetRef}>
      {isFirstItem ? (
        <TypeSelector setValueType={setValueType} />
      ) : (
        <CodeListTable
          codeList={codeList}
          errorMap={errorMap}
          onAddOrDeleteItem={onAddOrDeleteItem}
          onBlurAny={onBlurAny}
          onChange={onChange}
          onChangeTextResource={onChangeTextResource}
          textResources={textResources}
        />
      )}
      <AddButton onClick={handleAddButtonClick} />
      <Errors errorMap={errorMap} />
    </StudioFieldset>
  );
}

type CodeListTableProps = ControlledCodeListEditorProps & ErrorsProps;

function CodeListTable({ onBlurAny, ...rest }: CodeListTableProps): ReactElement {
  return (
    <StudioInputTable onBlurAny={onBlurAny}>
      <TableHeadings />
      <TableBody {...rest} />
    </StudioInputTable>
  );
}

function TableHeadings(): ReactElement {
  const { texts } = useStudioCodeListEditorContext();

  return (
    <StudioInputTable.Head>
      <StudioInputTable.Row>
        <StudioInputTable.HeaderCell>{texts.value}</StudioInputTable.HeaderCell>
        <StudioInputTable.HeaderCell>{texts.label}</StudioInputTable.HeaderCell>
        <StudioInputTable.HeaderCell>{texts.description}</StudioInputTable.HeaderCell>
        <StudioInputTable.HeaderCell>{texts.helpText}</StudioInputTable.HeaderCell>
        <StudioInputTable.HeaderCell>{texts.delete}</StudioInputTable.HeaderCell>
      </StudioInputTable.Row>
    </StudioInputTable.Head>
  );
}

function TableBody({
  codeList,
  onAddOrDeleteItem,
  onChange,
  onChangeTextResource,
  errorMap,
  textResources,
}: CodeListTableProps): ReactElement {
  const handleDeleteButtonClick = useCallback(
    (index: number) => {
      const updatedCodeList = removeCodeListItem(codeList, index);
      onChange(updatedCodeList);
      onAddOrDeleteItem?.(updatedCodeList);
    },
    [codeList, onChange, onAddOrDeleteItem],
  );

  const handleChange = useCallback(
    (index: number, newItem: CodeListItem) => {
      const updatedCodeList = changeCodeListItem(codeList, index, newItem);
      onChange(updatedCodeList);
    },
    [codeList, onChange],
  );

  return (
    <StudioInputTable.Body>
      {codeList.map((item, index) => (
        <StudioCodeListEditorRow
          error={errorMap[index]}
          item={item}
          key={index}
          number={index + 1}
          onChange={(newItem) => handleChange(index, newItem)}
          onChangeTextResource={onChangeTextResource}
          onDeleteButtonClick={() => handleDeleteButtonClick(index)}
          textResources={textResources}
        />
      ))}
    </StudioInputTable.Body>
  );
}

type ErrorsProps = {
  errorMap: ValueErrorMap;
};

function Errors({ errorMap }: ErrorsProps): ReactElement {
  const {
    texts: { generalError },
  } = useStudioCodeListEditorContext();
  if (areThereCodeListErrors(errorMap)) {
    return <StudioErrorMessage>{generalError}</StudioErrorMessage>;
  } else {
    return null;
  }
}

type TypeSelectorProps = {
  setValueType: (valueType: CodeListItemValueLiteral) => void;
};

function TypeSelector({ setValueType }: TypeSelectorProps): ReactElement {
  // const { texts } = useStudioCodeListEditorContext();
  const id = useId();

  return (
    <>
      <StudioLabelAsParagraph size='sm' htmlFor={id}>
        Velg hvilken type verdiene i kodelisten skal ha:
      </StudioLabelAsParagraph>
      <StudioNativeSelect
        name={id}
        onChange={(event) => setValueType(event.target.value as 'string' | 'number' | 'boolean')}
      >
        <option value='string'>Tekst (anbefalt)</option>
        <option value='number'>Tall</option>
        <option value='boolean'>Boolsk</option>
      </StudioNativeSelect>
    </>
  );
}

type AddButtonProps = {
  onClick: (valueType?: CodeListItemValueLiteral) => void;
};

function AddButton({ onClick }: AddButtonProps): ReactElement {
  const { texts } = useStudioCodeListEditorContext();
  return (
    <StudioButton onClick={onClick} variant='secondary' icon={<PlusIcon />}>
      {texts.add}
    </StudioButton>
  );
}
