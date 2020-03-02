using System.Net.Http;

namespace Altinn.Platform.Receipt.Clients
{
    /// <summary>
    /// Interface for http client accessor
    /// </summary>
    public interface IHttpClientAccessor
    {
        /// <summary>
        /// An Http StorageClient that communicates with the Altinn Platform Storage component
        /// </summary>
        HttpClient StorageClient { get; }

        /// <summary>
        /// An Http RegisterClient that communicates with the Altinn Platform Register component
        /// </summary>
        HttpClient RegisterClient { get; }

        /// <summary>
        /// An Http ProfileClient that communicates with the Altinn Platform Profile component.
        /// </summary>
        HttpClient ProfileClient { get; }
    }
}
