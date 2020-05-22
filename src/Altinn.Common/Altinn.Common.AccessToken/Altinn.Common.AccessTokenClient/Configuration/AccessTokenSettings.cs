using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Common.AccessTokenClient.Configuration
{
    public class AccessTokenSettings
    {
        public bool DisableAccesTokenGeneration { get; set;  }

        public string AccessTokenHeaderId { get; set; } = "PlatformAccessToken";

        public string AccessTokenSigningKeysFolder { get; set; } = "clientsigningkeys/";

        public int TokenExpirySeconds { get; set; } = 300;
    }
}
