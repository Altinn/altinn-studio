using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    public class XacmlJsonObligationOrAdvice
    {
        public string Id { get; set; }

        public List<XacmlJsonAttributeAssignment> AttributeAssignment { get; set; }

    }
}
