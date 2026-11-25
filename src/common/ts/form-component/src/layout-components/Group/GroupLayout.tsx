import type { PropsWithChildren, Ref } from 'react';

import { Heading } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { ConditionalWrapper } from '../../app-components/ConditionalWrapper';
import { FullWidthWrapper } from '../../app-components/FullWidthWrapper';
import { Fieldset } from '../../app-components/Label';
import { Panel } from '../../app-components/Panel';
import { useTranslation } from '../../LanguageTranslatorProvider';
import { HelpTextContainer } from '../common/HelpTextContainer';
import classes from './GroupLayout.module.css';

export type GroupHeadingLevel = 2 | 3 | 4 | 5 | 6;
export type GroupingIndicator = 'indented' | 'panel';

export interface GroupLayoutProps {
  /** Id of the group. Used for the container's id, unless `containerId` is given, and for the help text. */
  componentId: string;
  /** Id of the group in the layout, without row indexes. Set as `data-componentbaseid` on the container. */
  baseComponentId?: string;
  /** Overrides the container's DOM id. */
  containerId?: string;
  containerRef?: Ref<HTMLDivElement>;
  /** Text-resource key for the legend. */
  title?: string;
  /** Text-resource key for the description. Not shown in a summary. */
  description?: string;
  /** Text-resource key for the help text. Not shown in a summary. */
  help?: string;
  headingLevel?: GroupHeadingLevel;
  groupingIndicator?: GroupingIndicator;
  /** Whether the group is inside another group. A nested group is not indented. */
  isNested?: boolean;
  /** Renders the group as part of a summary: no panel, description or help text, and less padding. */
  isSummary?: boolean;
}

const headingSizes: Record<GroupHeadingLevel, Parameters<typeof Heading>[0]['data-size']> = {
  [2]: 'sm',
  [3]: 'xs',
  [4]: '2xs',
  [5]: '2xs',
  [6]: '2xs',
};

export function GroupLayout({
  componentId,
  baseComponentId,
  containerId,
  containerRef,
  title,
  description,
  help,
  headingLevel = 2,
  groupingIndicator,
  isNested,
  isSummary,
  children,
}: PropsWithChildren<GroupLayoutProps>) {
  const { lang } = useTranslation();
  const isPanel = groupingIndicator === 'panel';
  const isIndented = groupingIndicator === 'indented';

  return (
    <div
      className={cn(classes.groupWrapper, {
        [classes.panelWrapper]: isPanel,
        [classes.summary]: isSummary,
      })}
    >
      <ConditionalWrapper
        condition={isPanel && !isSummary}
        wrapper={(child) => (
          <FullWidthWrapper>
            <Panel variant='info'>{child}</Panel>
          </FullWidthWrapper>
        )}
      >
        <Fieldset
          legend={
            title ? (
              <Heading
                className={classes.legend}
                level={headingLevel}
                data-size={headingSizes[headingLevel]}
              >
                {lang(title)}
              </Heading>
            ) : undefined
          }
          description={
            description && !isSummary ? (
              <span className={classes.description}>{lang(description)}</span>
            ) : undefined
          }
          help={
            help && !isSummary ? (
              <HelpTextContainer id={componentId} title={title} helpText={lang(help)} />
            ) : undefined
          }
        >
          <div
            data-componentid={componentId}
            data-componentbaseid={baseComponentId}
            ref={containerRef}
            id={containerId ?? componentId}
            data-testid='display-group-container'
            className={cn(classes.groupContainer, {
              [classes.indented]: isIndented && !isNested,
            })}
          >
            {children}
          </div>
        </Fieldset>
      </ConditionalWrapper>
    </div>
  );
}
