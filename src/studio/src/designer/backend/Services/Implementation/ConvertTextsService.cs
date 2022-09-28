using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using RestSharp;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Service for converting texts files into new format.
    /// </summary>
    /// <remarks>Might consider moving this logic to the TextsService</remarks>
    public class ConvertTextsService : IConvertTextsService
    {
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
        public ConvertTextsService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
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

                await altinnAppGitRepository.SaveTextsV2(languageCode, newTexts);
                altinnAppGitRepository.DeleteFileByAbsolutePath(languageFile);
            }
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
    }
}
