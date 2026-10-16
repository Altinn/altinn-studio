import { t } from 'i18next';

/**
 * The name a task gets when it is added to the process from the palette. The name is saved in the
 * app's process definition, so it is always Norwegian, whatever language Studio is shown in.
 * @param paletteId The palette entry id, for example `user-controlled-signing`.
 */
export const getDefaultTaskName = (paletteId: string): string =>
  t(`process_editor.default_task_name.${paletteId.replaceAll('-', '_')}`, { lng: 'nb' });
