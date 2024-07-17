import BpmnModdle from 'bpmn-moddle';
import { useBpmnQuery } from 'app-development/hooks/queries/useBpmnQuery';
import { useBpmnMutation } from 'app-development/hooks/mutations';

const updateBpmn = async (
  bpmnXml: string,
  saveBpmnXml: (data: { form: FormData }) => void,
  updateCriteria: (definitions) => boolean,
) => {
  let hasChanged = false;
  const moddle = new BpmnModdle();

  const { rootElement: definitions } = await moddle.fromXML(bpmnXml);

  if (updateCriteria(definitions)) {
    hasChanged = true;
  }

  if (hasChanged) {
    const { xml } = await moddle.toXML(definitions, { format: true });

    const formData = new FormData();
    formData.append('content', new Blob([xml]), 'process.bpmn');

    saveBpmnXml({ form: formData });
  }
};

export const useUpdateBpmn = (org: string, app: string) => {
  const { refetch: refetchBpmn } = useBpmnQuery(org, app, false);
  const { mutate: mutateBpmn } = useBpmnMutation(org, app);

  return async (updateCriteria: (definitions) => boolean) => {
    const { data: bpmnXml } = await refetchBpmn();
    await updateBpmn(bpmnXml, mutateBpmn, updateCriteria);
  };
};
