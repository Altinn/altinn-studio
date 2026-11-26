import type { ReactElement } from 'react';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import { Description, getLabelId, OptionalIndicator, RequiredIndicator } from '@app/form-component';
import { useTranslation as useAppTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { CANVAS_CONTROL_ATTRIBUTE, INDICATOR_ATTRIBUTE } from '../../constants';
import type { LayoutComponent } from '../../types';
import { getStaticBoolean, getTextKey } from '../../utils/componentUtils';
import { getChildComponents } from '../../utils/layoutUtils';
import { hasDividerBeforeLast } from '../../utils/likertUtils';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import classes from './LikertPreview.module.css';

export type LikertPreviewProps = {
  component: LayoutComponent;
  /** A selected table is being edited, so each question shows a button for whether it must be answered. */
  isSelected?: boolean;
};

/**
 * The Likert table as the app shows it on a large screen: the options as column headings and a row
 * per question. The heading, the options and the questions are app texts, so they are edited where
 * they are. The radio buttons only show the layout and take no input.
 */
export function LikertPreview({ component, isSelected = false }: LikertPreviewProps): ReactElement {
  const { t } = useTranslation();
  const { lang } = useAppTranslation();
  const { layout } = usePageEditing();
  const questions = getChildComponents(layout, component);
  const options: { value: string; label: string }[] = (
    Array.isArray(component.options) ? component.options : []
  ).map((option: Record<string, unknown>) => ({
    value: String(option.value),
    label: String(option.label),
  }));
  const hasDivider = hasDividerBeforeLast(component);
  const isDividerColumn = (index: number): boolean => hasDivider && index === options.length - 1;
  const titleKey = getTextKey(component, 'title');
  const descriptionKey = getTextKey(component, 'description');
  const labelId = getLabelId(component.id);

  return (
    <div className={classes.likert}>
      {titleKey && (
        <p id={labelId} className={classes.title}>
          {lang(titleKey)}
        </p>
      )}
      {descriptionKey && (
        <Description componentId={component.id} description={lang(descriptionKey)} />
      )}
      <div className={classes.scroll}>
        <table className={classes.table} lang='nb' aria-labelledby={titleKey ? labelId : undefined}>
          {/* The options share at most 60 % of the width in equal columns, so the questions keep room. */}
          <colgroup>
            <col />
            {options.map((option) => (
              <col
                key={option.value}
                style={{ width: `${Math.min(12, 66 / Math.max(options.length, 1))}%` }}
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope='col'>
                <span className={classes.srOnly}>{t('app_builder.likert.question_column')}</span>
              </th>
              {options.map((option, index) => (
                <th
                  key={option.value}
                  scope='col'
                  className={cn({ [classes.dividerBefore]: isDividerColumn(index) })}
                >
                  {lang(option.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => {
              const questionKey = getTextKey(question, 'title');
              const required = getStaticBoolean(question.required);
              return (
                <tr key={question.id} data-question-id={question.id}>
                  <th scope='row'>
                    {questionKey ? lang(questionKey) : question.id}
                    {isSelected ? (
                      // While the table is edited, the choice is a real button: it is reached with
                      // Tab, opens the same menu as other questions, and does not look like status.
                      <button
                        type='button'
                        className={cn(classes.requiredButton, { [classes.optional]: !required })}
                        {...{ [INDICATOR_ATTRIBUTE]: required ? 'required' : 'optional' }}
                        {...{ [CANVAS_CONTROL_ATTRIBUTE]: '' }}
                        aria-haspopup='menu'
                        aria-label={t('app_builder.likert.required_button', {
                          state: required
                            ? t('app_builder.required_menu.required')
                            : t('app_builder.required_menu.optional'),
                        })}
                      >
                        {required
                          ? t('app_builder.required_menu.required')
                          : t('app_builder.required_menu.optional')}
                      </button>
                    ) : (
                      // Otherwise the table looks as it does in the app.
                      <span className={classes.indicator}>
                        <RequiredIndicator required={required} readOnly={false} />
                        <OptionalIndicator
                          required={required}
                          readOnly={false}
                          showOptionalMarking
                        />
                      </span>
                    )}
                  </th>
                  {options.map((option, index) => (
                    <td
                      key={option.value}
                      className={cn({ [classes.dividerBefore]: isDividerColumn(index) })}
                    >
                      <input type='radio' name={question.id} aria-label={option.value} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
