import React from 'react';

import { getInitialStateMock } from '__mocks__/initialStateMock';
import { screen, within } from '@testing-library/react';
import { mockMediaQuery, renderWithProviders } from 'testUtils';
import type { PayloadAction } from '@reduxjs/toolkit';

import { GroupContainer } from 'src/features/form/containers/GroupContainer';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import { setupStore } from 'src/store';
import type { IFormDataState } from 'src/features/form/data';
import type { IUpdateFormData } from 'src/features/form/data/formDataTypes';
import type {
  ILayoutCompLikert,
  ILayoutComponent,
  ILayoutGroup,
} from 'src/features/form/layout';
import type { ILayoutState } from 'src/features/form/layout/formLayoutSlice';
import type { IValidationState } from 'src/features/form/validation/validationSlice';
import type { ITextResourcesState } from 'src/shared/resources/textResources';
import type { ILayoutValidations, ITextResource } from 'src/types';

export const defaultMockQuestions = [
  { Question: 'Hvordan trives du på skolen?', Answer: '' },
  { Question: 'Har du det bra?', Answer: '' },
  { Question: 'Hvor god er du i matte?', Answer: '' },
];

const groupBinding = 'Questions';
const answerBinding = 'Answer';
const questionBinding = 'Question';

export const generateMockFormData = (
  likertQuestions: IQuestion[],
): Record<string, string> => {
  return likertQuestions.reduce((formData, likertQuestion, index) => {
    return {
      ...formData,
      [`${groupBinding}[${index}].${answerBinding}`]: likertQuestion.Answer,
      [`${groupBinding}[${index}].${questionBinding}`]: likertQuestion.Question,
    };
  }, {});
};

export const mockOptions = [
  {
    label: 'Bra',
    value: '1',
  },
  {
    label: 'Ok',
    value: '2',
  },
  {
    label: 'Dårlig',
    value: '3',
  },
];

export const questionsWithAnswers = ({ questions, selectedAnswers }) => {
  const questionsCopy = [...questions];

  selectedAnswers.forEach((answer) => {
    questionsCopy[answer.questionIndex].Answer = answer.answerValue;
  });

  return questionsCopy;
};

const createLikertContainer = (props: Partial<ILayoutGroup>): ILayoutGroup => {
  return {
    id: 'likert-repeating-group-id',
    type: 'Group',
    children: ['field1'],
    maxCount: 99,
    dataModelBindings: {
      group: groupBinding,
    },
    edit: {
      mode: 'likert',
    },
    ...props,
  };
};

const createRadioButton = (
  props: Partial<ILayoutCompLikert>,
): ILayoutCompLikert => {
  return {
    id: 'field1',
    type: 'Likert',
    dataModelBindings: {
      simpleBinding: `${groupBinding}.${answerBinding}`,
    },
    textResourceBindings: {
      title: 'likert-questions',
    },
    optionsId: 'option-test',
    readOnly: false,
    required: false,
    disabled: false,
    ...props,
  };
};

export const createFormDataUpdateAction = (
  index: number,
  optionValue: string,
): PayloadAction<IUpdateFormData> => {
  return {
    payload: {
      componentId: `field1-${index}`,
      data: optionValue,
      field: `Questions[${index}].Answer`,
      skipValidation: false,
    },
    type: FormDataActions.update.type,
  };
};

const createLayout = (
  container: ILayoutGroup,
  components: ILayoutComponent[],
  groupIndex: number,
): ILayoutState => {
  return {
    error: null,
    layoutsets: null,
    layouts: {
      FormLayout: [container, ...components],
    },
    uiConfig: {
      hiddenFields: [],
      repeatingGroups: {
        'likert-repeating-group-id': {
          index: groupIndex,
          editIndex: -1,
        },
      },
      currentView: 'FormLayout',
      focus: null,
      autoSave: null,
      fileUploadersWithTag: {},
      navigationConfig: {},
      layoutOrder: null,
      pageTriggers: [],
    },
  };
};

export const createFormError = (index: number): ILayoutValidations => {
  return {
    [`field1-${index}`]: {
      simpleBinding: {
        errors: ['Feltet er påkrevd'],
        warnings: [],
      },
    },
  };
};

const createFormValidationsForCurrentView = (
  validations: ILayoutValidations = {},
): IValidationState => {
  return {
    error: null,
    invalidDataTypes: [],
    currentSingleFieldValidation: {},
    validations: { FormLayout: validations },
  };
};

const createTextResource = (
  questions: IQuestion[],
  extraResources: ITextResource[],
): ITextResourcesState => {
  return {
    resources: [
      {
        id: 'likert-questions',
        value: '{0}',
        variables: [
          {
            key: `${groupBinding}[{0}].${questionBinding}`,
            dataSource: 'dataModel.default',
          },
        ],
      },
      ...questions.map((question, index) => {
        return {
          id: `likert-questions-${index}`,
          value: question.Question,
        };
      }),
      ...extraResources,
    ],
    language: 'nb',
    error: null,
  };
};

const { setScreenWidth } = mockMediaQuery(992);

interface IQuestion {
  Question: string;
  Answer: string;
}

interface IRenderProps {
  mobileView: boolean;
  mockQuestions: IQuestion[];
  radioButtonProps: Partial<ILayoutCompLikert>;
  likertContainerProps: Partial<ILayoutGroup>;
  extraTextResources: ITextResource[];
  validations: ILayoutValidations;
}

export const render = ({
  mobileView = false,
  mockQuestions = defaultMockQuestions,
  radioButtonProps,
  likertContainerProps,
  extraTextResources = [],
  validations,
}: Partial<IRenderProps> = {}) => {
  const mockRadioButton = createRadioButton(radioButtonProps);
  const mockLikertContainer = createLikertContainer(likertContainerProps);
  const components: ILayoutComponent[] = [mockRadioButton];
  const mockData: IFormDataState = {
    formData: generateMockFormData(mockQuestions),
    error: null,
    hasSubmitted: false,
    ignoreWarnings: false,
    submittingId: '',
    savingId: '',
    responseInstance: null,
    unsavedChanges: false,
  };

  const preloadedState = getInitialStateMock({
    formLayout: createLayout(
      mockLikertContainer,
      components,
      mockQuestions.length - 1,
    ),
    formData: mockData,
    formValidations: createFormValidationsForCurrentView(validations),
    textResources: createTextResource(mockQuestions, extraTextResources),
    optionState: {
      options: {
        'option-test': {
          id: 'option-test',
          options: mockOptions,
          loading: false,
        },
      },
      error: null,
    },
  });

  const mockStore = setupStore(preloadedState);
  const mockStoreDispatch = jest.fn();
  mockStore.dispatch = mockStoreDispatch;
  setScreenWidth(mobileView ? 600 : 1200);
  renderWithProviders(
    <GroupContainer
      components={components}
      container={mockLikertContainer}
      id={mockLikertContainer.id}
    />,
    {
      store: mockStore,
    },
  );

  return { mockStoreDispatch };
};

export const validateTableLayout = (questions: IQuestion[]) => {
  screen.getByRole('table');

  for (const option of mockOptions) {
    const columnHeader = screen.getByRole('columnheader', {
      name: new RegExp(option.label),
    });
    expect(columnHeader).toBeInTheDocument();
  }

  validateRadioLayout(questions);
};

export const validateRadioLayout = (
  questions: IQuestion[],
  mobileView = false,
) => {
  if (mobileView) {
    expect(screen.getAllByRole('radiogroup')).toHaveLength(questions.length);
  } else {
    expect(screen.getAllByRole('row')).toHaveLength(questions.length + 1);
  }

  for (const question of questions) {
    const row = screen.getByRole(mobileView ? 'radiogroup' : 'row', {
      name: question.Question,
    });

    for (const option of mockOptions) {
      // Ideally we should use `getByRole` selector here, but the tests that use this function
      // generates a DOM of several hundred nodes, and `getByRole` is quite slow since it has to traverse
      // the entire tree. Doing that in a loop (within another loop) on hundreds of nodes is not a good idea.
      // ref: https://github.com/testing-library/dom-testing-library/issues/698
      const radio = within(row).getByDisplayValue(option.value);

      if (question.Answer && option.value === question.Answer) {
        expect(radio).toBeChecked();
      } else {
        expect(radio).not.toBeChecked();
      }
    }
  }
};
