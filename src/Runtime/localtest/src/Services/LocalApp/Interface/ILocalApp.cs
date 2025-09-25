#nullable enable
using Altinn.Platform.Storage.Interface.Models;
using LocalTest.Services.TestData;

namespace LocalTest.Services.LocalApp.Interface
{
    public interface ILocalApp
    {
        Task<string?> GetXACMLPolicy(string appId);

        Task<Application?> GetApplicationMetadata(string? appId);

        Task<Dictionary<string, Application>> GetApplications();

        Task<TextResource?> GetTextResource(string org, string app, string language);

        /// <summary>
        /// Make a new instance with a given xml prefill, and using an access token
        /// </summary>
        Task<Instance?> Instantiate(string appId, Instance instance, string xmlPrefill, string xmlDataId, string token);

        Task<AppTestDataModel?> GetTestData();
    }
}
