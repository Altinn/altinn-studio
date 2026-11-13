using Altinn.Studio.Common.Domain.App;

namespace Altinn.Studio.Designer.Repository.Models;

/// <summary>
/// Identifies a release by the app it belongs to and its version, which is its tag name and the image tag an
/// environment runs.
/// </summary>
public sealed record ReleaseLookupKey(AppIdentifier App, AppVersion Version);
