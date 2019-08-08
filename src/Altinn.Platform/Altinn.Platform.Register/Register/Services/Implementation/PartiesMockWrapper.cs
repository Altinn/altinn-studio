using System;
using System.IO;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using Altinn.Platform.Register.Configuration;
using Altinn.Platform.Register.Helpers;
using Altinn.Platform.Register.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Register.Services.Implementation
{
    /// <summary>
    /// The parties wrapper
    /// </summary>
    public class PartiesMockWrapper : IParties
    {
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="PartiesWrapper"/> class 
        /// </summary>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        public PartiesMockWrapper(IOptions<GeneralSettings> generalSettings, ILogger<PartiesWrapper> logger)
        {
            _generalSettings = generalSettings.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<Party> GetParty(int partyId)
        {
            switch (partyId)
            {
                case 50004216:
                    return new Party()
                    {
                        PartyId = 50004216,
                        PartyTypeName = PartyType.Organization,
                        OrgNumber = "10008387",
                        SSN = null,
                        Person = null,
                        Organization = new Organization()
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
                        }
                    };
                case 50004217:
                    return new Party()
                    {
                        PartyId = 50004217,
                        PartyTypeName = PartyType.Organization,
                        OrgNumber = "10008433",
                        SSN = null,
                        Person = null,
                        Organization = new Organization()
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
                        }
                    };

                case 50004219:
                    return new Party()
                    {
                        PartyId = 50004219,
                        PartyTypeName = PartyType.Organization,
                        OrgNumber = "810418192",
                        SSN = null,
                        Person = null,
                        Organization = new Organization()
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
                        }
                    };
                case 50004232:
                    return new Party()
                    {
                        PartyId = 50004219,
                        PartyTypeName = PartyType.Organization,
                        OrgNumber = "810419962",
                        SSN = null,
                        Person = null,
                        Organization = new Organization()
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
                        }
                    };
                case 50002182:
                    return new Party()
                    {
                        PartyId = 50002182,
                        PartyTypeName = PartyType.Person,
                        OrgNumber = null,
                        SSN = "01124621077",
                        Organization = null,
                        Person = new Person()
                        {
                            AddressHouseLetter = null,
                            AddressHouseNumber = "9",
                            AddressStreetName = "Ringshaugveien",
                            AddressMunicipalName = "Tønsberg",
                            AddressMunicipalNumber = "3803",
                            MailingPostalCity = "Tolvsrød",
                            MailingPostalCode = "3151",
                            MailingAddress = "Ringshaugveien 9",
                            MobileNumber = "99000000",
                            TelephoneNumber = "99000000",
                            LastName = "GUNNERUD",
                            MiddleName = null,
                            FirstName = "Kari",
                            Name = "KARI GUNNERUD",
                            SSN = "01124621077",
                            AddressPostalCode = "3154",
                            AddressCity = "Tolvsrød"
                        }
                    };
                case 50003590:
                    return new Party()
                    {
                        PartyId = 50003590,
                        PartyTypeName = PartyType.Person,
                        OrgNumber = null,
                        SSN = "22104511094",
                        Organization = null,
                        Person = new Person()
                        {
                            AddressHouseLetter = "A",
                            AddressHouseNumber = "17",
                            AddressStreetName = "Høgstveien",
                            AddressMunicipalName = "Fauske",
                            AddressMunicipalNumber = "1841",
                            MailingPostalCity = "Fauske",
                            MailingPostalCode = "8200",
                            MailingAddress = "Høgstveien 17",
                            MobileNumber = "99000000",
                            TelephoneNumber = "99000000",
                            LastName = "NYSÆTER",
                            MiddleName = null,
                            FirstName = "OLA",
                            Name = "OLA NYSÆTER",
                            SSN = "22104511094",
                            AddressPostalCode = "8200",
                            AddressCity = "Fauske",
                        }
                    };
                case 50003681:
                    return new Party()
                    {
                        PartyId = 50003681,
                        PartyTypeName = PartyType.Person,
                        OrgNumber = null,
                        SSN = "24054670016",
                        Organization = null,
                        Person = new Person()
                        {
                            AddressHouseLetter = null,
                            AddressHouseNumber = "11",
                            AddressStreetName = "Marikollen",
                            AddressMunicipalName = "Bergen",
                            AddressMunicipalNumber = "4601",
                            MailingPostalCity = "Mjølkeråen",
                            MailingPostalCode = "5136",
                            MailingAddress = "Marikollen 11",
                            MobileNumber = "99000000",
                            TelephoneNumber = "99000000",
                            LastName = "FUGLERUD",
                            MiddleName = null,
                            FirstName = "PÅL",
                            Name = "PÅL FUGLERUD",
                            SSN = "24054670016",
                            AddressPostalCode = "5136",
                            AddressCity = "Mjølkeråen"
                        }
                    };
                case 50002550:
                    return new Party()
                    {
                        PartyId = 50002550,
                        PartyTypeName = PartyType.Person,
                        OrgNumber = null,
                        SSN = "07069400021",
                        Organization = null,
                        Person = new Person()
                        {
                            AddressHouseLetter = "D",
                            AddressHouseNumber = "41",
                            AddressStreetName = "Jens Bjelkes gate",
                            AddressMunicipalName = "Oslo",
                            AddressMunicipalNumber = "0301",
                            MailingPostalCity = "Oslo",
                            MailingPostalCode = "5136",
                            MailingAddress = "Jens Bjelkes gate 41",
                            MobileNumber = "99000000",
                            TelephoneNumber = "99000000",
                            LastName = "EMBERLAND",
                            MiddleName = "SOPHIE",
                            FirstName = "ANNE",
                            Name = "ANNE SOPHIE EMBERLAND",
                            SSN = "07069400021",
                            AddressPostalCode = "0578",
                            AddressCity = "Oslo"
                        }
                    };
                default:
                    return null;
            }
        }
    }
}
