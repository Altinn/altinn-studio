using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Service for handling texts in new format in an app repository.
    /// </summary>
    public class TextsService : ITextsService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
        private readonly IApplicationMetadataService _applicationMetadataService;
        private readonly IOptionsService _optionsService;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
        /// <param name="applicationMetadataService">IApplicationMetadataService</param>
        /// <param name="optionsService">IOptionsService</param>
        public TextsService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IApplicationMetadataService applicationMetadataService, IOptionsService optionsService)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
            _applicationMetadataService = applicationMetadataService;
            _optionsService = optionsService;
        }

        public async Task CreateLanguageResources(string org, string repo, string developer)
        {
            if (!string.IsNullOrEmpty(repo))
            {
                AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
                TextResource textResource = await altinnAppGitRepository.GetText("nb");
                if (textResource?.Resources == null)
                {
                    textResource = new TextResource();
                    textResource.Language = "nb";
                    textResource.Resources = new List<TextResourceElement>();
                }

                textResource.Resources.Add(new TextResourceElement() { Id = "appName", Value = repo });
                await altinnAppGitRepository.SaveText("nb", textResource);
            }
        }

        /// <inheritdoc />
        public List<string> GetLanguages(string org, string app, string developer)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            List<string> languages = altinnAppGitRepository.GetLanguages();

            return languages;
        }

        /// <inheritdoc />
        public async Task<TextResource> GetText(string org, string repo, string developer, string languageCode)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

            TextResource texts = await altinnAppGitRepository.GetText(languageCode);

            return texts;
        }

        /// <inheritdoc />
        public async Task SaveText(string org, string repo, string developer, TextResource textResource, string languageCode)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

            string[] duplicateKeys = textResource.Resources.GroupBy(tre => tre.Id).Where(grp => grp.Count() > 1).Select(grp => grp.Key).ToArray();
            if (duplicateKeys.Length > 0)
            {
                throw new ArgumentException($"Text keys must be unique. Please review keys: {string.Join(", ", duplicateKeys)}");
            }

            // updating application metadata with appTitle.
            TextResourceElement appTitleResourceElement = textResource.Resources.FirstOrDefault(tre => tre.Id == "appName" || tre.Id == "ServiceName");

            if (appTitleResourceElement != null && !string.IsNullOrEmpty(appTitleResourceElement.Value))
            {
                await _applicationMetadataService.UpdateAppTitleInAppMetadata(org, repo, "nb", appTitleResourceElement.Value);
            }
            else
            {
                throw new ArgumentException("The application name must be a value.");
            }

            await altinnAppGitRepository.SaveText(languageCode, textResource);
        }

        public async Task<TextResource> UpdateTextsForKeys(string org, string repo, string developer, Dictionary<string, string> keysTexts, string languageCode)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
            TextResource textResourceObject = await altinnAppGitRepository.GetText(languageCode);

            // handle if file not already exist

            foreach (KeyValuePair<string, string> kvp in keysTexts)
            {
                if ((kvp.Key == "appName" || kvp.Key == "serviceName") && string.IsNullOrEmpty(kvp.Value))
                {
                    throw new ArgumentException("The application name must be a value.");
                }

                TextResourceElement textResourceContainsKey = textResourceObject.Resources.Find(textResourceElement => textResourceElement.Id == kvp.Key);
                if (textResourceContainsKey is null)
                {
                    textResourceObject.Resources.Insert(0, new TextResourceElement() { Id = kvp.Key, Value = kvp.Value });
                }
                else
                {
                    int indexTextResourceElementUpdateKey = textResourceObject.Resources.IndexOf(textResourceContainsKey);
                    if (textResourceContainsKey.Variables == null)
                    {
                        textResourceObject.Resources[indexTextResourceElementUpdateKey] = new TextResourceElement { Id = kvp.Key, Value = kvp.Value };
                    }
                    else
                    {
                        List<TextResourceVariable> variables = textResourceContainsKey.Variables;
                        textResourceObject.Resources[indexTextResourceElementUpdateKey] = new TextResourceElement { Id = kvp.Key, Value = kvp.Value, Variables = variables };
                    }
                }
            }

            await altinnAppGitRepository.SaveText(languageCode, textResourceObject);
            return textResourceObject;
        }

        /// <inheritdoc />
        public async Task<List<string>> UpdateRelatedFiles(string org, string app, string developer, List<TextIdMutation> keyMutations)
        {
            // handle if no layout exists
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            string[] layoutSetNames = altinnAppGitRepository.GetLayoutSetNames();
            List<string> updatedFiles = [];

            if (altinnAppGitRepository.AppUsesLayoutSets())
            {
                foreach (string layoutSetName in layoutSetNames)
                {
                    updatedFiles.AddRange(await UpdateKeysInLayoutsInLayoutSet(org, app, developer, layoutSetName, keyMutations));
                }
            }
            else
            {
                updatedFiles.AddRange(await UpdateKeysInLayoutsInLayoutSet(org, app, developer, null, keyMutations));
            }

            updatedFiles.AddRange(await UpdateKeysInOptionLists(org, app, developer, keyMutations));
            return updatedFiles;
        }

        /// <summary>
        /// Updates text keys in layouts for a specific layoutset
        /// </summary>
        /// <param name="org">Identifier for the organisation</param>
        /// <param name="app">Identifier for the application</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="layoutSetName">Name of the layoutset</param>
        /// <param name="keyMutations">A list of the keys that are updated</param>
        private async Task<List<string>> UpdateKeysInLayoutsInLayoutSet(string org, string app, string developer, string layoutSetName, List<TextIdMutation> keyMutations)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            string[] layoutNames = altinnAppGitRepository.GetLayoutNames(layoutSetName);
            List<string> updatedFiles = [];
            foreach (string layoutName in layoutNames)
            {
                JsonNode layout = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);
                if (layout?["data"]?["layout"] is not JsonArray layoutArray)
                {
                    continue;
                }

                // Track if any mutations occur
                bool hasMutated = false;
                foreach (JsonNode layoutObject in layoutArray)
                {
                    foreach (TextIdMutation mutation in keyMutations)
                    {
                        hasMutated |= UpdateKeyInLayoutObject(layoutObject, mutation);
                    }
                }

                if (hasMutated)
                {
                    await altinnAppGitRepository.SaveLayout(layoutSetName, layoutName, layout);
                    updatedFiles.Add($"App/ui/{layoutSetName}/{layoutName}.json");
                }
            }
            return updatedFiles.Count > 0 ? ["App/ui/layouts"] : [];
        }

        private static bool UpdateKeyInLayoutObject(JsonNode layoutObject, TextIdMutation mutation)
        {
            bool mutated = false;

            if (layoutObject["textResourceBindings"] is JsonObject)
            {
                mutated |= UpdateTextResourceKeys(layoutObject["textResourceBindings"], mutation);
            }

            if (layoutObject["options"] is JsonArray optionsArray)
            {
                List<Option> options = optionsArray.Deserialize<List<Option>>();
                if (options != null && UpdateOptionListKeys(options, mutation))
                {
                    layoutObject["options"] = JsonSerializer.SerializeToNode(options);
                    mutated = true;
                }
            }

            if (layoutObject["source"] is JsonObject)
            {
                mutated |= UpdateSourceKeys(layoutObject["source"], mutation);
            }

            return mutated;
        }

        private static bool UpdateSourceKeys(JsonNode source, TextIdMutation mutation)
        {
            JsonElement jsonElement = source["label"].AsValue().GetValue<JsonElement>();
            if (jsonElement.ValueKind == JsonValueKind.String && jsonElement.GetString() == mutation.OldId && mutation.NewId.HasValue)
            {
                source["label"] = mutation.NewId.Value;
                return true;
            }
            return false;
        }

        private async Task<List<string>> UpdateKeysInOptionLists(string org, string app, string developer, List<TextIdMutation> keyMutations)
        {
            string[] optionListIds = _optionsService.GetOptionsListIds(org, app, developer);
            List<string> updatedFiles = [];
            foreach (string optionListId in optionListIds)
            {
                List<Option> options = await _optionsService.GetOptionsList(org, app, developer, optionListId);
                bool hasMutated = false;
                foreach (TextIdMutation mutation in keyMutations)
                {
                    hasMutated |= UpdateOptionListKeys(options, mutation);
                }

                if (hasMutated)
                {
                    await _optionsService.CreateOrOverwriteOptionsList(org, app, developer, optionListId, options);
                    updatedFiles.Add($"App/options/{optionListId}.json");
                }
            }
            return updatedFiles;
        }

        private static bool UpdateOptionListKeys(List<Option> options, TextIdMutation keyMutation)
        {
            if (!keyMutation.NewId.HasValue)
            {
                return false;
            }

            bool mutated = false;
            foreach (Option option in options)
            {
                if (option.Label == keyMutation.OldId)
                {
                    option.Label = keyMutation.NewId.Value;
                    mutated = true;
                }
                if (option.Description == keyMutation.OldId)
                {
                    option.Description = keyMutation.NewId.Value;
                    mutated = true;
                }
                if (option.HelpText == keyMutation.OldId)
                {
                    option.HelpText = keyMutation.NewId.Value;
                    mutated = true;
                }
            }

            return mutated;
        }

        private static bool UpdateTextResourceKeys(JsonNode textResourceBindings, TextIdMutation keyMutation)
        {
            if (textResourceBindings is not JsonObject textBindings)
            {
                throw new ArgumentException("Expected textResourceBindings to be a JsonObject.");
            }

            List<string> keysToUpdate = [];
            foreach ((string key, JsonNode value) in textBindings)
            {
                if (value is null or JsonArray)
                {
                    continue;
                }

                JsonElement valueElement = value.AsValue().GetValue<JsonElement>();
                if (valueElement.ValueKind == JsonValueKind.String && valueElement.GetString() == keyMutation.OldId)
                {
                    keysToUpdate.Add(key);
                }
            }

            foreach (string key in keysToUpdate)
            {
                if (keyMutation.NewId.HasValue)
                {
                    textBindings[key] = keyMutation.NewId.Value;
                }
                else
                {
                    textBindings.Remove(key);
                }
            }

            return keysToUpdate.Count > 0;
        }

        /// <summary>
        /// Replacing inline markdown from text-values in texts object
        /// with a reference to a .md file and stores content in that file.
        /// </summary>
        /// <param name="languageCode">Language identifier</param>
        /// <param name="texts">Texts object with inline markdown</param>
        /// <returns>Tuple of dictionary with keys and texts that
        /// should be stored as markdown and the original texts objects
        /// where inline markdown is replaced with the filename.</returns>
        /// <remarks>Autosave in FE results in old md files that never
        /// will be overwritten when client change ID.</remarks>
        private static (Dictionary<string, string> TextsWithMd, Dictionary<string, string> Texts) ExtractMarkdown(string languageCode, Dictionary<string, string> texts)
        {
            Dictionary<string, string> textsWithMarkdown = new();
            foreach (KeyValuePair<string, string> text in texts.Where(text => text.Value.Contains('\n')))
            {
                textsWithMarkdown[text.Key] = text.Value;
                string fileName = $"{text.Key}.{languageCode}.texts.md";
                texts[text.Key] = "${{md::" + fileName + "}}";
            }

            return (textsWithMarkdown, texts);
        }
    }
}
