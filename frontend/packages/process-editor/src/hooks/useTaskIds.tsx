export const useTaskIds = (bpmnXml: string): string[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(bpmnXml, 'text/xml');
  const tasks = xmlDoc.getElementsByTagName('bpmn:task');

  const taskIds = Array.from(tasks).map((task) => task.getAttribute('id') || '');

  return taskIds;
};
