#nullable enable
using Altinn.Platform.Storage.Interface.Models;
using LocalTest.Services.TestData;
using LocalTest.Services.LocalApp.Implementation;

namespace LocalTest.Services.LocalApp.Interface
{
    public interface ILocalApp
    {
        Task<string?> GetXACMLPolicy(string appId, CancellationToken cancellationToken = default);

        Task<Application?> GetApplicationMetadata(string? appId, CancellationToken cancellationToken = default);

        Task<Dictionary<string, Application>> GetApplications(CancellationToken cancellationToken = default);

        Task<TextResource?> GetTextResource(string org, string app, string language, CancellationToken cancellationToken = default);

        /// <summary>
        /// Make a new instance with a given xml prefill, and using an access token
        /// </summary>
        Task<Instance?> Instantiate(string appId, Instance instance, string xmlPrefill, string xmlDataId, string token, CancellationToken cancellationToken = default);

        public record TestDataResult(AppTestDataModel? Data, bool AllAppsHaveData);

        /// <summary>
        /// Gets test data along with metadata about whether all apps provided data
        /// </summary>
        Task<TestDataResult> GetTestDataWithMetadata(CancellationToken cancellationToken = default);

        void InvalidateTestDataCache();
    }
}
