import * as React from 'react';
import { shallowEqual } from 'react-redux';

import { Grid, makeStyles, Typography } from '@material-ui/core';
import cn from 'classnames';

import { useAppSelector } from 'src/common/hooks';
import ErrorPaper from 'src/components/message/ErrorPaper';
import { EditButton } from 'src/components/summary/EditButton';
import GroupInputSummary from 'src/components/summary/GroupInputSummary';
import { DisplayGroupContainer } from 'src/features/form/containers/DisplayGroupContainer';
import { renderLayoutComponent } from 'src/features/form/containers/Form';
import { getDisplayFormDataForComponent, getFormDataForComponentInRepeatingGroup } from 'src/utils/formComponentUtils';
import {
  getRepeatingGroupStartStopIndex,
  getVariableTextKeysForRepeatingGroupComponent,
  setMappingForRepeatingGroupComponent,
} from 'src/utils/formLayout';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { ComponentFromSummary } from 'src/features/form/containers/DisplayGroupContainer';
import type { ILayout, ILayoutComponent, ILayoutGroup, SummaryDisplayProperties } from 'src/features/form/layout';
import type { IRuntimeState } from 'src/types';

import appTheme from 'src/theme/altinnAppTheme';
import { getLanguageFromKey } from 'src/utils/sharedUtils';

export interface ISummaryGroupComponent {
  pageRef?: string;
  componentRef?: string;
  index?: number;
  changeText: string | null;
  onChangeClick: () => void;
  largeGroup?: boolean;
  parentGroup?: string;
  display?: SummaryDisplayProperties;
}

export function getComponentForSummaryGroup(layout: ILayout | undefined, groupId: string): ILayoutGroup | undefined {
  return layout?.find((component) => component.id === groupId) as ILayoutGroup;
}

const gridStyle = {
  paddingTop: '12px',
};

const useStyles = makeStyles({
  border: {
    border: '2px solid #EFEFEF',
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
  },
  label: {
    fontWeight: 500,
    fontSize: '1.8rem',
    '& p': {
      fontWeight: 500,
      fontSize: '1.8rem',
    },
  },
  labelWithError: {
    color: appTheme.altinnPalette.primary.red,
    '& p': {
      color: appTheme.altinnPalette.primary.red,
    },
  },
  link: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid #008FD6',
    cursor: 'pointer',
    paddingLeft: 0,
  },
});

function SummaryGroupComponent({
  pageRef,
  componentRef,
  index,
  parentGroup,
  largeGroup,
  onChangeClick,
  changeText,
  display,
}: ISummaryGroupComponent) {
  const classes = useStyles();

  const [title, setTitle] = React.useState<string>('');
  const [groupHasErrors, setGroupHasErrors] = React.useState<boolean>(false);
  const [groupChildComponents, setGroupChildComponents] = React.useState<string[]>([]);

  const groupComponent = useAppSelector(
    (state) =>
      (state.formLayout.layouts &&
        pageRef &&
        componentRef &&
        getComponentForSummaryGroup(state.formLayout.layouts[pageRef], componentRef)) ||
      undefined,
    shallowEqual,
  );
  const repeatingGroups = useAppSelector((state) => state.formLayout.uiConfig.repeatingGroups);
  const layout = useAppSelector(
    (state) => (state.formLayout.layouts && pageRef && state.formLayout.layouts[pageRef]) || [],
  );
  const formData = useAppSelector((state) => state.formData.formData);
  const textResources = useAppSelector((state) => state.textResources.resources);
  const language = useAppSelector((state) => state.language.language);
  const options = useAppSelector((state) => state.optionState.options);
  const attachments = useAppSelector((state: IRuntimeState) => state.attachments.attachments);
  const validations = useAppSelector((state) => state.formValidations.validations);
  const hiddenFields = useAppSelector((state) => new Set(state.formLayout.uiConfig.hiddenFields));

  React.useEffect(() => {
    if (textResources && groupComponent) {
      const titleKey = groupComponent.textResourceBindings?.title;
      setTitle(
        (titleKey &&
          getTextFromAppOrDefault(
            titleKey,
            textResources,
            {}, // TODO: Figure out if this should pass `language` instead
            [],
            true,
          )) ||
          '',
      );
    }
  }, [textResources, groupComponent]);

  React.useEffect(() => {
    if (groupComponent && groupComponent.children) {
      setGroupChildComponents(
        groupComponent.edit?.multiPage
          ? groupComponent.children.map((childId) => childId.split(':')[1] || childId)
          : groupComponent.children,
      );
    }
  }, [groupComponent]);

  const getRepeatingGroup = (containerId: string | undefined) => {
    const id = index !== undefined && index >= 0 && parentGroup ? `${containerId}-${index}` : containerId;
    if (id !== undefined && repeatingGroups && repeatingGroups[id]) {
      return repeatingGroups[id];
    }

    return undefined;
  };

  const { startIndex, stopIndex } = getRepeatingGroupStartStopIndex(
    getRepeatingGroup(componentRef)?.index ?? -1,
    groupComponent?.edit,
  );

  React.useEffect(() => {
    let groupErrors = false;
    if (!largeGroup) {
      for (let i = startIndex; i <= stopIndex; i++) {
        if (groupErrors) {
          break;
        }

        groupChildComponents.forEach((componentId: string) => {
          const component = layout?.find((c: ILayoutComponent) => c.id === componentId);
          const mainIndex = typeof index === 'number' && index >= 0 ? `-${index}` : '';
          const componentIdWithIndex = component && `${component.id}${mainIndex}-${i}`;

          if (pageRef && componentIdWithIndex && validations[pageRef] && validations[pageRef][componentIdWithIndex]) {
            groupErrors = true;
          }
        });
      }
      setGroupHasErrors(groupErrors);
    }
  }, [validations, largeGroup, pageRef, groupChildComponents, layout, index, stopIndex, startIndex]);

  const createRepeatingGroupSummaryComponents = () => {
    const componentArray: JSX.Element[] = [];
    for (let i = startIndex; i <= stopIndex; ++i) {
      const childSummaryComponents = groupChildComponents.map((componentId: string) => {
        const componentIdSuffix = `${typeof index === 'number' && index >= 0 ? `-${index}` : ''}-${i}`;
        if (hiddenFields.has(`${componentId}-${i}`) || hiddenFields.has(`${componentId}${componentIdSuffix}`)) {
          return null;
        }

        const component = layout.find((c: ILayoutComponent) => c.id === componentId);
        const componentDeepCopy = JSON.parse(JSON.stringify(component));
        componentDeepCopy.id = `${componentDeepCopy.id}${componentIdSuffix}`;

        const dmBindings = component?.dataModelBindings || {};
        Object.keys(dmBindings).forEach((key) => {
          let binding = dmBindings[key].replace(
            groupComponent?.dataModelBindings?.group,
            `${groupComponent?.dataModelBindings?.group}[${i}]`,
          );
          if (parentGroup) {
            const { dataModelBindings } = layout.find((c) => c.id === parentGroup) || {};
            binding = binding.replace(dataModelBindings?.group, `${dataModelBindings?.group}[${index}]`);
          }
          componentDeepCopy.dataModelBindings[key] = binding;
        });

        if (component && 'mapping' in component) {
          if (parentGroup) {
            componentDeepCopy.mapping = setMappingForRepeatingGroupComponent(componentDeepCopy.mapping, index);
          }
          componentDeepCopy.mapping = setMappingForRepeatingGroupComponent(componentDeepCopy.mapping, i);
        }

        const formDataForComponent = getDisplayFormDataForComponent(
          formData,
          attachments,
          componentDeepCopy,
          textResources,
          options,
          repeatingGroups,
        );

        const textResourceBindings = getVariableTextKeysForRepeatingGroupComponent(
          textResources,
          component?.textResourceBindings,
          i,
        );

        return (
          <GroupInputSummary
            key={componentId}
            formData={formDataForComponent}
            label={getTextFromAppOrDefault(
              textResourceBindings?.title,
              textResources,
              {}, // TODO: Figure out if this should pass `language` instead
              [],
              false,
            )}
          />
        );
      });
      componentArray.push(
        <div
          key={i}
          className={classes.border}
        >
          {childSummaryComponents}
        </div>,
      );
    }

    return componentArray;
  };

  const createRepeatingGroupSummaryForLargeGroups = () => {
    const componentArray: JSX.Element[] = [];
    for (let i = startIndex; i <= stopIndex; i++) {
      const groupContainer: ILayoutGroup = {
        id: `${groupComponent?.id}-${i}-summary`,
        type: 'Group',
        children: [],
        maxCount: 0,
        textResourceBindings: groupComponent?.textResourceBindings?.title
          ? {
              title: groupComponent.textResourceBindings.title,
            }
          : {},
      };

      const childSummaryComponents: ComponentFromSummary[] = [];
      groupChildComponents.forEach((componentId: string) => {
        if (hiddenFields.has(`${componentId}-${i}`)) {
          return;
        }

        const component = layout.find((c: ILayoutComponent) => c.id === componentId);
        const isGroupComponent = component?.type === 'Group';
        const summaryType = 'Summary';
        const summaryId = `${component?.id}-summary${isGroupComponent ? '-group' : ''}`;
        let formDataForComponent: any;
        if (!isGroupComponent) {
          formDataForComponent = getFormDataForComponentInRepeatingGroup(
            formData,
            attachments,
            component as ILayoutComponent,
            i,
            groupComponent?.dataModelBindings?.group,
            textResources,
            options,
            repeatingGroups,
          );
        }
        groupContainer.children.push(summaryId);

        const summaryComponent: ComponentFromSummary = {
          id: summaryId,
          type: summaryType,
          componentRef: component?.id,
          pageRef: pageRef,
          dataModelBindings: {},
          textResourceBindings: {},
          readOnly: false,
          required: false,
          formData: formDataForComponent,
          index: i,
          parentGroup: isGroupComponent ? groupComponent?.id : undefined,
          display,
        };

        childSummaryComponents.push(summaryComponent);
      });

      componentArray.push(
        <DisplayGroupContainer
          key={`${groupContainer.id}-summary`}
          components={childSummaryComponents}
          container={groupContainer}
          renderLayoutComponent={renderLayoutComponent}
        />,
      );
    }
    return componentArray;
  };

  const renderComponents: any = largeGroup
    ? createRepeatingGroupSummaryForLargeGroups()
    : createRepeatingGroupSummaryComponents();

  if (largeGroup && layout) {
    return <>{renderComponents}</>;
  }

  if (!language) {
    return null;
  }

  return (
    <>
      <Grid
        container={true}
        data-testid={'summary-group-component'}
      >
        <Grid
          item={true}
          xs={10}
        >
          <Typography
            variant='body1'
            className={cn(classes.label, groupHasErrors && classes.labelWithError)}
            component='span'
          >
            {title}
          </Typography>
        </Grid>
        <Grid
          item
          xs={2}
        >
          {!display?.hideChangeButton && (
            <EditButton
              onClick={onChangeClick}
              editText={changeText}
            />
          )}
        </Grid>
        <Grid
          item
          xs={12}
        >
          {renderComponents}
        </Grid>
      </Grid>
      {groupHasErrors && (
        <Grid
          container={true}
          style={gridStyle}
        >
          <ErrorPaper message={getLanguageFromKey('group.row_error', language)} />
          <Grid
            item={true}
            xs={12}
          >
            {!display?.hideChangeButton && (
              <button
                className={classes.link}
                onClick={onChangeClick}
                type='button'
              >
                {getTextFromAppOrDefault('form_filler.summary_go_to_correct_page', textResources, language, [], true)}
              </button>
            )}
          </Grid>
        </Grid>
      )}
    </>
  );
}

export default SummaryGroupComponent;
