#nullable disable
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Class that defines the common test data settings
    /// </summary>
    public class TestdataRepositorySettings : ISettingsMarker
    {
        /// <summary>
        /// Gets or sets the repository location
        /// </summary>
        public string RepositoryLocation { get; set; }

        /// <summary>
        /// Gets or sets the designer host
        /// </summary>
        public string DesignerHost { get; set; }
    }
}
