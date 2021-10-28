using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;

namespace Altinn.Platform.Storage.UnitTest.Mocks.Repository
{
    public class TextRepositoryMock : ITextRepository
    {
        public Task<TextResource> Create(string org, string app, TextResource textResource)
        {
            string language = textResource.Language;
            ValidateArguments(org, app, language);
            PreProcess(org, app, language, textResource);

            return Task.FromResult(textResource);
        }

        public Task<TextResource> Get(string org, string app, string language)
        {
            ValidateArguments(org, app, language);

            string id = GetTextId(org, app, language);
            string textResourcePath = GetTextsPath(id);
            if (File.Exists(textResourcePath))
            {
                string content = File.ReadAllText(textResourcePath);
                TextResource textResource = JsonSerializer.Deserialize<TextResource>(
                    content,
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                return Task.FromResult(textResource);
            }

            return Task.FromResult<TextResource>(null);
        }

        public async Task<List<TextResource>> Get(List<string> appIds, string language)
        {
            List<TextResource> result = new List<TextResource>();
            foreach (string appId in appIds)
            {
                string org = appId.Split("/")[0];
                string app = appId.Split("/")[1];

                TextResource resource = Get(org, app, language).Result;
                if (resource != null)
                {
                    result.Add(resource);
                }
            }

            return await Task.FromResult(result);
        }

        public Task<bool> Delete(string org, string app, string language)
        {
            throw new NotImplementedException();
        }

        public Task<TextResource> Update(string org, string app, TextResource textResource)
        {
            throw new NotImplementedException();
        }

        private static string GetTextId(string org, string app, string language)
        {
            return $"{org}-{app}-{language}";
        }

        /// <summary>
        /// Pre processes the text resource. Creates id and adds partition key org
        /// </summary>
        private static void PreProcess(string org, string app, string language, TextResource textResource)
        {
            textResource.Id = GetTextId(org, app, language);
            textResource.Org = org;
        }

        private static void ValidateArguments(string org, string app, string language)
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

        private static string GetTextsPath(string id)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(TextRepositoryMock).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\data\cosmoscollections\texts\" + id + ".json");
        }
    }
}
