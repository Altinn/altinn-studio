using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Wrappers
{
    /// <summary>
    /// Interface for actions related to actor
    /// </summary>
    public interface IParties
    {
        /// <summary>
        /// Call SBL to inform about a party getting an instance of an app.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
        /// <returns>Nothing is returned.</returns>
        Task SetHasAltinn3Instances(int instanceOwnerPartyId);
    }
}
