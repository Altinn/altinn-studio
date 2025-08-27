import type { CodeList } from './types/CodeList';
import React, { useMemo, useRef, useCallback, useReducer, useEffect } from 'react';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { StudioInputTable } from '../StudioInputTable';
import type { CodeListItem } from './types/CodeListItem';
import { StudioButton } from '../StudioButton';
import {
  removeCodeListItem,
  addNewCodeListItem,
  changeCodeListItem,
  isCodeListEmpty,
  evaluateDefaultType,
  isCodeLimitReached,
  updateCodeList,
} from './utils';
import { StudioCodeListEditorRow } from './StudioCodeListEditorRow/StudioCodeListEditorRow';
import type { CodeListEditorTexts } from './types/CodeListEditorTexts';
import {
  StudioCodeListEditorContext,
  useStudioCodeListEditorContext,
} from './StudioCodeListEditorContext';
import { PlusIcon } from '../../../../studio-icons';
import { areThereCodeListErrors, findCodeListErrors, isCodeListValid } from './validation';
import type { ValueErrorMap } from './types/ValueErrorMap';
import { StudioFieldset } from '../StudioFieldset';
import { StudioErrorMessage } from '../StudioErrorMessage';
import type { TextResource } from '../../types/TextResource';
import { usePropState } from '@studio/hooks';
import { StudioParagraph } from '../StudioParagraph';
import type { CodeListItemType } from './types/CodeListItemType';
import type { CodeListItemTextProperty } from './types/CodeListItemTextProperty';
import type { TypeSelectorProps } from './TypeSelector';
import { TypeSelector } from './TypeSelector';
import { reducer, ReducerActionType } from './StudioCodeListEditorReducer';
import type { ReducerState, ReducerAction } from './StudioCodeListEditorReducer';
import classes from './StudioCodeListEditor.module.css';

export type CreateTextResourceInternalArgs = {
  textResource: TextResource;
  codeItemIndex: number;
  property: CodeListItemTextProperty;
};

export type StudioCodeListEditorProps = {
  codeList: CodeList;
  onCreateTextResource: (textResource: TextResource) => void;
  onInvalid?: () => void;
  onUpdateCodeList: (codeList: CodeList) => void;
  onUpdateTextResource: (textResource: TextResource) => void;
  textResources: TextResource[];
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
  codeList: givenCodeList,
  onCreateTextResource,
  onInvalid,
  onUpdateCodeList,
  onUpdateTextResource,
  textResources: givenTextResources,
}: StatefulCodeListEditorProps): ReactElement {
  const initialState: ReducerState = {
    codeList: givenCodeList,
    textResources: givenTextResources,
  };
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({
      type: ReducerActionType.SetCodeList,
      codeList: givenCodeList,
    });
  }, [givenCodeList]);

  useEffect(() => {
    dispatch({
      type: ReducerActionType.SetTextResources,
      textResources: givenTextResources,
    });
  }, [givenTextResources]);

  const handleChange = useCallback(
    (newCodeList: CodeList) => {
      dispatch({
        type: ReducerActionType.SetCodeList,
        codeList: newCodeList,
      });
      if (!isCodeListValid(newCodeList)) {
        onInvalid?.();
      }
    },
    [onInvalid, dispatch],
  );

  const handleUpdateCodeList = useCallback(
    (codeList: CodeList) => {
      if (isCodeListValid(codeList)) {
        onUpdateCodeList?.(codeList);
      }
    },
    [onUpdateCodeList],
  );

  const handleCreateTextResource = useCallback(
    ({ textResource, codeItemIndex, property }: CreateTextResourceInternalArgs) => {
      const codeList: CodeList = updateCodeList(state.codeList, {
        newValue: textResource.id,
        codeItemIndex,
        property,
      });
      handleUpdateCodeList(codeList);
      onCreateTextResource?.(textResource);
    },
    [handleUpdateCodeList, onCreateTextResource, state.codeList],
  );

  return (
    <ControlledCodeListEditor
      codeList={state.codeList}
      dispatch={dispatch}
      onChange={handleChange}
      onCreateTextResource={handleCreateTextResource}
      onUpdateCodeList={handleUpdateCodeList}
      onUpdateTextResource={onUpdateTextResource}
      textResources={state.textResources}
    />
  );
}

type ControlledCodeListEditorProps = Omit<
  StatefulCodeListEditorProps,
  'onInvalid' | 'onCreateTextResource'
> & {
  dispatch: Dispatch<ReducerAction>;
  onCreateTextResource: (args: CreateTextResourceInternalArgs) => void;
  onChange: (codeList: CodeList) => void;
};

function ControlledCodeListEditor({
  codeList,
  dispatch,
  onChange,
  onCreateTextResource,
  onUpdateCodeList,
  onUpdateTextResource,
  textResources,
}: ControlledCodeListEditorProps): ReactElement {
  const [codeType, setCodeType] = useCodeTypeState(codeList);
  const { texts } = useStudioCodeListEditorContext();
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const errorMap = useMemo<ValueErrorMap>(() => findCodeListErrors(codeList), [codeList]);
  const shouldDisableAddButton = isCodeLimitReached(codeList, codeType);

  const handleAddButtonClick = useCallback(() => {
    const updatedCodeList = addNewCodeListItem(codeList, codeType);
    onChange(updatedCodeList);
    onUpdateCodeList(updatedCodeList);
  }, [codeList, codeType, onChange, onUpdateCodeList]);

  return (
    <StudioFieldset legend={texts.codeList} className={classes.codeListEditor} ref={fieldsetRef}>
      <CodeListTable
        codeList={codeList}
        codeType={codeType}
        dispatch={dispatch}
        errorMap={errorMap}
        onChange={onChange}
        onChangeCodeType={setCodeType}
        onCreateTextResource={onCreateTextResource}
        onUpdateCodeList={onUpdateCodeList}
        onUpdateTextResource={onUpdateTextResource}
        textResources={textResources}
      />
      <AddButton onClick={handleAddButtonClick} disabled={shouldDisableAddButton} />
      <Errors errorMap={errorMap} />
    </StudioFieldset>
  );
}

function useCodeTypeState(
  codeList: CodeList,
): [CodeListItemType, Dispatch<SetStateAction<CodeListItemType>>] {
  const initialType = useMemo(() => evaluateDefaultType(codeList), [codeList]);
  return usePropState<CodeListItemType>(initialType);
}

type CodeListTableProps = CodeListTableWithContentProps & EmptyCodeListTableProps;

function CodeListTable({ codeType, onChangeCodeType, ...rest }: CodeListTableProps): ReactElement {
  return isCodeListEmpty(rest.codeList) ? (
    <EmptyCodeListTable codeType={codeType} onChangeCodeType={onChangeCodeType} />
  ) : (
    <CodeListTableWithContent {...rest} />
  );
}

type EmptyCodeListTableProps = TypeSelectorProps;

function EmptyCodeListTable(props: EmptyCodeListTableProps): ReactElement {
  const { texts } = useStudioCodeListEditorContext();
  return (
    <>
      <StudioParagraph size='small'>{texts.emptyCodeList}</StudioParagraph>
      <TypeSelector {...props} />
    </>
  );
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
  dispatch,
  errorMap,
  onChange,
  onCreateTextResource,
  onUpdateCodeList,
  onUpdateTextResource,
  textResources,
}: CodeListTableWithContentProps): ReactElement {
  const handleDeleteButtonClick = useCallback(
    (index: number) => {
      const updatedCodeList = removeCodeListItem(codeList, index);
      onChange(updatedCodeList);
      onUpdateCodeList(updatedCodeList);
    },
    [codeList, onChange, onUpdateCodeList],
  );

  const handleChange = useCallback(
    (index: number, newItem: CodeListItem) => {
      const updatedCodeList = changeCodeListItem(codeList, index, newItem);
      onChange(updatedCodeList);
    },
    [codeList, onChange],
  );

  const handleUpdateCodeListItem = useCallback(
    (index: number, newItem: CodeListItem) => {
      const updatedCodeList = changeCodeListItem(codeList, index, newItem);
      onUpdateCodeList(updatedCodeList);
    },
    [codeList, onUpdateCodeList],
  );

  return (
    <StudioInputTable.Body>
      {codeList.map((item, index) => (
        <StudioCodeListEditorRow
          dispatch={dispatch}
          error={errorMap[index]}
          item={item}
          key={index}
          number={index + 1}
          onChange={(newItem) => handleChange(index, newItem)}
          onCreateTextResource={onCreateTextResource}
          onDeleteButtonClick={() => handleDeleteButtonClick(index)}
          onUpdateCodeListItem={(newItem) => handleUpdateCodeListItem(index, newItem)}
          onUpdateTextResource={onUpdateTextResource}
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
  disabled: boolean;
};

function AddButton({ onClick, disabled }: AddButtonProps): ReactElement {
  const { texts } = useStudioCodeListEditorContext();
  const tooltip = disabled ? texts.disabledAddButtonTooltip : undefined;

  return (
    <StudioButton
      onClick={onClick}
      variant='secondary'
      icon={<PlusIcon />}
      disabled={disabled}
      title={tooltip}
    >
      {texts.add}
    </StudioButton>
  );
}
