using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <inheritdoc />
    public class RegisterERStudioSI : IER
    {
        private const string TESTDATA_ORG_FOLDER = @"/Org/";
        private const string ORG_JSON_FILE = "org.json";
        private readonly ILogger _logger;
        private readonly TestdataRepositorySettings _testdataRepositorySettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterERStudioSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="testdataRepositorySettings">the testdata repository settings</param>
        public RegisterERStudioSI(ILogger<RegisterERStudioSI> logger, IOptions<TestdataRepositorySettings> testdataRepositorySettings)
        {
            _logger = logger;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
        }

        /// <inheritdoc />
        public async Task<Organization> GetOrganization(string OrgNr)
        {
            string path = _testdataRepositorySettings.RepositoryLocation + TESTDATA_ORG_FOLDER + OrgNr + @"/" + ORG_JSON_FILE;
            string textData = File.ReadAllText(path, Encoding.UTF8);
            Organization org = JsonConvert.DeserializeObject<Organization>(textData);
            return org;
        }
    }
}
