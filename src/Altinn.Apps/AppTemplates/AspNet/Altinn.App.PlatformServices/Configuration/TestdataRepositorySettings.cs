using System;

namespace Altinn.App.Services.Configuration
{
    /// <summary>
    /// Class that defines the common test data settings
    /// </summary>
    public class TestdataRepositorySettings
    {
        /// <summary>
        /// Gets or sets the repository location
        /// </summary>
        public string RepositoryLocation { get; set; }

        /// <summary>
        /// Gets or sets the designer host
        /// </summary>
        public string DesignerHost { get; set; }

        /// <summary>
        /// Returns the designer host. Created for fixing Kubernetes Flaw.
        /// </summary>
        /// <returns>The designer host</returns>
        public string GetDesignerHost()
        {
            string designerHost = Environment.GetEnvironmentVariable("TestdataRepositorySettings__DesignerInternalHost") ?? DesignerHost;
            return designerHost;
        }
    }
}
