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
import {
  getDisplayFormDataForComponent,
  getFormDataForComponentInRepeatingGroup,
} from 'src/utils/formComponentUtils';
import { setMappingForRepeatingGroupComponent } from 'src/utils/formLayout';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type {
  ILayout,
  ILayoutComponent,
  ILayoutGroup,
} from 'src/features/form/layout';
import type { IRuntimeState } from 'src/types';

import appTheme from 'altinn-shared/theme/altinnAppTheme';
import { getLanguageFromKey } from 'altinn-shared/utils';

export interface ISummaryGroupComponent {
  pageRef?: string;
  componentRef?: string;
  index?: number;
  changeText: string;
  onChangeClick: () => void;
  largeGroup?: boolean;
  parentGroup?: string;
}

export function getComponentForSummaryGroup(
  layout: ILayout,
  groupId: string,
): ILayoutGroup {
  return layout.find((component) => component.id === groupId) as ILayoutGroup;
}

const gridStyle = {
  paddingTop: '12px',
};

const useStyles = makeStyles({
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
}: ISummaryGroupComponent) {
  const classes = useStyles();

  const [title, setTitle] = React.useState<string>('');
  const [groupHasErrors, setGroupHasErrors] = React.useState<boolean>(false);
  const [groupChildComponents, setGroupChildComponents] = React.useState<
    string[]
  >([]);

  const groupComponent = useAppSelector(
    (state) =>
      getComponentForSummaryGroup(
        state.formLayout.layouts[pageRef],
        componentRef,
      ),
    shallowEqual,
  );
  const repeatingGroups = useAppSelector(
    (state) => state.formLayout.uiConfig.repeatingGroups,
  );
  const layout = useAppSelector((state) => state.formLayout.layouts[pageRef]);
  const formData = useAppSelector((state) => state.formData.formData);
  const textResources = useAppSelector(
    (state) => state.textResources.resources,
  );
  const language = useAppSelector((state) => state.language.language);
  const options = useAppSelector((state) => state.optionState.options);
  const attachments = useAppSelector(
    (state: IRuntimeState) => state.attachments.attachments,
  );
  const validations = useAppSelector(
    (state) => state.formValidations.validations,
  );
  const hiddenFields = useAppSelector(
    (state) => new Set(state.formLayout.uiConfig.hiddenFields),
  );

  React.useEffect(() => {
    if (textResources && groupComponent) {
      const titleKey = groupComponent.textResourceBindings?.title;
      setTitle(
        getTextFromAppOrDefault(titleKey, textResources, null, [], true),
      );
    }
  }, [textResources, groupComponent]);

  React.useEffect(() => {
    if (groupComponent && groupComponent.children) {
      setGroupChildComponents(
        groupComponent.edit?.multiPage
          ? groupComponent.children.map(
              (childId) => childId.split(':')[1] || childId,
            )
          : groupComponent.children,
      );
    }
  }, [groupComponent]);

  const getRepeatingGroup = (containerId: string) => {
    const id =
      index >= 0 && parentGroup ? `${containerId}-${index}` : containerId;
    if (repeatingGroups && repeatingGroups[id]) {
      return repeatingGroups[id];
    }

    return undefined;
  };

  const getRepeatingGroupMaxIndex = (containerId: string) => {
    const repeatingGroup = getRepeatingGroup(containerId);
    if (repeatingGroup && repeatingGroup.index >= 0) {
      return repeatingGroup.index;
    }
    return -1;
  };

  const repeatingGroupMaxIndex = getRepeatingGroupMaxIndex(componentRef);

  React.useEffect(() => {
    let groupErrors = false;
    if (!largeGroup) {
      for (let i = 0; i <= repeatingGroupMaxIndex; i++) {
        if (groupErrors) {
          break;
        }

        groupChildComponents.forEach((componentId: string) => {
          const component: ILayoutComponent = layout.find(
            (c: ILayoutComponent) => c.id === componentId,
          ) as ILayoutComponent;
          const componentIdWithIndex = `${component.id}${
            index >= 0 ? `-${index}` : ''
          }-${i}`;

          if (
            validations[pageRef] &&
            validations[pageRef][componentIdWithIndex]
          ) {
            groupErrors = true;
          }
        });
      }
      setGroupHasErrors(groupErrors);
    }
  }, [
    validations,
    largeGroup,
    pageRef,
    groupChildComponents,
    repeatingGroupMaxIndex,
    layout,
    index,
  ]);

  const createRepeatingGroupSummaryComponents = () => {
    const componentArray = [];
    for (let i = 0; i <= repeatingGroupMaxIndex; ++i) {
      const childSummaryComponents = groupChildComponents.map(
        (componentId: string) => {
          const componentIdSuffix = `${index >= 0 ? `-${index}` : ''}-${i}`;
          if (
            hiddenFields.has(`${componentId}-${i}`) ||
            hiddenFields.has(`${componentId}${componentIdSuffix}`)
          ) {
            return null;
          }

          const component: ILayoutComponent = layout.find(
            (c: ILayoutComponent) => c.id === componentId,
          ) as ILayoutComponent;
          const componentDeepCopy = JSON.parse(JSON.stringify(component));
          componentDeepCopy.id = `${componentDeepCopy.id}${componentIdSuffix}`;

          Object.keys(component.dataModelBindings).forEach((key) => {
            let binding = component.dataModelBindings[key].replace(
              groupComponent.dataModelBindings.group,
              `${groupComponent.dataModelBindings.group}[${i}]`,
            );
            if (parentGroup) {
              const { dataModelBindings } = layout.find(
                (c) => c.id === parentGroup,
              );
              binding = binding.replace(
                dataModelBindings.group,
                `${dataModelBindings.group}[${index}]`,
              );
            }
            componentDeepCopy.dataModelBindings[key] = binding;
          });

          if ('mapping' in component) {
            componentDeepCopy.mapping = setMappingForRepeatingGroupComponent(
              component.mapping,
              index,
            );

            if (parentGroup) {
              componentDeepCopy.mapping = setMappingForRepeatingGroupComponent(
                componentDeepCopy.mapping,
                i,
              );
            }
          }

          const formDataForComponent = getDisplayFormDataForComponent(
            formData,
            attachments,
            componentDeepCopy,
            textResources,
            options,
            repeatingGroups,
          );

          return (
            <GroupInputSummary
              key={componentId}
              formData={formDataForComponent}
              label={getTextFromAppOrDefault(
                component.textResourceBindings?.title,
                textResources,
                null,
                [],
                false,
              )}
            />
          );
        },
      );
      componentArray.push(
        <div
          key={i}
          style={{ paddingBottom: 24 }}
        >
          {childSummaryComponents}
        </div>,
      );
    }

    return componentArray;
  };

  const createRepeatingGroupSummaryForLargeGroups = () => {
    const componentArray = [];
    for (let i = 0; i <= repeatingGroupMaxIndex; i++) {
      const groupContainer: ILayoutGroup = {
        id: `${groupComponent.id}-${i}-summary`,
        type: 'Group',
        children: [],
        maxCount: 0,
        textResourceBindings: {
          title: groupComponent.textResourceBindings?.title,
        },
      };
      const childSummaryComponents = [];
      groupChildComponents.forEach((componentId: string) => {
        if (hiddenFields.has(`${componentId}-${i}`)) {
          return;
        }

        const component = layout.find(
          (c: ILayoutComponent) => c.id === componentId,
        );
        const isGroupComponent = component.type === 'Group';
        const summaryType = 'Summary';
        const summaryId = `${component.id}-summary${
          isGroupComponent ? '-group' : ''
        }`;
        let formDataForComponent: any;
        if (!isGroupComponent) {
          formDataForComponent = getFormDataForComponentInRepeatingGroup(
            formData,
            attachments,
            component as ILayoutComponent,
            i,
            groupComponent.dataModelBindings.group,
            textResources,
            options,
            repeatingGroups,
          );
        }
        groupContainer.children.push(summaryId);

        const summaryComponent = {
          id: summaryId,
          type: summaryType,
          componentRef: component.id,
          pageRef: pageRef,
          dataModelBindings: {},
          textResourceBindings: {},
          readOnly: false,
          required: false,
          formData: formDataForComponent,
          index: i,
          parentGroup: isGroupComponent ? groupComponent.id : undefined,
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
            className={cn(
              classes.label,
              groupHasErrors && classes.labelWithError,
            )}
            component='span'
          >
            {title}
          </Typography>
        </Grid>
        <Grid
          item
          xs={2}
        >
          <EditButton
            onClick={onChangeClick}
            editText={changeText}
          />
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
          <ErrorPaper
            message={getLanguageFromKey('group.row_error', language)}
          />
          <Grid
            item={true}
            xs={12}
          >
            <button
              className={classes.link}
              onClick={onChangeClick}
              type='button'
            >
              {getTextFromAppOrDefault(
                'form_filler.summary_go_to_correct_page',
                textResources,
                language,
                [],
                true,
              )}
            </button>
          </Grid>
        </Grid>
      )}
    </>
  );
}

export default SummaryGroupComponent;
