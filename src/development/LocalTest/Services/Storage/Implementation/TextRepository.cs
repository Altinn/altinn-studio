using System;
using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;

using LocalTest.Helpers;
using LocalTest.Services.Localtest.Interface;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Handles text repository.
    /// </summary>
    public class TextRepository : ITextRepository
    {
          private readonly ILocalTestAppSelection _localTestAppSelectionService;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextRepository"/> class with the given local platform settings.
        /// </summary>
        /// <param name="localPlatformSettings">Local platform settings.</param>
        public TextRepository(ILocalTestAppSelection localTestAppSelectionService)
        {
            _localTestAppSelectionService = localTestAppSelectionService;
        }

        /// <inheritdoc/>
        public async Task<TextResource> Get(string org, string app, string language)
        {
            ValidateArguments(org, app, language);
            TextResource textResource = null;
            string path = GetTextPath(language, app);

            if (File.Exists(path))
            {
                string fileContent = await File.ReadAllTextAsync(path);
                textResource = (TextResource)JsonConvert.DeserializeObject(fileContent, typeof(TextResource));
                textResource.Id = $"{org}-{app}-{language}";
                textResource.Org = org;
                textResource.Language = language;
            }

            return textResource;
        }

        private string GetTextPath(string language, string app)
        {
            return _localTestAppSelectionService.GetAppPath(app) + $"config/texts/resource.{language.AsFileName()}.json";
        }

        /// <inheritdoc/>
        public Task<TextResource> Create(string org, string app, TextResource textResource)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public Task<TextResource> Update(string org, string app, TextResource textResource)
        {
            throw new NotImplementedException();
        }

        /// <inheritdoc/>
        public Task<bool> Delete(string org, string app, string language)
        {
            throw new NotImplementedException();
        }

        /// <summary>
        /// Validates that org and app are not null, checks that language is two letter ISO string
        /// </summary>
        private void ValidateArguments(string org, string app, string language)
        {
            if (string.IsNullOrEmpty(org))
            {
                throw new ArgumentException($"Parameter {nameof(org)} cannot be null or empty", nameof(org));
            }

            if (string.IsNullOrEmpty(app))
            {
                throw new ArgumentException($"Parameter {nameof(app)} cannot be null or empty", nameof(app));
            }

            if (!LanguageHelper.IsTwoLetters(language))
            {
                throw new ArgumentException($"Parameter {nameof(language)} cannot be null or empty", nameof(language));
            }
        }
    }
}
