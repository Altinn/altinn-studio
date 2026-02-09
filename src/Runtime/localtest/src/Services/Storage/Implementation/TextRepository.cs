using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;

using LocalTest.Helpers;
using LocalTest.Services.LocalApp.Interface;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Handles text repository.
    /// </summary>
    public class TextRepository : ITextRepository
    {
        private readonly ILocalApp _localApp;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextRepository"/> class with the given local platform settings.
        /// </summary>
        /// <param name="localPlatformSettings">Local platform settings.</param>
        public TextRepository(ILocalApp localTestAppSelectionService)
        {
            _localApp = localTestAppSelectionService;
        }

        /// <inheritdoc/>
        public async Task<TextResource> Get(string org, string app, string language)
        {
            ValidateArguments(org, app, language);
            return await _localApp.GetTextResource(org, app, language);
        }

        /// <inheritdoc/>
        public Task<List<TextResource>> Get(List<string> appIds, string language)
        {
            throw new NotImplementedException();
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
        private static void ValidateArguments(string org, string app, string language)
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
