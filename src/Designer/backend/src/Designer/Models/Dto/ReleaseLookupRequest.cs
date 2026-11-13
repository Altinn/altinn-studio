using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// The app versions to look up.
/// </summary>
public sealed record ReleaseLookupRequest(IReadOnlyList<ReleaseLookupItem?>? Items);

/// <summary>
/// An app version to look up. The version is the release's tag name.
/// </summary>
public sealed record ReleaseLookupItem(string Org, string App, string Version);
