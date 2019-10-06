using System.IO;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Implementation for register functionality for app development. Uses local disk to store register data
    /// </summary>
    public class RegisterStudioSI : IRegister
    {
        private const string TESTDATA_PARTY_DIRECTORY = @"/Party/";
        private const string PARTY_FILENAME = "party.json";
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private readonly IDSF _dsfService;
        private readonly IER _erService;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterStudioSI"/> class
        /// </summary>
        /// <param name="testdataRepositorySettings">The test data repository settings</param>
        /// <param name="dsfService">The dsf service</param>
        /// <param name="erService">The er service</param>
        public RegisterStudioSI(IOptions<TestdataRepositorySettings> testdataRepositorySettings, IDSF dsfService, IER erService)
        {
            _testdataRepositorySettings = testdataRepositorySettings.Value;
            _dsfService = dsfService;
            _erService = erService;
        }

        /// <inheritdoc />
        public IDSF DSF
        {
            get { return _dsfService; }
        }

        /// <inheritdoc />
        public IER ER
        {
            get { return _erService; }
        }

        /// <inheritdoc />
        public async Task<Party> GetParty(int partyId)
        {
            string path = _testdataRepositorySettings.RepositoryLocation + TESTDATA_PARTY_DIRECTORY + partyId + @"/" + PARTY_FILENAME;
            string textData = File.ReadAllText(path, Encoding.UTF8);
            Party party = JsonConvert.DeserializeObject<Party>(textData);
            if (party.OrgNumber != null && party.OrgNumber != string.Empty)
            {
                party.Organization = await _erService.GetOrganization(party.OrgNumber);
            }

            if (party.SSN != null && party.SSN != string.Empty)
            {
                party.Person = await _dsfService.GetPerson(party.SSN);
            }

            return await Task.FromResult(party);
        }
    }
}
