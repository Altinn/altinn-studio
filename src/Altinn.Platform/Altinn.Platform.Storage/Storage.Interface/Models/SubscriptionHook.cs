namespace Storage.Interface.Models
{
    /// <summary>
    /// Model for the subscription hook
    /// </summary>
    public class SubscriptionHook
    {
        /// <summary>
        /// If the hook is active
        /// </summary>
        [JsonProperty(PropertyName = "active")]
        public bool Active { get; set; }

        /// <summary>
        /// The service code
        /// </summary>
        [JsonProperty(PropertyName = "serviceCode")]
        public string ServiceCode { get; set; }

        /// <summary>
        ///  The edition code
        /// </summary>
        [JsonProperty(PropertyName = "editionCode")]
        public string EditionCode { get; set; }
    }
}
