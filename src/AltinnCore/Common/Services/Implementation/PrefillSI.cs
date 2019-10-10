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
        private readonly IProfile _profile;
        private readonly IRepository _repository;
        private static readonly string ER_KEY = "ER";
        private static readonly string DSF_KEY = "DSF";
        private static readonly string USER_PROFILE_KEY = "UserProfile";
        private static readonly string ALLOW_OVERWRITE_KEY = "allowOverwrite";
        private bool allowOverwrite = false;

        /// <summary>
        /// Creates a new instance of the <see cref="PrefillSI"/> class
        /// </summary>
        /// <param name="logger">The logger</param>
        /// <param name="profile">Te profile service</param>
        /// <param name="repository">The repository service</param>
        public PrefillSI(ILogger<PrefillSI> logger, IProfile profile, IRepository repository)
        {
            _logger = logger;
            _profile = profile;
            _repository = repository;
        }

        /// <inheritdoc/>
        public async Task PrefillDataModel(PrefillContext prefillContext, object dataModel)
        {
            string jsonConfig = _repository.GetPrefillJson(prefillContext.Org, prefillContext.App);
            if (jsonConfig == null || jsonConfig == string.Empty)
            {
                return;
            }

            JObject prefillConfiguration = JObject.Parse(jsonConfig);
            JToken allowOverwriteToken = prefillConfiguration.SelectToken(ALLOW_OVERWRITE_KEY);
            if (allowOverwriteToken != null)
            {
                allowOverwrite = allowOverwriteToken.ToObject<bool>();
            }

            // Prefill from user profile
            JToken profilePrefill = prefillConfiguration.SelectToken(USER_PROFILE_KEY);
            Dictionary<string, string> userProfileDict;
            if (profilePrefill != null)
            {
                userProfileDict = profilePrefill.ToObject<Dictionary<string, string>>();
                if (userProfileDict.Count > 0)
                {
                    UserProfile userProfile = await _profile.GetUserProfile(prefillContext.UserId);
                    if (userProfile != null)
                    {
                        JObject userProfileJsonObject = JObject.FromObject(userProfile);
                        _logger.LogInformation($"Started prefill from {USER_PROFILE_KEY}");
                        LoopThroughDictionaryAndAssignValuesToDataModel(userProfileDict, userProfileJsonObject, dataModel);
                    }
                    else
                    {
                        string errorMessage = $"Could not  prefill from {USER_PROFILE_KEY}, user profile is not defined.";
                        _logger.LogError(errorMessage);
                        throw new Exception(errorMessage);
                    }
                }
            }

            // Prefill from ER (enhetsregisteret)
            JToken enhetsregisteret = prefillConfiguration.SelectToken(ER_KEY);
            Dictionary<string, string> enhetsregisterPrefill;
            if (enhetsregisteret != null)
            {
                enhetsregisterPrefill = enhetsregisteret.ToObject<Dictionary<string, string>>();
                if (enhetsregisterPrefill.Count > 0)
                {
                    if (prefillContext.Organization != null)
                    {
                        JObject orgJsonObject = JObject.FromObject(prefillContext.Organization);
                        _logger.LogInformation($"Started prefill from {ER_KEY}");
                        LoopThroughDictionaryAndAssignValuesToDataModel(enhetsregisterPrefill, orgJsonObject, dataModel);
                    }
                    else
                    {
                        string errorMessage = $"Could not  prefill from {ER_KEY}, organisation is not defined.";
                        _logger.LogError(errorMessage);
                        throw new Exception(errorMessage);
                    }
                }
            }

            // Prefill from DSF (det sentrale folkeregisteret)
            JToken folkeregisteret = prefillConfiguration.SelectToken(DSF_KEY);
            Dictionary<string, string> folkeregisterPrefill;
            if (folkeregisteret != null)
            {
                folkeregisterPrefill = folkeregisteret.ToObject<Dictionary<string, string>>();
                if (folkeregisterPrefill.Count > 0)
                {
                    if (prefillContext.Person != null)
                    {
                        JObject personJsonObject = JObject.FromObject(prefillContext.Person);
                        _logger.LogInformation($"Started prefill from {DSF_KEY}");
                        LoopThroughDictionaryAndAssignValuesToDataModel(folkeregisterPrefill, personJsonObject, dataModel);
                    }
                    else
                    {
                        string errorMessage = $"Could not  prefill from {DSF_KEY}, person is not defined.";
                        _logger.LogError(errorMessage);
                        throw new Exception(errorMessage);
                    }
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
                string errorMessage = $"Could not prefill the field {string.Join(".", keys)}, property {key} is not defined in the data model";
                _logger.LogError(errorMessage);
                throw new Exception(errorMessage);
            }
            else
            {
                object propertyValue = property.GetValue(currentObject, null);
                if (isLastKey)
                {
                    if (propertyValue == null || allowOverwrite)
                    {
                        // create instance of the property type defined in the datamodel
                        var instance = value.ToObject(property.PropertyType);

                        // assign the value
                        property.SetValue(currentObject, instance);
                    }
                    else
                    {
                        // The target field has a value, and we do not have permission to overwrite values
                        string errorMessage = $"Could not prefill, the field {string.Join(".", keys)} has a value and {ALLOW_OVERWRITE_KEY} is set to false";
                        _logger.LogError(errorMessage);
                        throw new Exception(errorMessage);
                    }
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
                string source = keyValuePair.Key;
                string target = keyValuePair.Value;
                if (source == null || source == string.Empty)
                {
                    string errorMessage = $"Could not prefill, a source value was not set for target: {target}";
                    _logger.LogError(errorMessage);
                    throw new Exception(errorMessage);
                }

                if (target == null || target == string.Empty)
                {
                    string errorMessage = $"Could not prefill, a target value was not set for source: {source}";
                    _logger.LogError(errorMessage);
                    throw new Exception(errorMessage);
                }

                JToken sourceValue = sourceObject.SelectToken(source);
                _logger.LogInformation($"Source: {source}, target: {target}");
                _logger.LogInformation($"Value read from source object: {sourceValue.ToString()}");
                string[] keys = target.Split(".");
                AssignValueToDataModel(keys, sourceValue, serviceModel);
            }
        }
    }
}
