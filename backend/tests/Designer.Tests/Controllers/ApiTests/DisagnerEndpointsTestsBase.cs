using System;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Designer.Tests.Controllers.ApiTests
{
    /// <summary>
    /// More adjusted version of the ApiTestsBase class that is used for testing controllers that contains org and repo in the path.
    /// Provides functionality for copying a repository from the test repositories location to a temporary location for testing which is disposed after execution of the test.
    /// </summary>
    /// <typeparam name="TController">Controller type.</typeparam>
    /// <typeparam name="TControllerTest">Tests class type.</typeparam>
    public abstract class DisagnerEndpointsTestsBase<TController, TControllerTest> : ApiTestsBase<TController, TControllerTest>, IDisposable
        where TController : ControllerBase
        where TControllerTest : class
    {
        /// <summary>
        /// Holds the information of the test repo path that was created for tests purposes.
        /// </summary>
        protected string CreatedFolderPath { get; private set; }

        // Most common tests configuration used. If needed override this method in the test class.
        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
        }

        /// <summary>
        /// Common Serialization options for tests.
        /// </summary>
        protected readonly JsonSerializerOptions JsonSerializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };

        public DisagnerEndpointsTestsBase(WebApplicationFactory<TController> factory) : base(factory)
        {
        }

        /// <summary>
        /// Copies a repository from the test repositories location to a temporary location for testing.
        /// Ensures that created Folder is deleted after test.
        /// Value of created repo path is stored in <see cref="CreatedFolderPath"/> property.
        /// Limitation is that only one repository can be cloned.
        /// </summary>
        /// <param name="org">Organization short name.</param>
        /// <param name="repo">Repository name.</param>
        /// <param name="developer">Developer username.</param>
        /// <param name="targetRepository">Repository to be coppied.</param>
        protected async Task CopyRepositoryForTest(string org, string repo, string developer, string targetRepository)
        {
            if (CreatedFolderPath is not null)
            {
                throw new InvalidOperationException("Repository already created for test.");
            }
            CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, repo, developer, targetRepository);
        }

        public void Dispose()
        {
            if (!string.IsNullOrWhiteSpace(CreatedFolderPath))
            {
                TestDataHelper.DeleteDirectory(CreatedFolderPath);
            }
            if (HttpClient.IsValueCreated)
            {
                HttpClient.Value.Dispose();
            }
        }
    }
}
