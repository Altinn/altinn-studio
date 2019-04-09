using System;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using Altinn.Platform.Register.Configuration;
using Altinn.Platform.Register.Helpers;
using Altinn.Platform.Register.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Register.Services.Implementation
{
    /// <summary>
    /// The organization wrapper
    /// </summary>
    public class OrganizationsMockWrapper : IOrganizations
    {
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="OrganizationsMockWrapper"/> class
        /// </summary>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        public OrganizationsMockWrapper(IOptions<GeneralSettings> generalSettings, ILogger<OrganizationsWrapper> logger)
        {
            _generalSettings = generalSettings.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<Organization> GetOrganization(string orgNr)
        {
            switch (orgNr)
            {
                case "10008387":
                    return new Organization()
                    {
                        OrgNumber = "10008387",
                        Name = "TYNSET OG OPPDAL",
                        UnitType = "ANS",
                        TelephoneNumber = "99000000",
                        MobileNumber = "fd",
                        FaxNumber = "22077108",
                        EMailAddress = "tynsetOgOppdal@dispostable.com",
                        InternetAddress = null,
                        MailingAddress = null,
                        MailingPostalCode = null,
                        MailingPostalCity = null,
                        BusinessAddress = "Kasernegaten 12",
                        BusinessPostalCode = "1632",
                        BusinessPostalCity = "Fredrikstad"
                    };
                case "10008433" :
                    return new Organization()
                    {
                        OrgNumber = "10008433",
                        Name = "DEKNEPOLLEN OG FINNSNES",
                        UnitType = "IS",
                        TelephoneNumber = "22077000",
                        MobileNumber = "22077000",
                        FaxNumber = "22077108",
                        EMailAddress = "deknepollenOgFinnsnes@dispostable.com",
                        InternetAddress = "http://vg.no",
                        MailingAddress = "Nordjorda 1",
                        MailingPostalCode = "9409",
                        MailingPostalCity = "Harstad",
                        BusinessAddress = "Nordjorda 1",
                        BusinessPostalCode = "9409",
                        BusinessPostalCity = "Harstad"
                    };
                case "810418192":
                    return new Organization()
                    {
                        OrgNumber = "810418192",
                        Name = "KOLSÅS OG FLÅM REGNSKAP",
                        UnitType = "AS",
                        TelephoneNumber = "99000000",
                        MobileNumber = "99000000",
                        FaxNumber = "22077108",
                        EMailAddress = "kolsaasOgFlaamRegnskap@dispostable.com",
                        InternetAddress = null,
                        MailingAddress = "Vagleskogveien 23",
                        MailingPostalCode = "4322",
                        MailingPostalCity = "Sandnes",
                        BusinessAddress = "Vagleskogveien 23",
                        BusinessPostalCode = "4322",
                        BusinessPostalCity = "Sandnes"
                    };
                case "810419962":
                    return new Organization()
                    {
                        OrgNumber = "810419962",
                        Name = "BØNES OG BJUGN REGNSKAP",
                        UnitType = "AS",
                        TelephoneNumber = "99000000",
                        MobileNumber = "99000000",
                        FaxNumber = "22077108",
                        EMailAddress = "bjonesOgBjugnRegnskap@dispostable.com",
                        InternetAddress = "https://www.harmannenfalt.no/",
                        MailingAddress = "Jåttåflaten 11",
                        MailingPostalCode = "4020",
                        MailingPostalCity = "Hinna",
                        BusinessAddress = "Jåttåflaten 11",
                        BusinessPostalCode = "4020",
                        BusinessPostalCity = "Hinna"
                    };
                default:
                    return null;
            }
        }
    }
}
