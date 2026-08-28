using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Models;

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
    // The properties we copy when cloning UserProfile (a plain class, so it can't use `with` like
    // Party/Person can). Cached once so we don't reflect on every call.
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

        // `with` copies every field as-is; only the parts that carry an SSN need to change.
        return party with
        {
            SSN = NationalIdentityNumberExtensions.Mask(party.SSN),
            Person = MaskPerson(party.Person),
            ChildParties = MaskChildParties(party.ChildParties),
        };
    }

    private static List<Party>? MaskChildParties(IReadOnlyList<Party>? childParties)
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

        return person with
        {
            SSN = NationalIdentityNumberExtensions.Mask(person.SSN),
        };
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
