using System.Net.Http;

namespace Altinn.Common.PEP.Clients
{
    /// <summary>
    /// Interface for http client accessor
    /// </summary>
    public interface IHttpClientAccessor
    {
        /// <summary>
        /// An Http Authorization client that communicates with the Altinn Platform Authorization component.
        /// </summary>
        HttpClient AuthorizationClient { get; }
    }
}
