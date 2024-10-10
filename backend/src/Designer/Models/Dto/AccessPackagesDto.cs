using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto
{
    public class AccessPackagesDto
    {
        public List<AccessPackageCategory> Categories { get; set; }

        public List<AccessPackage> AccessPackages { get; set; }
    }
}
