namespace Altinn.Studio.Designer.Models.App;

/// <summary>
/// Studio facade for application metadata model
/// </summary>
public class ApplicationMetadata : Altinn.App.Core.Models.ApplicationMetadata
{
    public ApplicationMetadata(string id) : base(id)
    {
    }

    /// <summary>
    /// Gets or sets the altinn nuget version
    /// Overrides the base class property to initialize with null value
    /// </summary>
    public new string AltinnNugetVersion { get; set; } = null;
}
