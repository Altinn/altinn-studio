import type { CodeList } from './types/CodeList';
import type { ReactElement } from 'react';
import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { StudioInputTable } from '../StudioInputTable';
import type { CodeListItem } from './types/CodeListItem';
import { StudioButton } from '../StudioButton';
import {
  removeCodeListItem,
  addEmptyCodeListItem,
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
import { StudioParagraph } from '../StudioParagraph';
import { areThereCodeListErrors, findCodeListErrors, isCodeListValid } from './validation';
import type { ValueErrorMap } from './types/ValueErrorMap';
import { StudioFieldset } from '../StudioFieldset';
import { StudioErrorMessage } from '../StudioErrorMessage';
import type { CodeListType } from './types/CodeListType';

export type StudioCodeListEditorProps = {
  codeList: CodeList;
  codeListType: CodeListType;
  onChange: (codeList: CodeList) => void;
  onInvalid?: () => void;
  texts: CodeListEditorTexts;
};

export function StudioCodeListEditor({
  codeList,
  codeListType,
  onChange,
  onInvalid = () => {},
  texts,
}: StudioCodeListEditorProps): ReactElement {
  return (
    <StudioCodeListEditorContext.Provider value={{ codeListType, texts }}>
      <StatefulCodeListEditor
        codeList={codeList}
        codeListType={codeListType}
        onChange={onChange}
        onInvalid={onInvalid}
      />
    </StudioCodeListEditorContext.Provider>
  );
}

type StatefulCodeListEditorProps = Omit<StudioCodeListEditorProps, 'texts'>;

function StatefulCodeListEditor({
  codeList: defaultCodeList,
  codeListType,
  onChange,
  onInvalid,
}: StatefulCodeListEditorProps): ReactElement {
  const [codeList, setCodeList] = useState<CodeList>(defaultCodeList);

  useEffect(() => {
    setCodeList(defaultCodeList);
  }, [defaultCodeList]);

  const handleChange = useCallback(
    (newCodeList: CodeList) => {
      setCodeList(newCodeList);
      isCodeListValid(newCodeList, codeListType) ? onChange(newCodeList) : onInvalid?.();
    },
    [onChange, onInvalid],
  );

  return (
    <ControlledCodeListEditor
      codeList={codeList}
      codeListType={codeListType}
      onChange={handleChange}
    />
  );
}

type InternalCodeListEditorProps = Omit<StatefulCodeListEditorProps, 'onInvalid'>;

function ControlledCodeListEditor({
  codeList,
  codeListType,
  onChange,
}: InternalCodeListEditorProps): ReactElement {
  const { texts } = useStudioCodeListEditorContext();
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);

  const errorMap = useMemo<ValueErrorMap>(
    () => findCodeListErrors(codeList, codeListType),
    [codeList, codeListType],
  );

  const handleAddButtonClick = useCallback(() => {
    const updatedCodeList = addEmptyCodeListItem(codeList);
    onChange(updatedCodeList);
  }, [codeList, onChange, codeListType]);

  return (
    <StudioFieldset legend={texts.codeList} className={classes.codeListEditor} ref={fieldsetRef}>
      <CodeListTable
        codeList={codeList}
        codeListType={codeListType}
        errorMap={errorMap}
        onChange={onChange}
      />
      <AddButton onClick={handleAddButtonClick} />
      <Errors errorMap={errorMap} />
    </StudioFieldset>
  );
}
type InternalCodeListEditorWithErrorsProps = InternalCodeListEditorProps & ErrorsProps;

function CodeListTable(props: InternalCodeListEditorWithErrorsProps): ReactElement {
  return isCodeListEmpty(props.codeList) ? (
    <EmptyCodeListTable />
  ) : (
    <CodeListTableWithContent {...props} />
  );
}

function EmptyCodeListTable(): ReactElement {
  const { texts } = useStudioCodeListEditorContext();
  return <StudioParagraph size='small'>{texts.emptyCodeList}</StudioParagraph>;
}

function CodeListTableWithContent(props: InternalCodeListEditorWithErrorsProps): ReactElement {
  return (
    <StudioInputTable>
      <TableHeadings />
      <TableBody {...props} />
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
  onChange,
  errorMap,
}: InternalCodeListEditorWithErrorsProps): ReactElement {
  const handleDeleteButtonClick = useCallback(
    (index: number) => {
      const updatedCodeList = removeCodeListItem(codeList, index);
      onChange(updatedCodeList);
    },
    [codeList, onChange],
  );

  const handleBlur = useCallback(
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
          onBlur={(newItem) => handleBlur(index, newItem)}
          onDeleteButtonClick={() => handleDeleteButtonClick(index)}
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

type AddButtonProps = {
  onClick: () => void;
};

function AddButton({ onClick }: AddButtonProps): ReactElement {
  const { texts } = useStudioCodeListEditorContext();
  return (
    <StudioButton onClick={onClick} variant='secondary' icon={<PlusIcon />}>
      {texts.add}
    </StudioButton>
  );
}
