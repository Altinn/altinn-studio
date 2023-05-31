import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  createFormDataUpdateAction,
  createFormError,
  defaultMockOptions,
  defaultMockQuestions,
  questionsWithAnswers,
  render,
  validateRadioLayout,
  validateTableLayout,
} from 'src/layout/Likert/GroupContainerLikertTestUtils';

describe('GroupContainerLikert', () => {
  jest.useFakeTimers();

  const user = userEvent.setup({
    advanceTimers: (time) => {
      act(() => {
        jest.advanceTimersByTime(time);
      });
    },
  });

  describe('Desktop', () => {
    it('should render table using options and not optionsId', () => {
      render({
        radioButtonProps: {
          optionsId: 'non-existing-options-id',
          options: defaultMockOptions,
        },
      });
      validateTableLayout(defaultMockQuestions, defaultMockOptions);
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
      expect(screen.getByRole('table', { name: 'Test title' })).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Test left column header' })).toBeInTheDocument();
    });

    it('should render table with one selected row', () => {
      const questions = questionsWithAnswers({
        questions: defaultMockQuestions,
        selectedAnswers: [{ questionIndex: 1, answerValue: '2' }],
      });
      render({ mockQuestions: questions });

      validateTableLayout(defaultMockQuestions, defaultMockOptions);
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
      validateTableLayout(defaultMockQuestions, defaultMockOptions);
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

      validateTableLayout(defaultMockQuestions.slice(2), defaultMockOptions);
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

      validateTableLayout(defaultMockQuestions.slice(0, 3), defaultMockOptions);
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

      validateTableLayout(defaultMockQuestions.slice(1, 3), defaultMockOptions);
    });

    it('should render table view and click radiobuttons', async () => {
      const { mockStoreDispatch } = render();
      validateTableLayout(defaultMockQuestions, defaultMockOptions);

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

      mockStoreDispatch.mockClear();
      expect(btn1).not.toBeChecked();
      await act(() => user.click(btn1));
      expect(mockStoreDispatch).not.toHaveBeenCalled();
      jest.runOnlyPendingTimers();
      expect(mockStoreDispatch).toHaveBeenCalledWith(createFormDataUpdateAction(0, '1'));

      mockStoreDispatch.mockClear();
      expect(btn2).not.toBeChecked();
      await act(() => user.click(btn2));
      expect(mockStoreDispatch).not.toHaveBeenCalledTimes(2);
      jest.runOnlyPendingTimers();
      expect(mockStoreDispatch).toHaveBeenCalledWith(createFormDataUpdateAction(1, '3'));
    });

    it('should render standard view and use keyboard to navigate', async () => {
      const { mockStoreDispatch } = render();
      validateTableLayout(defaultMockQuestions, defaultMockOptions);

      await act(async () => {
        await user.tab();
        await user.keyboard('[Space]');
      });
      expect(mockStoreDispatch).not.toHaveBeenCalled();
      jest.runOnlyPendingTimers();
      expect(mockStoreDispatch).toHaveBeenCalledWith(createFormDataUpdateAction(0, '1'));
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
      validateTableLayout(defaultMockQuestions, defaultMockOptions);
      screen.getByRole('radio', { name: 'Hvordan trives du på skolen? Bra' });
      screen.getByRole('radio', { name: 'Hvordan trives du på skolen? Ok' });
      screen.getByRole('radio', { name: 'Hvordan trives du på skolen? Dårlig' });
    });

    it('should support nested binding for options label referencing text resources', async () => {
      const extraTextResources = defaultMockOptions.map((option, i) => ({
        value: option.label,
        id: `nested-option-binding-${i}`,
      }));
      const mockOptions = defaultMockOptions.map((option, i) => ({
        ...option,
        label: `nested-option-binding-${i}`,
      }));
      render({ mockOptions, extraTextResources });
      validateTableLayout(defaultMockQuestions, mockOptions);
      screen.getByRole('radio', { name: 'Hvordan trives du på skolen? Bra' });
      screen.getByRole('radio', { name: 'Hvordan trives du på skolen? Ok' });
      screen.getByRole('radio', { name: 'Hvordan trives du på skolen? Dårlig' });
    });

    it('should render error message', async () => {
      render({
        validations: createFormError(1),
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Feltet er påkrevd');
    });

    it('should render 2 alerts', async () => {
      render({
        validations: { ...createFormError(1), ...createFormError(2) },
      });
      expect(screen.getAllByRole('alert')).toHaveLength(2);
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
      expect(screen.getByRole('table', { name: /Likert test title/i })).toHaveAccessibleDescription(
        'This is a test description',
      );
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
      expect(screen.getByRole('group', { name: /Likert test title/i })).toHaveAccessibleDescription(
        'This is a test description',
      );
    });

    it('should render mobile view and click radiobuttons', async () => {
      const { mockStoreDispatch } = render({ mobileView: true });
      validateRadioLayout(defaultMockQuestions, defaultMockOptions, true);
      const rad1 = within(
        screen.getByRole('group', {
          name: /Hvordan trives du på skolen/i,
        }),
      ).getByRole('radiogroup');
      const btn1 = within(rad1).getByRole('radio', {
        name: /Bra/i,
      });

      expect(btn1).not.toBeChecked();
      await act(() => user.click(btn1));
      expect(mockStoreDispatch).not.toHaveBeenCalled();
      jest.runOnlyPendingTimers();
      expect(mockStoreDispatch).toHaveBeenCalledWith(createFormDataUpdateAction(0, '1'));
      mockStoreDispatch.mockClear();

      const rad2 = within(
        screen.getByRole('group', {
          name: /Har du det bra/i,
        }),
      ).getByRole('radiogroup');

      const btn2 = within(rad2).getByRole('radio', {
        name: /Dårlig/i,
      });

      expect(btn2).not.toBeChecked();
      await act(() => user.click(btn2));
      expect(mockStoreDispatch).not.toHaveBeenCalledTimes(2);
      jest.runOnlyPendingTimers();
      expect(mockStoreDispatch).toHaveBeenCalledWith(createFormDataUpdateAction(1, '3'));
    });

    it('should render mobile view with selected values', () => {
      const questions = questionsWithAnswers({
        questions: defaultMockQuestions,
        selectedAnswers: [{ questionIndex: 2, answerValue: '2' }],
      });

      render({ mockQuestions: questions, mobileView: true });
      validateRadioLayout(questions, defaultMockOptions, true);

      // Validate that radio is selected
      const selectedRow = within(
        screen.getByRole('group', {
          name: questions[2].Question,
        }),
      ).getByRole('radiogroup');

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

      validateRadioLayout(defaultMockQuestions.slice(1, 3), defaultMockOptions, true);
    });
  });
});
