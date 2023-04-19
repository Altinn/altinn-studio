import { useMutation } from '@tanstack/react-query';
import { IExternalFormLayout, IFormLayouts, IInternalLayout } from '../../types/global';
import { layoutSchemaUrl } from 'app-shared/cdn-paths';
import { convertInternalToLayoutFormat } from '../../utils/formLayout';
import { QueryKey } from '../../types/QueryKey';
import { queryClient, useServicesContext } from '../../../../../app-development/common/ServiceContext';

export const useFormLayoutMutation = (org: string, app: string, layoutName: string) => {
  const { saveFormLayout } = useServicesContext();
  return useMutation({
    mutationFn: (layout: IInternalLayout) => {
      const convertedLayout: IExternalFormLayout = {
        $schema: layoutSchemaUrl(),
        data: {
          layout: convertInternalToLayoutFormat(layout),
          hidden: layout.hidden,
        },
      };
      return saveFormLayout(org, app, layoutName, convertedLayout).then(() => layout);
    },
    onSuccess: (savedLayout) => {
      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app],
        (oldData: IFormLayouts) => ({ ...oldData, [layoutName]: savedLayout })
      );
    }
  })
};
