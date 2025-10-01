#nullable enable
using System.Security.Claims;

namespace Altinn.Platform.Authorization.Services.Interface
{
    public interface IClaims
    {
        public Task<List<Claim>> GetCustomClaims(int userId, string issuer);
    }
}
