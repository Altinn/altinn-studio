using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// The releases found for the requested app versions. A version without a succeeded release has none.
/// </summary>
public sealed record ReleaseLookupResponse(IReadOnlyList<ReleaseLookupResult> Releases);

/// <summary>
/// The commit an app version was built from.
/// </summary>
public sealed record ReleaseLookupResult(string Org, string App, string Version, string Commit, DateTime Created);
