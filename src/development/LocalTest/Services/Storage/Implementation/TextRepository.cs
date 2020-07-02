using System;
using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using LocalTest.Configuration;

using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Handles text repository.
    /// </summary>
    public class TextRepository : ITextRepository
    {
        private readonly LocalPlatformSettings _localPlatformSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        public TextRepository(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        /// <inheritdoc/>
        public async Task<TextResource> Get(string org, string app, string language)
        {
            ValidateArguments(org, app, language);
            TextResource textResource = null;
            string path = GetTextPath(org, app, language);

            if (File.Exists(path))
            {
                string fileContent = File.ReadAllText(path);
                textResource = (TextResource)JsonConvert.DeserializeObject(fileContent, typeof(TextResource));
                textResource.Id = $"{org}-{app}-{language}";
                textResource.Org = org;
                textResource.Language = language;
            }

            return await Task.FromResult(textResource);
        }

        private string GetTextPath(string org, string app, string language)
        {
            return _localPlatformSettings.AppRepsitoryBasePath + $"config/texts/resource.{language}.json";
        }

        /// <inheritdoc/>
        public async Task<TextResource> Create(string org, string app, TextResource textResource)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public async Task<TextResource> Update(string org, string app, TextResource textResource)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public async Task<bool> Delete(string org, string app, string language)
        {
            throw new NotImplementedException();
        }

        private string GetTextId(string org, string app, string language)
        {
            return $"{org}-{app}-{language}";
        }

        /// <summary>
        /// Pre processes the text resource. Creates id and adds partition key org
        /// </summary>
        private void PreProcess(string org, string app, string language, TextResource textResource)
        {
            textResource.Id = GetTextId(org, app, language);
            textResource.Org = org;
        }

        /// <summary>
        /// Validates that org and app are not null, checks that language is two letter ISO string
        /// </summary>
        private void ValidateArguments(string org, string app, string language)
        {
            if (string.IsNullOrEmpty(org))
            {
                throw new ArgumentException("Org can not be null or empty");
            }

            if (string.IsNullOrEmpty(app))
            {
                throw new ArgumentException("App can not be null or empty");
            }

            if (!LanguageHelper.IsTwoLetters(language))
            {
                throw new ArgumentException("Language must be a two letter ISO name");
            }
        }
    }
}
