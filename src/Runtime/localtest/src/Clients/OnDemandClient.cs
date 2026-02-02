using System.IO;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Clients;

/// <summary>
/// Mock implementation of <see cref="IOnDemandClient"/> for local testing.
/// </summary>
public class OnDemandClient : IOnDemandClient
{
    /// <inheritdoc/>
    public Task<Stream> GetStreamAsync(string path)
    {
        // Return empty stream for local testing
        return Task.FromResult<Stream>(new MemoryStream());
    }
}