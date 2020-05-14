using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Clients
{
    /// <summary>
    /// Interface for actions related to the parties with instances resource in SBL.
    /// </summary>
    public interface IPartiesWithInstancesClient
    {
        /// <summary>
        /// Call SBL to inform about a party getting an instance of an app.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <returns>Nothing is returned.</returns>
        Task SetHasAltinn3Instances(int instanceOwnerPartyId);
    }
}
