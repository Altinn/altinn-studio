import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { TabsLayout } from './TabsLayout';
import type { TabsLayoutTab } from './TabsLayout';

const tabs: TabsLayoutTab[] = [
  { id: 'tab1', title: 'tab.one', content: <p>First tab content</p> },
  { id: 'tab2', title: 'tab.two', content: <p>Second tab content</p> },
];

const overrides = { 'tab.one': 'First Tab', 'tab.two': 'Second Tab' };

describe('TabsLayout', () => {
  it('renders tab headers with translated titles', () => {
    renderWithTranslations(<TabsLayout tabs={tabs} />, { overrides });

    expect(screen.getByRole('tab', { name: 'First Tab' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Second Tab' })).toBeInTheDocument();
  });

  it("renders the first tab's content by default", () => {
    renderWithTranslations(<TabsLayout tabs={tabs} />, { overrides });

    expect(screen.getByText('First tab content')).toBeInTheDocument();
    expect(screen.queryByText('Second tab content')).not.toBeInTheDocument();
  });

  it('switches active tab on click', () => {
    renderWithTranslations(<TabsLayout tabs={tabs} />, { overrides });

    fireEvent.click(screen.getByRole('tab', { name: 'Second Tab' }));

    expect(screen.getByText('Second tab content')).toBeInTheDocument();
    expect(screen.queryByText('First tab content')).not.toBeInTheDocument();
  });

  it('respects controlled activeTab prop', () => {
    renderWithTranslations(<TabsLayout tabs={tabs} activeTab='tab2' />, { overrides });

    expect(screen.getByText('Second tab content')).toBeInTheDocument();
    expect(screen.queryByText('First tab content')).not.toBeInTheDocument();
  });

  it('calls onActiveTabChange when tab is clicked', () => {
    const onActiveTabChange = vi.fn();
    renderWithTranslations(<TabsLayout tabs={tabs} onActiveTabChange={onActiveTabChange} />, {
      overrides,
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Second Tab' }));

    expect(onActiveTabChange).toHaveBeenCalledWith('tab2');
  });

  it.each([
    ['small', 'sm'],
    ['medium', 'md'],
    ['large', 'lg'],
  ] as const)('applies size mapping correctly for %s', (size, expected) => {
    const { container } = renderWithTranslations(<TabsLayout tabs={tabs} size={size} />, {
      overrides,
    });

    expect(container.querySelector(`[data-size="${expected}"]`)).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const iconTabs: TabsLayoutTab[] = [
      { id: 'tab1', title: 'tab.one', icon: 'https://example.com/icon.svg', content: <p>First</p> },
    ];
    const { container } = renderWithTranslations(<TabsLayout tabs={iconTabs} />, { overrides });

    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('throws on invalid icon file type', () => {
    const iconTabs: TabsLayoutTab[] = [
      { id: 'tab1', title: 'tab.one', icon: 'https://example.com/icon.txt', content: <p>First</p> },
    ];

    // Suppress the expected React error boundary noise.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderWithTranslations(<TabsLayout tabs={iconTabs} />, { overrides })).toThrow();
    } finally {
      spy.mockRestore();
    }
  });

  it('throws on icon without file extension', () => {
    const iconTabs: TabsLayoutTab[] = [
      { id: 'tab1', title: 'tab.one', icon: 'https://example.com/icon', content: <p>First</p> },
    ];

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderWithTranslations(<TabsLayout tabs={iconTabs} />, { overrides })).toThrow();
    } finally {
      spy.mockRestore();
    }
  });

  it('renders form-content-{componentId} wrapper when componentId is set', () => {
    const { container } = renderWithTranslations(<TabsLayout tabs={tabs} componentId='my-tabs' />, {
      overrides,
    });

    expect(container.querySelector('#form-content-my-tabs')).toBeInTheDocument();
  });

  it('does not render form-content- wrapper when componentId is undefined', () => {
    const { container } = renderWithTranslations(<TabsLayout tabs={tabs} />, { overrides });

    expect(container.querySelector('[id^="form-content-"]')).not.toBeInTheDocument();
  });

  it('renders validation messages when provided', () => {
    renderWithTranslations(
      <TabsLayout tabs={tabs} validationMessages={<span>Validation error</span>} />,
      { overrides },
    );

    expect(screen.getByText('Validation error')).toBeInTheDocument();
  });

  it('does not render validation area when validationMessages is undefined', () => {
    const { container } = renderWithTranslations(<TabsLayout tabs={tabs} componentId='my-tabs' />, {
      overrides,
    });

    // The form-content wrapper holds only the content child, no validation area.
    const wrapper = container.querySelector('#form-content-my-tabs');
    expect(wrapper?.children).toHaveLength(1);
  });

  it('renders without any tabs gracefully', () => {
    expect(() => renderWithTranslations(<TabsLayout tabs={[]} />, { overrides })).not.toThrow();
  });
});
