import type { ComponentType } from 'app-shared/types/ComponentType';

/** The language that is edited in place. Other languages are edited in the text editor. */
export const EDITOR_LANGUAGE = 'nb';

/** The attribute that marks a text on the canvas as editable and holds its text resource key. */
export const TEXT_KEY_ATTRIBUTE = 'data-text-key';

/** The attribute on the "required" and "optional" tags after a field label. */
export const INDICATOR_ATTRIBUTE = 'data-indicator';

/** Marks a control in a preview that the user edits with, so the canvas keeps it in the tab order. */
export const CANVAS_CONTROL_ATTRIBUTE = 'data-canvas-control';

/**
 * A Likert table whose questions are written in the layout. The types are not in Studio's component
 * list, since only the app builder offers them.
 */
export const LIKERT_STATIC_TYPE = 'LikertStatic' as ComponentType;
export const LIKERT_ITEM_TYPE = 'LikertItem' as ComponentType;
