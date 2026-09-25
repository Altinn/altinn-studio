import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';

export type FixtureOptions = {
  controlled?: boolean;
  creatable?: boolean;
  multiple?: boolean;
  unmountOnClick?: boolean;
  rejectMatch?: boolean;
  rejectChange?: boolean;
};

const initialSelection = { value: '1', label: 'First' };

function Fixture({
  controlled,
  creatable,
  multiple,
  unmountOnClick,
  rejectMatch,
  rejectChange,
}: FixtureOptions) {
  const [selection, setSelection] = useState<StudioSuggestionItem | null>(initialSelection);
  const [changes, setChanges] = useState<Array<string | string[] | null>>([]);
  const [visible, setVisible] = useState(true);
  const recordChange = (item: StudioSuggestionItem | StudioSuggestionItem[] | null): void => {
    setChanges((previous) => [
      ...previous,
      Array.isArray(item) ? item.map(({ value }) => value) : (item?.value ?? null),
    ]);
  };
  const selectionProps = multiple
    ? {
        multiple: true as const,
        defaultSelected: [initialSelection],
        onSelectedChange: recordChange,
      }
    : {
        multiple: false as const,
        ...(controlled ? { selected: selection } : { defaultSelected: initialSelection }),
        onSelectedChange: (item: StudioSuggestionItem | null) => {
          recordChange(item);
          if (!rejectChange) setSelection(item);
        },
      };

  return (
    <div data-size='sm' style={{ width: 400, padding: 24 }}>
      {visible && (
        <StudioSuggestion
          {...selectionProps}
          label='Choice'
          emptyText='No options'
          creatable={creatable}
          onBeforeMatch={(event) => {
            if (rejectMatch) event.preventDefault();
          }}
        >
          <StudioSuggestion.Option value='1' label='First'>
            First
          </StudioSuggestion.Option>
          <StudioSuggestion.Option value='2' label='Second'>
            Second
          </StudioSuggestion.Option>
        </StudioSuggestion>
      )}
      <div style={{ position: 'absolute', left: 500, top: 24, width: 300 }}>
        <button
          onClick={() => {
            if (unmountOnClick) flushSync(() => setVisible(false));
          }}
        >
          Outside
        </button>
        <StudioSuggestion label='Other choice' emptyText='No options'>
          <StudioSuggestion.Option value='other'>Other</StudioSuggestion.Option>
        </StudioSuggestion>
      </div>
      <output aria-label='Changes'>{JSON.stringify(changes)}</output>
    </div>
  );
}

export function mount(options: FixtureOptions): void {
  createRoot(document.getElementById('root')).render(<Fixture {...options} />);
}
