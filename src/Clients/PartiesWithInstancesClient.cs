using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Clients
{
    /// <summary>
    /// Represents an implementation of <see cref="IPartiesWithInstancesClient"/> using a HttpClient.
    /// </summary>
    public class PartiesWithInstancesClient : IPartiesWithInstancesClient
    {
        /// <inheritdoc />
        public async Task SetHasAltinn3Instances(int instanceOwnerPartyId)
        {
            await Task.CompletedTask;
        }
    }
}
