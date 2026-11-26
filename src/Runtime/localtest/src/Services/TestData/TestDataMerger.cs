#nullable enable

using System.Text.Json;
using Authorization.Interface.Models;

namespace LocalTest.Services.TestData;

/// <summary>
/// Provides shared logic for merging TestDataModel instances
/// </summary>
public static class TestDataMerger
{
    private static readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions();
    /// <summary>
    /// Merges source test data into target test data.
    /// Only adds items that don't already exist in target (no overwrites).
    /// </summary>
    /// <param name="source">Source test data to merge from</param>
    /// <param name="target">Target test data to merge into</param>
    /// <param name="sourceIdentifier">Optional identifier for the source (e.g., app ID) used in error messages</param>
    /// <exception cref="InvalidOperationException">Thrown if there are conflicting identifiers between source and target</exception>
    public static void MergeTestData(TestDataModel source, TestDataModel target, string? sourceIdentifier = null)
    {
        var conflicts = new List<string>();

        if (source.Profile?.User != null)
        {
            foreach (var (userId, user) in source.Profile.User)
            {
                if (!target.Profile.User.ContainsKey(userId))
                {
                    target.Profile.User[userId] = user;
                }
                else if (!AreEqual(user, target.Profile.User[userId]))
                {
                    conflicts.Add($"User ID {userId}");
                }
                // else: identical user already exists, no conflict
            }
        }

        if (source.Register?.Party != null)
        {
            foreach (var (partyId, party) in source.Register.Party)
            {
                if (!target.Register.Party.ContainsKey(partyId))
                {
                    target.Register.Party[partyId] = party;
                }
                else if (!AreEqual(party, target.Register.Party[partyId]))
                {
                    conflicts.Add($"Party ID {partyId}");
                }
            }
        }

        if (source.Register?.Person != null)
        {
            foreach (var (ssn, person) in source.Register.Person)
            {
                if (!target.Register.Person.ContainsKey(ssn))
                {
                    target.Register.Person[ssn] = person;
                }
                else if (!AreEqual(person, target.Register.Person[ssn]))
                {
                    conflicts.Add($"Person SSN {ssn}");
                }
            }
        }

        if (source.Register?.Org != null)
        {
            foreach (var (orgNumber, org) in source.Register.Org)
            {
                if (!target.Register.Org.ContainsKey(orgNumber))
                {
                    target.Register.Org[orgNumber] = org;
                }
                else if (!AreEqual(org, target.Register.Org[orgNumber]))
                {
                    conflicts.Add($"Organization number {orgNumber}");
                }
            }
        }

        if (source.Register?.OrgUnits != null)
        {
            foreach (var (partyId, unit) in source.Register.OrgUnits)
            {
                if (!target.Register.OrgUnits.TryAdd(partyId, unit) && unit != target.Register.OrgUnits[partyId])
                {
                    conflicts.Add($"Organization party ID {partyId}");
                }
            }
        }

        if (source.Authorization?.PartyList != null)
        {
            foreach (var (userId, parties) in source.Authorization.PartyList)
            {
                if (!target.Authorization.PartyList.TryGetValue(userId, out var targetParties))
                {
                    target.Authorization.PartyList[userId] = parties;
                    continue;
                }

                // The target's parties win; the source adds the parties the target does not list
                target.Authorization.PartyList[userId] =
                [
                    .. targetParties,
                    .. parties.Where(party => !targetParties.Any(targetParty => targetParty.PartyId == party.PartyId)),
                ];
            }
        }

        if (source.Authorization?.Roles != null)
        {
            foreach (var (userId, roles) in source.Authorization.Roles)
            {
                if (!target.Authorization.Roles.TryGetValue(userId, out var targetRoles))
                {
                    target.Authorization.Roles[userId] = roles;
                    continue;
                }

                // The target's roles for a party win; the source adds the parties the target has none for
                var merged = new Dictionary<string, List<Role>>(targetRoles);
                foreach (var (partyId, partyRoles) in roles)
                {
                    merged.TryAdd(partyId, partyRoles);
                }
                target.Authorization.Roles[userId] = merged;
            }
        }

        if (source.Authorization?.AccessPackages != null)
        {
            foreach (var (userId, accessPackages) in source.Authorization.AccessPackages)
            {
                if (!target.Authorization.AccessPackages.TryGetValue(userId, out var targetPackages))
                {
                    target.Authorization.AccessPackages[userId] = accessPackages;
                    continue;
                }

                // The target's packages for a party win; the source adds the parties the target has none for
                var merged = new Dictionary<string, List<string>>(targetPackages);
                foreach (var (partyId, packages) in accessPackages)
                {
                    merged.TryAdd(partyId, packages);
                }
                target.Authorization.AccessPackages[userId] = merged;
            }
        }

        if (source.Authorization?.Systems != null)
        {
            foreach (var (systemId, system) in source.Authorization.Systems)
            {
                if (!target.Authorization.Systems.TryGetValue(systemId, out var targetSystem))
                {
                    target.Authorization.Systems[systemId] = system;
                    continue;
                }

                // The same system in both: keep the target's system users and add the source's other ones
                var systemUsers = new Dictionary<string, TestDataSystemUser>(targetSystem.SystemUsers);
                foreach (var (systemUserId, systemUser) in system.SystemUsers)
                {
                    systemUsers.TryAdd(systemUserId, systemUser);
                }
                target.Authorization.Systems[systemId] = targetSystem with { SystemUsers = systemUsers };
            }
        }

        if (source.Authorization?.SystemUsers != null)
        {
            foreach (var (systemUserId, systemUser) in source.Authorization.SystemUsers)
            {
                if (
                    !target.Authorization.SystemUsers.TryAdd(systemUserId, systemUser)
                    && !target.Authorization.SystemUsers[systemUserId].HasTheSameValues(systemUser)
                )
                {
                    conflicts.Add($"System user ID {systemUserId}");
                }
            }
        }

        if (conflicts.Count > 0)
        {
            var sourceName = sourceIdentifier ?? "source";
            var message = $"Test data conflict detected in {sourceName}. The following identifiers have conflicts: {string.Join(", ", conflicts)}. Each app must use unique user IDs, party IDs, SSNs, organization numbers and system user IDs OR use the same identifiers with the exact same values.";
            throw new InvalidOperationException(message);
        }
    }

    /// <summary>
    /// Performs a deep equality comparison by serializing both objects to JSON and comparing.
    /// This ensures all properties are compared, including nested objects and collections.
    /// </summary>
    private static bool AreEqual<T>(T obj1, T obj2)
    {
        if (ReferenceEquals(obj1, obj2)) return true;
        if (obj1 == null || obj2 == null) return false;

        var json1 = JsonSerializer.Serialize(obj1, _jsonOptions);
        var json2 = JsonSerializer.Serialize(obj2, _jsonOptions);

        return json1 == json2;
    }
}
