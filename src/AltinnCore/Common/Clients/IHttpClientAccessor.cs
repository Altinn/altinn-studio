using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;

namespace AltinnCore.Common.Clients
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

        /// <summary>
        /// An Http Authorization client that communicates with the Altinn Platform Authorization component.
        /// </summary>
        HttpClient AuthorizationClient { get; }

        /// <summary>
        /// An Http SBLClient that communicates with SBL in Altinn II. 
        /// </summary>
        HttpClient SBLClient { get; }
    }
}
