namespace Altinn.Studio.Designer.Repository.Models;

/// <summary>
/// Identifies a release by the app it belongs to and its tag name, which is also the image tag an environment runs.
/// </summary>
public sealed record ReleaseLookupKey(string Org, string App, string TagName);
