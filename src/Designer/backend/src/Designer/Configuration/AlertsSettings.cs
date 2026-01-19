#nullable disable
using System;
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Class representation for basic Alerts configuration
    /// </summary>
    public class AlertsSettings : ISettingsMarker
    {
        /// <summary>
        /// Gets or sets the Slack webhook URL
        /// </summary>
        public Uri SlackWebhookUrl { get; set; }
    }
}
