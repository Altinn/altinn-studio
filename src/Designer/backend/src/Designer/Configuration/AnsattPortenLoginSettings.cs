#nullable disable
namespace Altinn.Studio.Designer.Configuration;

public class AnsattPortenLoginSettings : OidcLoginSettings
{
    public string AcrValues { get; set; }
    public AutorizationDetail[] AuthorizationDetails { get; set; }
}

public class AutorizationDetail
{
    public string Type { get; set; }
    public string Resource { get; set; }
}
