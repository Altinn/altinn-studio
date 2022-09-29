using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Services.Interfaces;

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
                string fileName = text.Value.Substring(3, text.Value.Length - 5);
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
            return textValue.StartsWith("${{") && textValue.EndsWith(".md}}");
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
        private static (Dictionary<string, string> TtextsWithMd, Dictionary<string, string> Ttexts) ExtractMarkdown(string languageCode, Dictionary<string, string> texts)
        {
            Dictionary<string, string> textsWithMd = new Dictionary<string, string>();
            foreach (KeyValuePair<string, string> text in texts.Where(text => text.Value.Contains('\n')))
            {
                textsWithMd[text.Key] = text.Value;
                string fileName = $"{text.Key}.{languageCode}.texts.md";
                texts[text.Key] = "${{" + fileName + "}}";
            }

            return (textsWithMd, texts);
        }
    }
}
