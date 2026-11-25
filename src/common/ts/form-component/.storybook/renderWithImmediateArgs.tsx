import { useCallback, useState } from 'react';
import type { ComponentType } from 'react';

import { useArgs } from 'storybook/preview-api';
import type { Args } from '@storybook/react-vite';

export interface StoryArgsProps<TArgs> {
  args: TArgs;
  updateArgs: (update: Partial<TArgs>) => void;
}

/**
 * Returns a story `render` that gives `Component` the story's args, and a function that updates them in Controls.
 * Updates show immediately. `useArgs` from `storybook/preview-api` applies them asynchronously, so a controlled
 * input rendered from its args alone drops fast keystrokes.
 */
export function renderWithImmediateArgs<TArgs extends Args>(
  Component: ComponentType<StoryArgsProps<TArgs>>,
) {
  // useArgs only works while Storybook calls render, and React re-renders the component that holds `pending`
  // on its own, so the two live in separate components.
  function ImmediateArgs({ args, updateArgs }: StoryArgsProps<TArgs>) {
    const [pending, setPending] = useState<Partial<TArgs> | null>(null);
    const caughtUp =
      pending !== null &&
      (Object.keys(pending) as (keyof TArgs)[]).every((key) => isSameArg(pending[key], args[key]));
    if (caughtUp) {
      setPending(null);
    }

    const update = useCallback(
      (newArgs: Partial<TArgs>) => {
        setPending((prev) => ({ ...prev, ...newArgs }));
        updateArgs(newArgs);
      },
      [updateArgs],
    );

    return <Component args={{ ...args, ...pending }} updateArgs={update} />;
  }

  return function Render(args: TArgs) {
    const [, updateArgs] = useArgs<TArgs>();
    return <ImmediateArgs args={args} updateArgs={updateArgs} />;
  };
}

// Storybook rebuilds object and array args when it stores them, so those are compared by content.
function isSameArg(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  return (
    typeof a === 'object' &&
    typeof b === 'object' &&
    a !== null &&
    b !== null &&
    JSON.stringify(a) === JSON.stringify(b)
  );
}
