using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Service that handles functionality needed for creating and updating services in AltinnCore
    /// </summary>
    public class TestingRepository : ITestingRepository
    {
        private readonly IDefaultFileFactory _defaultFileFactory;
        private readonly ServiceRepositorySettings _settings;
        private readonly GeneralSettings _generalSettings;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="RepositorySI"/> class 
        /// </summary>
        /// <param name="repositorySettings">The settings for the service repository</param>
        /// <param name="generalSettings">The current general settings</param>
        /// <param name="defaultFileFactory">The default factory</param>
        public TestingRepository(IOptions<ServiceRepositorySettings> repositorySettings,
            IOptions<GeneralSettings> generalSettings, IDefaultFileFactory defaultFileFactory, IHttpContextAccessor httpContextAccessor)
        {
            _defaultFileFactory = defaultFileFactory;
            _settings = repositorySettings.Value;
            _generalSettings = generalSettings.Value;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Create Test metadata for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="test">The test metadata</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        public bool UpdateTest(string org, string service, TestMetadata test)
        {
            string dirName = _settings.GetTestPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            bool updated = false;

            if(!Directory.Exists(dirName))
            {
                Directory.CreateDirectory(dirName);
            }
           
            if (string.IsNullOrEmpty(test.FileName)) {
                // TODO: Use type
                test.FileName = test.Name + ".cs";
            }

            File.WriteAllText(dirName + test.FileName, test.Content ?? "");
            updated = true;
            
            return updated;
        }


        /// <summary>
        /// Get the view content for a given razor file on disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>

        /// <param name="name">The name of the test file</param>
        /// <returns>The content of the test</returns>
        public string GetTest(string org, string service, string name)
        {
            IList<TestMetadata> tests = GetTests(org, service, true, name);
            string test = null;
            if (tests.Count == 1) {
                test = tests.First().Content;
            }

            return test;
        }

        /// <summary>
        /// Get the view content for a given razor file on disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>

        /// <param name="includeContent">Controls if the test content should be included. Default is false.</param>
        /// /// <param name="filterPattern">Pattern to filter the returned tests</param>
        /// <returns>All the tests</returns>
        public IList<TestMetadata> GetTests(string org, string service, bool includeContent = false, string filterPattern = "*")
        {
            IList<TestMetadata> tests = new List<TestMetadata>();

            string dirName = _settings.GetTestPath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            if(!Directory.Exists(dirName))
            {
                return tests;
            }

            string[] files = Directory.GetFiles(dirName, filterPattern);

            foreach (string filename in files)
            {
                var test = new TestMetadata
                {
                    Name = Path.GetFileNameWithoutExtension(filename),
                    FileName = filename
                };
                if (includeContent)
                {
                    test.Content = File.ReadAllText(filename);
                }

                tests.Add(test);
            }

            return tests;
        }
    }
}