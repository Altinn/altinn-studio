import type { CodeList } from './types/CodeList';
import type { ReactElement } from 'react';
import React, { useMemo, useRef, useCallback } from 'react';
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
import type { TextResource } from '../../types/TextResource';
import { usePropState } from '@studio/hooks';

export type StudioCodeListEditorProps = {
  codeList: CodeList;
  onChange: (codeList: CodeList) => void;
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
  onChange,
  onChangeTextResource,
  onInvalid,
  textResources,
}: StatefulCodeListEditorProps): ReactElement {
  const [codeList, setCodeList] = usePropState<CodeList>(defaultCodeList);

  const handleChange = useCallback(
    (newCodeList: CodeList) => {
      setCodeList(newCodeList);
      isCodeListValid(newCodeList) ? onChange(newCodeList) : onInvalid?.();
    },
    [onChange, onInvalid, setCodeList],
  );

  return (
    <ControlledCodeListEditor
      codeList={codeList}
      onChange={handleChange}
      onChangeTextResource={onChangeTextResource}
      textResources={textResources}
    />
  );
}

type ControlledCodeListEditorProps = Omit<StatefulCodeListEditorProps, 'onInvalid'>;

function ControlledCodeListEditor({
  codeList,
  onChange,
  onChangeTextResource,
  textResources,
}: ControlledCodeListEditorProps): ReactElement {
  const { texts } = useStudioCodeListEditorContext();
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);

  const errorMap = useMemo<ValueErrorMap>(() => findCodeListErrors(codeList), [codeList]);

  const handleAddButtonClick = useCallback(() => {
    const updatedCodeList = addEmptyCodeListItem(codeList);
    onChange(updatedCodeList);
  }, [codeList, onChange]);

  return (
    <StudioFieldset legend={texts.codeList} className={classes.codeListEditor} ref={fieldsetRef}>
      <CodeListTable
        codeList={codeList}
        errorMap={errorMap}
        onChange={onChange}
        onChangeTextResource={onChangeTextResource}
        textResources={textResources}
      />
      <AddButton onClick={handleAddButtonClick} />
      <Errors errorMap={errorMap} />
    </StudioFieldset>
  );
}

type CodeListTableProps = ControlledCodeListEditorProps & ErrorsProps;

function CodeListTable(props: CodeListTableProps): ReactElement {
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

function CodeListTableWithContent(props: CodeListTableProps): ReactElement {
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
  onChangeTextResource,
  errorMap,
  textResources,
}: CodeListTableProps): ReactElement {
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
