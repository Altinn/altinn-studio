import BpmnModdle from 'bpmn-moddle';
import { useBpmnQuery } from './queries/useBpmnQuery';
import { useBpmnMutation } from './mutations/useBpmnMutation';

type Definitions = BpmnModdle.Definitions;

const updateBpmn = async (
  bpmnXml: string,
  saveBpmnXml: (data: { form: FormData }) => void,
  updateCriteria: (definitions: Definitions) => boolean,
) => {
  const moddle = new BpmnModdle();

  const { rootElement } = await moddle.fromXML(bpmnXml);
  const definitions = rootElement as Definitions;

  const hasChanged = updateCriteria(definitions);
  if (hasChanged) {
    const { xml } = await moddle.toXML(definitions, { format: true });

    const formData = new FormData();
    formData.append('content', new Blob([xml]));

    saveBpmnXml({ form: formData });
  }
};

export const useUpdateBpmn = (org: string, app: string) => {
  const { refetch: refetchBpmn } = useBpmnQuery(org, app, false);
  const { mutate: mutateBpmn } = useBpmnMutation(org, app);

  return async (updateCriteria: (definitions: Definitions) => boolean) => {
    const { data: bpmnXml } = await refetchBpmn();
    await updateBpmn(bpmnXml, mutateBpmn, updateCriteria);
  };
};
