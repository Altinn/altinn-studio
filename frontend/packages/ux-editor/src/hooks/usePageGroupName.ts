import type { GroupModel } from 'app-shared/types/api/dto/PageModel';
import { useTranslation } from 'react-i18next';

export const usePageGroupName = () => {
  const { t } = useTranslation();

  return (groupModel: GroupModel): string => {
    if (groupModel.name) return groupModel.name;
    if (groupModel.order.length === 1) return groupModel.order[0].id;
    return t('ux_editor.unknown_page_name');
  };
};
