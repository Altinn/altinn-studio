using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Common.AccessToken.Configuration
{
    public class AccessTokenSettings
    {
        public bool DisableAccesTokenVerification { get; set;  }

        public string AccessTokenHeaderId { get; set; } = "PlatformAccessToken";

        public string AccessTokenSigningKeysFolder { get; set; } = "clientsigningkeys/";

        public string AccessTokenSigningCredentialsFolder { get; set; } = "signingcredentials/";

        public int TokenExpirySeconds { get; set; } = 300;
    }
}
