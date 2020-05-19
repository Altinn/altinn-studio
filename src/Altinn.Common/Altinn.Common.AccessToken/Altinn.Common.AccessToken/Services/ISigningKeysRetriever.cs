using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Common.AccessToken.Services
{
    public interface ISigningKeysRetriever
    {
        Task <IEnumerable<SecurityKey>> GetSigningKeys(string issuer);
    }
}
