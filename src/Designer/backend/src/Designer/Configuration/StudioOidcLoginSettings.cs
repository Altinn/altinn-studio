namespace Altinn.Studio.Designer.Configuration;

public class StudioOidcLoginSettings : OidcLoginSettings
{
    public string? AcrValues { get; set; }
    public string? ValidIssuer { get; set; }
}
