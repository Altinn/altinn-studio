#nullable enable
using System.Text.Json.Serialization;
using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Authorization.Interface.Models;

namespace LocalTest.Services.TestData;

/// <summary>
/// Simple model that directly matches the directory structure of the TestData folder
/// Currently this is used internally for backwards compatibility reasons
/// </summary>
public class AppTestDataModel
{
    [JsonPropertyOrder(int.MinValue)]
    [JsonPropertyName("$schema")]
    public string Schema => "https://altinncdn.no/schemas/json/test-users/test-users.schema.v1.json";
    [JsonPropertyName("persons")]
    public List<AppTestPerson> Persons { get; set; } = default!;
    [JsonPropertyName("orgs")]
    public List<AppTestOrg> Orgs { get; set; } = default!;

    public TestDataModel GetTestDataModel()
    {
        return new TestDataModel()
        {
            Authorization = GetTestDataAuthorization(),
            Register = GetTestDataRegister(),
            Profile = GetTestDataProfile(),
        };
    }
    public TestDataRegister GetTestDataRegister()
    {
        var org = Orgs.Select(o => (Organization)o).ToDictionary(o => o.OrgNumber);
        var party = GetParties();
        var person = Persons.Select(p => (Person)p).Where(p=>!string.IsNullOrEmpty(p.SSN)).ToDictionary(p => p.SSN);
        return new TestDataRegister()
        {
            Org = org,
            Party = party,
            Person = person,
        };
    }

    public TestDataProfile GetTestDataProfile()
    {
        var user = Persons.Select(p => p.ToUserProfile()).ToDictionary(p => p.UserId.ToString());

        return new TestDataProfile()
        {
            User = user,
        };
    }

    public TestDataAuthorization GetTestDataAuthorization()
    {
        var claims = Persons.Where(p => p.CustomClaims.Count > 0).ToDictionary(p => p.UserId.ToString(), p => p.CustomClaims);
        var parties = GetOrgPartiesWithChildren();
        var partyList = Persons
            .ToDictionary(
                p => p.UserId.ToString(),
                p => {
                    var partiesForUser = new List<Party>{p.ToParty()};
                    partiesForUser.AddRange(p.PartyRoles.Keys.Select(partyId =>
                        parties.TryGetValue(partyId.ToString(), out var value) ? value! : null!
                    ));
                    return partiesForUser.Where(p=>p is not null).ToList();
                });
        var roles = Persons.ToDictionary(p => p.UserId.ToString(), p => p.PartyRoles.ToDictionary(r => r.Key.ToString(), r => r.Value));

        return new TestDataAuthorization
        {
            Claims = claims,
            PartyList = partyList,
            Roles = roles,
        };
    }

    private Dictionary<string, Party> GetParties()
    {
        return Enumerable.Concat(
                        Orgs.Select(o => o.ToParty()),
                        Persons.Select(p => p.ToParty()))
                    .ToDictionary(p => p.PartyId.ToString());
    }
    private Dictionary<string, Party> GetOrgPartiesWithChildren()
    {
        return Orgs.Select(p => p.ToParty(Orgs))
                    .ToDictionary(p => p.PartyId.ToString());
    }

    // Only used for debugging
    public static AppTestDataModel FromTestDataModel(TestDataModel localData)
    {
        int negativePartyId = -1;
        var constructedAppData = new AppTestDataModel()
        {
            Orgs = localData.Register.Org.Values.Select(org =>
            {
                var party = localData.Register.Party.Values.FirstOrDefault(p => p.OrgNumber == org.OrgNumber);
                var parentParty = localData.Authorization.PartyList.Values.SelectMany(l => l).FirstOrDefault(p => p.ChildParties?.Any(cp => cp.PartyId == party?.PartyId) == true);
                return new AppTestOrg()
                {
                    PartyId = party?.PartyId ?? negativePartyId--,
                    ParentPartyId = parentParty?.PartyId,
                    TelephoneNumber = org.TelephoneNumber,
                    UnitStatus = org.UnitStatus,
                    UnitType = party?.UnitType ?? org.UnitType, // These are inconsistent in the original TestData folder
                    BusinessAddress = org.BusinessAddress,
                    BusinessPostalCity = org.BusinessPostalCity,
                    BusinessPostalCode = org.BusinessPostalCode,
                    EMailAddress = org.EMailAddress,
                    FaxNumber = org.FaxNumber,
                    InternetAddress = org.InternetAddress,
                    MailingAddress = org.MailingAddress,
                    MailingPostalCity = org.MailingPostalCity,
                    MailingPostalCode = org.MailingPostalCode,
                    MobileNumber = org.MobileNumber,
                    Name = org.Name,
                    OrgNumber = org.OrgNumber,
                };
            }).ToList(),
            Persons = localData.Register.Person.Values.Select(p =>
            {
                // TODO: Self identified users are not in the persons table, but should be in the AppTestDataModel.Persons
                // We need a different way to find persons here, but as this is only for matching old and new model, this is fine.
                var party = localData.Register.Party.Values.First(party => party.SSN == p.SSN);
                var profile = localData.Profile.User.Values.First(user => user.PartyId == party.PartyId);
                var customClaims = localData.Authorization.Claims.TryGetValue(profile.UserId.ToString(), out var v) ? v : new();

                var userRoles = localData.Authorization.Roles.TryGetValue(profile.UserId.ToString(), out var roles) ? roles : null;

                return new AppTestPerson()
                {
                    PartyId = party.PartyId,
                    AddressCity = p.AddressCity,
                    AddressHouseLetter = p.AddressHouseLetter,
                    AddressHouseNumber = p.AddressHouseNumber,
                    AddressMunicipalName = p.AddressMunicipalName,
                    AddressMunicipalNumber = p.AddressMunicipalNumber,
                    AddressPostalCode = p.AddressPostalCode,
                    AddressStreetName = p.AddressStreetName,
                    Email = profile.Email,
                    FirstName = p.FirstName,
                    MiddleName = p.MiddleName,
                    LastName = p.LastName,
                    MailingAddress = p.MailingAddress,
                    MailingPostalCity = p.MailingPostalCity,
                    MailingPostalCode = p.MailingPostalCode,
                    SSN = p.SSN,
                    TelephoneNumber = p.TelephoneNumber,
                    MobileNumber = p.MobileNumber,
                    PartyRoles = userRoles?.ToDictionary(r => int.Parse(r.Key), r => r.Value) ?? new(),
                    CustomClaims = customClaims,
                    UserId = profile.UserId,
                    Language = profile.ProfileSettingPreference?.Language,
                    UserName = profile.UserName,
                };
            }).ToList(),
        };
        return constructedAppData;
    }

    public bool IsEmpty()
    {
        return Persons.Count == 0 && Orgs.Count == 0;
    }
}

public class AppTestOrg
{
    [JsonPropertyName("partyId")]
    public int PartyId { get; set; }
    [JsonPropertyName("orgNumber")]
    public string OrgNumber { get; set; } = default!;

    [JsonPropertyName("parentPartyId")]
    public int? ParentPartyId { get; set; }
    [JsonPropertyName("name")]
    public string? Name { get; set; }
    [JsonPropertyName("businessAddress")]
    public string? BusinessAddress { get; set; }
    [JsonPropertyName("businessPostalCity")]
    public string? BusinessPostalCity { get; set; }
    [JsonPropertyName("businessPostalCode")]
    public string? BusinessPostalCode { get; set; }
    [JsonPropertyName("eMailAddress")]
    public string? EMailAddress { get; set; }
    [JsonPropertyName("faxNumber")]
    public string? FaxNumber { get; set; }
    [JsonPropertyName("internetAddress")]
    public string? InternetAddress { get; set; }
    [JsonPropertyName("mailingAddress")]
    public string? MailingAddress { get; set; }
    [JsonPropertyName("mailingPostalCity")]
    public string? MailingPostalCity { get; set; }
    [JsonPropertyName("mailingPostalCode")]
    public string? MailingPostalCode { get; set; }
    [JsonPropertyName("mobileNumber")]
    public string? MobileNumber { get; set; }
    [JsonPropertyName("telephoneNumber")]
    public string? TelephoneNumber { get; set; }
    [JsonPropertyName("unitStatus")]
    public string? UnitStatus { get; set; }
    [JsonPropertyName("unitType")]
    public string? UnitType { get; set; }

    public Party ToParty(List<AppTestOrg>? potentialChildOrgs = null)
    {
        List<Party>? childParties = potentialChildOrgs?.Where(o=>o.ParentPartyId == PartyId).Select(o=>o.ToParty()).ToList();
        if(childParties?.Count == 0)
        {
            childParties = null;
        }

        return new Party()
        {
            PartyId = PartyId,
            OrgNumber = OrgNumber,
            IsDeleted = false,
            PartyTypeName = Altinn.Platform.Register.Enums.PartyType.Organisation, // TODO: consider supporting bankrupt or subUnit
            Name = Name,
            ChildParties = childParties,
            //HelperFieldsSetLater
            // OnlyHierarchyElementWithNoAccess =
            // Organization =
            //RelantForPersonOnly
            // Person =
            // SSN =
            //Unknown field
            UnitType = UnitType
        };
    }
    public static explicit operator Organization(AppTestOrg org) => new Organization()
    {
        OrgNumber = org.OrgNumber,
        Name = org.Name,
        BusinessAddress = org.BusinessAddress,
        BusinessPostalCity = org.BusinessPostalCity,
        BusinessPostalCode = org.BusinessPostalCode,
        EMailAddress = org.EMailAddress,
        FaxNumber = org.FaxNumber,
        InternetAddress = org.InternetAddress,
        MailingAddress = org.MailingAddress,
        MailingPostalCity = org.MailingPostalCity,
        MailingPostalCode = org.MailingPostalCode,
        MobileNumber = org.MobileNumber,
        TelephoneNumber = org.TelephoneNumber,
        UnitStatus = org.UnitStatus,
        UnitType = org.UnitType,
    };
}

public class AppTestPerson
{
    [JsonPropertyName("partyId")]
    public int PartyId { get; set; } = default!;
    [JsonPropertyName("ssn")]
    public string SSN { get; set; } = default!;
    [JsonPropertyName("firstName")]
    public string? FirstName { get; set; } = default!;
    [JsonPropertyName("middleName")]
    public string? MiddleName { get; set; }
    [JsonPropertyName("lastName")]
    public string LastName { get; set; } = default!;
    [JsonPropertyName("customClaims")]
    public List<CustomClaim> CustomClaims { get; set; } = new();
    [JsonPropertyName("partyRoles")]
    public Dictionary<int, List<Role>> PartyRoles { get; set; } = new();
    [JsonPropertyName("addressCity")]
    public string? AddressCity { get; set; }
    [JsonPropertyName("addressHouseLetter")]
    public string? AddressHouseLetter { get; set; }
    [JsonPropertyName("addressHouseNumber")]
    public string? AddressHouseNumber { get; set; }
    [JsonPropertyName("addressMunicipalName")]
    public string? AddressMunicipalName { get; set; }
    [JsonPropertyName("addressMunicipalNumber")]
    public string? AddressMunicipalNumber { get; set; }
    [JsonPropertyName("addressPostalCode")]
    public string? AddressPostalCode { get; set; }
    [JsonPropertyName("addressStreetName")]
    public string? AddressStreetName { get; set; }
    [JsonPropertyName("mailingAddress")]
    public string? MailingAddress { get; set; }
    [JsonPropertyName("mailingPostalCity")]
    public string? MailingPostalCity { get; set; }
    [JsonPropertyName("mailingPostalCode")]
    public string? MailingPostalCode { get; set; }
    [JsonPropertyName("mobileNumber")]
    public string? MobileNumber { get; set; }
    [JsonPropertyName("telephoneNumber")]
    public string? TelephoneNumber { get; set; }
    [JsonPropertyName("email")]
    public string? Email { get; set; }
    [JsonPropertyName("userId")]
    public int UserId { get; set; }
    [JsonPropertyName("language")]
    public string? Language { get; set; }
    [JsonPropertyName("userName")]
    public string? UserName { get; set; }

    public string GetFullName() => string.IsNullOrWhiteSpace(MiddleName) ? $"{FirstName} {LastName}" : $"{FirstName} {MiddleName} {LastName}";

    public Party ToParty(List<AppTestOrg>? possibleChildParties = null)
    {
        List<Party>? childParties = null;
        if (possibleChildParties is not null)
        {
            childParties = possibleChildParties.Where(o => o.ParentPartyId == PartyId).Select(o => o.ToParty()).ToList();
            if (childParties?.Count == 0)
            {
                childParties = null;
            }
        }
        return new Party()
        {
            PartyId = PartyId,
            IsDeleted = false,
            SSN = string.IsNullOrEmpty(SSN) ? null : SSN,
            Name = GetFullName(),
            PartyTypeName = string.IsNullOrEmpty(SSN) ? Altinn.Platform.Register.Enums.PartyType.SelfIdentified : Altinn.Platform.Register.Enums.PartyType.Person,
            ChildParties = childParties,
            //HelperFieldsSetLater
            // OnlyHierarchyElementWithNoAccess =
            // Person =
            //RelantForOrgOnly
            // Organization =
            // OrgNumber = org.OrgNumber,
            //Unknown field
            // UnitType =
        };
    }
    public static explicit operator Person(AppTestPerson person) => new Person()
    {
        SSN = person.SSN,
        Name = person.GetFullName(),
        AddressCity = person.AddressCity,
        AddressHouseLetter = person.AddressHouseLetter,
        AddressHouseNumber = person.AddressHouseNumber,
        AddressMunicipalName = person.AddressMunicipalName,
        AddressMunicipalNumber = person.AddressMunicipalNumber,
        AddressPostalCode = person.AddressPostalCode,
        AddressStreetName = person.AddressStreetName,
        FirstName = person.FirstName,
        LastName = person.LastName,
        MailingAddress = person.MailingAddress,
        MailingPostalCity = person.MailingPostalCity,
        MailingPostalCode = person.MailingPostalCode,
        MiddleName = person.MiddleName,
        MobileNumber = person.MobileNumber,
        TelephoneNumber = person.TelephoneNumber,
    };

    public UserProfile ToUserProfile() => new UserProfile
    {
        PartyId = PartyId,
        PhoneNumber = TelephoneNumber ?? MobileNumber,
        Email = Email,
        // ExternalIdentity,
        Party = ToParty(),
        ProfileSettingPreference = new()
        {
            // DoNotPromptForParty,
            Language = Language,
            // LanguageType,
            // PreSelectedPartyId,
        },
        UserId = UserId,
        UserName = UserName,
        // UserType,
    };
}
