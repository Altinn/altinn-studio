#nullable disable
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Models.Dto
{
    public class VersionResponse
    {
        public SemanticVersion BackendVersion { get; set; }

        /// <summary>
        /// It's string type due to limitation of SemanticVersion class. It doesn't support parsing "3" as a valid version.
        /// </summary>
        public string FrontendVersion { get; set; }
    }
}
