using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Mappers
{
    /// <summary>
    /// A class that holds the subscription mapper configurations
    /// </summary>
    public class SubscriptionMapper : AutoMapper.Profile
    {
        /// <summary>
        /// The subscription mapper configuration
        /// </summary>
        public SubscriptionMapper()
        {
            CreateMap<SubscriptionRequestModel, Subscription>();
        }
    }
}
