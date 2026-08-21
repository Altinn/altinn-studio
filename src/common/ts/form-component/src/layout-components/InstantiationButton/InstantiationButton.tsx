import { Button } from '@app/form-component/app-components/Button';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';

import classes from './InstantiationButton.module.css';

export interface InstantiationButtonProps {
  componentId: string;
  title?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
  addPageMargin?: boolean;
}

export function InstantiationButton({
  componentId,
  title,
  disabled = false,
  isLoading = false,
  onClick,
  addPageMargin = false,
}: InstantiationButtonProps) {
  const { lang, langAsString } = useTranslation();

  return (
    <div
      className={classes.container}
      style={{ marginTop: addPageMargin ? 'var(--button-margin-top)' : undefined }}
    >
      <ComponentStructure componentId={componentId}>
        <Button
          id={componentId}
          onClick={onClick}
          disabled={disabled}
          isLoading={isLoading}
          loadingLabel={langAsString('general.loading')}
          variant='secondary'
          color='first'
        >
          {lang(title)}
        </Button>
      </ComponentStructure>
    </div>
  );
}
