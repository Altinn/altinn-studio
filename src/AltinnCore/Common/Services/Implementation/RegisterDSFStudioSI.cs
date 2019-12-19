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
    public class RegisterDSFStudioSI : IDSF
    {
        private readonly ILogger _logger;
        private readonly TestdataRepositorySettings _testdataRepositorySettings;
        private static readonly string TESTDATA_PERSON_FOLDER = @"/Person/";
        private static readonly string PERSON_JSON_FILE = "person.json";

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterDSFStudioSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        /// <param name="testdataRepositorySettings">the test data repository settings</param>
        public RegisterDSFStudioSI(ILogger<RegisterDSFStudioSI> logger, IOptions<TestdataRepositorySettings> testdataRepositorySettings)
        {
            _logger = logger;
            _testdataRepositorySettings = testdataRepositorySettings.Value;
        }

        /// <inheritdoc />
        public async Task<Person> GetPerson(string SSN)
        {
            string path = _testdataRepositorySettings.RepositoryLocation + TESTDATA_PERSON_FOLDER + SSN + @"/" + PERSON_JSON_FILE;
            string textData = await File.ReadAllTextAsync(path, Encoding.UTF8);
            Person person = JsonConvert.DeserializeObject<Person>(textData);
            return person;
        }
    }
}
