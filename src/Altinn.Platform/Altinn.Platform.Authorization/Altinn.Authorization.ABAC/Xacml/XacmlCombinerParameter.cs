using System;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.17 Element <CombinerParameter/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047122
    /// The <CombinerParameter/> element conveys a single parameter for a policy- or rule-combining algorithm.
    ///
    /// The <CombinerParameter/> element is of CombinerParameterType complex type.
    /// The<CombinerParameter/> element contains the following attributes:
    ///
    /// ParameterName[Required]
    /// The identifier of the parameter.
    ///
    /// <AttributeValue/> [Required]
    /// The value of the parameter.
    /// Support for the<CombinerParameter/> element is optional.
    /// </summary>
    public class XacmlCombinerParameter
    {
        private string parameterName;
        private XacmlAttributeValue attributeValue;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlCombinerParameter"/> class.
        /// </summary>
        /// <param name="parameterName">The identifier of the parameter.</param>
        /// <param name="attributeValue">The value of the parameter.</param>
        public XacmlCombinerParameter(string parameterName, XacmlAttributeValue attributeValue)
        {
            Guard.ArgumentNotNull(parameterName, nameof(parameterName));
            if (parameterName.Length == 0)
            {
                throw new ArgumentException("Value cannot be empty.", nameof(parameterName));
            }

            Guard.ArgumentNotNull(parameterName, nameof(parameterName));
            this.parameterName = parameterName;
            this.attributeValue = attributeValue;
        }

        /// <summary>
        /// The identifier of the parameter.
        /// </summary>
        public string ParameterName
        {
            get
            {
                return this.parameterName;
            }

            set
            {
                if (value == null)
                {
                    throw new ArgumentNullException(nameof(value));
                }

                if (value.Length == 0)
                {
                    throw new ArgumentException("Value cannot be empty.", nameof(value));
                }

                this.parameterName = value;
            }
        }

        /// <summary>
        /// The value of the parameter.
        /// </summary>
        public XacmlAttributeValue AttributeValue
        {
            get
            {
                return this.attributeValue;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.attributeValue = value;
            }
        }
    }
}
