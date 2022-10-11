import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockDelayBeforeSaving } from 'src/components/hooks/useDelayedSavedState';
import {
  createFormDataUpdateAction,
  createFormError,
  defaultMockQuestions,
  mockOptions,
  questionsWithAnswers,
  render,
  validateRadioLayout,
  validateTableLayout,
} from 'src/features/form/containers/GroupContainerLikertTestUtils';

describe('GroupContainerLikert', () => {
  describe('Desktop', () => {
    it('should render table using options and not optionsId', () => {
      render({
        radioButtonProps: {
          optionsId: 'non-existing-options-id',
          options: mockOptions,
        },
      });
      validateTableLayout(defaultMockQuestions);
    });

    it('should render title, description and left column header', () => {
      render({
        likertContainerProps: {
          textResourceBindings: {
            title: 'Test title',
            description: 'Test description',
            leftColumnHeader: 'Test left column header',
          },
        },
      });
      expect(screen.getByText('Test title')).toBeInTheDocument();
      expect(
        screen.getByRole('table', { name: 'Test title' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(
        screen.getByRole('columnheader', { name: 'Test left column header' }),
      ).toBeInTheDocument();
    });

    it('should render table with one selected row', () => {
      const questions = questionsWithAnswers({
        questions: defaultMockQuestions,
        selectedAnswers: [{ questionIndex: 1, answerValue: '2' }],
      });
      render({ mockQuestions: questions });

      validateTableLayout(questions);
    });

    it('should render table with two selected row', () => {
      const selectedAnswers = [
        {
          questionIndex: 1,
          answerValue: '2',
        },
        {
          questionIndex: 2,
          answerValue: '1',
        },
      ];

      const questions = questionsWithAnswers({
        questions: defaultMockQuestions,
        selectedAnswers,
      });

      render({ mockQuestions: questions });
      validateTableLayout(questions);
    });

    it('should render table with start binding', () => {
      render({
        likertContainerProps: {
          edit: {
            mode: 'likert',
            filter: [{ key: 'start', value: '2' }],
          },
        },
      });

      validateTableLayout(defaultMockQuestions.slice(2));
    });

    it('should render table with end binding', () => {
      render({
        likertContainerProps: {
          edit: {
            mode: 'likert',
            filter: [{ key: 'stop', value: '3' }],
          },
        },
      });

      validateTableLayout(defaultMockQuestions.slice(0, 3));
    });

    it('should render table with start and end binding', () => {
      render({
        likertContainerProps: {
          edit: {
            mode: 'likert',
            filter: [
              { key: 'start', value: '1' },
              { key: 'stop', value: '3' },
            ],
          },
        },
      });

      validateTableLayout(defaultMockQuestions.slice(1, 3));
    });

    it('should render table view and click radiobuttons', async () => {
      const { mockStoreDispatch } = render();
      validateTableLayout(defaultMockQuestions);

      const rad1 = screen.getByRole('row', {
        name: /Hvordan trives du på skolen/i,
      });
      const btn1 = within(rad1).getByRole('radio', {
        name: /Bra/i,
      });

      const rad2 = screen.getByRole('row', {
        name: /Har du det bra/i,
      });

      const btn2 = within(rad2).getByRole('radio', {
        name: /Dårlig/i,
      });

      mockDelayBeforeSaving(25);

      mockStoreDispatch.mockClear();
      expect(btn1).not.toBeChecked();
      await userEvent.click(btn1);
      expect(mockStoreDispatch).not.toHaveBeenCalled();
      await new Promise((r) => setTimeout(r, 25));
      expect(mockStoreDispatch).toHaveBeenCalledWith(
        createFormDataUpdateAction(0, '1'),
      );

      mockStoreDispatch.mockClear();
      expect(btn2).not.toBeChecked();
      await userEvent.click(btn2);
      expect(mockStoreDispatch).not.toHaveBeenCalledTimes(2);
      await new Promise((r) => setTimeout(r, 25));
      expect(mockStoreDispatch).toHaveBeenCalledWith(
        createFormDataUpdateAction(1, '3'),
      );

      mockDelayBeforeSaving(undefined);
    });

    it('should render standard view and use keyboard to navigate', async () => {
      const { mockStoreDispatch } = render();
      validateTableLayout(defaultMockQuestions);

      mockDelayBeforeSaving(25);

      await userEvent.tab();
      await userEvent.keyboard('[Space]');
      expect(mockStoreDispatch).not.toHaveBeenCalled();
      await new Promise((r) => setTimeout(r, 25));
      expect(mockStoreDispatch).toHaveBeenCalledWith(
        createFormDataUpdateAction(0, '1'),
      );

      mockDelayBeforeSaving(undefined);
    });

    it('should support nested binding for question text in data model', async () => {
      const extraTextResources = defaultMockQuestions.map((question, i) => ({
        value: question.Question,
        id: `nested-question-binding-${i}`,
      }));
      const mockQuestions = defaultMockQuestions.map((question, i) => ({
        ...question,
        Question: `nested-question-binding-${i}`,
      }));
      render({ mockQuestions, extraTextResources });
      validateTableLayout(defaultMockQuestions);
    });

    it('should render error message', async () => {
      render({
        validations: createFormError(1),
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Feltet er påkrevd');
      screen.getByText(/En av radene er ikke fylt ut riktig/i);
    });

    it('should render 2 alerts', async () => {
      render({
        validations: { ...createFormError(1), ...createFormError(2) },
      });
      expect(screen.getAllByRole('alert')).toHaveLength(2);
      screen.getByText(/En av radene er ikke fylt ut riktig/i);
    });

    it('should display title and description', async () => {
      render({
        likertContainerProps: {
          textResourceBindings: {
            title: 'Likert test title',
            description: 'This is a test description',
          },
        },
      });
      expect(
        screen.getByRole('table', { name: /Likert test title/i }),
      ).toHaveAccessibleDescription('This is a test description');
    });
  });
  describe('Mobile', () => {
    it('should display title and description', async () => {
      render({
        likertContainerProps: {
          textResourceBindings: {
            title: 'Likert test title',
            description: 'This is a test description',
          },
        },
        mobileView: true,
      });
      expect(
        screen.getByRole('group', { name: /Likert test title/i }),
      ).toHaveAccessibleDescription('This is a test description');
    });

    it('should render mobile view and click radiobuttons', async () => {
      const { mockStoreDispatch } = render({ mobileView: true });
      validateRadioLayout(defaultMockQuestions, true);
      const rad1 = screen.getByRole('radiogroup', {
        name: /Hvordan trives du på skolen/i,
      });
      const btn1 = within(rad1).getByRole('radio', {
        name: /Bra/i,
      });

      mockDelayBeforeSaving(25);

      expect(btn1).not.toBeChecked();
      await userEvent.click(btn1);
      expect(mockStoreDispatch).not.toHaveBeenCalled();
      await new Promise((r) => setTimeout(r, 25));
      expect(mockStoreDispatch).toHaveBeenCalledWith(
        createFormDataUpdateAction(0, '1'),
      );
      mockStoreDispatch.mockClear();

      const rad2 = screen.getByRole('radiogroup', {
        name: /Har du det bra/i,
      });

      const btn2 = within(rad2).getByRole('radio', {
        name: /Dårlig/i,
      });

      expect(btn2).not.toBeChecked();
      await userEvent.click(btn2);
      expect(mockStoreDispatch).not.toHaveBeenCalledTimes(2);
      await new Promise((r) => setTimeout(r, 25));
      expect(mockStoreDispatch).toHaveBeenCalledWith(
        createFormDataUpdateAction(1, '3'),
      );

      mockDelayBeforeSaving(undefined);
    });

    it('should render mobile view with selected values', () => {
      const questions = questionsWithAnswers({
        questions: defaultMockQuestions,
        selectedAnswers: [{ questionIndex: 2, answerValue: '2' }],
      });

      render({ mockQuestions: questions, mobileView: true });
      validateRadioLayout(questions, true);

      // Validate that radio is selected
      const selectedRow = screen.getByRole('radiogroup', {
        name: questions[2].Question,
      });

      const selectedRadio = within(selectedRow).getByRole('radio', {
        name: /Ok/i,
      });
      expect(selectedRadio).toBeChecked();
    });

    it('should render error message', async () => {
      render({
        validations: { ...createFormError(1), ...createFormError(2) },
        mobileView: true,
      });
      expect(screen.getAllByRole('alert')).toHaveLength(2);
    });

    it('should render mobile layout with start and end binding', () => {
      render({
        mobileView: true,
        likertContainerProps: {
          edit: {
            mode: 'likert',
            filter: [
              { key: 'start', value: '1' },
              { key: 'stop', value: '3' },
            ],
          },
        },
      });

      validateRadioLayout(defaultMockQuestions.slice(1, 3), true);
    });
  });
});
