import { useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { ClipboardEvent, FormEvent, KeyboardEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { StudioButton, StudioHeading } from '@designer/components';
import { PlusIcon, XMarkIcon } from '@designer/icons';
import { getScaleOptionTexts, scaleChoices } from '../../utils/likertUtils';
import type { NewLikertValues, ScaleChoiceId } from '../../utils/likertUtils';
import formClasses from '../NewComponentForm/NewComponentForm.module.css';
import classes from './NewLikertForm.module.css';

export type NewLikertFormProps = {
  isSaving: boolean;
  onAdd: (values: NewLikertValues) => void;
  onCancel: () => void;
};

type Question = { text: string; required: boolean };

/**
 * Asks only for what has no good default: a heading, a scale and the questions. Every question
 * must be answered until the user says otherwise, and the form says nothing about that default
 * until it is changed. Nothing here names a field: every table saves to the same list in the data
 * model, so the questions can be written and changed freely.
 */
export function NewLikertForm({ isSaving, onAdd, onCancel }: NewLikertFormProps): ReactElement {
  const { t } = useTranslation();
  const id = useId();
  const [title, setTitle] = useState<string>('');
  const [choiceId, setChoiceId] = useState<ScaleChoiceId>('agree-dk');
  const [ownOptions, setOwnOptions] = useState<string[]>(['', '']);
  const [questions, setQuestions] = useState<Question[]>([{ text: '', required: true }]);
  const [errors, setErrors] = useState<{ title?: boolean; questions?: boolean }>({});
  // Cancelling a form with questions in it asks first, since nothing typed can be got back.
  const [isConfirmingCancel, setIsConfirmingCancel] = useState<boolean>(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const questionRefs = useRef<(HTMLInputElement | null)[]>([]);
  const masterRef = useRef<HTMLInputElement>(null);

  const choice = scaleChoices.find((c) => c.id === choiceId) ?? scaleChoices[0];
  const optionTexts = getScaleOptionTexts({
    scale: choice.scale,
    ownOptions: ownOptions.filter(Boolean),
    includeDontKnow: choice.dontKnow,
  });
  const filled = questions.filter((q) => q.text.trim());
  const requiredCount = filled.filter((q) => q.required).length;
  const allRequired = questions.every((q) => q.required);
  const noneRequired = questions.every((q) => !q.required);

  useEffect(() => {
    if (masterRef.current) masterRef.current.indeterminate = !allRequired && !noneRequired;
  }, [allRequired, noneRequired]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (isSaving) return;
    const newErrors = { title: !title.trim(), questions: filled.length === 0 };
    setErrors(newErrors);
    if (newErrors.title) return titleRef.current?.focus();
    if (newErrors.questions) return questionRefs.current[0]?.focus();
    onAdd({
      title: title.trim(),
      scale: choice.scale,
      ownOptions: ownOptions.map((o) => o.trim()).filter(Boolean),
      includeDontKnow: choice.dontKnow,
      questions: filled.map((q) => q.text.trim()),
      required: filled.map((q) => q.required),
    });
  };

  const update = (index: number, change: Partial<Question>): void =>
    setQuestions((current) => current.map((q, i) => (i === index ? { ...q, ...change } : q)));

  const addQuestionAfter = (index: number): void => {
    flushSync(() =>
      setQuestions((current) => [
        ...current.slice(0, index + 1),
        { text: '', required: true },
        ...current.slice(index + 1),
      ]),
    );
    questionRefs.current[index + 1]?.focus();
  };

  const removeQuestion = (index: number): void => {
    setQuestions((current) =>
      current.length > 1 ? current.filter((_, i) => i !== index) : [{ text: '', required: true }],
    );
    questionRefs.current[Math.max(0, index - 1)]?.focus();
  };

  const handleQuestionKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number): void => {
    if (event.key !== 'Enter') return;
    const isLast = index === questions.length - 1;
    if (isLast && questions[index].text.trim() === '') return;
    event.preventDefault();
    if (isLast) addQuestionAfter(index);
    else questionRefs.current[index + 1]?.focus();
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, index: number): void => {
    const lines = event.clipboardData
      .getData('text')
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(\d+[.)]|[-•*–])\s*/, '').trim())
      .filter(Boolean);
    if (lines.length < 2) return;
    event.preventDefault();
    flushSync(() =>
      setQuestions((current) => [
        ...current.slice(0, index),
        ...lines.map((text) => ({ text, required: true })),
        ...current.slice(index + 1),
      ]),
    );
    questionRefs.current[index + lines.length - 1]?.focus();
  };

  const hasQuestions = filled.length > 0;
  const isDirty = Boolean(title.trim()) || hasQuestions;

  const requestCancel = (): void => {
    if (isDirty) setIsConfirmingCancel(true);
    else onCancel();
  };

  return (
    <form
      className={cn(formClasses.newComponentForm, classes.form)}
      data-size='sm'
      onSubmit={handleSubmit}
      // Escape only leaves an empty form. With text in it, it would throw away work without asking.
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        // The canvas also closes what is open on Escape, so the key stops here while there is text.
        event.stopPropagation();
        if (isDirty) setIsConfirmingCancel(true);
        else onCancel();
      }}
    >
      <StudioHeading level={2} data-size='xs'>
        {t('app_builder.likert.new_title')}
      </StudioHeading>

      <div className={formClasses.field}>
        <label className='ds-label' htmlFor={`${id}-title`}>
          {t('app_builder.likert.heading')}
        </label>
        <input
          ref={titleRef}
          id={`${id}-title`}
          className='ds-input'
          value={title}
          autoFocus
          placeholder={t('app_builder.likert.heading_placeholder')}
          aria-invalid={errors.title && !title.trim()}
          aria-describedby={errors.title && !title.trim() ? `${id}-title-error` : undefined}
          onChange={(event) => setTitle(event.target.value)}
        />
        {errors.title && !title.trim() && (
          <span id={`${id}-title-error`} className={formClasses.error}>
            {t('app_builder.likert.heading_missing')}
          </span>
        )}
      </div>

      <div className={formClasses.field}>
        <label className='ds-label' htmlFor={`${id}-scale`}>
          {t('app_builder.likert.scale')}
        </label>
        <select
          id={`${id}-scale`}
          className={cn('ds-input', classes.select)}
          value={choiceId}
          aria-describedby={`${id}-scale-options`}
          onChange={(event) => setChoiceId(event.target.value as ScaleChoiceId)}
        >
          {scaleChoices.map((c) => (
            <option key={c.id} value={c.id}>
              {t(`app_builder.likert.scale_choice.${c.id}`)}
            </option>
          ))}
        </select>
        {choice.scale === 'own' ? (
          <ol className={classes.ownOptions}>
            {ownOptions.map((option, index) => (
              <li key={index}>
                <input
                  className='ds-input'
                  aria-label={t('app_builder.new_component.option', { number: index + 1 })}
                  placeholder={t('app_builder.new_component.option', { number: index + 1 })}
                  value={option}
                  onChange={(event) =>
                    setOwnOptions((c) => c.map((o, i) => (i === index ? event.target.value : o)))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && option.trim()) {
                      event.preventDefault();
                      if (index === ownOptions.length - 1) setOwnOptions((c) => [...c, '']);
                    }
                  }}
                />
              </li>
            ))}
          </ol>
        ) : (
          <span id={`${id}-scale-options`} className={classes.quiet}>
            {optionTexts.join(' · ')}
          </span>
        )}
      </div>

      <fieldset className={classes.questions}>
        <legend className='ds-label'>{t('app_builder.likert.questions')}</legend>
        <span id={`${id}-questions-hint`} className={classes.quiet}>
          {t('app_builder.likert.questions_hint')}
        </span>
        {hasQuestions && (
          <div className={classes.columnHead}>
            <label className={classes.master}>
              {t('app_builder.likert.required_column')}
              <input
                ref={masterRef}
                type='checkbox'
                className='ds-input'
                checked={allRequired}
                onChange={(event) =>
                  setQuestions((c) => c.map((q) => ({ ...q, required: event.target.checked })))
                }
              />
            </label>
          </div>
        )}
        <ol className={classes.rows}>
          {questions.map((question, index) => (
            <li key={index} className={classes.row}>
              <input
                ref={(input) => {
                  questionRefs.current[index] = input;
                }}
                className='ds-input'
                aria-label={t('app_builder.likert.question', { number: index + 1 })}
                aria-invalid={errors.questions && !hasQuestions && index === 0}
                aria-describedby={`${id}-questions-hint`}
                value={question.text}
                onChange={(event) => update(index, { text: event.target.value })}
                onKeyDown={(event) => handleQuestionKeyDown(event, index)}
                onPaste={(event) => handlePaste(event, index)}
              />
              {/* The checkbox appears with the question's text, so it is never there without its column heading. */}
              {question.text.trim() ? (
                <input
                  type='checkbox'
                  className={cn('ds-input', classes.rowCheck)}
                  checked={question.required}
                  aria-label={t('app_builder.likert.required_for', { number: index + 1 })}
                  onChange={(event) => update(index, { required: event.target.checked })}
                />
              ) : (
                <span aria-hidden />
              )}
              <StudioButton
                variant='tertiary'
                data-size='sm'
                icon={<XMarkIcon />}
                className={classes.remove}
                aria-label={t('app_builder.likert.remove_question', { number: index + 1 })}
                onClick={() => removeQuestion(index)}
              />
            </li>
          ))}
        </ol>
        {errors.questions && !hasQuestions && (
          <span className={formClasses.error}>{t('app_builder.likert.questions_missing')}</span>
        )}
        <div className={classes.below}>
          <StudioButton
            variant='tertiary'
            data-size='sm'
            icon={<PlusIcon />}
            onClick={() => addQuestionAfter(questions.length - 1)}
          >
            {t('app_builder.likert.add_question')}
          </StudioButton>
          {/* Said only when it differs from the default, so silence means "all must be answered". */}
          <span className={classes.quiet} aria-live='polite'>
            {hasQuestions && requiredCount < filled.length
              ? t('app_builder.likert.required_summary', {
                  required: requiredCount,
                  total: filled.length,
                })
              : ''}
          </span>
        </div>
      </fieldset>

      <div className={classes.actions}>
        {isConfirmingCancel ? (
          <div className={classes.confirm} role='alert'>
            <span>{t('app_builder.likert.discard_question', { count: filled.length })}</span>
            <StudioButton variant='secondary' data-size='sm' data-color='danger' onClick={onCancel}>
              {t('app_builder.likert.discard')}
            </StudioButton>
            <StudioButton
              variant='tertiary'
              data-size='sm'
              autoFocus
              onClick={() => setIsConfirmingCancel(false)}
            >
              {t('app_builder.likert.keep_editing')}
            </StudioButton>
          </div>
        ) : (
          <>
            <StudioButton type='submit' variant='primary' data-size='sm' disabled={isSaving}>
              {t('app_builder.new_component.add')}
            </StudioButton>
            <StudioButton variant='tertiary' data-size='sm' onClick={requestCancel}>
              {t('general.cancel')}
            </StudioButton>
          </>
        )}
      </div>
    </form>
  );
}
