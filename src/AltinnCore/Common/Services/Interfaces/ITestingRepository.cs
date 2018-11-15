using System.Collections.Generic;
using AltinnCore.ServiceLibrary.ServiceMetadata;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for the testing repository service
    /// </summary>
    public interface ITestingRepository
    {
        /// <summary>
        /// Update test
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="test">The test meta data</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool UpdateTest(string org, string service, TestMetadata test);

        /// <summary>
        /// Get the view content for a given razor file on disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="name">The name of the test</param>
        /// <returns>The content of the test</returns>
        string GetTest(string org, string service, string name);

        /// <summary>
        /// Get the view content for a given razor file on disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="includeContent">Controls if the test content should be included. Default is false.</param>
        /// <param name="filterPattern">Pattern to filter the returned tests</param>
        /// <returns>List of all tests</returns>
        IList<TestMetadata> GetTests(string org, string service, bool includeContent = false, string filterPattern = "*");
    }
}