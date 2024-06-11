using Altinn.Notifications.Core.Models;

namespace Altinn.Notifications.Core.Services.Interfaces
{
    /// <summary>
    /// Service for retrieving contact points for recipients
    /// </summary>
    public interface IContactPointService
    {
        /// <summary>
        /// Looks up and adds the email contact points for recipients based on their national identity number or organization number
        /// </summary>
        /// <param name="recipients">List of recipients to retrieve contact points for</param>
        /// <param name="resourceId">The resource to find contact points in relation to</param>
        /// <returns>The list of recipients augumented with email address points where available</returns>
        /// <remarks>Implementation alters the recipient reference object directly</remarks>
        public Task AddEmailContactPoints(List<Recipient> recipients, string? resourceId);

        /// <summary>
        /// Looks up and adds the SMS contact points for recipients based on their national identity number or organization number
        /// </summary>
        /// <param name="recipients">List of recipients to retrieve contact points for</param>
        /// <param name="resourceId">The resource to find contact points in relation to</param>
        /// <returns>The list of recipients augumented with SMS address points where available</returns>
        /// <remarks>Implementation alters the recipient reference object directly</remarks>
        public Task AddSmsContactPoints(List<Recipient> recipients, string? resourceId);
    }
}
