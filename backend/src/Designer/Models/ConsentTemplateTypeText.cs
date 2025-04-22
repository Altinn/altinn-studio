using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Defines texts used in consent templates
    /// </summary>
    public class ConsentTemplateTypeText
    {
        public Dictionary<string, string> Org { get; set; }

        public Dictionary<string, string> Person { get; set; }
    }
}
