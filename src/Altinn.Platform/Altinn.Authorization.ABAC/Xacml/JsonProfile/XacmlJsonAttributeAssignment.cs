using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    public class XacmlJsonAttributeAssignment
    {
        public string AttributeId { get; set; }

        public string Value { get; set; }

        public string Category { get; set; }

        public string DataType { get; set; }

        public string Issuer { get; set; }
    }
}
