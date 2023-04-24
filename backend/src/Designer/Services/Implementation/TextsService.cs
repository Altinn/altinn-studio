using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Interface for dealing with texts in new format in an app repository.
    /// </summary>
    public class TextsService : ITextsService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
        private readonly IApplicationMetadataService _applicationMetadataService;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
        /// <param name="applicationMetadataService">IApplicationMetadataService</param>
        public TextsService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory, IApplicationMetadataService applicationMetadataService)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
            _applicationMetadataService = applicationMetadataService;
        }

        public async Task CreateLanguageResources(string org, string repo, string developer)
        {
            if (!string.IsNullOrEmpty(repo))
            {
                AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
                TextResource textResource = await altinnAppGitRepository.GetTextV1("nb");
                textResource.Resources.Add(new TextResourceElement() { Id = "appName", Value = repo });
                await altinnAppGitRepository.SaveTextV1("nb", textResource);
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
        public async Task<TextResource> GetTextV1(string org, string repo, string developer, string languageCode)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

            TextResource texts = await altinnAppGitRepository.GetTextV1(languageCode);

            return texts;
        }

        /// <inheritdoc />
        public async Task SaveTextV1(string org, string repo, string developer, TextResource textResource, string languageCode)
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

            await altinnAppGitRepository.SaveTextV1(languageCode, textResource);
        }

        /// <inheritdoc />
        public async Task<Dictionary<string, string>> GetTextsV2(string org, string repo, string developer, string languageCode)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

            Dictionary<string, string> jsonTexts = await altinnAppGitRepository.GetTextsV2(languageCode);

            List<string> markdownFileNames = ExtractMarkdownFileNames(jsonTexts);
            foreach (string markdownFileName in markdownFileNames)
            {
                string key = markdownFileName.Split('.')[0];
                string text = await altinnAppGitRepository.GetTextMarkdown(markdownFileName);
                jsonTexts[key] = text;
            }

            return jsonTexts;
        }

        /// <inheritdoc />
        public async Task<List<string>> GetKeys(string org, string repo, string developer, IList<string> languages)
        {
            if (languages.IsNullOrEmpty())
            {
                throw new FileNotFoundException();
            }

            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
            Dictionary<string, string> firstJsonTexts = await altinnAppGitRepository.GetTextsV2(languages[0]);
            languages.RemoveAt(0);
            List<string> allKeys = firstJsonTexts.Keys.ToList();

            foreach (string languageCode in languages)
            {
                Dictionary<string, string> jsonTexts = await altinnAppGitRepository.GetTextsV2(languageCode);
                allKeys = MergeKeys(allKeys, jsonTexts.Keys.ToList());
            }

            return allKeys;
        }

        /// <inheritdoc />
        public async Task UpdateTexts(string org, string repo, string developer, string languageCode, Dictionary<string, string> jsonTexts)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

            (Dictionary<string, string>, Dictionary<string, string>) extractMarkdown = ExtractMarkdown(languageCode, jsonTexts);

            foreach (KeyValuePair<string, string> text in extractMarkdown.Item1)
            {
                await altinnAppGitRepository.SaveTextMarkdown(languageCode, text);
            }

            await altinnAppGitRepository.SaveTextsV2(languageCode, extractMarkdown.Item2);
        }

        /// <inheritdoc />
        public void DeleteTexts(string org, string repo, string developer, string languageCode)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

            altinnAppGitRepository.DeleteTexts(languageCode);
        }

        /// <inheritdoc />
        public async void ConvertV1TextsToV2(string org, string repo, string developer)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

            IEnumerable<string> languageFiles = altinnAppGitRepository.FindFiles(new[] { "resource.*.json" });

            foreach (string languageFile in languageFiles.ToList())
            {
                Dictionary<string, string> newTexts = new();

                string languageCode = GetLanguageCodeFromFilePath(languageFile);
                TextResource texts = await altinnAppGitRepository.GetTextV1(languageCode);

                foreach (TextResourceElement text in texts.Resources)
                {
                    string newText = text.Value;

                    if (text.Variables != null)
                    {
                        newText = ConvertText(text);
                    }

                    newTexts[text.Id] = newText;
                }

                (Dictionary<string, string> TextsWithMarkdown, Dictionary<string, string> Texts) extractMarkdown = ExtractMarkdown(languageCode, newTexts);

                foreach (KeyValuePair<string, string> text in extractMarkdown.TextsWithMarkdown)
                {
                    await altinnAppGitRepository.SaveTextMarkdown(languageCode, text);
                }

                await UpdateTexts(org, repo, developer, languageCode, extractMarkdown.Texts);

                altinnAppGitRepository.DeleteFileByAbsolutePath(languageFile);
            }
        }

        public async Task UpdateTextsForKeys(string org, string repo, string developer, Dictionary<string, string> keysTexts, string languageCode)
        {
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
            TextResource textResourceObject = await altinnAppGitRepository.GetTextV1(languageCode);

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
                    textResourceObject.Resources.Add(new TextResourceElement() { Id = kvp.Key, Value = kvp.Value });
                }
                else
                {
                    int indexTextResourceElementUpdateKey = textResourceObject.Resources.IndexOf(textResourceContainsKey);
                    textResourceObject.Resources[indexTextResourceElementUpdateKey] = new TextResourceElement { Id = kvp.Key, Value = kvp.Value };
                }
            }

            await altinnAppGitRepository.SaveTextV1(languageCode, textResourceObject);
        }

        /// <inheritdoc />
        public async Task<string> UpdateKey(string org, string repo, string developer, IList<string> languages, string oldKey, string newKey)
        {
            if (languages.IsNullOrEmpty())
            {
                throw new FileNotFoundException();
            }

            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
            Dictionary<string, Dictionary<string, string>> tempUpdatedTexts = new(languages.Count);
            bool oldKeyExistsOriginally = false;
            string response = string.Empty;
            try
            {
                foreach (string languageCode in languages)
                {
                    Dictionary<string, string> jsonTexts = await altinnAppGitRepository.GetTextsV2(languageCode);
                    oldKeyExistsOriginally = jsonTexts.ContainsKey(oldKey) || oldKeyExistsOriginally;
                    if (!newKey.IsNullOrEmpty() && jsonTexts.ContainsKey(newKey) && jsonTexts.ContainsKey(oldKey))
                    {
                        throw new ArgumentException();
                    }

                    if (!newKey.IsNullOrEmpty() && jsonTexts.ContainsKey(oldKey))
                    {
                        string value = jsonTexts[oldKey];
                        jsonTexts[newKey] = value;
                    }

                    jsonTexts.Remove(oldKey);
                    tempUpdatedTexts[languageCode] = jsonTexts;
                }

                response = newKey.IsNullOrEmpty() ? $"the key, {oldKey}, was deleted." : $"The old key, {oldKey}, have been replaced with the new key, {newKey}.";

                if (!oldKeyExistsOriginally)
                {
                    throw new Exception($"The key, {oldKey}, does not exist.");
                }
            }
            catch (ArgumentException)
            {
                throw new ArgumentException();
            }

            foreach (KeyValuePair<string, Dictionary<string, string>> kvp in tempUpdatedTexts)
            {
                await altinnAppGitRepository.SaveTextsV2(kvp.Key, kvp.Value);
            }

            return response;
        }

        /// <inheritdoc />
        public async Task UpdateRelatedFiles(string org, string app, string developer, List<TextIdMutation> keyMutations)
        {
            // handle if no layout exists
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            string[] layoutSetNames = altinnAppGitRepository.GetLayoutSetNames();

            if (altinnAppGitRepository.AppUsesLayoutSets())
            {
                foreach (string layoutSetName in layoutSetNames)
                {
                    await UpdateKeysInLayoutsInLayoutSet(org, app, developer, layoutSetName, keyMutations);
                }

                return;
            }

            await UpdateKeysInLayoutsInLayoutSet(org, app, developer, null, keyMutations);
        }

        /// <summary>
        /// Updates text keys in layouts for a specific layoutset
        /// </summary>
        /// <param name="org">Identifier for the organisation</param>
        /// <param name="app">Identifier for the application</param>
        /// <param name="developer">Username of developer</param>
        /// <param name="layoutSetName">Name of the layoutset</param>
        /// <param name="keyMutations">A list of the keys that are updated</param>
        private async Task UpdateKeysInLayoutsInLayoutSet(string org, string app, string developer, string layoutSetName, List<TextIdMutation> keyMutations)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            string[] layoutNames = altinnAppGitRepository.GetLayoutNames(layoutSetName);
            foreach (string layoutName in layoutNames)
            {
                JsonNode layout = await altinnAppGitRepository.GetLayout(layoutSetName, layoutName);
                if (layout?["data"]?["layout"] is not JsonArray layoutArray)
                {
                    continue;
                }
                foreach (var layoutObject in layoutArray)
                {
                    foreach (TextIdMutation mutation in keyMutations.Where(_ => layoutObject["textResourceBindings"] is not null))
                    {
                        layoutObject["textResourceBindings"] = UpdateKey(layoutObject["textResourceBindings"], mutation);
                    }
                }
                await altinnAppGitRepository.SaveLayout(layoutSetName, layoutName, layout);
            }
        }

        private static JsonNode UpdateKey(JsonNode textResourceBindings, TextIdMutation keyMutation)
        {
            JsonNode updatedTextResourceBindings = JsonNode.Parse(textResourceBindings.ToJsonString());
            foreach ((string key, var value) in (textResourceBindings as JsonObject)!)
            {
                if (value is null)
                {
                    continue;
                }
                var valueElement = value.AsValue().GetValue<JsonElement>();
                // Only update if the value is a string and the value is the same as the old key
                if (valueElement.ValueKind != JsonValueKind.String || valueElement.GetString() != keyMutation.OldId)
                {
                    continue;
                }

                if (keyMutation.NewId.HasValue)
                {
                    updatedTextResourceBindings![key] = keyMutation.NewId.Value;
                }
                else
                {
                    (updatedTextResourceBindings as JsonObject)!.Remove(key);
                }
            }
            return updatedTextResourceBindings;
        }

        private static List<string> MergeKeys(List<string> currentSetOfKeys, List<string> keysToMerge)
        {
            foreach (string key in keysToMerge)
            {
                if (currentSetOfKeys.Contains(key))
                {
                    continue;
                }

                currentSetOfKeys.Add(key);
            }

            return currentSetOfKeys;
        }

        /// <summary>
        /// Extracts language code from path to language file.
        /// </summary>
        /// <param name="filePath">Path to language file</param>
        /// <returns>A two letter language code</returns>
        private static string GetLanguageCodeFromFilePath(string filePath)
        {
            string fileName = Path.GetFileName(filePath);
            string languageCode = fileName.Split(".")[1];
            return languageCode;
        }

        /// <summary>
        /// Converts a single text resource element in the
        /// old texts format to a key:value pair.
        /// </summary>
        /// <param name="text">The text resource element from the old texts format.</param>
        /// <returns>The new string that will be the value in the new texts format.</returns>
        private static string ConvertText(TextResourceElement text)
        {
            string newText = string.Empty;

            StringBuilder builder = new StringBuilder(text.Value);

            foreach (TextResourceVariable variable in text.Variables)
            {
                string variableNumber = text.Variables.IndexOf(variable).ToString();
                string oldString = "{" + variableNumber + "}";
                string newString = "${{" + GetDatasourceAlias(variable.DataSource) + "::" + variable.Key + "}}";
                builder.Replace(oldString, newString);
                newText = builder.ToString();
            }

            return newText;
        }

        /// <summary>
        /// Converts the longer datasource values, applicationSettings,
        /// instanceContext and dataModel to the short alias versions; as, ic and dm.
        /// </summary>
        /// <param name="datasource">The datasource value from a variable connected to a text</param>
        /// <returns>The short version of the datasource.</returns>
        private static string GetDatasourceAlias(string datasource)
        {
            if (datasource.ToLower() == "applicationsettings")
            {
                return "as";
            }
            if (datasource.ToLower() == "instancecontext")
            {
                return "ic";
            }
            if (datasource.ToLower().StartsWith("datamodel"))
            {
                return datasource.ToLower().Replace("datamodel", "dm");
            }

            throw new ArgumentOutOfRangeException(nameof(datasource), $"{datasource} is not an expected datasource value.");
        }

        /// <summary>
        /// Helper method for extracting the markdown filenames from values in a texts objects.
        /// </summary>
        /// <param name="texts">Json object consisting of texts with key:value pairs id:text</param>
        /// <returns>List of markdown filenames</returns>
        private static List<string> ExtractMarkdownFileNames(Dictionary<string, string> texts)
        {
            List<string> markdownFileNames = new();
            foreach (KeyValuePair<string, string> text in texts.Where(text => IsFileReference(text.Value)))
            {
                int fileNameStart = 7;
                int fileNameEnd = text.Value.Length - 9;
                string fileName = text.Value.Substring(fileNameStart, fileNameEnd);
                markdownFileNames.Add(fileName);
            }

            return markdownFileNames;
        }

        /// <summary>
        /// Checks if value text from texts file is a reference to a filename.
        /// </summary>
        /// <param name="textValue">A value in the key:value pair from a texts file</param>
        /// <returns>boolean value indicating if value is a filename reference or not</returns>
        private static bool IsFileReference(string textValue)
        {
            return textValue.StartsWith("${{md::") && textValue.EndsWith(".md}}");
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
