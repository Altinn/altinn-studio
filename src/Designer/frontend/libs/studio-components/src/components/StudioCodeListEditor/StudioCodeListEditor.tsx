import type { CodeList } from './types/CodeList';
import React, { useMemo, useRef, useCallback } from 'react';
import type { ReactElement, ReactNode } from 'react';
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
  StudioCodeListEditorContextProvider,
  useStudioCodeListEditorContext,
} from './StudioCodeListEditorContext';
import { PlusIcon } from '@studio/icons';
import { areThereCodeListErrors, findCodeListErrors, isCodeListValid } from './validation';
import type { ValueErrorMap } from './types/ValueErrorMap';
import { StudioFieldset } from '../StudioFieldset';
import { usePropState } from '@studio/hooks';
import { StudioParagraph } from '../StudioParagraph';
import classes from './StudioCodeListEditor.module.css';
import { StudioValidationMessage } from '../StudioValidationMessage';
import cn from 'classnames';

export type StudioCodeListEditorProps = {
  className?: string;
  codeList: CodeList;
  language: string;
  onInvalid?: () => void;
  onUpdateCodeList: (codeList: CodeList) => void;
  texts: CodeListEditorTexts;
};

export function StudioCodeListEditor({
  language,
  texts,
  ...rest
}: StudioCodeListEditorProps): ReactElement {
  return (
    <StudioCodeListEditorContextProvider value={{ language, texts }}>
      <StatefulCodeListEditor {...rest} />
    </StudioCodeListEditorContextProvider>
  );
}

type StatefulCodeListEditorProps = Omit<StudioCodeListEditorProps, 'language' | 'texts'>;

function StatefulCodeListEditor({
  className,
  codeList: givenCodeList,
  onInvalid,
  onUpdateCodeList,
}: StatefulCodeListEditorProps): ReactElement {
  const [codeList, setCodeList] = usePropState<CodeList>(givenCodeList);

  const handleChangeCodeList = useCallback(
    (newCodeList: CodeList) => {
      setCodeList(newCodeList);
      if (isCodeListValid(newCodeList)) {
        onUpdateCodeList?.(newCodeList);
      } else {
        onInvalid?.();
      }
    },
    [onUpdateCodeList, onInvalid, setCodeList],
  );

  return (
    <ControlledCodeListEditor
      className={className}
      codeList={codeList}
      onChangeCodeList={handleChangeCodeList}
    />
  );
}

type ControlledCodeListEditorProps = Omit<
  StatefulCodeListEditorProps,
  'onInvalid' | 'onUpdateCodeList'
> & {
  onChangeCodeList: (codeList: CodeList) => void;
};

function ControlledCodeListEditor({
  className: givenClass,
  codeList,
  onChangeCodeList,
}: ControlledCodeListEditorProps): ReactElement {
  const { texts } = useStudioCodeListEditorContext();
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const errorMap = useMemo<ValueErrorMap>(() => findCodeListErrors(codeList), [codeList]);

  const handleAddButtonClick = useCallback(() => {
    const updatedCodeList = addNewCodeListItem(codeList);
    onChangeCodeList(updatedCodeList);
  }, [codeList, onChangeCodeList]);

  const className = cn(classes.codeListEditor, givenClass);

  return (
    <StudioFieldset legend={texts.codeList} className={className} ref={fieldsetRef}>
      <CodeListTable codeList={codeList} errorMap={errorMap} onChangeCodeList={onChangeCodeList} />
      <AddButton onClick={handleAddButtonClick} />
      <Errors errorMap={errorMap} />
    </StudioFieldset>
  );
}

type CodeListTableProps = CodeListTableWithContentProps;

function CodeListTable(props: CodeListTableProps): ReactElement {
  return isCodeListEmpty(props.codeList) ? (
    <EmptyCodeListTable />
  ) : (
    <CodeListTableWithContent {...props} />
  );
}

function EmptyCodeListTable(): ReactElement {
  const { texts } = useStudioCodeListEditorContext();
  return <StudioParagraph>{texts.emptyCodeList}</StudioParagraph>;
}

type CodeListTableWithContentProps = ControlledCodeListEditorProps & ErrorsProps;

function CodeListTableWithContent({ ...rest }: CodeListTableWithContentProps): ReactElement {
  return (
    <StudioInputTable>
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
  errorMap,
  onChangeCodeList,
}: CodeListTableWithContentProps): ReactElement {
  const handleDeleteButtonClick = useCallback(
    (index: number) => {
      const updatedCodeList = removeCodeListItem(codeList, index);
      onChangeCodeList(updatedCodeList);
    },
    [codeList, onChangeCodeList],
  );

  const handleChangeCodeListItem = useCallback(
    (index: number, newItem: CodeListItem) => {
      const updatedCodeList = changeCodeListItem(codeList, index, newItem);
      onChangeCodeList(updatedCodeList);
    },
    [codeList, onChangeCodeList],
  );

  return (
    <StudioInputTable.Body>
      {codeList.map((item, index) => (
        <StudioCodeListEditorRow
          error={errorMap[index]}
          item={item}
          key={index}
          number={index + 1}
          onDeleteButtonClick={() => handleDeleteButtonClick(index)}
          onChangeCodeListItem={(newItem) => handleChangeCodeListItem(index, newItem)}
        />
      ))}
    </StudioInputTable.Body>
  );
}

type ErrorsProps = {
  errorMap: ValueErrorMap;
};

function Errors({ errorMap }: ErrorsProps): ReactNode {
  const {
    texts: { generalError },
  } = useStudioCodeListEditorContext();
  if (areThereCodeListErrors(errorMap)) {
    return <StudioValidationMessage>{generalError}</StudioValidationMessage>;
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
    <StudioButton icon={<PlusIcon />} onClick={onClick} variant='secondary'>
      {texts.add}
    </StudioButton>
  );
}
