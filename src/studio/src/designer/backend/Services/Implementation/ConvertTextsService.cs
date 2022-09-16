using System;
using System.Collections.Generic;
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

            var languageFiles = altinnAppGitRepository.FindFiles(new string[] { "resource.*.json" });

            foreach (string languageFile in languageFiles.ToList())
            {
                Dictionary<string, string> newTexts = new Dictionary<string, string>();

                string languageCode = languageFile.Split(".")[1];
                TextResource texts = await altinnAppGitRepository.GetTextV1(languageCode);

                foreach (TextResourceElement text in texts.Resources)
                {
                    string newText = text.Value;

                    if (text.Variables != null)
                    {
                        Console.Write("OLD TEXT\n\n");
                        Console.WriteLine(newText);

                        // converting value string to a mutable string type
                        StringBuilder builder = new StringBuilder(text.Value);

                        foreach (TextResourceVariable variable in text.Variables)
                        {
                            string variableNumber = text.Variables.IndexOf(variable).ToString();
                            string oldString = "{" + variableNumber + "}";
                            string newString = "${{" + variable.DataSource + "." + variable.Key + "}}";
                            builder.Replace(oldString, newString);
                            newText = builder.ToString();
                        }

                        Console.Write("\n\nNEW TEXT\n\n");
                        Console.WriteLine(newText);
                    }

                    newTexts[text.Id] = newText;
                }

                string textsString = JsonSerializer.Serialize(newTexts);
                await altinnAppGitRepository.SaveTextV2(languageCode, newTexts);
                altinnAppGitRepository.DeleteFileByAbsolutePath(languageFile);
            }
        }
    }
}
