import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { RoleList } from './RoleList';

const subjects = [
  {
    id: '1',
    legacyUrn: 'urn:altinn:rolecode:revisor',
    urn: 'urn:altinn:external-role:ccr:revisor',
    name: 'Revisor',
    description: 'Kan revidere regnskap',
    legacyRoleCode: '',
    provider: {
      id: '1',
      name: '',
      code: 'sys-altinn2',
    },
  },
  {
    id: '2',
    legacyUrn: 'urn:altinn:rolecode:skatt',
    urn: 'urn:altinn:external-role:ccr:skatt',
    name: 'Skatt',
    description: 'Skatteansvarlig',
    legacyRoleCode: 'SKT',
    provider: {
      id: '1',
      name: '',
      code: 'sys-altinn2',
    },
  },
];
const item1Title = `${subjects[0].name}`;
const item2Title = `${subjects[1].name} (${subjects[1].legacyRoleCode})`;
const selectedSubjects = [subjects[0].legacyUrn];
const handleChange = jest.fn();
const heading = 'Roles';

describe('RoleList', () => {
  afterEach(jest.clearAllMocks);

  it('should display role list items', async () => {
    renderRoleList();
    expect(screen.getByText(item1Title)).toBeInTheDocument();
    expect(screen.getByText(item2Title)).toBeInTheDocument();
    expect(screen.getByText(subjects[0].description)).toBeInTheDocument();
    expect(screen.getByText(subjects[1].description)).toBeInTheDocument();
  });

  it('should display message on no search results', async () => {
    const user = userEvent.setup();
    renderRoleList();
    await user.type(screen.getByRole('searchbox'), 'notfound');
    expect(
      screen.getByText(
        textMock('policy_editor.rule_card_subjects_search_no_results', {
          searchCollection: heading,
        }),
      ),
    ).toBeInTheDocument();
  });

  it('should show search result for title', async () => {
    const user = userEvent.setup();
    renderRoleList();
    await user.type(screen.getByRole('searchbox'), 'Revisor');
    expect(screen.getByText(item1Title)).toBeInTheDocument();
    expect(screen.queryByText(item2Title)).not.toBeInTheDocument();
  });

  it('should show search result for role code', async () => {
    const user = userEvent.setup();
    renderRoleList();
    await user.type(screen.getByRole('searchbox'), 'SKT');
    expect(screen.getByText(item2Title)).toBeInTheDocument();
    expect(screen.queryByText(item1Title)).not.toBeInTheDocument();
  });

  it('should show search result for description', async () => {
    const user = userEvent.setup();
    renderRoleList();
    await user.type(screen.getByRole('searchbox'), 'regnskap');
    expect(screen.getByText(item1Title)).toBeInTheDocument();
    expect(screen.queryByText(item2Title)).not.toBeInTheDocument();
  });

  it('should show checkbox checked for selected subject', async () => {
    renderRoleList();
    const checkbox = screen.getByLabelText(item1Title);
    expect(checkbox).toBeChecked();
  });

  it('should call onChange when checkbox is checked', async () => {
    const user = userEvent.setup();
    renderRoleList();
    const checkbox = screen.getByLabelText(item1Title);
    await user.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(subjects[0].urn, subjects[0].legacyUrn);
  });
});

const renderRoleList = () => {
  return render(
    <RoleList
      selectedSubjects={selectedSubjects}
      subjects={subjects}
      heading={heading}
      handleChange={handleChange}
    />,
  );
};
