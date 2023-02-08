using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Models;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json.Linq;

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Default implementation of IPdfOptionsMapping
/// </summary>
public class PdfOptionsMapping : IPdfOptionsMapping
{
    private readonly IAppOptionsService _appOptionsService;

    /// <summary>
    /// Create new instance of PdfOptionsMapping
    /// </summary>
    /// <param name="appOptionsService"><see cref="IAppOptionsService"/> used to fetch mapped value of option</param>
    public PdfOptionsMapping(IAppOptionsService appOptionsService)
    {
        _appOptionsService = appOptionsService;
    }


    /// <inheritdoc />
    public async Task<Dictionary<string, Dictionary<string, string>>> GetOptionsDictionary(string formLayout, string language, object data, string instanceId)
    {
        IEnumerable<JToken> componentsWithOptionsDefined = GetFormComponentsWithOptionsDefined(formLayout);

        Dictionary<string, Dictionary<string, string>> dictionary = new Dictionary<string, Dictionary<string, string>>();

        foreach (JToken component in componentsWithOptionsDefined)
        {
            string? optionsId = component.SelectToken("optionsId")?.Value<string>();
            if (optionsId == null)
                continue;
            bool hasMappings = component.SelectToken("mapping") != null;
            var secureToken = component.SelectToken("secure");
            bool isSecureOptions = secureToken != null && secureToken.Value<bool>();
            Dictionary<string, List<string>> keyValues = hasMappings ? GetComponentKeyValuePairs(component, data) : new Dictionary<string, List<string>>();

            await GetMappingsForComponent(language, instanceId, keyValues, isSecureOptions, optionsId, dictionary);
        }

        return dictionary;
    }

    private async Task GetMappingsForComponent(string language, string instanceId, Dictionary<string, List<string>> mappings, bool isSecureOptions, string optionsId, Dictionary<string, Dictionary<string, string>> dictionary)
    {
        if (!dictionary.ContainsKey(optionsId))
        {
            dictionary.Add(optionsId, new Dictionary<string, string>());
        }

        var instanceIdentifier = new InstanceIdentifier(instanceId);
        if (mappings.IsNullOrEmpty())
        {
            AppOptions appOptions = await GetOptions(isSecureOptions, instanceIdentifier, optionsId, language, new Dictionary<string, string>());
            AppendOptionsToDictionary(dictionary[optionsId], appOptions.Options);
            return;
        }

        foreach (var pair in mappings)
        {
            foreach (var value in pair.Value)
            {
                AppOptions appOptions = await GetOptions(isSecureOptions, instanceIdentifier, optionsId, language, new Dictionary<string, string>() { { pair.Key, value } });

                AppendOptionsToDictionary(dictionary[optionsId], appOptions.Options);
            }
        }
    }

    private async Task<AppOptions> GetOptions(bool isSecure, InstanceIdentifier instanceIdentifier, string optionsId, string language, Dictionary<string, string> mappings)
    {
        if (isSecure)
        {
            return await _appOptionsService.GetOptionsAsync(instanceIdentifier, optionsId, language, mappings);
        }
        else
        {
            return await _appOptionsService.GetOptionsAsync(optionsId, language, mappings);
        }
    }

    private static IEnumerable<JToken> GetFormComponentsWithOptionsDefined(string formLayout)
    {
        JObject formLayoutObject = JObject.Parse(formLayout);

        // @ = Current object, ?(expression) = Filter, the rest is just dot notation ref. https://goessner.net/articles/JsonPath/
        return formLayoutObject.SelectTokens("*.data.layout[?(@.optionsId)]");
    }

    private static Dictionary<string, List<string>> GetComponentKeyValuePairs(JToken component, object data)
    {
        var componentKeyValuePairs = new Dictionary<string, List<string>>();
        JObject jsonData = JObject.FromObject(data);

        Dictionary<string, string> mappings = GetMappingsForComponent(component);
        foreach (var map in mappings)
        {
            var selectedDatas = GetMappingValues(jsonData, map);

            componentKeyValuePairs.Add(map.Value, selectedDatas);
        }

        return componentKeyValuePairs;
    }

    private static Dictionary<string, string> GetMappingsForComponent(JToken component)
    {
        var maps = new Dictionary<string, string>();
        foreach (var jToken in component.SelectToken("mapping")?.Children()!)
        {
            var map = (JProperty)jToken;
            maps.Add(map.Name, map.Value.ToString());
        }

        return maps;
    }

    private static void AppendOptionsToDictionary(Dictionary<string, string> dictionary, List<AppOption> options)
    {
        foreach (AppOption item in options)
        {
            if (!dictionary.ContainsKey(item.Label))
            {
                dictionary.Add(item.Label, item.Value);
            }
        }
    }


    private static List<string> GetMappingValues(JObject jsonData, KeyValuePair<string, string> map, int depth = 0)
    {
        int count = 1;
        if (MappingHasRepeatingGroup(map.Key))
        {
            var mappingUntilFirstGroup = GetMappingUntilFirstGroup(map.Key);
            JToken repeatingGroup = jsonData.SelectToken(mappingUntilFirstGroup);
            count = repeatingGroup.Children().Count();
        }

        List<string> selectedDatas = new List<string>();
        for (var i = 0; i < count; i++)
        {
            string replaceText = "{" + depth + "}";

            string select = map.Key.Replace(replaceText, i.ToString());
            if (MappingHasRepeatingGroup(select))
            {
                selectedDatas.AddRange(GetMappingValues(jsonData, new KeyValuePair<string, string>(select, map.Value), depth + 1));
            }
            else
            {
                JToken? token = jsonData.SelectToken(select);
                if (token != null) {
                    selectedDatas.Add(token.ToString());
                }
            }
        }

        return selectedDatas;
    }

    /// <summary>
    /// Return true if mapping contains a array replacement start "[{"
    /// </summary>
    /// <param name="mapping">Field mapping</param>
    /// <returns></returns>
    private static bool MappingHasRepeatingGroup(string mapping)
    {
        return mapping.Contains("[{");
    }

    /// <summary>
    /// Returns mapping of first element in mapping that is a list with replacement string.
    /// </summary>
    /// <param name="mapping"></param>
    /// <returns></returns>
    private static string GetMappingUntilFirstGroup(string mapping)
    {
        return mapping.Substring(0, mapping.IndexOf("[{"));
    }
}
