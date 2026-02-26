using System.Globalization;
using System.Reflection;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.Registers;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;

namespace Altinn.App.Core.Implementation;

/// <inheritdoc/>
public class PrefillSI : IPrefill
{
    private readonly ILogger _logger;
    private readonly IAppResources _appResourcesService;
    private readonly IRegisterClient _registerClient;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly Telemetry? _telemetry;
    private static readonly string _erKey = "ER";
    private static readonly string _dsfKey = "DSF";
    private static readonly string _userProfileKey = "UserProfile";
    private static readonly string _allowOverwriteKey = "allowOverwrite";
    private bool _allowOverwrite = false;

    /// <summary>
    /// Creates a new instance of the <see cref="PrefillSI"/> class
    /// </summary>
    /// <param name="logger">The logger</param>
    /// <param name="appResourcesService">The app's resource service</param>
    /// <param name="authenticationContext">The authentication context</param>
    /// <param name="serviceProvider">The service provider</param>
    /// <param name="telemetry">Telemetry for traces and metrics.</param>
    public PrefillSI(
        ILogger<PrefillSI> logger,
        IAppResources appResourcesService,
        IAuthenticationContext authenticationContext,
        IServiceProvider serviceProvider,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _appResourcesService = appResourcesService;
        _registerClient = serviceProvider.GetRequiredService<IRegisterClient>();
        _authenticationContext = authenticationContext;
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
        JToken? allowOverwriteToken = prefillConfiguration.SelectToken(_allowOverwriteKey);
        if (allowOverwriteToken != null)
        {
            _allowOverwrite = allowOverwriteToken.ToObject<bool>();
        }

        var currentAuth = _authenticationContext.Current;
        var partyIdNum = int.Parse(partyId, CultureInfo.InvariantCulture);
        Party? party = currentAuth switch
        {
            Authenticated.User user when user.SelectedPartyId == partyIdNum => await user.LookupSelectedParty(),
            Authenticated.SystemUser systemUser
                when await systemUser.LoadDetails() is { } details && details.Party.PartyId == partyIdNum =>
                details.Party,
            // We use the unchecked register client here,
            // thinking that it is fine to do so because it is the calling code
            // that is responsible for authorizing the overarching request
            _ => await _registerClient.GetPartyUnchecked(partyIdNum, default),
        };
        if (party == null)
        {
            string errorMessage = $"Could find party for partyId: {partyId}";
            _logger.LogError(errorMessage);
            throw new Exception(errorMessage);
        }

        // Prefill from user profile
        JToken? profilePrefill = prefillConfiguration.SelectToken(_userProfileKey);

        if (profilePrefill != null)
        {
            var userProfileDict =
                profilePrefill.ToObject<Dictionary<string, string>>()
                ?? throw new Exception("Unexpectedly failed to convert profilePrefill JToken to dictionary");

            if (userProfileDict.Count > 0)
            {
                UserProfile? userProfile = null;
                switch (currentAuth)
                {
                    case Authenticated.User user:
                    {
                        var details = await user.LoadDetails(validateSelectedParty: false);
                        userProfile = details.Profile;
                        break;
                    }
                }

                if (userProfile != null)
                {
                    JObject userProfileJsonObject = JObject.FromObject(userProfile);
                    _logger.LogInformation($"Started prefill from {_userProfileKey}");
                    LoopThroughDictionaryAndAssignValuesToDataModel(
                        SwapKeyValuesForPrefill(userProfileDict),
                        userProfileJsonObject,
                        dataModel
                    );
                }
                else
                {
                    string errorMessage = $"Could not  prefill from {_userProfileKey}, user profile is not defined.";
                    _logger.LogError(errorMessage);
                }
            }
        }

        // Prefill from ER (enhetsregisteret)
        JToken? enhetsregisteret = prefillConfiguration.SelectToken(_erKey);
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
                    _logger.LogInformation($"Started prefill from {_erKey}");
                    LoopThroughDictionaryAndAssignValuesToDataModel(
                        SwapKeyValuesForPrefill(enhetsregisterPrefill),
                        orgJsonObject,
                        dataModel
                    );
                }
                else
                {
                    string errorMessage = $"Could not  prefill from {_erKey}, organisation is not defined.";
                    _logger.LogError(errorMessage);
                }
            }
        }

        // Prefill from DSF (det sentrale folkeregisteret)
        JToken? folkeregisteret = prefillConfiguration.SelectToken(_dsfKey);
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
                    _logger.LogInformation($"Started prefill from {_dsfKey}");
                    LoopThroughDictionaryAndAssignValuesToDataModel(
                        SwapKeyValuesForPrefill(folkeregisterPrefill),
                        personJsonObject,
                        dataModel
                    );
                }
                else
                {
                    string errorMessage = $"Could not  prefill from {_dsfKey}, person is not defined.";
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
                if (propertyValue == null || _allowOverwrite)
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

            if (string.IsNullOrEmpty(source))
            {
                string errorMessage =
                    $"Could not prefill, a source value was not set for target: {target.Replace(Environment.NewLine, "")}";
                _logger.LogError(errorMessage);
                throw new Exception(errorMessage);
            }

            if (string.IsNullOrEmpty(target))
            {
                string errorMessage =
                    $"Could not prefill, a target value was not set for source: {source.Replace(Environment.NewLine, "")}";
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
                sourceValue = JValue.CreateString(source);
            }

            string[] keys = target.Split(".");

            AssignValueToDataModel(keys, sourceValue, serviceModel, 0, continueOnError);
        }
    }

    private static Dictionary<string, string> SwapKeyValuesForPrefill(Dictionary<string, string> externalPrefil)
    {
        return externalPrefil.ToDictionary(x => x.Value, x => x.Key);
    }
}
