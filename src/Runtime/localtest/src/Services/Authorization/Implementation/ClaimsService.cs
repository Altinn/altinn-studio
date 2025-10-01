#nullable enable
using System.Security.Claims;
using Altinn.Platform.Authorization.Services.Interface;
using LocalTest.Services.TestData;

namespace LocalTest.Services.Authorization.Implementation
{
    public class ClaimsService : IClaims
    {
        private readonly TestDataService _testDataService;

        public ClaimsService(TestDataService testDataService)
        {
            _testDataService = testDataService;
        }

        public async Task<List<Claim>> GetCustomClaims(int userId, string issuer)
        {
            var data = await _testDataService.GetTestData();
            if(data.Authorization.Claims.TryGetValue(userId.ToString(), out var customClaims))
            {
                return customClaims.Select(c => new Claim(c.Type, c.Value, c.ValueType, issuer)).ToList();
            }

            return new List<Claim>();
        }
    }
}
