using System;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// The commit an app version was built from.
/// </summary>
public record ReleaseLookupResponse(string Org, string App, string Version, string Commit, DateTime Created);
