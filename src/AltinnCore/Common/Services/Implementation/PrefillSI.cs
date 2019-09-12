using System.Collections.Generic;
using System.Threading.Tasks;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json.Serialization;

namespace AltinnCore.Common.Services.Implementation
{
    /// <inheritdoc/>
    public class PrefillSI : IPrefill
    {
        private readonly ILogger _logger;

        /// <summary>
        /// Creates a new instance of the <see cref="PrefillSI"/> class
        /// </summary>
        /// <param name="logger">The logger</param>
        public PrefillSI(ILogger<PrefillSI> logger)
        {
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task PrefillDataModel(string jsonConfig, IRegister register, IProfile profile, PrefillContext prefillContext)
        {
            _logger.LogInformation($"[PREFILL] Started prefill for org: {prefillContext.OrgNumber}, SSN: {prefillContext.SSN}, UserId: {prefillContext.UserId}");
            JObject prefillConfiguration = JObject.Parse(jsonConfig);

            // Prefill from profile
            JToken profilePrefill = prefillConfiguration.SelectToken("profile");
            Dictionary<string, string> profilePrefillDict;
            if (profilePrefill != null)
            {
                UserProfile userProfile = await profile.GetUserProfile(prefillContext.UserId);

                // Parse to JSON in order to get lowercase names => TODO: MAKE GetUserProfileAsJSON in the profile service
                var serializerSettings = new JsonSerializerSettings();
                serializerSettings.ContractResolver = new CamelCasePropertyNamesContractResolver();
                string userProfileASJSON = JsonConvert.SerializeObject(userProfile, serializerSettings);

                JObject userProfileJsonObject = JObject.Parse(userProfileASJSON);
                profilePrefillDict = profilePrefill.ToObject<Dictionary<string, string>>();
                _logger.LogInformation($"[PREFILL] Started prefill from profile");
                foreach (KeyValuePair<string, string> keyValuePair in profilePrefillDict)
                {
                    JToken sourceValue = userProfileJsonObject.SelectToken(keyValuePair.Key);
                    _logger.LogInformation($"[PREFILL] KEY (SOURCE): {keyValuePair.Key}, VALUE (TARGET): {keyValuePair.Value}");
                    _logger.LogInformation($"[PREFILL] VALUE READ FROM PROFILE OBJECT: {sourceValue.ToString()}");
                    // TODO: CAll assign value
                }
            }

            // Prefill from enhetsregisteret
            JToken enhetsregisteret = prefillConfiguration.SelectToken("enhetsregisteret");
            Dictionary<string, string> enhetsregisterPrefill;
            if (enhetsregisteret != null)
            {
                enhetsregisterPrefill = enhetsregisteret.ToObject<Dictionary<string, string>>();
                if (enhetsregisterPrefill.Count > 0)
                {
                    _logger.LogInformation($"[PREFILL] Started prefill from enhetsregisteret");
                }
            }

            // Prefill from folkeregisteret
            JToken folkeregisteret = prefillConfiguration.SelectToken("folkeregisteret");
            Dictionary<string, string> folkeregisterPrefill;
            if (folkeregisteret != null)
            {
                folkeregisterPrefill = folkeregisteret.ToObject<Dictionary<string, string>>();
                if (folkeregisterPrefill.Count > 0)
                {
                    _logger.LogInformation($"[PREFILL] Started prefill from folkeregisteret");
                }
            }
        }

        private void AssignValueToDataModel(string dataModelPath, JToken value)
        {
            // TODO: Implement assigning values
        }
    }
}
