import type { CodeList } from './types/CodeList';
import { useMemo, useRef, useCallback, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { StudioInputTable } from '../StudioInputTable';
import type { CodeListItem } from './types/CodeListItem';
import { StudioButton } from '../StudioButton';
import {
  removeCodeListItem,
  addNewCodeListItem,
  changeCodeListItem,
  isCodeListEmpty,
  initialiseSelectedLanguage,
  addLanguage,
  removeLanguage,
  initialiseLanguageOptions,
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
import type { StudioLanguagePickerTexts } from '../StudioLanguagePicker';
import { StudioLanguagePicker } from '../StudioLanguagePicker';
import { ArrayUtils } from '@studio/pure-functions';

export type StudioCodeListEditorProps = Readonly<{
  className?: string;
  codeList: CodeList;
  fallbackLanguage: string;
  onInvalid?: () => void;
  onUpdateCodeList: (codeList: CodeList) => void;
  texts: CodeListEditorTexts;
}>;

export function StudioCodeListEditor({ texts, ...rest }: StudioCodeListEditorProps): ReactElement {
  return (
    <StudioCodeListEditorContextProvider value={{ texts }}>
      <StatefulCodeListEditor {...rest} />
    </StudioCodeListEditorContextProvider>
  );
}

type StatefulCodeListEditorProps = Omit<StudioCodeListEditorProps, 'texts'>;

function StatefulCodeListEditor({
  codeList: givenCodeList,
  onInvalid,
  onUpdateCodeList,
  ...rest
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
      codeList={codeList}
      onChangeCodeList={handleChangeCodeList}
      {...rest}
    />
  );
}

type ControlledCodeListEditorProps = Omit<
  StatefulCodeListEditorProps,
  'onInvalid' | 'onUpdateCodeList'
> & {
  readonly onChangeCodeList: (codeList: CodeList) => void;
};

function ControlledCodeListEditor({
  className: givenClass,
  codeList,
  fallbackLanguage,
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

  const [language, setLanguage] = useState(initialiseSelectedLanguage(codeList, fallbackLanguage));

  return (
    <StudioFieldset legend={texts.codeList} className={className} ref={fieldsetRef}>
      <LanguagePicker
        codeList={codeList}
        fallbackLanguage={fallbackLanguage}
        onChangeCodeList={onChangeCodeList}
        onSelect={setLanguage}
        texts={texts.languagePickerTexts}
      />
      <CodeListTable
        codeList={codeList}
        errorMap={errorMap}
        language={language}
        onChangeCodeList={onChangeCodeList}
      />
      <AddButton onClick={handleAddButtonClick} />
      <Errors errorMap={errorMap} />
    </StudioFieldset>
  );
}

type LanguagePickerProps = {
  codeList: CodeList;
  fallbackLanguage: string;
  onChangeCodeList: (codeList: CodeList) => void;
  onSelect: (languageCode: string) => void;
  texts: StudioLanguagePickerTexts;
};

function LanguagePicker({
  codeList,
  fallbackLanguage,
  onChangeCodeList,
  onSelect,
  texts,
}: LanguagePickerProps): ReactElement {
  const [languageCodes, setLanguageCodes] = useState<string[]>(
    initialiseLanguageOptions(codeList, fallbackLanguage),
  );

  const handleAddLanguage = useCallback(
    (languageCode: string): void => {
      setLanguageCodes([...languageCodes, languageCode]);
      onChangeCodeList(addLanguage(codeList, languageCode));
    },
    [codeList, onChangeCodeList, languageCodes, setLanguageCodes],
  );

  const handleRemoveLanguage = useCallback(
    (languageCode: string): void => {
      setLanguageCodes(ArrayUtils.removeItemByValue(languageCodes, languageCode));
      onChangeCodeList(removeLanguage(codeList, languageCode));
    },
    [codeList, onChangeCodeList, languageCodes, setLanguageCodes],
  );

  return (
    <StudioLanguagePicker
      languageCodes={languageCodes}
      onSelect={onSelect}
      onAdd={handleAddLanguage}
      onRemove={handleRemoveLanguage}
      texts={texts}
    />
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

type CodeListTableWithContentProps = Omit<ControlledCodeListEditorProps, 'fallbackLanguage'> &
  ErrorsProps & {
    language: string;
  };

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
  language,
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
          language={language}
          number={index + 1}
          onDeleteButtonClick={() => handleDeleteButtonClick(index)}
          onChangeCodeListItem={(newItem) => handleChangeCodeListItem(index, newItem)}
        />
      ))}
    </StudioInputTable.Body>
  );
}

type ErrorsProps = {
  readonly errorMap: ValueErrorMap;
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
  readonly onClick: () => void;
};

function AddButton({ onClick }: AddButtonProps): ReactElement {
  const { texts } = useStudioCodeListEditorContext();

  return (
    <StudioButton icon={<PlusIcon />} onClick={onClick} variant='secondary'>
      {texts.add}
    </StudioButton>
  );
}
