using Microsoft.AspNetCore.Mvc.Rendering;

using System.Collections.Generic;

namespace LocalTest.Models
{
    public class FrontendVersion
    {
        public string Version { get; set; }
        public List<SelectListItem> Versions { get; set; }
    }
}
