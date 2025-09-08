using System;
using System.IO;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Medallion.Threading;
using Medallion.Threading.FileSystem;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using VerifyTests;

namespace Designer.Tests.Controllers.ApiTests
{
    /// <summary>
    /// More adjusted version of the ApiTestsBase class that is used for testing controllers that contains org and repo in the path.
    /// Provides functionality for copying a repository from the test repositories location to a temporary location for testing which is disposed after execution of the test.
    /// </summary>
    /// <typeparam name="TControllerTest">Tests class type.</typeparam>
    public abstract class DesignerEndpointsTestsBase<TControllerTest> : ApiTestsBase<TControllerTest>
        where TControllerTest : class
    {
        /// <summary>
        /// Holds the path of the test repo path that was created for tests purposes.
        /// </summary>
        protected string TestRepoPath { get; private set; }

        protected string RemoteTestRepoPath { get; private set; }

        protected string TestOrgPath { get; private set; }

        // Most common tests configuration used. If needed override this method in the test class.
        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddSingleton<IDistributedLockProvider>(_ =>
            {
                var directoryInfo = TestLockPathProvider.Instance.LockFileDirectory;
                return new FileDistributedSynchronizationProvider(directoryInfo);
            });
        }

        /// <summary>
        /// Common Serialization options for tests.
        /// </summary>
        protected readonly JsonSerializerOptions JsonSerializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            Converters = { new JsonStringEnumConverter() }
        };

        /// <summary>
        /// Custom Verify settings for snapshot testing.
        /// </summary>
        protected static VerifySettings CustomVerifySettings
        {
            get
            {
                VerifySettings settings = new();
                settings.UseStrictJson();
                settings.DontScrubGuids();
                settings.DontIgnoreEmptyCollections();
                return settings;
            }
        }

        public DesignerEndpointsTestsBase(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        /// <summary>
        /// Copies a repository from the test repositories location to a temporary location for testing.
        /// Ensures that created Folder is deleted after test.
        /// Value of created repo path is stored in <see cref="TestRepoPath"/> property.
        /// Limitation is that only one repository can be cloned.
        /// </summary>
        /// <param name="org">Organisation short name.</param>
        /// <param name="repo">Repository name.</param>
        /// <param name="developer">Developer username.</param>
        /// <param name="targetRepository">Test repository name.</param>
        protected async Task CopyRepositoryForTest(string org, string repo, string developer, string targetRepository)
        {
            if (TestRepoPath is not null)
            {
                throw new InvalidOperationException("Repository already created for test.");
            }
            TestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, repo, developer, targetRepository);
        }

        /// <summary>
        /// Copies a remote repository from the test repositories location to a temporary location for testing.
        /// Ensures that created Folder is deleted after test.
        /// Value of created repo path is stored in <see cref="RemoteTestRepoPath"/> property.
        /// Limitation is that only one repository can be cloned.
        /// </summary>
        /// <param name="org">Organisation short name.</param>
        /// <param name="repo">Repository name</param>
        /// <param name="targetRepository">Test repository name.</param>
        protected async Task CopyRemoteRepositoryForTest(string org, string repo, string targetRepository)
        {
            if (RemoteTestRepoPath is not null)
            {
                throw new InvalidOperationException("Remote repository already created for test.");
            }
            RemoteTestRepoPath = await TestDataHelper.CopyRemoteRepositoryForTest(org, repo, targetRepository);
        }

        /// <summary>
        /// Copies a organisation and repository from the test repositories to a temporary location for testing.
        /// Ensures that created Folder is deleted after test.
        /// Value of created org path is stored in <see cref="TestOrgPath"/> property.
        /// Limitation is that only one org can be cloned.
        /// </summary>
        /// <param name="developer">Username of developer.</param>
        /// <param name="org">Organisation short name.</param>
        /// <param name="repo">Repository name.</param>
        /// <param name="targetOrg">Test organisation name.</param>
        /// <param name="targetRepository">test repository name.</param>
        /// <exception cref="InvalidOperationException"></exception>
        protected async Task CopyOrgRepositoryForTest(string developer, string org, string repo, string targetOrg, string targetRepository)
        {
            if (TestOrgPath is not null)
            {
                throw new InvalidOperationException("Organisation already created for test.");
            }
            TestOrgPath = await TestDataHelper.CopyOrgForTest(developer, org, repo, targetOrg, targetRepository);
        }

        /// <summary>
        /// Copies a repository from the test repositories to a temporary location for testing.
        /// </summary>
        /// <param name="developer">Username of developer.</param>
        /// <param name="org">Organisation short name.</param>
        /// <param name="repo">Repository name.</param>
        /// <param name="targetOrg">Test organisation name.</param>
        /// <param name="targetRepository">test repository name.</param>
        /// <exception cref="InvalidOperationException"></exception>
        /// <remarks>
        /// <see cref="CopyOrgRepositoryForTest"/> must be used first.
        /// </remarks>
        protected async Task AddRepositoryToTestOrg(string developer, string org, string repo, string targetOrg, string targetRepository)
        {
            if (TestOrgPath is null)
            {
                throw new InvalidOperationException("Organisation has not been instantiated for test.");
            }
            await TestDataHelper.AddRepositoryToTestOrg(developer, org, repo, targetOrg, targetRepository);
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (!disposing)
            {
                return;
            }
            if (!string.IsNullOrWhiteSpace(TestRepoPath))
            {
                Directory.Delete(TestRepoPath, true);
            }
            if (!string.IsNullOrWhiteSpace(RemoteTestRepoPath))
            {
                Directory.Delete(RemoteTestRepoPath, true);
            }
            if (!string.IsNullOrWhiteSpace(TestOrgPath))
            {
                Directory.Delete(TestOrgPath, true);
            }
        }
    }
}
