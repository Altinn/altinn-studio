using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Common.AccessToken.Configuration
{
    public class AccessTokenSettings
    {
        public bool DisableAccesTokenVerification { get; set;  }

        public string AccessTokenHeaderId { get; set; } = "AltinnAccessToken";
    }
}
