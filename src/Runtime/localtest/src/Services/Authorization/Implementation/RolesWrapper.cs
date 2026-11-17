using Altinn.Platform.Authorization.Services.Interface;
using Authorization.Interface.Models;
using LocalTest.Services.TestData;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// Wrapper for the roles api
    /// </summary>
    public class RolesWrapper : IRoles
    {
        private readonly TestDataService _testDataService;

        /// <summary>
        /// Initializes a new instance of the <see cref="RolesWrapper"/> class
        /// </summary>
        /// <param name="testDataService">Service to fetch test data</param>
        public RolesWrapper(TestDataService testDataService)
        {
            this._testDataService = testDataService;
        }

        /// <inheritdoc />
        public async Task<List<Role>> GetDecisionPointRolesForUser(int coveredByUserId, int offeredByPartyId)
        {
            var data = await _testDataService.GetTestData();
            if (!data.Authorization.Roles.TryGetValue(coveredByUserId.ToString(), out var user))
            {
                return new List<Role>();
            }

            var roles = user.GetValueOrDefault(offeredByPartyId.ToString()) ?? [];
            // A sub-unit inherits the roles held for its main unit, as in Access Management's hierarchy
            if (data.GetInheritedFromPartyId(offeredByPartyId) is int mainUnitPartyId
                && user.TryGetValue(mainUnitPartyId.ToString(), out var mainUnitRoles))
            {
                roles = [.. roles, .. mainUnitRoles.Where(role => !roles.Any(own => string.Equals(own.Value, role.Value, StringComparison.OrdinalIgnoreCase)))];
            }

            return roles;
        }
    }
}
