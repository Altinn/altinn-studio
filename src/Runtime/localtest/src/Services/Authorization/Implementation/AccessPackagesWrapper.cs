using Altinn.Platform.Authorization.Services.Interface;
using LocalTest.Configuration;
using LocalTest.Services.AccessManagement.RolePackages;
using LocalTest.Services.TestData;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// Reads the access packages from the test data. When <see cref="LocalPlatformSettings.AccessPackagesFromRoles"/>
    /// is set, a user's roles for a party also give the packages Access Management derives from them.
    /// </summary>
    public class AccessPackagesWrapper : IAccessPackages
    {
        private readonly TestDataService _testDataService;
        private readonly LocalPlatformSettings _settings;

        public AccessPackagesWrapper(TestDataService testDataService, IOptions<LocalPlatformSettings> settings)
        {
            _testDataService = testDataService;
            _settings = settings.Value;
        }

        /// <inheritdoc />
        public async Task<List<string>> GetAccessPackagesForUser(int userId, int partyId)
        {
            var data = await _testDataService.GetTestData();
            var packages = HeldFor(data, userId, partyId);
            if (data.GetParentPartyId(partyId) is int mainUnitPartyId)
            {
                packages = packages.Concat(HeldFor(data, userId, mainUnitPartyId));
            }

            return packages.Distinct().ToList();
        }

        /// <inheritdoc />
        public async Task<List<string>> GetAccessPackagesForSystemUser(string systemUserId, int partyId)
        {
            var data = await _testDataService.GetTestData();
            if (!data.Authorization.SystemUsers.TryGetValue(systemUserId, out var systemUser))
            {
                return [];
            }

            var ownParty = data.Register.Party.Values.FirstOrDefault(party => party.OrgNumber == systemUser.OrgNumber);
            if (ownParty is null || (ownParty.PartyId != partyId && data.GetParentPartyId(partyId) != ownParty.PartyId))
            {
                return [];
            }

            return systemUser.AccessPackages.ToList();
        }

        private IEnumerable<string> HeldFor(TestDataModel data, int userId, int partyId)
        {
            var user = userId.ToString();
            var party = partyId.ToString();
            IEnumerable<string> packages =
                data.Authorization.AccessPackages.TryGetValue(user, out var byParty) && byParty.TryGetValue(party, out var given)
                    ? given
                    : [];

            if (_settings.AccessPackagesFromRoles
                && data.Authorization.Roles.TryGetValue(user, out var rolesByParty)
                && rolesByParty.TryGetValue(party, out var roles))
            {
                var unitType = data.GetUnitType(partyId);
                packages = packages.Concat(roles
                    .Where(role => !string.IsNullOrEmpty(role.Value))
                    .SelectMany(role => RoleAccessPackages.Embedded.GetPackages(role.Value, unitType)));
            }

            return packages;
        }
    }
}
