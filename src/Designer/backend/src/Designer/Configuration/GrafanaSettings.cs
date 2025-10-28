using System;
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Grafana settings
    /// </summary>
    public class GrafanaSettings : ISettingsMarker
    {
        public GrafanaEnvSettings Test { get; set; }
        public GrafanaEnvSettings Prod { get; set; }

        public GrafanaEnvSettings GetSettings(string env)
        {
            return string.Equals(env, "prod", StringComparison.OrdinalIgnoreCase) ? Prod : Test;
        }
    }
}
