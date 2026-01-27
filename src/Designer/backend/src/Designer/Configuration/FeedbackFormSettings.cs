#nullable disable
using System;
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Class representation for basic FeedbackForm configuration
    /// </summary>
    public class FeedbackFormSettings : ISettingsMarker
    {
        /// <summary>
        /// Gets or sets the Slack webhook URL
        /// </summary>
        public Uri SlackWebhookUrl { get; set; }
    }
}
