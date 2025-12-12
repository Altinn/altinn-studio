using System;
using Altinn.Studio.Designer.Configuration.Marker;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Configuration;

public class RuntimeGatewaySettings : ISettingsMarker
{
    public string ProdUrlFormat { get; set; } = "https://{0}.apps.altinn.no/runtime/gateway/api/v1";
    public string TestUrlFormat { get; set; } = "https://{0}.apps.{1}.altinn.no/runtime/gateway/api/v1";

}
