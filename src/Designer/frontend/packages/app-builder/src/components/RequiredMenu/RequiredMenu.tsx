import { useEffect, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckmarkIcon } from '@designer/icons';
import classes from './RequiredMenu.module.css';

export type RequiredChoice = 'required' | 'optional' | 'conditional';

const choices: RequiredChoice[] = ['required', 'optional', 'conditional'];

export type RequiredMenuProps = {
  current: RequiredChoice;
  /** Where the menu goes, below the tag it belongs to. */
  position: CSSProperties;
  onChoose: (choice: RequiredChoice) => void;
  onClose: () => void;
};

/**
 * The menu that opens from the "required" or "optional" tag after a label. The tag is drawn by the
 * shared form component, so the menu is placed below it rather than attached to it.
 */
export function RequiredMenu({
  current,
  position,
  onChoose,
  onClose,
}: RequiredMenuProps): ReactElement {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLUListElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Runs once when the menu opens, so a new onClose on each render does not move the focus.
  useEffect(() => {
    const menu = menuRef.current;
    menu?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    const document = menu?.ownerDocument;
    const handlePointerDown = (event: PointerEvent): void => {
      if (!menu?.contains(event.target as Node)) onCloseRef.current();
    };
    document?.addEventListener('pointerdown', handlePointerDown);
    return () => document?.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>): void => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
    );
    const index = items.indexOf(event.target as HTMLElement);
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    }
  };

  return (
    <ul
      ref={menuRef}
      role='menu'
      aria-label={t('app_builder.required_menu.label')}
      className={classes.menu}
      style={position}
      onKeyDown={handleKeyDown}
    >
      {choices.map((choice) => (
        <li key={choice} role='none'>
          <button
            type='button'
            role='menuitemradio'
            aria-checked={choice === current}
            className={classes.item}
            onClick={() => onChoose(choice)}
          >
            <span className={classes.check}>
              {choice === current && <CheckmarkIcon aria-hidden />}
            </span>
            {t(`app_builder.required_menu.${choice}`)}
          </button>
        </li>
      ))}
    </ul>
  );
}
