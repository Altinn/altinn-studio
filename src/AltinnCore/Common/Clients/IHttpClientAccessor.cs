using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;

namespace AltinnCore.Common.Clients
{
    /// <summary>
    /// Interface for handling form data related operations
    /// </summary>
    public interface IHttpClientAccessor
    {
        /// <summary>
        /// segwsgwsg
        /// </summary>
        HttpClient Client { get; }
    }
}
