using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using Altinn.App.Core.Extensions;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Api.Helpers;

/// <summary>
/// Produces copies of <see cref="Party"/> objects with their social security numbers (SSNs) masked,
/// so the full SSN is never leaked in HTTP responses (e.g. "12345678901" becomes "123456*****").
/// The masking rule itself lives in <see cref="NationalIdentityNumberExtensions.Mask"/>; this type only
/// applies it across the party graph. The original objects (which may be cached and used server-side)
/// are never modified.
/// </summary>
internal static class PartySsnMasking
{
    // The properties we copy when cloning. Cached once per type so we don't reflect on every call.
    private static readonly PropertyInfo[] _partyProperties = CopyableProperties(typeof(Party));
    private static readonly PropertyInfo[] _personProperties = CopyableProperties(typeof(Person));
    private static readonly PropertyInfo[] _userProfileProperties = CopyableProperties(typeof(UserProfile));

    /// <summary>
    /// Returns a copy of <paramref name="profile"/> with the SSN masked on its nested
    /// <see cref="UserProfile.Party"/> (including that party's <see cref="Party.Person"/> and
    /// <see cref="Party.ChildParties"/>). Returns <c>null</c> if <paramref name="profile"/> is <c>null</c>.
    /// </summary>
    [return: NotNullIfNotNull(nameof(profile))]
    public static UserProfile? MaskUserProfile(UserProfile? profile)
    {
        if (profile is null)
        {
            return null;
        }

        UserProfile clone = new UserProfile();
        CopyProperties(_userProfileProperties, profile, clone);

        clone.Party = MaskParty(profile.Party);

        return clone;
    }

    /// <summary>
    /// Returns a new list where every party is a masked copy of the corresponding input party.
    /// </summary>
    public static List<Party> MaskParties(IEnumerable<Party> parties)
    {
        List<Party> maskedParties = new List<Party>();
        foreach (Party party in parties)
        {
            maskedParties.Add(MaskParty(party));
        }

        return maskedParties;
    }

    /// <summary>
    /// Returns a copy of <paramref name="party"/> with the SSN masked, including the nested
    /// <see cref="Party.Person"/> and any <see cref="Party.ChildParties"/>. Returns <c>null</c> if
    /// <paramref name="party"/> is <c>null</c>.
    /// </summary>
    [return: NotNullIfNotNull(nameof(party))]
    public static Party? MaskParty(Party? party)
    {
        if (party is null)
        {
            return null;
        }

        // Copy every field as-is, then transform only the parts that carry an SSN.
        Party clone = new Party();
        CopyProperties(_partyProperties, party, clone);

        clone.SSN = NationalIdentityNumberExtensions.Mask(party.SSN);
        clone.Person = MaskPerson(party.Person);
        clone.ChildParties = MaskChildParties(party.ChildParties);

        return clone;
    }

    private static List<Party>? MaskChildParties(List<Party>? childParties)
    {
        if (childParties is null)
        {
            return null;
        }

        return MaskParties(childParties);
    }

    /// <summary>
    /// Returns a copy of <paramref name="person"/> with only the SSN masked; all other fields are
    /// copied as-is. Returns <c>null</c> if <paramref name="person"/> is <c>null</c>.
    /// </summary>
    private static Person? MaskPerson(Person? person)
    {
        if (person is null)
        {
            return null;
        }

        Person clone = new Person();
        CopyProperties(_personProperties, person, clone);

        clone.SSN = NationalIdentityNumberExtensions.Mask(person.SSN);

        return clone;
    }

    /// <summary>
    /// Returns the readable and writable, non-indexer properties of <paramref name="type"/>;
    /// these are the ones we can copy when cloning.
    /// </summary>
    private static PropertyInfo[] CopyableProperties(Type type)
    {
        return type.GetProperties()
            .Where(property => property.CanRead && property.CanWrite && property.GetIndexParameters().Length == 0)
            .ToArray();
    }

    private static void CopyProperties(PropertyInfo[] properties, object source, object destination)
    {
        foreach (PropertyInfo property in properties)
        {
            property.SetValue(destination, property.GetValue(source));
        }
    }
}
