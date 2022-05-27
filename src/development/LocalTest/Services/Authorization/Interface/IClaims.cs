using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Altinn.Platform.Authorization.Services.Interface
{
    public interface IClaims
    {
        public Task<List<Claim>> GetCustomClaims(int userId, string issuer);
    }
}
