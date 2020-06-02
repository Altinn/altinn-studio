using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Common.AccessTokenClient.Constants
{
    /// <summary>
    /// Access token claim types
    /// </summary>
    public static class AccessTokenClaimTypes
    {
        /// <summary>
        /// The application claim
        /// </summary>
        public const string App = "urn:altinn:app";

        /// <summary>
        /// The component claim
        /// </summary>
        public const string Component = "urn:altinn:component";
    }
}
