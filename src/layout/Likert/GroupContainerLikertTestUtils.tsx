import React from 'react';

import { screen, within } from '@testing-library/react';
import type { PayloadAction } from '@reduxjs/toolkit';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { GroupContainerTester } from 'src/layout/Group/GroupContainerTestUtills';
import { setupStore } from 'src/redux/store';
import { mockMediaQuery, renderWithProviders } from 'src/testUtils';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { IFormDataState } from 'src/features/formData';
import type { IUpdateFormData } from 'src/features/formData/formDataTypes';
import type { ILayoutState } from 'src/features/layout/formLayoutSlice';
import type { ITextResourcesState } from 'src/features/textResources';
import type { IValidationState } from 'src/features/validation/validationSlice';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ComponentInGroup, ILayoutComponent } from 'src/layout/layout';
import type { ILayoutCompLikert } from 'src/layout/Likert/types';
import type { ILayoutValidations, IOption, ITextResource } from 'src/types';

export const defaultMockQuestions = [
  { Question: 'Hvordan trives du på skolen?', Answer: '' },
  { Question: 'Har du det bra?', Answer: '' },
  { Question: 'Hvor god er du i matte?', Answer: '' },
];

const groupBinding = 'Questions';
const answerBinding = 'Answer';
const questionBinding = 'Question';

export const generateMockFormData = (likertQuestions: IQuestion[]): Record<string, string> =>
  likertQuestions.reduce(
    (formData, likertQuestion, index) => ({
      ...formData,
      [`${groupBinding}[${index}].${answerBinding}`]: likertQuestion.Answer,
      [`${groupBinding}[${index}].${questionBinding}`]: likertQuestion.Question,
    }),
    {},
  );

export const defaultMockOptions = [
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

const createLikertContainer = (
  props: Partial<ExprUnresolved<ILayoutGroup>> | undefined,
): ExprUnresolved<ILayoutGroup> => ({
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
});

const createRadioButton = (
  props: Partial<ExprUnresolved<ILayoutCompLikert>> | undefined,
): ExprUnresolved<ILayoutCompLikert> => ({
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
  ...props,
});

export const createFormDataUpdateAction = (index: number, optionValue: string): PayloadAction<IUpdateFormData> => ({
  payload: {
    componentId: `field1-${index}`,
    data: optionValue,
    field: `Questions[${index}].Answer`,
    skipValidation: false,
  },
  type: FormDataActions.update.type,
});

const createLayout = (
  container: ExprUnresolved<ILayoutGroup>,
  components: ExprUnresolved<ILayoutComponent | ComponentInGroup>[],
  groupIndex: number,
): ILayoutState => ({
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
    tracks: {
      order: null,
      hidden: [],
      hiddenExpr: {},
    },
    pageTriggers: [],
    excludePageFromPdf: [],
    excludeComponentFromPdf: [],
  },
});

export const createFormError = (index: number): ILayoutValidations => ({
  [`field1-${index}`]: {
    simpleBinding: {
      errors: ['Feltet er påkrevd'],
      warnings: [],
    },
  },
});

const createFormValidationsForCurrentView = (validations: ILayoutValidations = {}): IValidationState => ({
  error: null,
  invalidDataTypes: [],
  validations: { FormLayout: validations },
});

const createTextResource = (questions: IQuestion[], extraResources: ITextResource[]): ITextResourcesState => ({
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
    ...questions.map((question, index) => ({
      id: `likert-questions-${index}`,
      value: question.Question,
    })),
    ...extraResources,
  ],
  language: 'nb',
  error: null,
});

const { setScreenWidth } = mockMediaQuery(992);

interface IQuestion {
  Question: string;
  Answer: string;
}

interface IRenderProps {
  mobileView: boolean;
  mockQuestions: IQuestion[];
  mockOptions: IOption[];
  radioButtonProps: Partial<ExprUnresolved<ILayoutCompLikert>>;
  likertContainerProps: Partial<ExprUnresolved<ILayoutGroup>>;
  extraTextResources: ITextResource[];
  validations: ILayoutValidations;
}

export const render = ({
  mobileView = false,
  mockQuestions = defaultMockQuestions,
  mockOptions = defaultMockOptions,
  radioButtonProps,
  likertContainerProps,
  extraTextResources = [],
  validations,
}: Partial<IRenderProps> = {}) => {
  const mockRadioButton = createRadioButton(radioButtonProps);
  const mockLikertContainer = createLikertContainer(likertContainerProps);
  const components: ExprUnresolved<ComponentInGroup>[] = [mockRadioButton];
  const mockData: IFormDataState = {
    formData: generateMockFormData(mockQuestions),
    lastSavedFormData: {},
    error: null,
    submittingId: '',
    savingId: '',
    unsavedChanges: false,
    saving: false,
  };

  const preloadedState = getInitialStateMock({
    formLayout: createLayout(mockLikertContainer, components, mockQuestions.length - 1),
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
      loading: false,
    },
  });

  const mockStore = setupStore(preloadedState).store;
  const mockStoreDispatch = jest.fn();
  mockStore.dispatch = mockStoreDispatch;
  setScreenWidth(mobileView ? 600 : 1200);
  renderWithProviders(<GroupContainerTester id={mockLikertContainer.id} />, {
    store: mockStore,
  });

  return { mockStoreDispatch };
};

export const validateTableLayout = (questions: IQuestion[], options: IOption[]) => {
  screen.getByRole('table');

  for (const option of defaultMockOptions) {
    const columnHeader = screen.getByRole('columnheader', {
      name: new RegExp(option.label),
    });
    expect(columnHeader).toBeInTheDocument();
  }

  validateRadioLayout(questions, options);
};

export const validateRadioLayout = (questions: IQuestion[], options: IOption[], mobileView = false) => {
  if (mobileView) {
    expect(screen.getAllByRole('radiogroup')).toHaveLength(questions.length);
  } else {
    expect(screen.getAllByRole('row')).toHaveLength(questions.length + 1);
  }

  for (const question of questions) {
    const row = mobileView
      ? within(
          screen.getByRole('group', {
            name: question.Question,
          }),
        ).getByRole('radiogroup')
      : screen.getByRole('row', {
          name: question.Question,
        });

    for (const option of options) {
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
