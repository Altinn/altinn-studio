import { render, screen } from '@testing-library/react';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { isTaskReceipt, taskNavigationIcon, taskNavigationType } from './SettingsUtils';

describe('taskNavigationType', () => {
  it('should return the correct text key', () => {
    expect(taskNavigationType('receipt')).toBe(
      'process_editor.configuration_panel_custom_receipt_accordion_header',
    );
    expect(taskNavigationType(PROTECTED_TASK_NAME_CUSTOM_RECEIPT)).toBe(
      'process_editor.configuration_panel_custom_receipt_accordion_header',
    );
    expect(taskNavigationType('data')).toBe('process_editor.task_type.data');
    expect(taskNavigationType('feedback')).toBe('process_editor.task_type.feedback');
    expect(taskNavigationType('payment')).toBe('process_editor.task_type.payment');
    expect(taskNavigationType('signing')).toBe('process_editor.task_type.signing');
    expect(taskNavigationType('confirmation')).toBe('process_editor.task_type.confirmation');
  });
});

describe('taskNavigationIcon', () => {
  it('should return the correct icon', () => {
    render(taskNavigationIcon('receipt'));
    expect(screen.getByTestId('receipt')).toBeInTheDocument();

    render(taskNavigationIcon('data'));
    expect(screen.getByTestId('data')).toBeInTheDocument();

    render(taskNavigationIcon('signing'));
    expect(screen.getByTestId('signing')).toBeInTheDocument();

    render(taskNavigationIcon('payment'));
    expect(screen.getByTestId('payment')).toBeInTheDocument();

    render(taskNavigationIcon('feedback'));
    expect(screen.getByTestId('questionMark')).toBeInTheDocument();
  });
});

describe('isTaskReceipt', () => {
  it('should return true if taskType is receipt', () => {
    expect(isTaskReceipt('receipt')).toBe(true);
  });

  it('should return true if taskType is custom receipt', () => {
    expect(isTaskReceipt(PROTECTED_TASK_NAME_CUSTOM_RECEIPT)).toBe(true);
  });

  it('should return false if taskType is not receipt or PROTECTED_TASK_NAME_CUSTOM_RECEIPT', () => {
    expect(isTaskReceipt('data')).toBe(false);
  });
});
