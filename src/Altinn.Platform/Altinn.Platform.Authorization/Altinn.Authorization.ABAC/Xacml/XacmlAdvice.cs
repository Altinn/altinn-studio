using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Text;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.35 Element <Advice/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047140
    ///
    /// The <Advice/> element SHALL contain an identifier for the advice and a set of attributes that form arguments of the supplemental
    /// information defined by the advice.
    ///
    /// The <Advice/> element is of AdviceType complexType.  See Section 7.18 for a description of how the set of advice to be returned by the PDP is determined.
    /// The<Advice/> element contains the following elements and attributes:
    ///
    /// AdviceId[Required]
    /// Advice identifier.The value of the advice identifier MAY be interpreted by the PEP.
    ///
    /// <AttributeAssignment/> [Optional]
    /// Advice arguments assignment.The values of the advice arguments MAY be interpreted by the PEP.
    /// </summary>
    public class XacmlAdvice
    {
        private readonly ICollection<XacmlAttributeAssignment> attributeAssignment = new Collection<XacmlAttributeAssignment>();
        private Uri adviceId;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlAdvice"/> class.
        /// </summary>
        /// <param name="adviceId">Advice identifier.The value of the advice identifier MAY be interpreted by the PEP.</param>
        /// <param name="attributeAssigments">Advice arguments assignment.The values of the advice arguments MAY be interpreted by the PEP.</param>
        public XacmlAdvice(Uri adviceId, IEnumerable<XacmlAttributeAssignment> attributeAssigments)
        {
            if (adviceId == null)
            {
                throw new ArgumentNullException(nameof(adviceId));
            }

            this.adviceId = adviceId;

            foreach (var item in attributeAssigments)
            {
                if (item == null)
                {
                    throw new ArgumentException("Enumeration cannot contains null values.", nameof(attributeAssigments));
                }

                this.attributeAssignment.Add(item);
            }
        }

        /// <summary>
        /// Gets advice arguments assignment.The values of the advice arguments MAY be interpreted by the PEP.
        /// </summary>
        public ICollection<XacmlAttributeAssignment> AttributeAssignment
        {
            get
            {
                return this.attributeAssignment;
            }
        }

        /// <summary>
        /// Gets or sets advice identifier.The value of the advice identifier MAY be interpreted by the PEP.
        /// </summary>
        public Uri AdviceId
        {
            get
            {
                return this.adviceId;
            }

            set
            {
                if (value == null)
                {
                    throw new ArgumentNullException(nameof(value));
                }

                this.adviceId = value;
            }
        }
    }
}
