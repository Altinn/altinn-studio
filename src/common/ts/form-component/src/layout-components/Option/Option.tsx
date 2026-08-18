import { Flex } from '@app/form-component/app-components/Flex';
import { HelpText } from '@app/form-component/app-components/HelpText';
import { LoadingEmpty } from '@app/form-component/app-components/loading';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { Description } from '@app/form-component/layout-components/common/Description';
import { HelpTextContainer } from '@app/form-component/layout-components/common/HelpTextContainer';
import { getLabelId } from '@app/form-component/layout-components/utils/labelIds';
import { Label as DsLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import classes from './Option.module.css';

export type OptionDirection = 'horizontal' | 'vertical';

export interface OptionProps {
  componentId: string;
  title?: string;
  description?: string;
  help?: string;
  icon?: string;
  direction?: OptionDirection;
  labelGrid?: IGridStyling;
  innerGrid?: IGridStyling;
  isLoading?: boolean;
  optionLabel?: string;
  optionHelp?: string;
  optionDescription?: string;
}

function OptionValue({
  title,
  icon,
  labelId,
  optionLabel,
  optionHelp,
  optionDescription,
}: {
  title?: string;
  icon?: string;
  labelId?: string;
  optionLabel?: string;
  optionHelp?: string;
  optionDescription?: string;
}) {
  const { lang, langAsString } = useTranslation();

  return (
    <>
      {icon && title && <img src={icon} className={classes.icon} alt={langAsString(title)} />}
      <span
        {...(labelId ? { 'aria-labelledby': labelId } : {})}
        className={classes.optionLabelContainer}
      >
        {lang(optionLabel)}
        {optionHelp && <HelpText title={langAsString(optionHelp)}>{lang(optionHelp)}</HelpText>}
        {optionDescription && (
          <span className={classes.optionDescription}>{lang(optionDescription)}</span>
        )}
      </span>
    </>
  );
}

export function Option({
  componentId,
  title,
  description,
  help,
  icon,
  direction = 'horizontal',
  labelGrid,
  innerGrid,
  isLoading = false,
  optionLabel,
  optionHelp,
  optionDescription,
}: OptionProps) {
  const { lang } = useTranslation();

  if (!title) {
    if (isLoading) {
      return <LoadingEmpty />;
    }
    return (
      <OptionValue
        icon={icon}
        optionLabel={optionLabel}
        optionHelp={optionHelp}
        optionDescription={optionDescription}
      />
    );
  }

  const labelId = getLabelId(componentId);

  return (
    <div
      className={cn(
        classes.label,
        classes.fieldWrapper,
        classes.optionComponent,
        direction === 'vertical' ? classes.vertical : classes.horizontal,
      )}
    >
      <Flex item size={labelGrid ?? { xs: 12 }}>
        <DsLabel asChild>
          <span className={classes.labelWrapper}>
            <span className={classes.labelContainer}>
              <span id={labelId} className={classes.labelContent}>
                {lang(title)}
              </span>
              {help && <HelpTextContainer id={componentId} title={title} helpText={lang(help)} />}
            </span>
            {description && (
              <Description
                componentId={componentId}
                description={lang(description)}
                className={classes.labelDescription}
              />
            )}
          </span>
        </DsLabel>
      </Flex>
      <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
        {isLoading ? (
          <LoadingEmpty />
        ) : (
          <OptionValue
            title={title}
            icon={icon}
            labelId={labelId}
            optionLabel={optionLabel}
            optionHelp={optionHelp}
            optionDescription={optionDescription}
          />
        )}
      </ComponentStructure>
    </div>
  );
}
