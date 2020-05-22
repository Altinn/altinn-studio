using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Common.AccessTokenClient.Services
{
    public interface IAccessTokenGenerator
    {
        string GenerateAccessToken(string issuer, string app);
    }
}
