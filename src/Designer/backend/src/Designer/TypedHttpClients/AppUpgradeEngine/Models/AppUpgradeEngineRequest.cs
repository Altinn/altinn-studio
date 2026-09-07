namespace Altinn.Studio.Designer.TypedHttpClients.AppUpgradeEngine.Models;

public sealed record AppUpgradeEngineRequest(
    string Kind,
    string ProjectFolder,
    string? StudioRoot,
    bool ConvertPackageReferences,
    bool AllowDirty
);
