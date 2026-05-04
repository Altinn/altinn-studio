using System.IO;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Clients;

/// <summary>
/// Interface for ondemand access
/// </summary>
public interface IOnDemandClient
{
    /// <summary>
    /// Get ondemand data
    /// </summary>
    /// <param name="path">The path to access ondemand data</param>
    /// <returns>The on demand data content</returns>
    Task<Stream> GetStreamAsync(string path);
}
