#nullable enable
using System.Text.Json;
using Authorization.Interface.Models;
using LocalTest.Configuration;
using LocalTest.Models;
using LocalTest.Services.Tenor.Models;
using Microsoft.Extensions.Options;

namespace LocalTest.Services.TestData;

public class TenorDataRepository
{
    private static readonly JsonSerializerOptions _options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };
    private readonly LocalPlatformSettings _settings;

    public TenorDataRepository(IOptions<LocalPlatformSettings> settings)
    {
        _settings = settings.Value;
    }

    public DirectoryInfo GetTenorStorageDirectory()
    {
        var dir = new DirectoryInfo(Path.Join(_settings.LocalTestingStorageBasePath, _settings.TenorDataFolder));
        if (!dir.Exists)
        {
            dir.Create();
        }
        return dir;
    }


    public async Task<(List<BrregErFr>, List<Freg>)> ReadFromDisk(List<string>? files = null)
    {
        var freg = new List<Freg>();
        var brregErFr = new List<BrregErFr>();
        var tenorFolder = GetTenorStorageDirectory();

        foreach (var fregFile in tenorFolder.GetFiles("freg.*.kildedata.json").Where(f => files?.Contains(f.Name) ?? true))
        {
            var fileBytes = await File.ReadAllBytesAsync(fregFile.FullName);
            var fileData = JsonSerializer.Deserialize<Freg>(fileBytes, _options);
            if (fileData is not null)
                freg.Add(fileData);
        }
        foreach (var brregFile in tenorFolder.GetFiles("brreg-er-fr.*.kildedata.json").Where(f => files?.Contains(f.Name) ?? true))
        {
            var fileBytes = await File.ReadAllBytesAsync(brregFile.FullName);
            var fileData = JsonSerializer.Deserialize<BrregErFr>(fileBytes, _options);
            if (fileData is not null)
                brregErFr.Add(fileData);
        }

        return (brregErFr, freg);
    }

    public async Task<AppTestDataModel> GetAppTestDataModel(List<string>? files = null)
    {
        var (brreg, freg) = await ReadFromDisk(files);
        // Assign partyId to all entities
        int partyId = 600000;
        freg.ForEach(f => f.PartyId = partyId++);
        partyId = 700000;
        brreg.ForEach(b => b.PartyId = partyId++);


        var roles = brreg.SelectMany(b => b.Rollegrupper.SelectMany(rg => rg.Roller.Select(r => (b.PartyId, r.Type.Kode, r.Person.Foedselsnummer)))).Where(r => r.Foedselsnummer is not null);
        var fnrRoleLookup = roles.GroupBy(r => r.Foedselsnummer).ToDictionary(role => role.Key, role => role.GroupBy(r => r.PartyId).ToDictionary(k => k.Key, k => k.Select(tuple => new Role { Type = "Altinn", Value = tuple.Kode }).ToList()));


        int userId = 10000;
        return new()
        {
            Persons = freg.Select(f =>
            {
                var fnr = f.Identifikasjonsnummer.FirstErGjeldende()?.FoedselsEllerDNummer ?? throw new Exception("fødselsnummer ikke funnet");
                var adresse = f.Bostedsadresse.FirstErGjeldende() ?? throw new Exception("Mangler bostedsadresse");
                return new AppTestPerson
                {
                    UserId = userId++,
                    PartyId = f.PartyId,
                    SSN = fnr,
                    FirstName = f.Navn.FirstErGjeldende()?.Fornavn ?? "Ukjent",
                    LastName = f.Navn.FirstErGjeldende()?.Etternavn ?? "Ukjent",
                    MiddleName = f.Navn.FirstErGjeldende()?.Mellomnavn,
                    UserName = $"user-{99999999999 - long.Parse(fnr)}", // Make an sytnetic username based on an obfuscated fnr
                    AddressCity = adresse.Vegadresse.Poststed.Poststedsnavn,
                    // AddressMunicipalName = adresse.Vegadresse.Kommunenummer,
                    AddressMunicipalNumber = adresse.Vegadresse.Kommunenummer,
                    AddressHouseLetter = f.Bostedsadresse.FirstErGjeldende()?.Vegadresse.Adressekode,
                    AddressHouseNumber = f.Bostedsadresse.FirstErGjeldende()?.Vegadresse.Adressenummer.Husnummer,
                    AddressMunicipalName = null,
                    AddressPostalCode = null,
                    AddressStreetName = null,
                    Email = null,
                    MobileNumber = null,
                    TelephoneNumber = null,
                    Language = null,
                    MailingAddress = null,
                    MailingPostalCity = null,
                    MailingPostalCode = null,
                    PartyRoles = fnrRoleLookup.TryGetValue(fnr, out var partyRoles) ? partyRoles : new Dictionary<int, List<Role>>(),
                    CustomClaims = new()
                    {
                        new()
                        {
                            Type = "user:source",
                            ValueType = "http://www.w3.org/2001/XMLSchema#string",
                            Value = "localTenor"
                        }
                    },

                };
            }).ToList(),
            Orgs = brreg.Select(b => new AppTestOrg
            {
                PartyId = b.PartyId,
                ParentPartyId = null,
                OrgNumber = b.Organisasjonsnummer,
                Name = b.Navn,
                BusinessAddress = string.Join("\n", b.Forretningsadresse.Adresse),
                BusinessPostalCity = b.Forretningsadresse.Poststed,
                BusinessPostalCode = b.Forretningsadresse.Postnummer,
                MailingAddress = string.Join("\n", b.Postadresse.Adresse),
                MailingPostalCity = b.Postadresse.Poststed,
                MailingPostalCode = b.Postadresse.Postnummer,
                EMailAddress = null,
                FaxNumber = null,
                InternetAddress = null,
                MobileNumber = null,
                TelephoneNumber = null,
                UnitStatus = null,
                UnitType = null,
            }).ToList(),
        };
    }

    public async Task StoreUploadedFile(IFormFile file)
    {
        var dir = GetTenorStorageDirectory();
        var filename = new FileInfo(Path.Join(dir.FullName, file.FileName));
        if (filename.Directory?.FullName != dir.FullName)
        {
            throw new Exception($"Invalid filename {file.FileName}");
        }
        using Stream fileStream = filename.OpenWrite();
        await file.CopyToAsync(fileStream);
    }
    private static T? ParseCatchException<T>(string rawJson) where T : class
    {
        try
        {
            return JsonSerializer.Deserialize<T>(rawJson, _options);
        }
        catch (Exception)
        {
            return null;
        }
    }
    public async Task<List<TenorFileItem>> GetFileItems()
    {
        var directory = GetTenorStorageDirectory();
        var itemList = new List<TenorFileItem>();
        foreach (var f in directory.GetFiles())
        {
            if (f.Name.StartsWith('.'))
            {
                continue; // Ignore hidden files (like .DS_Store)
            }
            var content = await System.IO.File.ReadAllTextAsync(f.FullName);

            itemList.Add(new()
            {
                FileName = f.Name,
                RawFileContent = content,
                Freg = ParseCatchException<Freg>(content),
                Brreg = ParseCatchException<BrregErFr>(content),
            });
        };
        return itemList;
    }

    public void DeleteFile(string fileName)
    {
        var fileHandle = GetTenorStorageDirectory().GetFiles(fileName).First(f => f.Name == fileName);
        fileHandle.Delete();
    }
}

public static class ListExtentions
{
    public static T? FirstErGjeldende<T>(this List<T> list)
    {
        var erGjeldendeAccessor = typeof(T).GetProperty("erGjeldende");
        return list.FirstOrDefault(t => erGjeldendeAccessor?.GetValue(t) as bool? == true) ?? list.FirstOrDefault();
    }
}