namespace Altinn.Studio.Designer.Telemetry;

internal static partial class ServiceTelemetry
{
    /// <summary>
    /// The names of the attributes Designer puts on its telemetry: the OpenTelemetry semantic conventions it sets
    /// itself, the shared Altinn vocabulary, and Designer's own under altinn.designer
    /// (https://github.com/Altinn/altinn-studio/issues/21073).
    /// </summary>
    public static class Attributes
    {
        public const string ServiceVersion = "service.version";
        public const string UrlFull = "url.full";

        /// <summary>
        /// Marks a span whose trace the collectors' tail sampling always keeps.
        /// </summary>
        public const string Sampling = "altinn.studio.sampling";
    }
}
