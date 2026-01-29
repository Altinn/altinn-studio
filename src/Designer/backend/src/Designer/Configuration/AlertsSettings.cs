#nullable disable
using System;
using Altinn.Studio.Designer.Configuration.Marker;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Class representation for basic Alerts configuration
    /// </summary>
    public class AlertsSettings : ISettingsMarker
    {
        /// <summary>
        /// Gets or sets Slack webhook URL for TT02, AT21, AT22, AT23, AT24, YT01.
        /// </summary>
        public Uri Test { get; set; }

        /// <summary>
        /// Gets or sets Slack webhook URL for production.
        /// </summary>
        public Uri Prod { get; set; }

        /// <summary>
        /// Returns the Slack webhook URL for the given environment.
        /// </summary>
        public Uri GetSlackWebhookUrl(AltinnEnvironment environment)
        {
            return environment.IsProd() ? Prod : Test;
        }
    }
}
