namespace Altinn.Platform.Storage.Configuration
{
    /// <summary>
    /// Policy Enforcement Point configuration settings
    /// </summary>
    public class PepSettings
    {
        /// <summary>
        /// Gets or sets to disable pep er not
        /// </summary>
        public bool DisablePEP { get; set; }

        /// <summary>
        /// The timout on pdp decions
        /// </summary>
        public int PdpDecisionCachingTimeout { get; set; }
    }
}
