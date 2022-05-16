using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authorization.Services.Interface;
using LocalTest.Configuration;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace LocalTest.Services.Authorization.Implementation
{
    public class ClaimsService : IClaims
    {
        private readonly LocalPlatformSettings _localPlatformSettings;

        public ClaimsService(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        public Task<List<Claim>> GetCustomClaims(int userId, string issuer)
        {
            var path = GetCustomClaimsPath(userId);

            if (File.Exists(path))
            {
                var content = File.ReadAllText(path);
                var claims = JsonConvert.DeserializeObject<List<CustomClaim>>(content) ?? new List<CustomClaim>();
                return Task.FromResult(claims.Select(c => new Claim(c.Type, c.Value, c.ValueType, issuer)).ToList());
            }

            return Task.FromResult(new List<Claim>());
        }

        private string GetCustomClaimsPath(int userId)
        {
            return _localPlatformSettings.LocalTestingStaticTestDataPath +
                   _localPlatformSettings.AuthorizationDataFolder + _localPlatformSettings.ClaimsFolder + userId +
                   ".json";
        }
    }
}
