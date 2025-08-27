import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { StatusRadioGroup } from './StatusRadioGroup';
import type { StatusRadioGroupProps } from './StatusRadioGroup';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { LabelAndValue } from '../../../../../../types/LabelAndValue';
import { getStatusOptions } from '../../utils/appConfigStatusUtils';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';

describe('StatusRadioGroup', () => {
  afterEach(jest.clearAllMocks);

  it('renders the radio group heading and tag', () => {
    renderStatusRadioGroup();

    expect(getText(textMock('app_settings.about_tab_status_field_label'))).toBeInTheDocument();
    expect(getText(textMock('general.required'))).toBeInTheDocument();
  });

  it('renders all status options', () => {
    renderStatusRadioGroup();

    const options: LabelAndValue[] = getStatusOptions(textMock);
    options.forEach((option: LabelAndValue) => {
      expect(getLabelText(option.label)).toBeInTheDocument();
    });
  });

  it('does not select any option when selectedStatus is undefined', () => {
    renderStatusRadioGroup({ selectedStatus: undefined });
    const options: LabelAndValue[] = getStatusOptions(textMock);
    options.forEach((option: LabelAndValue) => {
      expect(getLabelText(option.label)).not.toBeChecked();
    });
  });

  it('preselects the correct option based on selectedStatus', () => {
    renderStatusRadioGroup({ selectedStatus: 'UnderDevelopment' });

    expect(screen.getByLabelText(completedText)).not.toBeChecked();
    expect(screen.getByLabelText(deprecatedText)).not.toBeChecked();
    expect(screen.getByLabelText(underDevelopmentText)).toBeChecked();
    expect(screen.getByLabelText(withdrawnText)).not.toBeChecked();
  });

  it('calls onChangeStatus when an option is clicked', async () => {
    const onChangeStatus = jest.fn();
    renderStatusRadioGroup({ onChangeStatus });

    const user = userEvent.setup();
    await user.click(getLabelText(completedText));

    expect(onChangeStatus).toHaveBeenCalledTimes(1);
    expect(onChangeStatus).toHaveBeenCalledWith('Completed', '');
  });

  it('renders error message when errors are present', () => {
    renderStatusRadioGroup({ errors });
    expect(getText(textMock('app_settings.about_tab_status_field_error'))).toBeInTheDocument();
  });
});

const defaultProps: StatusRadioGroupProps = {
  selectedStatus: undefined,
  onChangeStatus: jest.fn(),
  errors: [],
  id: 'status-radio-group',
};

function renderStatusRadioGroup(props: Partial<StatusRadioGroupProps> = {}) {
  return render(<StatusRadioGroup {...defaultProps} {...props} />);
}

const getText = (name: string): HTMLParagraphElement => screen.getByText(name);
const getLabelText = (name: string): HTMLLabelElement => screen.getByLabelText(name);

const completedText: string = textMock('app_settings.about_tab_status_completed');
const deprecatedText: string = textMock('app_settings.about_tab_status_deprecated');
const underDevelopmentText: string = textMock('app_settings.about_tab_status_under_development');
const withdrawnText: string = textMock('app_settings.about_tab_status_withdrawn');

const error: AppConfigFormError = {
  field: 'status',
  error: textMock('app_settings.about_tab_status_field_error'),
};
const errors: AppConfigFormError[] = [error];
