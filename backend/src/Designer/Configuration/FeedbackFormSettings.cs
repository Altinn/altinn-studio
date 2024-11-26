namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Class representation for basic service configuration
    /// </summary>
    public class FeedbackFormSettings
    {
        public SlackSettings SlackSettings { get; set; }
    }

    public class SlackSettings
    {
        public string WebhookUrl { get; set; }
    }
}
