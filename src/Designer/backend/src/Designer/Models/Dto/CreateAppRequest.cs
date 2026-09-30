namespace Altinn.Studio.Designer.Models.Dto;

public class CreateAppRequest
{
    public string Org { get; set; } = string.Empty;
    public string Repository { get; set; } = string.Empty;

    /// <summary>
    /// Id of the app scaffold to create the application from, e.g. "v8" or "v9". Falls back to the
    /// configured default when not set. Distinct from <see cref="Template"/>, which is a content overlay.
    /// </summary>
    public string? AppTemplate { get; set; }

    public CustomTemplateReference? Template { get; set; }
}
