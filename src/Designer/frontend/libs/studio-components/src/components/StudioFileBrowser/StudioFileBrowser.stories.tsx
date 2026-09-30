import { useState } from 'react';
import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { StudioFileBrowser } from './StudioFileBrowser';
import type {
  StudioFileBrowserEntry,
  StudioFileBrowserFile,
  StudioFileBrowserProps,
} from './StudioFileBrowser';

const files: Record<string, string> = {
  'App/App.csproj':
    '<Project Sdk="Microsoft.NET.Sdk.Web">\n  <PropertyGroup>\n    <TargetFramework>net8.0</TargetFramework>\n  </PropertyGroup>\n</Project>\n',
  'App/config/applicationmetadata.json': JSON.stringify(
    { id: 'ttd/my-app', org: 'ttd', title: { nb: 'Min app' } },
    null,
    2,
  ),
  'App/logic/DataProcessor.cs':
    'namespace Altinn.App.Logic;\n\npublic class DataProcessor\n{\n    // Add your logic here.\n}\n',
};

const directories: Record<string, string[]> = {
  '': ['App'],
  App: ['App/config', 'App/logic', 'App/App.csproj'],
  'App/config': ['App/config/applicationmetadata.json'],
  'App/logic': ['App/logic/DataProcessor.cs'],
};

function toEntry(path: string): StudioFileBrowserEntry {
  return {
    name: path.split('/').pop(),
    path,
    type: path in directories ? 'directory' : 'file',
  };
}

function StudioFileBrowserExample(props: Pick<StudioFileBrowserProps, 'texts'>): ReactElement {
  const [path, setPath] = useState('App');
  const [file, setFile] = useState<StudioFileBrowserFile | undefined>(undefined);

  return (
    <div style={{ height: '480px' }}>
      <StudioFileBrowser
        {...props}
        directory={{ path, status: 'loaded', entries: directories[path].map(toEntry) }}
        file={file}
        onOpenDirectory={(newPath) => {
          setPath(newPath);
          setFile(undefined);
        }}
        onOpenFile={(filePath) =>
          setFile({ path: filePath, status: 'loaded', content: files[filePath] })
        }
      />
    </div>
  );
}

const meta = {
  title: 'Components/StudioFileBrowser',
  component: StudioFileBrowserExample,
} satisfies Meta<typeof StudioFileBrowserExample>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preview: Story = {
  args: {
    texts: {
      breadcrumbsLabel: 'Mappesti',
      root: 'Hjem',
      loadingDirectory: 'Laster inn filer …',
      emptyDirectory: 'Mappen er tom.',
      loadingFile: 'Laster inn innhold …',
      noFileSelected: 'Velg en fil for å se innholdet.',
      collapseCode: 'Skjul innholdet',
      expandCode: 'Vis innholdet',
    },
  },
};
