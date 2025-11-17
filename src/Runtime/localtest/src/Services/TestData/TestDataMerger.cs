#nullable enable

using System.Text.Json;

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

        if (source.Authorization?.PartyList != null)
        {
            foreach (var (userId, parties) in source.Authorization.PartyList)
            {
                if (!target.Authorization.PartyList.ContainsKey(userId))
                {
                    target.Authorization.PartyList[userId] = parties;
                }
            }
        }

        if (source.Authorization?.Roles != null)
        {
            foreach (var (userId, roles) in source.Authorization.Roles)
            {
                if (!target.Authorization.Roles.ContainsKey(userId))
                {
                    target.Authorization.Roles[userId] = roles;
                }
            }
        }

        if (conflicts.Count > 0)
        {
            var sourceName = sourceIdentifier ?? "source";
            var message = $"Test data conflict detected in {sourceName}. The following identifiers have conflicts: {string.Join(", ", conflicts)}. Each app must use unique user IDs, party IDs, SSNs, and organization numbers OR use the same identifiers with the exact same values.";
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
