using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class AccessPackageService
    {
        public string Identifier { get; set; }

        public Dictionary<string, string> Title { get; set; }

        public CompetentAuthority HasCompetentAuthority { get; set; }

        public string LogoUrl { get; set; }
    }
}
