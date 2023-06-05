import type { IUseLanguage } from 'src/hooks/useLanguage';

/**
 * @param maxLength - max length of input
 * @param lang - language function from useLanguage()
 * @returns {maxCount: number, label: (count: number) => string, srLabel: string}
 */
export const createCharacterLimit = (maxLength: number, lang: IUseLanguage['lang']) => ({
  maxCount: maxLength,
  label: (count: number) =>
    count >= 0
      ? (lang('input_components.remaining_characters', [`${count}`]) as string)
      : (lang('input_components.exceeded_max_limit', [`${Math.abs(count)}`]) as string),

  srLabel: lang('input_components.character_limit_sr_label', [`${maxLength}`]) as string,
});
