using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.App.Common.Models
{
    public class AppOptions
    {
        public List<AppOption> Options { get; set; }

        public bool IsCacheable { get; set; }
    }
}
