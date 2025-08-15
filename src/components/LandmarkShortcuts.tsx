import React from 'react';

import cn from 'classnames';

import classes from 'src/components/LandmarkShortcuts.module.css';

export interface ILandmarkShortcutsProps {
  shortcuts: ILandmarkShortcut[];
}

interface ILandmarkShortcut {
  id: string;
  text: React.ReactNode;
}

export function LandmarkShortcuts({ shortcuts }: ILandmarkShortcutsProps) {
  const handleClick = (id: string) => {
    // workaround because we still use a hash-router (sigh...)
    // can be replaced by the more elegant solution <a href="#main-content></a> once this is no longer the case.
    const target = document.getElementById(id);
    if (target) {
      const currentTabIndex = target.tabIndex;
      target.tabIndex = -1;
      target.focus();
      target.tabIndex = currentTabIndex;
    }
  };

  return (
    <div>
      {shortcuts.map((shortcut) => (
        <button
          key={shortcut.id}
          role='link'
          className={cn(classes.button, classes.srOnly)}
          onClick={() => handleClick(shortcut.id)}
        >
          {shortcut.text}
        </button>
      ))}
    </div>
  );
}
