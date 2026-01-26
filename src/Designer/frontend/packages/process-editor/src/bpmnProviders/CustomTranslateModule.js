import { t } from 'i18next';

/**
 * Custom translate module that uses i18next for translations.
 * This allows bpmn-js palette and context pad to use the same
 * translation system as the rest of the application.
 *
 * @param {string} template - The translation key or template string
 * @param {Object} replacements - Optional replacements for interpolation
 * @returns {string} The translated string
 */
function customTranslate(template, replacements) {
  return t(template, replacements);
}

const CustomTranslateModule = {
  translate: ['value', customTranslate],
};

export default CustomTranslateModule;
