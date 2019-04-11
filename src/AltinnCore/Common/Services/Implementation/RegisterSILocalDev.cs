using System.IO;
using System.Text;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Register service for service development. Uses local disk to store register data
    /// </summary>
    public class RegisterSILocalDev : IRegister
    {
        private const string TESTDATA_PARTY_DIRECTORY = @"/Party/";

        private const string PARTY_FILENAME = "party.json";

        private TestdataRepositorySettings _testdataRepositorySettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterSILocalDev"/> class
        /// </summary>
        /// <param name="testdataRepositorySettings">The test data repository settings</param>
        public RegisterSILocalDev(IOptions<TestdataRepositorySettings> testdataRepositorySettings)
        {
            this._testdataRepositorySettings = testdataRepositorySettings.Value;
        }

        /// <summary>
        /// Returns party information
        /// </summary>
        /// <param name="partyId">The partyId</param>
        /// <returns>The party</returns>
        public Party GetParty(int partyId)
        {
            string path = _testdataRepositorySettings.RepositoryLocation + TESTDATA_PARTY_DIRECTORY + partyId + @"/" + PARTY_FILENAME;
            string textData = File.ReadAllText(path, Encoding.UTF8);
            Party party = JsonConvert.DeserializeObject<Party>(textData);
            return party;
        }
    }
}
