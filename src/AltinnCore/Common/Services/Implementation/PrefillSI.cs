using System;
using System.Collections.Generic;
using System.Reflection;
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
        private static readonly string ER_KEY = "ER";
        private static readonly string DSF_KEY = "DSF";
        private static readonly string USER_PROFILE_KEY = "UserProfile";

        /// <summary>
        /// Creates a new instance of the <see cref="PrefillSI"/> class
        /// </summary>
        /// <param name="logger">The logger</param>
        public PrefillSI(ILogger<PrefillSI> logger)
        {
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task PrefillDataModel(string jsonConfig, IRegister register, IProfile profile, PrefillContext prefillContext, object serviceModel)
        {
            _logger.LogInformation($"[PREFILL] Started prefill for org: {prefillContext.OrgNumber}, SSN: {prefillContext.SSN}, UserId: {prefillContext.UserId}");
            JObject prefillConfiguration = JObject.Parse(jsonConfig);

            // Prefill from profile
            JToken profilePrefill = prefillConfiguration.SelectToken(USER_PROFILE_KEY);
            Dictionary<string, string> profilePrefillDict;
            if (profilePrefill != null)
            {
                UserProfile userProfile = await profile.GetUserProfile(prefillContext.UserId);
                JObject userProfileJsonObject = JObject.FromObject(userProfile);
                profilePrefillDict = profilePrefill.ToObject<Dictionary<string, string>>();
                _logger.LogInformation($"[PREFILL] Started prefill from {USER_PROFILE_KEY}");
                LoopThroughDictionaryAndAssignValuesToDataModel(profilePrefillDict, userProfileJsonObject, serviceModel);
            }

            // Prefill from enhetsregisteret
            JToken enhetsregisteret = prefillConfiguration.SelectToken(ER_KEY);
            Dictionary<string, string> enhetsregisterPrefill;
            if (enhetsregisteret != null)
            {
                enhetsregisterPrefill = enhetsregisteret.ToObject<Dictionary<string, string>>();
                if (enhetsregisterPrefill.Count > 0)
                {
                    Organization org = await register.ER.GetOrganization(prefillContext.OrgNumber);
                    JObject orgJsonObject = JObject.FromObject(org);
                    _logger.LogInformation($"[PREFILL] Started prefill from {ER_KEY}");
                    _logger.LogInformation($"[PREFILL] {orgJsonObject.ToString()}");
                    LoopThroughDictionaryAndAssignValuesToDataModel(enhetsregisterPrefill, orgJsonObject, serviceModel);
                }
            }

            // Prefill from folkeregisteret
            JToken folkeregisteret = prefillConfiguration.SelectToken(DSF_KEY);
            Dictionary<string, string> folkeregisterPrefill;
            if (folkeregisteret != null)
            {
                folkeregisterPrefill = folkeregisteret.ToObject<Dictionary<string, string>>();
                if (folkeregisterPrefill.Count > 0)
                {
                    Person person = await register.DSF.GetPerson(prefillContext.SSN);
                    JObject personJsonObject = JObject.FromObject(person);
                    _logger.LogInformation($"[PREFILL] Started prefill from {DSF_KEY}");
                    _logger.LogInformation($"[PREFILL] {personJsonObject.ToString()}");
                    LoopThroughDictionaryAndAssignValuesToDataModel(folkeregisterPrefill, personJsonObject, serviceModel);
                }
            }
        }

        /// <summary>
        /// Recursivly navigates through the datamodel, initiating objects if needed, and assigns the value to the target field
        /// </summary>
        private void AssignValueToDataModel(string[] keys, JToken value, object currentObject, int index = 0)
        {
            string key = keys[index];
            bool isLastKey = (keys.Length - 1) == index;
            Type current = currentObject.GetType();
            PropertyInfo property = current.GetProperty(key);

            if (property == null)
            {
                // TODO: Throw error message
                _logger.LogInformation($"[PREFILL] CAN NOT PREFILL, PROPERTY IS NOT DEFINED IN DATA MODEL");
            }
            else
            {
                object propertyValue = property.GetValue(currentObject, null);
                if (isLastKey)
                {
                    // create instance of the property type defined in the datamodel
                    var instance = value.ToObject(property.PropertyType);

                    // assign the value, we prefill even though it has a value for now
                    property.SetValue(currentObject, instance);
                }
                else
                {
                    if (propertyValue == null)
                    { 
                        // the object does not exsist, create a new one with the property type
                        var instance = Activator.CreateInstance(property.PropertyType);
                        property.SetValue(currentObject, instance, null);
                    }

                    // recurivly assign values
                    AssignValueToDataModel(keys, value, property.GetValue(currentObject, null), index + 1);
                }
            }
        }

        /// <summary>
        /// Loops through the key-value dictionary and assigns each value to the datamodel target field
        /// </summary>
        private void LoopThroughDictionaryAndAssignValuesToDataModel(Dictionary<string, string> dictionary, JObject sourceObject, object serviceModel)
        {
            foreach (KeyValuePair<string, string> keyValuePair in dictionary)
            {
                JToken sourceValue = sourceObject.SelectToken(keyValuePair.Key);
                _logger.LogInformation($"[PREFILL] KEY (SOURCE): {keyValuePair.Key}, VALUE (TARGET): {keyValuePair.Value}");
                _logger.LogInformation($"[PREFILL] VALUE READ FROM SOURCE OBJECT: {sourceValue.ToString()}");
                string[] keys = keyValuePair.Value.Split(".");
                AssignValueToDataModel(keys, sourceValue, serviceModel);
            }
        }
    }
}
