import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioCodeViewer } from './StudioCodeViewer';

const meta = {
  title: 'Components/StudioCodeViewer',
  component: StudioCodeViewer,
  args: { texts: { collapse: 'Skjul innholdet', expand: 'Vis innholdet' } },
} satisfies Meta<typeof StudioCodeViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    title: 'App/config/applicationmetadata.json',
    language: 'json',
    code: JSON.stringify(
      {
        id: 'ttd/my-app',
        org: 'ttd',
        title: { nb: 'Min app' },
        dataTypes: [{ id: 'model', allowedContentTypes: ['application/xml'], maxCount: 1 }],
        partyTypesAllowed: { person: true, organisation: false },
      },
      null,
      2,
    ),
  },
};

export const CSharp: Story = {
  args: {
    title: 'App/logic/DataProcessor.cs',
    language: 'csharp',
    code: `using System.Threading.Tasks;

namespace Altinn.App.Logic;

/// <summary>Sets default values in the data model.</summary>
public class DataProcessor : IDataProcessor
{
    public Task ProcessDataRead(Instance instance, object data, string? language)
    {
        var count = 42;
        return Task.CompletedTask;
    }
}
`,
  },
};

export const PlainText: Story = {
  args: {
    title: '.gitignore',
    code: 'bin/\nobj/\n*.user\n',
  },
};
