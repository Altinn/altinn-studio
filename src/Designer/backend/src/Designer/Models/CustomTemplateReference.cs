namespace Altinn.Studio.Designer.Models;

/// <summary>
/// Represents a reference to a custom template by owner and ID.
/// </summary>
public class CustomTemplateReference
{
    public string Owner { get; set; } = string.Empty;
    public string Id { get; set; } = string.Empty;
}
