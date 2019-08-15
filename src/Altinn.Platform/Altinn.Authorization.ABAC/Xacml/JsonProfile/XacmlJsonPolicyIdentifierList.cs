using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    public class XacmlJsonPolicyIdentifierList
    {
        public List<XacmlJsonIdReference> PolicyIdReference { get; set; }

        public List<XacmlJsonIdReference> PolicySetIdReference {get; set; }
    }
}
