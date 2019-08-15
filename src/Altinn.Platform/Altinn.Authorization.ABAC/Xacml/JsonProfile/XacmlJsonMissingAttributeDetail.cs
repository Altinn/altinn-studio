using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml.JsonProfile
{
    public class XacmlJsonMissingAttributeDetail
    {
        public string AttributeId { get; set; }

        public List<string> Value {get; set; }

        public string Issuer { get; set; }

        public string DataType { get; set; }

        public string Category { get; set; }
    }
}
