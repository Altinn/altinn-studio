using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    public class EuroVocTerm
    {
        public string Uri { get; set; }

        public string Code { get; set; }

        public Dictionary<string, string> Label { get; set; }

        public List<object> Children { get; set; }

        public List<string> Parents { get; set; }

        public List<string> EurovocPaths { get; set; }
    }
}
