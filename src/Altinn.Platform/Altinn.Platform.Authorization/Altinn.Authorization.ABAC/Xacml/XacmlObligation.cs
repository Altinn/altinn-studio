using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// 5.34 Element <Obligation/> http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html#_Toc325047139
    /// The <Obligation/> element SHALL contain an identifier for the obligation and a set of attributes that form arguments of the action defined by the obligation.
    ///
    /// The <Obligation/> element is of ObligationType complexType.  See Section 7.18 for a description of how the set of obligations to be returned by the PDP is determined.
    /// The <Obligation/> element contains the following elements and attributes:
    ///
    /// ObligationId[Required]
    /// Obligation identifier.The value of the obligation identifier SHALL be interpreted by the PEP.
    ///
    /// <AttributeAssignment/> [Optional]
    /// Obligation arguments assignment.The values of the obligation arguments SHALL be interpreted by the PEP.
    /// </summary>
    public class XacmlObligation
    {
        private readonly ICollection<XacmlAttributeAssignment> attributeAssignment = new Collection<XacmlAttributeAssignment>();
        private Uri obligationId;

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlObligation"/> class.
        /// </summary>
        /// <param name="obligationId">Obligation identifier.The value of the obligation identifier SHALL be interpreted by the PEP.</param>
        /// <param name="fulfillOn">The action to fulfillon.</param>
        /// <param name="attributeAssigments"> list Obligation arguments assignment.The values of the obligation arguments SHALL be interpreted by the PEP.</param>
        public XacmlObligation(Uri obligationId, XacmlEffectType fulfillOn, IEnumerable<XacmlAttributeAssignment> attributeAssigments)
        {
            Guard.ArgumentNotNull(obligationId, nameof(obligationId));
            this.obligationId = obligationId;
            this.FulfillOn = fulfillOn;

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
        /// Initializes a new instance of the <see cref="XacmlObligation"/> class.
        /// </summary>
        /// <param name="obligationId">Obligation identifier.The value of the obligation identifier SHALL be interpreted by the PEP.</param>
        /// <param name="attributeAssigments">list Obligation arguments assignment.The values of the obligation arguments SHALL be interpreted by the PEP.</param>
        public XacmlObligation(Uri obligationId, IEnumerable<XacmlAttributeAssignment> attributeAssigments)
            : this(obligationId, XacmlEffectType.Deny, attributeAssigments)
        {
        }

        /// <summary>
        /// Gets the attribute assignment.
        /// </summary>
        /// <value>
        /// The attribute assignment.
        /// </value>
        public ICollection<XacmlAttributeAssignment> AttributeAssignment
        {
            get
            {
                return this.attributeAssignment;
            }
        }

        /// <summary>
        /// Gets or sets the obligation identifier.
        /// </summary>
        /// <value>
        /// The obligation identifier.
        /// </value>
        public Uri ObligationId
        {
            get
            {
                return this.obligationId;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.obligationId = value;
            }
        }

        /// <summary>
        /// Gets or sets the fulfill on.
        /// </summary>
        /// <value>
        /// The fulfill on.
        /// </value>
        public XacmlEffectType FulfillOn { get; set; }
    }
}
