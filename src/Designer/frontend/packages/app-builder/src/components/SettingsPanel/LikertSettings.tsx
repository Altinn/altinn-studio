import { useEffect, useId, useRef, useState } from 'react';
import type { ClipboardEvent, FormEvent, PropsWithChildren, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { StudioButton, StudioParagraph } from '@designer/components';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from '@designer/icons';
import { useUpsertTextResourcesMutation } from 'app-shared/hooks/mutations/useUpsertTextResourcesMutation';
import { useLanguagesQuery } from '../../hooks/useLanguagesQuery';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { useLikertQuestions } from '../../hooks/useLikertQuestions';
import type { LayoutComponent, PageLayout } from '../../types';
import { getStaticBoolean, getTextKey } from '../../utils/componentUtils';
import {
  buildScale,
  findScaleChoice,
  getCategory,
  getLikertCategories,
  LIKERT_MODEL_FIELD,
  scaleChoices,
} from '../../utils/likertUtils';
import type { ScaleChoiceId } from '../../utils/likertUtils';
import { setProperty } from '../../utils/layoutUtils';
import { getInlineOptions } from '../../utils/optionUtils';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import { SettingsSection } from './SettingsPanelFrame';
import { TextSetting } from './TextSetting';
import classes from './LikertSettings.module.css';

export type LikertSettingsProps = {
  component: LayoutComponent;
};

/**
 * The settings of a Likert table, with what is changed most first: the questions. The scale, the
 * texts and what the receiver gets are set once, so they are closed and sum up what they hold.
 */
export function LikertSettings({ component }: LikertSettingsProps): ReactElement {
  const { t } = useTranslation();
  const { texts } = useAppBuilder();
  const optionTexts = getInlineOptions(component).map(({ label }) => texts[label] ?? label);
  const titleKey = getTextKey(component, 'title');

  return (
    <>
      <QuestionsSection component={component} />
      <Collapsible title={t('app_builder.likert.scale')} summary={optionTexts.join(', ')}>
        <ScaleSetting component={component} optionTexts={optionTexts} />
      </Collapsible>
      <Collapsible
        title={t('app_builder.settings.content')}
        summary={titleKey ? (texts[titleKey] ?? '') : ''}
      >
        <TextSetting
          component={component}
          property='title'
          label={t('app_builder.likert.heading')}
        />
        <TextSetting
          component={component}
          property='description'
          label={t('app_builder.settings.description')}
          description={t('app_builder.likert.description_hint')}
        />
        <TextSetting
          component={component}
          property='help'
          label={t('app_builder.settings.help')}
          description={t('app_builder.settings.help.description')}
        />
      </Collapsible>
      <ReceiverSection component={component} />
    </>
  );
}

type CollapsibleProps = PropsWithChildren<{ title: string; summary: string }>;

/** A section that is closed until needed, and says what it holds while closed. */
function Collapsible({ title, summary, children }: CollapsibleProps): ReactElement {
  return (
    <details className={classes.collapsible}>
      <summary>
        <span className={classes.collapsibleTitle}>{title}</span>
        <span className={classes.collapsibleSummary}>{summary}</span>
      </summary>
      <div className={classes.collapsibleBody}>{children}</div>
    </details>
  );
}

type ScaleSettingProps = LikertSettingsProps & { optionTexts: string[] };

/**
 * The same choice of scale as when the table was added, so the user meets one way of thinking about
 * it. Their own options are edited as a list, one per line, like the questions.
 */
function ScaleSetting({ component, optionTexts }: ScaleSettingProps): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useAppBuilder();
  const { pageName, updateComponent, saveTexts } = usePageEditing();
  const { data: languages = [] } = useLanguagesQuery(org, app);
  const { mutate: upsertTexts } = useUpsertTextResourcesMutation(org, app);
  const choiceId = findScaleChoice(optionTexts);
  const [isOwn, setIsOwn] = useState<boolean>(choiceId === 'own');
  const keyFor = (n: number): string => `${pageName}.${component.id}.option${n}`;

  const chooseScale = (id: ScaleChoiceId): void => {
    if (id === 'own') return setIsOwn(true);
    setIsOwn(false);
    const scale = buildScale(id, keyFor);
    saveTexts(scale.texts.nb);
    (['nn', 'en'] as const)
      .filter((language) => languages.includes(language))
      .forEach((language) =>
        upsertTexts({
          language,
          textResources: Object.entries(scale.texts[language]).map(([key, value]) => ({
            id: key,
            value,
          })),
        }),
      );
    updateComponent(component.id, (current) =>
      setProperty(setProperty(current, 'options', scale.options), 'columns', scale.columns),
    );
  };

  const saveOwn = (texts: string[]): void => {
    const filled = texts.map((text) => text.trim()).filter(Boolean);
    saveTexts(Object.fromEntries(filled.map((text, i) => [keyFor(i + 1), text])));
    updateComponent(component.id, (current) =>
      setProperty(
        setProperty(
          current,
          'options',
          filled.map((_, i) => ({ value: `${i + 1}`, label: keyFor(i + 1) })),
        ),
        'columns',
        undefined,
      ),
    );
  };

  return (
    <div className={classes.scale}>
      <select
        className='ds-input'
        aria-label={t('app_builder.likert.scale')}
        value={isOwn ? 'own' : choiceId}
        onChange={(event) => chooseScale(event.target.value as ScaleChoiceId)}
      >
        {scaleChoices.map((c) => (
          <option key={c.id} value={c.id}>
            {t(`app_builder.likert.scale_choice.${c.id}`)}
          </option>
        ))}
      </select>
      {isOwn ? (
        <label className={classes.ownLabel}>
          <span className={classes.quiet}>{t('app_builder.likert.own_options_hint')}</span>
          <textarea
            className='ds-input'
            rows={Math.max(3, optionTexts.length)}
            defaultValue={optionTexts.join('\n')}
            onBlur={(event) => saveOwn(event.target.value.split(/\r?\n/))}
          />
        </label>
      ) : (
        <span className={classes.quiet}>{t('app_builder.likert.scale_shared')}</span>
      )}
    </div>
  );
}

function QuestionsSection({ component }: LikertSettingsProps): ReactElement {
  const { t } = useTranslation();
  const { texts } = useAppBuilder();
  const { saveTexts } = usePageEditing();
  const likert = useLikertQuestions(component);
  const [newText, setNewText] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  // The last removed question can be brought back until the user does something else.
  const [undo, setUndo] = useState<{ layout: PageLayout; text: string }>();
  const total = likert.questions.length;
  const requiredCount = likert.questions.filter((q) => getStaticBoolean(q.required)).length;
  const masterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (masterRef.current)
      masterRef.current.indeterminate = requiredCount > 0 && requiredCount < total;
  }, [requiredCount, total]);

  const handleAdd = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const text = newText.trim();
    if (!text || isAdding) return;
    setIsAdding(true);
    setUndo(undefined);
    await likert.addQuestions([text]);
    setIsAdding(false);
    setNewText('');
  };

  // Several lines pasted at once give one question each, as when the table is added.
  const handlePaste = async (event: ClipboardEvent<HTMLInputElement>): Promise<void> => {
    const lines = event.clipboardData
      .getData('text')
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(\d+[.)]|[-•*–])\s*/, '').trim())
      .filter(Boolean);
    if (lines.length < 2) return;
    event.preventDefault();
    setIsAdding(true);
    setUndo(undefined);
    await likert.addQuestions(lines);
    setIsAdding(false);
  };

  return (
    <SettingsSection title={t('app_builder.likert.questions')}>
      <div className={classes.columnHead}>
        <span className={classes.quiet} aria-live='polite'>
          {requiredCount < total
            ? t('app_builder.likert.required_summary', { required: requiredCount, total })
            : ''}
        </span>
        <label className={classes.master}>
          {t('app_builder.likert.required_column')}
          <input
            ref={masterRef}
            type='checkbox'
            className='ds-input'
            checked={total > 0 && requiredCount === total}
            onChange={(event) => likert.setAllRequired(event.target.checked)}
          />
        </label>
      </div>
      <ol className={classes.rows}>
        {likert.questions.map((question, index) => {
          const textKey = getTextKey(question, 'title');
          const text = textKey ? (texts[textKey] ?? '') : '';
          return (
            <li key={question.id} className={classes.row}>
              <input
                key={`${textKey}-${text}`}
                className='ds-input'
                aria-label={t('app_builder.likert.question', { number: index + 1 })}
                defaultValue={text}
                onBlur={(event) => {
                  const value = event.target.value.trim();
                  if (textKey && value && value !== text) saveTexts({ [textKey]: value });
                }}
              />
              <input
                type='checkbox'
                className='ds-input'
                checked={getStaticBoolean(question.required)}
                aria-label={t('app_builder.likert.required_for', { number: index + 1 })}
                onChange={(event) => likert.setRequired(question.id, event.target.checked)}
              />
              <div className={classes.rowActions}>
                <StudioButton
                  variant='tertiary'
                  data-size='sm'
                  icon={<ArrowUpIcon />}
                  disabled={index === 0}
                  aria-label={t('app_builder.likert.move_up', { number: index + 1 })}
                  onClick={() => likert.moveQuestion(question.id, -1)}
                />
                <StudioButton
                  variant='tertiary'
                  data-size='sm'
                  icon={<ArrowDownIcon />}
                  disabled={index === total - 1}
                  aria-label={t('app_builder.likert.move_down', { number: index + 1 })}
                  onClick={() => likert.moveQuestion(question.id, 1)}
                />
                <StudioButton
                  variant='tertiary'
                  data-size='sm'
                  icon={<TrashIcon />}
                  aria-label={t('app_builder.likert.remove_question', { number: index + 1 })}
                  onClick={() => setUndo({ layout: likert.removeQuestion(question.id), text })}
                />
              </div>
            </li>
          );
        })}
      </ol>
      {undo && (
        <p className={classes.undo} role='status'>
          {t('app_builder.likert.removed', { text: undo.text })}
          <StudioButton
            variant='tertiary'
            data-size='sm'
            onClick={() => {
              likert.restoreLayout(undo.layout);
              setUndo(undefined);
            }}
          >
            {t('app_builder.likert.undo')}
          </StudioButton>
        </p>
      )}
      <form className={classes.addQuestion} onSubmit={(event) => void handleAdd(event)}>
        <input
          className='ds-input'
          aria-label={t('app_builder.likert.new_question')}
          placeholder={t('app_builder.likert.new_question_placeholder')}
          value={newText}
          onChange={(event) => setNewText(event.target.value)}
          onPaste={(event) => void handlePaste(event)}
        />
        <StudioButton
          type='submit'
          variant='tertiary'
          data-size='sm'
          icon={<PlusIcon />}
          disabled={!newText.trim() || isAdding}
        >
          {t('app_builder.likert.add_question')}
        </StudioButton>
      </form>
    </SettingsSection>
  );
}

/**
 * What the receiver gets, shown as the data itself. The only thing to set is the category, which
 * tells this table apart from others in the same list. It is made from the heading when the table
 * is added, so most people never need to open this.
 */
function ReceiverSection({ component }: LikertSettingsProps): ReactElement | null {
  const { t } = useTranslation();
  const id = useId();
  const { dataModel, texts, layouts } = useAppBuilder();
  const { updateComponent } = usePageEditing();
  const likert = useLikertQuestions(component);
  const category = getCategory(component);
  const [draft, setDraft] = useState<string>(category);
  const [error, setError] = useState<string>();
  if (!dataModel) return null;

  const otherCategories = getLikertCategories(layouts).filter((c) => c !== category);
  const firstOption = getInlineOptions(component)[0];
  const example = {
    [LIKERT_MODEL_FIELD]: [
      {
        category,
        questions: likert.questions.slice(0, 2).map((question) => {
          const key = getTextKey(question, 'title');
          return {
            text: (key && texts[key]) || '',
            answer: firstOption ? String(firstOption.value) : '1',
            answerText: firstOption ? (texts[firstOption.label] ?? '') : '',
          };
        }),
      },
    ],
  };

  const save = (): void => {
    const value = draft.trim();
    if (!value) return setError(t('app_builder.likert.category_missing'));
    if (otherCategories.includes(value)) {
      return setError(t('app_builder.likert.category_taken', { category: value }));
    }
    setError(undefined);
    if (value !== category) {
      updateComponent(component.id, (current) => setProperty(current, 'category', value));
    }
  };

  return (
    <Collapsible
      title={t('app_builder.likert.receiver')}
      summary={t('app_builder.likert.receiver_summary', { category })}
    >
      <StudioParagraph data-size='xs'>{t('app_builder.likert.receiver_explained')}</StudioParagraph>
      <pre className={classes.example} aria-label={t('app_builder.likert.receiver_example_label')}>
        {JSON.stringify(example, null, 2)}
      </pre>
      <div className={classes.category}>
        <label className='ds-label' htmlFor={`${id}-category`}>
          {t('app_builder.likert.category')}
        </label>
        <span id={`${id}-category-hint`} className={classes.quiet}>
          {t('app_builder.likert.category_hint')}
        </span>
        <input
          id={`${id}-category`}
          className='ds-input'
          value={draft}
          aria-invalid={Boolean(error)}
          aria-describedby={cn(`${id}-category-hint`, { [`${id}-category-error`]: error })}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
        />
        {error && (
          <span id={`${id}-category-error`} className={classes.error}>
            {error}
          </span>
        )}
      </div>
    </Collapsible>
  );
}
