namespace Altinn.Studio.Designer.Telemetry;

/// <summary>
/// How an app was created.
/// </summary>
public enum AppCreationSource
{
    /// <summary>
    /// From an app template, with the custom templates the developer picked.
    /// </summary>
    Template,

    /// <summary>
    /// As a copy of another app.
    /// </summary>
    Copy,
}
