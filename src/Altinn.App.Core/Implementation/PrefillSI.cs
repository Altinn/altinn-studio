using System.Reflection;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace Altinn.App.Core.Implementation
{
    /// <inheritdoc/>
    public class PrefillSI : IPrefill
    {
        private readonly ILogger _logger;
        private readonly IProfileClient _profileClient;
        private readonly IAppResources _appResourcesService;
        private readonly IAltinnPartyClient _altinnPartyClientClient;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly Telemetry? _telemetry;
        private static readonly string ER_KEY = "ER";
        private static readonly string DSF_KEY = "DSF";
        private static readonly string USER_PROFILE_KEY = "UserProfile";
        private static readonly string ALLOW_OVERWRITE_KEY = "allowOverwrite";
        private bool allowOverwrite = false;

        /// <summary>
        /// Creates a new instance of the <see cref="PrefillSI"/> class
        /// </summary>
        /// <param name="logger">The logger</param>
        /// <param name="profileClient">The profile client</param>
        /// <param name="appResourcesService">The app's resource service</param>
        /// <param name="altinnPartyClientClient">The register client</param>
        /// <param name="httpContextAccessor">A service with access to the http context.</param>
        /// <param name="telemetry">Telemetry for traces and metrics.</param>
        public PrefillSI(
            ILogger<PrefillSI> logger,
            IProfileClient profileClient,
            IAppResources appResourcesService,
            IAltinnPartyClient altinnPartyClientClient,
            IHttpContextAccessor httpContextAccessor,
            Telemetry? telemetry = null
        )
        {
            _logger = logger;
            _profileClient = profileClient;
            _appResourcesService = appResourcesService;
            _altinnPartyClientClient = altinnPartyClientClient;
            _httpContextAccessor = httpContextAccessor;
            _telemetry = telemetry;
        }

        /// <inheritdoc/>
        public void PrefillDataModel(
            object dataModel,
            Dictionary<string, string> externalPrefill,
            bool continueOnError = false
        )
        {
            using var activity = _telemetry?.StartPrefillDataModelActivity();
            LoopThroughDictionaryAndAssignValuesToDataModel(externalPrefill, null, dataModel, continueOnError);
        }

        /// <inheritdoc/>
        public async Task PrefillDataModel(
            string partyId,
            string dataModelName,
            object dataModel,
            Dictionary<string, string>? externalPrefill = null
        )
        {
            using var activity = _telemetry?.StartPrefillDataModelActivity(partyId);
            // Prefill from external input. Only available during instansiation
            if (externalPrefill != null && externalPrefill.Count > 0)
            {
                PrefillDataModel(dataModel, externalPrefill, true);
            }

            string? jsonConfig = _appResourcesService.GetPrefillJson(dataModelName);
            if (jsonConfig == null || jsonConfig == string.Empty)
            {
                return;
            }

            JObject prefillConfiguration = JObject.Parse(jsonConfig);
            JToken? allowOverwriteToken = prefillConfiguration.SelectToken(ALLOW_OVERWRITE_KEY);
            if (allowOverwriteToken != null)
            {
                allowOverwrite = allowOverwriteToken.ToObject<bool>();
            }

            Party? party = await _altinnPartyClientClient.GetParty(int.Parse(partyId));
            if (party == null)
            {
                string errorMessage = $"Could find party for partyId: {partyId}";
                _logger.LogError(errorMessage);
                throw new Exception(errorMessage);
            }

            // Prefill from user profile
            JToken? profilePrefill = prefillConfiguration.SelectToken(USER_PROFILE_KEY);

            if (profilePrefill != null)
            {
                var userProfileDict =
                    profilePrefill.ToObject<Dictionary<string, string>>()
                    ?? throw new Exception("Unexpectedly failed to convert profilePrefill JToken to dictionary");

                if (userProfileDict.Count > 0)
                {
                    var httpContext =
                        _httpContextAccessor.HttpContext
                        ?? throw new Exception(
                            "Could not get HttpContext - must be in a request context to get current user"
                        );
                    int userId = AuthenticationHelper.GetUserId(httpContext);
                    UserProfile? userProfile = userId != 0 ? await _profileClient.GetUserProfile(userId) : null;
                    if (userProfile != null)
                    {
                        JObject userProfileJsonObject = JObject.FromObject(userProfile);
                        _logger.LogInformation($"Started prefill from {USER_PROFILE_KEY}");
                        LoopThroughDictionaryAndAssignValuesToDataModel(
                            SwapKeyValuesForPrefill(userProfileDict),
                            userProfileJsonObject,
                            dataModel
                        );
                    }
                    else
                    {
                        string errorMessage =
                            $"Could not  prefill from {USER_PROFILE_KEY}, user profile is not defined.";
                        _logger.LogError(errorMessage);
                    }
                }
            }

            // Prefill from ER (enhetsregisteret)
            JToken? enhetsregisteret = prefillConfiguration.SelectToken(ER_KEY);
            if (enhetsregisteret != null)
            {
                var enhetsregisterPrefill =
                    enhetsregisteret.ToObject<Dictionary<string, string>>()
                    ?? throw new Exception("Unexpectedly failed to convert enhetsregisteret JToken to dictionary");

                if (enhetsregisterPrefill.Count > 0)
                {
                    Organization org = party.Organization;
                    if (org != null)
                    {
                        JObject orgJsonObject = JObject.FromObject(org);
                        _logger.LogInformation($"Started prefill from {ER_KEY}");
                        LoopThroughDictionaryAndAssignValuesToDataModel(
                            SwapKeyValuesForPrefill(enhetsregisterPrefill),
                            orgJsonObject,
                            dataModel
                        );
                    }
                    else
                    {
                        string errorMessage = $"Could not  prefill from {ER_KEY}, organisation is not defined.";
                        _logger.LogError(errorMessage);
                    }
                }
            }

            // Prefill from DSF (det sentrale folkeregisteret)
            JToken? folkeregisteret = prefillConfiguration.SelectToken(DSF_KEY);
            if (folkeregisteret != null)
            {
                var folkeregisterPrefill =
                    folkeregisteret.ToObject<Dictionary<string, string>>()
                    ?? throw new Exception("Unexpectedly failed to convert folkeregisteret JToken to dictionary");

                if (folkeregisterPrefill.Count > 0)
                {
                    Person person = party.Person;
                    if (person != null)
                    {
                        JObject personJsonObject = JObject.FromObject(person);
                        _logger.LogInformation($"Started prefill from {DSF_KEY}");
                        LoopThroughDictionaryAndAssignValuesToDataModel(
                            SwapKeyValuesForPrefill(folkeregisterPrefill),
                            personJsonObject,
                            dataModel
                        );
                    }
                    else
                    {
                        string errorMessage = $"Could not  prefill from {DSF_KEY}, person is not defined.";
                        _logger.LogError(errorMessage);
                    }
                }
            }
        }

        /// <summary>
        /// Recursivly navigates through the datamodel, initiating objects if needed, and assigns the value to the target field
        /// </summary>
        private void AssignValueToDataModel(
            string[] keys,
            JToken? value,
            object currentObject,
            int index = 0,
            bool continueOnError = false
        )
        {
            string key = keys[index];
            bool isLastKey = (keys.Length - 1) == index;
            Type current = currentObject.GetType();
            PropertyInfo? property = current.GetProperty(
                key,
                BindingFlags.IgnoreCase | BindingFlags.Public | BindingFlags.Instance
            );

            if (property == null)
            {
                if (!continueOnError)
                {
                    string errorMessage =
                        $"Could not prefill the field {string.Join(".", keys)}, property {key} is not defined in the data model";
                    _logger.LogError(errorMessage);
                    throw new Exception(errorMessage);
                }
            }
            else
            {
                object? propertyValue = property.GetValue(currentObject, null);
                if (isLastKey)
                {
                    if (propertyValue == null || allowOverwrite)
                    {
                        ArgumentNullException.ThrowIfNull(value);

                        // create instance of the property type defined in the datamodel
                        var instance = value.ToObject(property.PropertyType);

                        // assign the value
                        property.SetValue(currentObject, instance);
                    }
                    else
                    {
                        // The target field has a value, and we do not have permission to overwrite values
                    }
                }
                else
                {
                    if (propertyValue == null)
                    {
                        // the object does not exsist, create a new one with the property type
                        propertyValue =
                            Activator.CreateInstance(property.PropertyType)
                            ?? throw new Exception(
                                $"Could not create instance of type {property.PropertyType.Name} while prefilling"
                            );
                        property.SetValue(currentObject, propertyValue, null);
                    }

                    // recursively assign values
                    // TODO: handle Nullable<T> (nullable value types), propertyValue may be null here
                    // due to Activator.CreateInstance above. Right now there is an exception
                    // but we could handle this better
                    AssignValueToDataModel(keys, value, propertyValue, index + 1, continueOnError);
                }
            }
        }

        /// <summary>
        /// Loops through the key-value dictionary and assigns each value to the datamodel target field
        /// </summary>
        private void LoopThroughDictionaryAndAssignValuesToDataModel(
            Dictionary<string, string> dictionary,
            JObject? sourceObject,
            object serviceModel,
            bool continueOnError = false
        )
        {
            foreach (KeyValuePair<string, string> keyValuePair in dictionary)
            {
                string source = keyValuePair.Value;
                string target = keyValuePair.Key.Replace("-", string.Empty);
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

                JToken? sourceValue = null;
                if (sourceObject != null)
                {
                    sourceValue = sourceObject.SelectToken(source);
                }
                else
                {
                    sourceValue = JToken.Parse($"'{source}'");
                }

                _logger.LogInformation($"Source: {source}, target: {target}");
                _logger.LogInformation($"Value read from source object: {sourceValue?.ToString()}");
                string[] keys = target.Split(".");
                AssignValueToDataModel(keys, sourceValue, serviceModel, 0, continueOnError);
            }
        }

        private Dictionary<string, string> SwapKeyValuesForPrefill(Dictionary<string, string> externalPrefil)
        {
            return externalPrefil.ToDictionary(x => x.Value, x => x.Key);
        }
    }
}
