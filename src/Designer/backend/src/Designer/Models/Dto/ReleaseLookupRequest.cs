namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// An app version to look up. The version is the release's tag name.
/// </summary>
public record ReleaseLookupRequest(string Org, string App, string Version);
