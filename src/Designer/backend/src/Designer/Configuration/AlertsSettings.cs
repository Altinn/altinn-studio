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
        /// Gets or sets Slack webhook URL for TT02.
        /// </summary>
        public Uri TT02 { get; set; }

        /// <summary>
        /// Gets or sets Slack webhook URL for production.
        /// </summary>
        public Uri Prod { get; set; }

        /// <summary>
        /// Returns the Slack webhook URL for the given environment.
        /// </summary>
        public Uri GetSlackWebhookUrl(AltinnEnvironment environment)
        {
            return environment.IsProd() ? Prod : TT02;
        }
    }
}
