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

        Task<Instance?> Instantiate(string appId, Instance instance, string xmlPrefill, string xmlDataId);

        Task<AppTestDataModel?> GetTestData();
    }
}
