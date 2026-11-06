using Altinn.Platform.Authorization.Services.Interface;
using LocalTest.Services.AccessManagement.RolePackages;
using LocalTest.Services.TestData;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// Reads the access packages from the test data. A user's roles for a party also give the packages Access
    /// Management derives from them, and a person always holds privatperson (PRIV) for their own party, as the
    /// platform gives every person it from the register.
    /// </summary>
    public class AccessPackagesWrapper : IAccessPackages
    {
        private readonly TestDataService _testDataService;
        private readonly RoleAccessPackages _roleAccessPackages;

        public AccessPackagesWrapper(TestDataService testDataService, RoleAccessPackages roleAccessPackages)
        {
            _testDataService = testDataService;
            _roleAccessPackages = roleAccessPackages;
        }

        /// <inheritdoc />
        public async Task<List<string>> GetAccessPackagesForUser(int userId, int partyId)
        {
            var data = await _testDataService.GetTestData();
            // Roles give packages by the unit type of the party asked for, also when they are held for its main unit
            var unitType = data.GetUnitType(partyId);
            var packages = HeldFor(data, userId, partyId, unitType);
            if (data.GetInheritedFromPartyId(partyId) is int mainUnitPartyId)
            {
                packages = packages.Concat(HeldFor(data, userId, mainUnitPartyId, unitType));
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

            var ownParty = data.GetOrgUnit(systemUser.OrgNumber);
            if (ownParty is null || (ownParty.PartyId != partyId && data.GetInheritedFromPartyId(partyId) != ownParty.PartyId))
            {
                return [];
            }

            return systemUser.AccessPackages.ToList();
        }

        private IEnumerable<string> HeldFor(TestDataModel data, int userId, int partyId, string? unitType)
        {
            var user = userId.ToString();
            var party = partyId.ToString();
            IEnumerable<string> packages =
                data.Authorization.AccessPackages.TryGetValue(user, out var byParty) && byParty.TryGetValue(party, out var given)
                    ? given
                    : [];

            if (data.Authorization.Roles.TryGetValue(user, out var rolesByParty)
                && rolesByParty.TryGetValue(party, out var roles))
            {
                packages = packages.Concat(roles
                    .Where(role => !string.IsNullOrEmpty(role.Value))
                    .SelectMany(role => _roleAccessPackages.GetPackages(role.Value, unitType)));
            }

            if (IsOwnPartyOfPerson(data, user, partyId))
            {
                packages = packages.Concat(_roleAccessPackages.GetPackages(PrivatePersonRoleCode, null));
            }

            return packages;
        }

        private const string PrivatePersonRoleCode = "priv";

        /// <summary>Whether the party is the user's own and the user is a person (not self-identified).</summary>
        private static bool IsOwnPartyOfPerson(TestDataModel data, string userId, int partyId) =>
            data.Profile.User.TryGetValue(userId, out var profile)
            && profile.PartyId == partyId
            && !string.IsNullOrEmpty(profile.Party?.SSN);
    }
}
