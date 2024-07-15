import BpmnModdle from 'bpmn-moddle';
import { useBpmnQuery } from 'app-development/hooks/queries/useBpmnQuery';
import { useBpmnMutation } from 'app-development/hooks/mutations';

const removeDataTypesToSignFromSigningTasks = async (
  dataTypeIds: string[],
  bpmnXml: string,
  saveBpmnXml: (data: { form: FormData }) => void,
) => {
  let hasChanged = false;
  const moddle = new BpmnModdle();

  const { rootElement: definitions } = await moddle.fromXML(bpmnXml);

  definitions.rootElements[0].flowElements.forEach((flowElement) => {
    if (flowElement.$type !== 'bpmn:Task') return;

    flowElement.extensionElements.values[0].$children.forEach((child) => {
      if (child.$type === 'altinn:signatureConfig') {
        child.$children?.forEach((subChild) => {
          if (subChild.$type === 'altinn:dataTypesToSign') {
            const filteredChildren = subChild.$children?.filter(
              (item) => !dataTypeIds.includes(item.$body),
            );
            if (filteredChildren.length !== subChild.$children.length) {
              hasChanged = true;
              subChild.$children = filteredChildren;
            }
          }
        });
      }
    });
  });

  if (hasChanged) {
    const { xml } = await moddle.toXML(definitions, { format: true });

    const formData = new FormData();
    formData.append('content', new Blob([xml]), 'process.bpmn');

    saveBpmnXml({ form: formData });
  }
};

export const useRemoveDataTypesToSignFromSigningTasks = (org: string, app: string) => {
  const { refetch: refetchBpmn } = useBpmnQuery(org, app, false);
  const { mutate: mutateBpmn } = useBpmnMutation(org, app);

  return async (dataTypeIds: string[]) => {
    const { data: bpmnXml } = await refetchBpmn();
    await removeDataTypesToSignFromSigningTasks(dataTypeIds, bpmnXml, mutateBpmn);
  };
};
