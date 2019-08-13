using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Authorization service created for service development where test data is located on disk
    /// </summary>
    public class AuthorizationStudioSI : IAuthorization
    {
        private const string TESDATA_USER_DIRECTORY = @"/User/";

        private const string PARTYLIST_FILENAME = "partylist.json";

        private readonly TestdataRepositorySettings _testdataRepositorySettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthorizationStudioSI"/> class.
        /// </summary>
        /// <param name="testdataRepositorySettings">Repository settings</param>
        public AuthorizationStudioSI(IOptions<TestdataRepositorySettings> testdataRepositorySettings)
        {
            _testdataRepositorySettings = testdataRepositorySettings.Value;
        }

        /// <summary>
        /// Creates the list of parties that a user can report for based on test data on disk
        /// </summary>
        /// <param name="userId">The userId</param>
        /// <returns>List of parties user can report for</returns>
        public List<Party> GetPartyList(int userId)
        {
            string path = _testdataRepositorySettings.RepositoryLocation + TESDATA_USER_DIRECTORY + userId + @"/" + PARTYLIST_FILENAME;
            string textData = File.ReadAllText(path, Encoding.UTF8);
            List<Party> partyList = JsonConvert.DeserializeObject<List<Party>>(textData);
            return partyList;
        }

        /// <inheritdoc />
        public Task<bool> UpdateSelectedParty(int partyId)
        {
            throw new System.NotImplementedException();
        }

        /// <summary>
        /// Verifies that the user can represent the party based on test data on disk
        /// </summary>
        /// <param name="userId">The userId</param>
        /// <param name="partyId">The partyId</param>
        /// <returns> true or false</returns>
        public async Task<bool?> ValidateSelectedParty(int userId, int partyId)
        {
            bool result = false;
            List<Party> partyList = GetPartyList(userId);
           
            if (partyList.Count > 0)
            {
                result = partyList.Any(p => p.PartyId == partyId);
            }

            return await Task.FromResult(result);            
        }
    }
}
