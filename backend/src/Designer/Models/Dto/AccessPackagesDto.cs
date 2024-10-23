using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto
{
    public class AccessPackagesDto
    {
        public List<AccessPackageTagGroup> TagGroups { get; set; }
        public List<AccessPackageTag> Tags { get; set; }

        public List<AccessPackage> AccessPackages { get; set; }
    }
}
