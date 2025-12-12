using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class RuntimeGatewaySettings : ISettingsMarker
{
    public string ProdUrlFormat { get; set; } = "https://{0}.apps.altinn.no/runtime/gateway/api/v1";
    public string TtUrlFormat { get; set; } = "https://{0}.apps.{1}.altinn.no/runtime/gateway/api/v1";
    public string AtYtUrlFormat { get; set; } = "https://{0}.apps.{1}.altinn.cloud/runtime/gateway/api/v1";
}
