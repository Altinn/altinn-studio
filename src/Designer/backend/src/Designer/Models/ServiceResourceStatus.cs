#nullable disable
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class ServiceResourceStatus
    {
        public string PolicyVersion { get; set; }

        public string ResourceVersion { get; set; }

        public List<ResourceVersionInfo> PublishedVersions { get; set; }

    }
}
