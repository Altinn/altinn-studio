using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.IntegrationTest.Helpers
{
    /// <summary>
    /// Class to set http client in RuntimeControllerTest
    /// </summary>
    public class HttpClientHelper
    {
        /// <summary>
        /// Client attribute.
        /// </summary>
        public static HttpClient Client { get; set; }
    }
}
