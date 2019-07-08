namespace Storage.Interface.Models
{
    /// <summary>
    /// Model of application hooks
    /// </summary>
    public class Hooks
    {
        /// <summary>
        /// The subscription hook
        /// </summary>
        [JsonProperty(PropertyName = "subscriptionHook")]
        public SubscriptionHook SubscriptionHook { get; set; }
    }
}
