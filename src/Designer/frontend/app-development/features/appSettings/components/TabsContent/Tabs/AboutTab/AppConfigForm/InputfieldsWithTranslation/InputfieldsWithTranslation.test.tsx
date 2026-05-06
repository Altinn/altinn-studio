import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { InputfieldsWithTranslation } from './InputfieldsWithTranslation';
import type { InputfieldsWithTranslationProps } from './InputfieldsWithTranslation';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import type { SupportedLanguage } from 'app-shared/types/SupportedLanguages';

describe('InputfieldsWithTranslation', () => {
  afterEach(jest.clearAllMocks);

  it('renders NB field with correct label and description', () => {
    renderInputfieldsWithTranslation();

    expect(getTextbox(`${label} (${textMock('language.nb')})`)).toBeInTheDocument();
    expect(getText(description)).toBeInTheDocument();
  });

  it('displays error for NB field if provided', () => {
    const nbError: string = 'NB Error';
    const errors: AppConfigFormError[] = [{ field: 'serviceName', error: nbError, index: 'nb' }];
    renderInputfieldsWithTranslation({ errors });

    expect(getText(nbError)).toBeInTheDocument();
  });

  it('calls updateLanguage when NB field is typed into', async () => {
    const user = userEvent.setup();
    const updateLanguage = jest.fn();
    renderInputfieldsWithTranslation({ updateLanguage });

    const input = getTextbox(`${label} (${textMock('language.nb')})`);
    const newText: string = 'A';
    await user.type(input, newText);

    expect(updateLanguage).toHaveBeenCalledTimes(1);
    expect(updateLanguage).toHaveBeenLastCalledWith({
      ...defaultProps.value,
      nb: value.nb + newText,
    });
  });

  it('clears focus query param when switching language tab', async () => {
    const user = userEvent.setup();
    renderInputfieldsWithTranslation({ route: '/?focus=test-id-nb' });
    await user.click(screen.getByRole('tab', { name: `${textMock('language.nn')} ${label}` }));
    expect(getLocationSearch()).toBeEmptyDOMElement();
  });
});

const label = textMock('label');
const description = textMock('some_description_translation');
const value: SupportedLanguage = { nb: 'Tjeneste', nn: '', en: '' };

const defaultProps: InputfieldsWithTranslationProps = {
  id: 'test-id',
  label,
  description,
  value,
  updateLanguage: jest.fn(),
  errors: [],
  isTextArea: false,
  required: true,
};

type RenderInputfieldsWithTranslationArgs = Partial<InputfieldsWithTranslationProps> & {
  route?: string;
};

function renderInputfieldsWithTranslation({
  route = '/',
  ...props
}: RenderInputfieldsWithTranslationArgs = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <InputfieldsWithTranslation {...defaultProps} {...props} />
      <TestLocationSearch />
    </MemoryRouter>,
  );
}

const getTextbox = (name: string): HTMLInputElement => screen.getByRole('textbox', { name });
const getText = (name: string): HTMLElement => screen.getByText(name);
const getLocationSearch = (): HTMLElement => screen.getByTestId('location-search');

function TestLocationSearch() {
  const location = useLocation();
  return <div data-testid='location-search'>{location.search}</div>;
}
