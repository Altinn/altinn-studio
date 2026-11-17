import { describe, expect, it } from 'vitest';
import { createWorkflowFormData } from './workflowFormData';

describe('createWorkflowFormData', () => {
  it('puts the message fields in the form', () => {
    const formData = createWorkflowFormData({
      goal: 'Lag et skjema',
      branch: 'master',
      allowAppChanges: true,
    });

    expect(formData.get('goal')).toBe('Lag et skjema');
    expect(formData.get('branch')).toBe('master');
    expect(formData.get('allowAppChanges')).toBe('true');
    expect(formData.getAll('attachments')).toEqual([]);
  });

  it('sends each attachment as a file with its name, type and bytes', async () => {
    const formData = createWorkflowFormData({
      goal: 'Lag et skjema fra vedleggene',
      branch: 'master',
      allowAppChanges: false,
      attachments: [
        {
          name: 'krav.pdf',
          mimeType: 'application/pdf',
          dataBase64: 'data:application/pdf;base64,AQIDBA==',
        },
        { name: 'notat.txt', mimeType: 'text/plain', dataBase64: 'aGVp' },
      ],
    });

    const [pdf, text] = formData.getAll('attachments') as File[];
    expect(pdf.name).toBe('krav.pdf');
    expect(pdf.type).toBe('application/pdf');
    expect(Array.from(new Uint8Array(await pdf.arrayBuffer()))).toEqual([1, 2, 3, 4]);
    expect(text.name).toBe('notat.txt');
    expect(await text.text()).toBe('hei');
  });
});
