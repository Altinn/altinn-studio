using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    public class XacmlJsonStatus
    {
        public string StatusMessage { get; set; }

        public List<string> StatusDetails { get; set; }

        public XacmlJsonStatusCode StatusCode { get; set; }

    }
}
