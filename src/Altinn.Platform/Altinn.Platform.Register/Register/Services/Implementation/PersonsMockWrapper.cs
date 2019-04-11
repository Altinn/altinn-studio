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
    /// The persons wrapper
    /// </summary>
    public class PersonsMockWrapper : IPersons
    {
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="PersonsMockWrapper"/> class
        /// </summary>
        /// <param name="generalSettings">the general settings</param>
        /// <param name="logger">the logger</param>
        public PersonsMockWrapper(IOptions<GeneralSettings> generalSettings, ILogger<PersonsWrapper> logger)
        {
            _generalSettings = generalSettings.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<Person> GetPerson(string ssn)
        {
            switch (ssn)
            {
                case "01124621077":
                    return new Person()
                    {
                        AddressHouseLetter = null,
                        AddressHouseNumber = "9",
                        AddressStreetName = "Ringshaugveien",
                        AddressMunicipalName = "Tønsberg",
                        AddressMunicipalNumber = "3803",
                        MailingPostalCity = "Tolvsrød",
                        MailingPostalCode = "3151",
                        MailingAddress = "Roseveien 24",
                        MobileNumber = "99000000",
                        TelephoneNumber = "99000000",
                        LastName = "GUNNERUD",
                        MiddleName = null,
                        FirstName = "Kari",
                        Name = "KARI GUNNERUD",
                        SSN = "01124621077",
                        AddressPostalCode = "3154",
                        AddressCity = "Tolvsrød"
                    };
                case "22104511094":
                    return new Person()
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
                    };
                case "24054670016":
                    return new Person()
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
                    };
                case "07069400021":
                    return new Person()
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
                    };
                default:
                    return null;
            }
        }
    }
}
