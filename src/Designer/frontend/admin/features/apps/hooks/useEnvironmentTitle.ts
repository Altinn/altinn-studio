import { useTranslation } from 'react-i18next';

export const useEnvironmentTitle = (env: string): string => {
  const { t } = useTranslation();
  return env === 'production'
    ? t('general.production_environment_alt').toLowerCase()
    : `${t('general.test_environment_alt').toLowerCase()} ${env?.toUpperCase()}`;
};
