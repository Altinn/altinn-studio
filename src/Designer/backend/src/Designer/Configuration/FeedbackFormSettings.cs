#nullable disable
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Class representation for basic FeedbackForm configuration
    /// </summary>
    public class FeedbackFormSettings : ISettingsMarker
    {
        /// <summary>
        /// Gets or sets the Slack settings
        /// </summary>
        public SlackSettings SlackSettings { get; set; }
    }

    public class SlackSettings
    {
        /// <summary>
        /// Gets or sets the WebhookUrl
        /// </summary>
        public string WebhookUrl { get; set; }
    }
}
