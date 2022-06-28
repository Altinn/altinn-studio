import React from "react";
import { screen, within } from "@testing-library/react";
import { mockMediaQuery, renderWithProviders } from "../../../../testUtils";
import type { ILayoutComponent, ILayoutGroup } from "src/features/form/layout";
import type { ILayoutState } from "src/features/form/layout/formLayoutSlice";
import type { IFormDataState } from "src/features/form/data/formDataReducer";
import type { ITextResourcesState } from "src/shared/resources/textResources/textResourcesReducer";
import { getInitialStateMock } from "../../../../__mocks__/initialStateMock";
import { setupStore } from "src/store";
import { GroupContainer } from "src/features/form/containers/GroupContainer";
import type { ILayoutValidations, ITextResource } from "src/types";
import type { IValidationState } from "src/features/form/validation/validationSlice";

export const defaultMockQuestions = [
  { Question: "Hvordan trives du på skolen?", Answer: "" },
  { Question: "Har du det bra?", Answer: "" },
  { Question: "Hvor god er du i matte?", Answer: "" },
  { Question: "Hvor god er du i javascript?", Answer: "" },
  { Question: "Hvor god er du i css?", Answer: "" },
  { Question: "Hvordan trives du ute i skogen?", Answer: "" },
];

const groupBinding = "Questions";
const answerBinding = "Answer";
const questionBinding = "Question";

export const generateMockFormData = (
  likertQuestions: IQuestion[]
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
    label: "Bra",
    value: "1",
  },
  {
    label: "Ok",
    value: "2",
  },
  {
    label: "Dårlig",
    value: "3",
  },
];

const createLikertContainer = (props: Partial<ILayoutGroup>): ILayoutGroup => {
  return {
    id: "likert-repeating-group-id",
    type: "Group",
    children: ["field1"],
    maxCount: 99,
    dataModelBindings: {
      group: groupBinding,
    },
    edit: {
      mode: "likert",
    },
    ...props,
  };
};

const createRadioButton = (
  props: Partial<ILayoutComponent>
): ILayoutComponent => {
  return {
    id: "field1",
    type: "Likert",
    dataModelBindings: {
      simpleBinding: `${groupBinding}.${answerBinding}`,
    },
    textResourceBindings: {
      title: "likert-questions",
    },
    optionsId: "option-test",
    readOnly: false,
    required: false,
    disabled: false,
    ...props,
  };
};

export const createFormDataUpdateAction = (
  index: number,
  optionValue: string
) => {
  return {
    payload: {
      componentId: `field1-${index}`,
      data: optionValue,
      field: `Questions[${index}].Answer`,
      skipValidation: false,
    },
    type: "formData/update",
  };
};

const createLayout = (
  container: ILayoutGroup,
  components: ILayoutComponent[],
  groupIndex: number
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
        "likert-repeating-group-id": {
          index: groupIndex,
          editIndex: -1,
        },
      },
      currentView: "FormLayout",
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
        errors: ["Feltet er påkrevd"],
        warnings: [],
      },
    },
  };
};

const createFormValidationsForCurrentView = (
  validations: ILayoutValidations = {}
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
  extraResources: ITextResource[]
): ITextResourcesState => {
  return {
    resources: [
      {
        id: "likert-questions",
        value: "{0}",
        variables: [
          {
            key: `${groupBinding}[{0}].${questionBinding}`,
            dataSource: "dataModel.default",
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
    language: "nb",
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
  radioButtonProps: Partial<ILayoutComponent>;
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
    isSubmitting: false,
    ignoreWarnings: false,
    isSaving: false,
    responseInstance: null,
    unsavedChanges: false,
  };

  const preloadedState = getInitialStateMock({
    formLayout: createLayout(
      mockLikertContainer,
      components,
      mockQuestions.length - 1
    ),
    formData: mockData,
    formValidations: createFormValidationsForCurrentView(validations),
    textResources: createTextResource(mockQuestions, extraTextResources),
    optionState: {
      options: {
        "option-test": {
          id: "option-test",
          options: mockOptions,
          loading: false,
        },
      },
      error: null,
    },
  });

  const mockStore = setupStore(preloadedState);
  const mockStorDispatch = jest.fn();
  mockStore.dispatch = mockStorDispatch;
  setScreenWidth(mobileView ? 600 : 1200);
  renderWithProviders(
    <GroupContainer
      components={components}
      container={mockLikertContainer}
      id={mockLikertContainer.id}
    />,
    {
      store: mockStore,
    }
  );

  return { mockStorDispatch };
};

export const validateTableLayout = (questions: IQuestion[]) => {
  screen.getByRole("table");

  for (const option of mockOptions) {
    screen.getByRole("columnheader", {
      name: new RegExp(option.label),
    });
  }

  validateRadioLayout(questions);
};

export const validateRadioLayout = (questions: IQuestion[]) => {
  expect(screen.getAllByRole("radiogroup")).toHaveLength(questions.length);
  for (const question of questions) {
    const row = screen.getByRole("radiogroup", {
      name: question.Question,
    });
    for (const option of mockOptions) {
      const radio = within(row).getByRole("radio", {
        name: new RegExp(option.label),
      });
      if (question.Answer && option.value === question.Answer) {
        expect(radio).toBeChecked();
      }
    }
  }
};
