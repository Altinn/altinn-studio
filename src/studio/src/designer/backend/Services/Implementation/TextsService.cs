using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Templates;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using JetBrains.Annotations;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Interface for dealing with texts in new format in an app repository.
    /// </summary>
    public class TextsService : ITextsService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
        public TextsService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        }

        /// <inheritdoc />
        public async Task<Dictionary<string, string>> GetTexts(string org, string repo, string developer, string languageCode)
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
                allKeys = MergeKeysDeterministicResult(allKeys, jsonTexts.Keys.ToList());
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

            IEnumerable<string> languageFiles = altinnAppGitRepository.FindFiles(new string[] { "resource.*.json" });

            foreach (string languageFile in languageFiles.ToList())
            {
                Dictionary<string, string> newTexts = new Dictionary<string, string>();

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

        /// <inheritdoc />
        public async Task<KeyValuePair<string, string>> AddKey(string org, string repo, string developer, IList<string> languages, string newKey)
        {
            if (languages.IsNullOrEmpty())
            {
                throw new FileNotFoundException();
            }

            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
            KeyValuePair<string, string> keyValuePair = new KeyValuePair<string, string>(newKey, string.Empty);

            foreach (string languageCode in languages)
            {
                Dictionary<string, string> jsonTexts = await altinnAppGitRepository.GetTextsV2(languageCode);

                if (jsonTexts.ContainsKey(newKey))
                {
                    continue;
                }

                jsonTexts = new Dictionary<string, string> { { newKey, string.Empty } }.Concat(jsonTexts).ToDictionary(k => k.Key, v => v.Value);
                await altinnAppGitRepository.SaveTextsV2(languageCode, jsonTexts);
            }

            return keyValuePair;
        }

        /// <inheritdoc />
        public async Task<KeyValuePair<string, string>> UpdateKey(string org, string repo, string developer, IList<string> languages, string oldKey, string newKey)
        {
            if (languages.IsNullOrEmpty())
            {
                throw new FileNotFoundException();
            }

            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
            Dictionary<string, OrderedDictionary> tempUpdatedTexts = new Dictionary<string, OrderedDictionary>(languages.Count);
            KeyValuePair<string, string> keyValuePair = new KeyValuePair<string, string>(oldKey, string.Empty);
            try
            {
                foreach (string languageCode in languages)
                {
                    Dictionary<string, string> jsonTexts = await altinnAppGitRepository.GetTextsV2(languageCode);
                    OrderedDictionary orderedJsonTexts = ConvertDictionaryToOrderedDictionary(jsonTexts);
                    if (!newKey.IsNullOrEmpty() && jsonTexts.ContainsKey(oldKey))
                    {
                        // handle if oldKey only present in some files and if newKey already present
                        int indexOfKey = jsonTexts.Keys.ToList().IndexOf(oldKey);
                        string value = jsonTexts[oldKey];
                        keyValuePair = new KeyValuePair<string, string>(newKey, value);
                        orderedJsonTexts.Insert(indexOfKey, newKey, value);
                    }

                    orderedJsonTexts.Remove(oldKey);
                    tempUpdatedTexts[languageCode] = orderedJsonTexts;
                }
            }
            catch (ArgumentException)
            {
                throw new BadHttpRequestException($"It looks like the key, {newKey}, that you tried to insert already exists in one or more texts files.");
            }

            foreach (KeyValuePair<string, OrderedDictionary> kvp in tempUpdatedTexts)
            {
                Dictionary<string, string> dictionaryJsonTexts = ConvertOrderedDictionaryToDictionary(kvp.Value);
                await altinnAppGitRepository.SaveTextsV2(kvp.Key, dictionaryJsonTexts);
            }

            return keyValuePair;
        }

        private static List<string> MergeKeysDeterministicResult(List<string> currentSetOfKeys, List<string> keysToMerge)
        {
            int currentPosition = 0;
            foreach (string key in keysToMerge)
            {
                if (currentSetOfKeys.Contains(key))
                {
                    currentPosition = currentSetOfKeys.IndexOf(key);
                    continue;
                }

                currentSetOfKeys.Insert(currentPosition == 0 ? 0 : currentPosition + 1, key);
                currentPosition = 0;
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
            else if (datasource.ToLower() == "instancecontext")
            {
                return "ic";
            }
            else if (datasource.ToLower().StartsWith("datamodel"))
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
            List<string> markdownFileNames = new List<string>();
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
            Dictionary<string, string> textsWithMarkdown = new Dictionary<string, string>();
            foreach (KeyValuePair<string, string> text in texts.Where(text => text.Value.Contains('\n')))
            {
                textsWithMarkdown[text.Key] = text.Value;
                string fileName = $"{text.Key}.{languageCode}.texts.md";
                texts[text.Key] = "${{md::" + fileName + "}}";
            }

            return (textsWithMarkdown, texts);
        }

        private static OrderedDictionary ConvertDictionaryToOrderedDictionary(Dictionary<string, string> dictionary)
        {
            OrderedDictionary orderedDictionary = new OrderedDictionary(dictionary.Count);
            foreach (KeyValuePair<string, string> kvp in dictionary)
            {
                orderedDictionary.Add(kvp.Key, kvp.Value);
            }

            return orderedDictionary;
        }

        private static Dictionary<string, string> ConvertOrderedDictionaryToDictionary(OrderedDictionary orderedDictionary)
        {
            Dictionary<string, string> dictionary = new Dictionary<string, string>();
            foreach (DictionaryEntry dictionaryEntry in orderedDictionary)
            {
                dictionary.Add(dictionaryEntry.Key.ToString() ?? string.Empty, (dictionaryEntry.Value ?? string.Empty).ToString());
            }

            return dictionary;
        }
    }
}
