import { useMemo } from 'react';

import { pick } from 'dot-object';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import { convertDataBindingToModel, getKeyWithoutIndexIndicators } from 'src/utils/databindings';
import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import type { IFormData } from 'src/features/formData';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { IOption, IOptionSource } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface IUseSourceOptionsArgs {
  source: IOptionSource | undefined;
  node: LayoutNode;
}

export const useSourceOptions = ({ source, node }: IUseSourceOptionsArgs): IOption[] | undefined => {
  const formData = useAppSelector((state) => state.formData.formData);
  const langTools = useLanguage(node);

  return useMemo(() => getSourceOptions({ source, node, formData, langTools }), [source, node, formData, langTools]);
};

interface IGetSourceOptionsArgs extends IUseSourceOptionsArgs {
  formData: IFormData;
  langTools: IUseLanguage;
}

export function getSourceOptions({ source, node, formData, langTools }: IGetSourceOptionsArgs): IOption[] | undefined {
  if (!source) {
    return undefined;
  }

  const { group, value, label, helpText, description } = source;
  const cleanValue = getKeyWithoutIndexIndicators(value);
  const cleanGroup = getKeyWithoutIndexIndicators(group);
  const groupPath = node.transposeDataModel(cleanGroup) || group;
  const formDataAsObject = convertDataBindingToModel(formData);
  const output: IOption[] = [];

  if (groupPath) {
    const groupData = pick(groupPath, formDataAsObject);
    if (groupData && Array.isArray(groupData)) {
      for (const idx in groupData) {
        const path = `${groupPath}[${idx}]`;
        const valuePath = transposeDataBinding({ subject: cleanValue, currentLocation: path });
        output.push({
          value: pick(valuePath, formDataAsObject),
          label: langTools.langAsStringUsingPathInDataModel(label, path),
          description: langTools.langAsStringUsingPathInDataModel(description, path),
          helpText: langTools.langAsStringUsingPathInDataModel(helpText, path),
        });
      }
    }
  }

  return output;
}
