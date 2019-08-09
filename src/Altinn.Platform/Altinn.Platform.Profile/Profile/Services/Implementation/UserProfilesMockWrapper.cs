using System.Threading.Tasks;
using Altinn.Platform.Profile.Configuration;
using Altinn.Platform.Profile.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Profile.Services.Implementation
{
    /// <summary>
    /// The users wrapper
    /// </summary>
    public class UserProfilesMockWrapper : IUserProfiles
    {
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="UserProfilesMockWrapper"/> class
        /// </summary>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        public UserProfilesMockWrapper(IOptions<GeneralSettings> generalSettings, ILogger<UserProfilesMockWrapper> logger)
        {
            _generalSettings = generalSettings.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<UserProfile> GetUser(int userId)
        {
            switch (userId)
            { 
                case 1083:
                    return new UserProfile
                    {
                        UserId = 1083,
                        PartyId = 50002182,
                        Email = "kari.gunnerud@dispostable.com",
                        UserName = "kari",
                        PhoneNumber = "99000000",
                        UserType = UserType.SelfIdentified,
                        Party = new Party()
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
                        }
                    };
                case 2772:
                    return new UserProfile
                    {
                        UserId = 2772,
                        PartyId = 50003590,
                        Email = "ola.nysaeter@dispostable.com",
                        UserName = "ola",
                        PhoneNumber = "99000000",
                        UserType = UserType.SelfIdentified,
                        Party = new Party()
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
                        }
                    };
                case 2882:
                    return new UserProfile
                    {
                        UserId = 2882,
                        PartyId = 50003681,
                        Email = "paal.fuglerud@dispostable.com",
                        UserName = "paal",
                        PhoneNumber = "99000000",
                        UserType = UserType.SelfIdentified,
                        Party = new Party()
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
                        }
                    };
                case 1536:
                    return new UserProfile
                    {
                        UserId = 1536,
                        PartyId = 50002550,
                        Email = "anne.sophie.emberland@dispostable.com",
                        UserName = "anne",
                        PhoneNumber = "99000000",
                        UserType = UserType.SelfIdentified,
                        Party = new Party()
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
                        }
                    };
                default:
                    return null;
        }
    }
    }
}
