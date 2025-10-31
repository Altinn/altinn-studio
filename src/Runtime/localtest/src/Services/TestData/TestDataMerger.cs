#nullable enable

namespace LocalTest.Services.TestData;

/// <summary>
/// Provides shared logic for merging TestDataModel instances
/// </summary>
public static class TestDataMerger
{
    /// <summary>
    /// Merges source test data into target test data.
    /// Only adds items that don't already exist in target (no overwrites).
    /// </summary>
    /// <param name="source">Source test data to merge from</param>
    /// <param name="target">Target test data to merge into</param>
    public static void MergeTestData(TestDataModel source, TestDataModel target)
    {
        // Merge users from app registry
        if (source.Profile?.User != null)
        {
            foreach (var (userId, user) in source.Profile.User)
            {
                if (!target.Profile.User.ContainsKey(userId))
                {
                    target.Profile.User[userId] = user;
                }
            }
        }

        // Merge parties
        if (source.Register?.Party != null)
        {
            foreach (var (partyId, party) in source.Register.Party)
            {
                if (!target.Register.Party.ContainsKey(partyId))
                {
                    target.Register.Party[partyId] = party;
                }
            }
        }

        // Merge persons
        if (source.Register?.Person != null)
        {
            foreach (var (ssn, person) in source.Register.Person)
            {
                if (!target.Register.Person.ContainsKey(ssn))
                {
                    target.Register.Person[ssn] = person;
                }
            }
        }

        // Merge orgs
        if (source.Register?.Org != null)
        {
            foreach (var (orgNumber, org) in source.Register.Org)
            {
                if (!target.Register.Org.ContainsKey(orgNumber))
                {
                    target.Register.Org[orgNumber] = org;
                }
            }
        }

        // Merge party lists
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

        // Merge roles
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
    }
}
