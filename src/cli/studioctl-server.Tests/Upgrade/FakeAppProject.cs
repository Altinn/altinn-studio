namespace Altinn.Studio.StudioctlServer.Tests.Upgrade;

internal sealed record FakeAppProject(
    string RootDirectory,
    string AppDirectory,
    string ProjectFile,
    string ProgramFile,
    string ProcessFile,
    string ApplicationMetadataFile,
    string UiDirectory,
    string TextsDirectory
);
