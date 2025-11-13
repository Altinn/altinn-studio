using System;
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Studio gateway settings
    /// </summary>
    public class StudioGatewaySettings : ISettingsMarker
    {
        public StudioGatewayEnvSettings Test { get; set; }
        public StudioGatewayEnvSettings Prod { get; set; }

        public StudioGatewayEnvSettings GetSettings(string env)
        {
            return string.Equals(env, "prod", StringComparison.OrdinalIgnoreCase) ? Prod : Test;
        }
    }
}
