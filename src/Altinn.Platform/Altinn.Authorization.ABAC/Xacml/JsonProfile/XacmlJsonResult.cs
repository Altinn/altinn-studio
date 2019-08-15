using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    public class XacmlJsonResult
    {
        public string Decision { get; set; }

        public XacmlJsonStatus Status { get; set;  }

        public List<XacmlJsonObligationOrAdvice> Obligations { get; set; }

        public List<XacmlJsonObligationOrAdvice> AssociateAdvice { get; set; }

        public List<XacmlJsonCategory> Category { get; set;  }

        public XacmlJsonPolicyIdentifierList PolicyIdentifierList { get; set; }
    }
}
