using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Services.Interfaces;

using Microsoft.AspNetCore.Mvc;

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
                string text = await altinnAppGitRepository.GetMarkdownText(markdownFileName);
                jsonTexts[key] = text;
            }

            return jsonTexts;
        }

        /// <inheritdoc />
        public async Task UpdateTexts(string org, string repo, string developer, string languageCode, Dictionary<string, string> jsonTexts)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

            (Dictionary<string, string>, Dictionary<string, string>) textsExtractedMd = ExtractMarkdown(languageCode, jsonTexts);

            foreach (KeyValuePair<string, string> text in textsExtractedMd.Item1)
            {
                await altinnAppGitRepository.SaveTextMarkdown(languageCode, text);
            }

            await altinnAppGitRepository.SaveTextsV2(languageCode, textsExtractedMd.Item2);
        }

        /// <inheritdoc />
        public void DeleteTexts(string org, string repo, string developer, string languageCode)
        {
            var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);

            altinnAppGitRepository.DeleteTexts(languageCode);
        }

        private static List<string> ExtractMarkdownFileNames(Dictionary<string, string> texts)
        {
            List<string> markdownFileNames = new List<string>();
            foreach (KeyValuePair<string, string> text in texts)
            {
                if (text.Value.StartsWith("${{") && text.Value.EndsWith(".md}}"))
                {
                    string fileName = text.Value.Substring(3, text.Value.Length - 5);
                    markdownFileNames.Add(fileName);
                }
            }

            return markdownFileNames;
        }

        // REMARKS: Autosave in FE results in old md files that never will be overwritten when client change ID.
        // returns Tuple(Dictionary<string, string>, Dictionary<string, string>) of keys and texts that should be stored as markdown
        private static (Dictionary<string, string> textsWithMd, Dictionary<string, string> texts) ExtractMarkdown(string languageCode, Dictionary<string, string> texts)
        {
            Dictionary<string, string> textsWithMd = new Dictionary<string, string>();
            foreach (KeyValuePair<string, string> text in texts)
            {
                if (text.Value.Contains('\n'))
                {
                    textsWithMd[text.Key] = text.Value;
                    string fileName = $"{text.Key}.{languageCode}.texts.md";
                    texts[text.Key] = "${{" + fileName + "}}";
                }
            }

            return (textsWithMd, texts);
        }
    }
}
