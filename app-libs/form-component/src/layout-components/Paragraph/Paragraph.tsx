import { ParagraphText } from '@app/form-component/app-components';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { HelpTextContainer } from '@app/form-component/layout-components/common/HelpTextContainer';
import type { PropCategories } from '@app/form-component/layout-components/common/storybook';

import classes from './Paragraph.module.css';

export interface ParagraphProps {
  id?: string;
  title?: string;
  help?: string;
}

/**
 * Sorts each prop into a Storybook docs group. `satisfies PropCategories<ParagraphProps>` makes it
 * exhaustive, so a new prop must be classified here.
 */
export const PARAGRAPH_PROP_CATEGORIES = {
  id: 'config',
  title: 'config',
  help: 'config',
} satisfies PropCategories<ParagraphProps>;

export function Paragraph({ id, title, help }: ParagraphProps) {
  const { lang } = useTranslation();

  return (
    <div className={classes.paragraphWrapper}>
      <div id={id} data-testid={`paragraph-component-${id}`}>
        <ParagraphText>{lang(title)}</ParagraphText>
      </div>
      {help && <HelpTextContainer id={id} title={title} helpText={lang(help)} />}
    </div>
  );
}
