using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    /// <summary>
    /// The JSON Response
    /// </summary>
    public class XacmlJsonResponse
    {
        public List<XacmlJsonResult> Response { get; set; }
    }
}
