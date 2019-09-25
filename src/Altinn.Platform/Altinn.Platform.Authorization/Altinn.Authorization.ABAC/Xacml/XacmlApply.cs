using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;

namespace Altinn.Authorization.ABAC.Xacml
{
    /// <summary>
    /// From Xacml Specification 5.27 http://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-cd-03-en.html#_Toc256503880
    /// The <Apply/> element denotes application of a function to its arguments, thus encoding a function call.
    /// The <Apply/> element can be applied to any combination of the members of the <Expression/> element substitution group.  See Section 5.25.
    ///
    /// The <Apply/> element is of ApplyType complex type.
    /// The<Apply/> element contains the following attributes and elements:
    ///
    /// FunctionId[Required]
    /// The identifier of the function to be applied to the arguments.XACML-defined functions are described in Appendix A.3.
    ///
    /// <Description/> [Optional]
    /// A free-form description of the <Apply/> element.
    ///
    /// <Expression/> [Optional]
    /// Arguments to the function, which may include other functions.
    /// </summary>
    public class XacmlApply : IXacmlExpression
    {
        private readonly ICollection<IXacmlExpression> parameters = new Collection<IXacmlExpression>();
        private Uri functionId;

        /// <summary>
        /// Gets or sets A free-form description of the <Apply/> element.
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="XacmlApply"/> class.
        /// </summary>
        /// <param name="functionId">The identifier of the function to be applied to the arguments.XACML-defined functions are described in Appendix A.3.</param>
        public XacmlApply(Uri functionId)
        {
            Guard.ArgumentNotNull(functionId, nameof(functionId));
            this.functionId = functionId;
        }

       /// <summary>
       /// Gets the collection of parameters for the Apply object.
       /// </summary>
        public ICollection<IXacmlExpression> Parameters
        {
            get
            {
                return this.parameters;
            }
        }

        /// <summary>
        /// Gets or sets the identifier of the function to be applied to the arguments.XACML-defined functions are described in Appendix A.3 of the XACML documentation.
        /// </summary>
        public Uri FunctionId
        {
            get
            {
                return this.functionId;
            }

            set
            {
                Guard.ArgumentNotNull(value, nameof(value));
                this.functionId = value;
            }
        }

        /// <summary>
        /// Evauluate the Apply.
        /// </summary>
        /// <param name="request">The context request.</param>
        /// <returns>The match result.</returns>
        public XacmlAttributeMatchResult Evalute(XacmlContextRequest request)
        {
            XacmlAttributeValue policyConditionAttributeValue = null;
            XacmlAttributeDesignator xacmlAttributeDesignator = null;
            XacmlApply xacmlApply = null;

            foreach (IXacmlExpression xacmlExpression in this.Parameters)
           {
                if (xacmlExpression.GetType() == typeof(XacmlAttributeValue))
                {
                    policyConditionAttributeValue = xacmlExpression as XacmlAttributeValue;
                }
                else if (xacmlExpression.GetType() == typeof(XacmlAttributeDesignator))
                {
                    xacmlAttributeDesignator = xacmlExpression as XacmlAttributeDesignator;
                }
                else if (xacmlExpression.GetType() == typeof(XacmlApply))
                {
                    xacmlApply = xacmlExpression as XacmlApply;
                }
            }

            if (xacmlAttributeDesignator == null && xacmlApply != null)
            {
                foreach (IXacmlExpression xacmlExpression in xacmlApply.Parameters)
                {
                    if (xacmlExpression.GetType() == typeof(XacmlAttributeDesignator))
                    {
                        xacmlAttributeDesignator = xacmlExpression as XacmlAttributeDesignator;
                    }
                }
            }

            return this.Evaluate(request, policyConditionAttributeValue, xacmlAttributeDesignator, xacmlApply);
        }

        private XacmlAttributeMatchResult Evaluate(XacmlContextRequest contextRequest, XacmlAttributeValue policyConditionAttributeValue, XacmlAttributeDesignator attributeDesignator, XacmlApply xacmlApply)
        {
            ICollection<XacmlContextAttributes> xacmlContextAttributes = new Collection<XacmlContextAttributes>();

            foreach (XacmlContextAttributes attributes in contextRequest.Attributes)
           {
               if (attributes.Category.Equals(attributeDesignator.Category))
                {
                    xacmlContextAttributes.Add(attributes);
                }
           }

            if (xacmlContextAttributes.Count == 0)
            {
                // No match for the condition in the attributes
                return XacmlAttributeMatchResult.RequiredAttributeMissing;
            }

            if (!this.ValidateSingleElementInBagCondition(xacmlContextAttributes, policyConditionAttributeValue, xacmlApply, attributeDesignator))
            {
                return XacmlAttributeMatchResult.ToManyAttributes;
            }

            if (this.IsBagSizeCondition(xacmlApply))
            {
                return this.EvaluateBagSize(xacmlContextAttributes, policyConditionAttributeValue, xacmlApply, attributeDesignator);
            }

            return this.Evalute(xacmlContextAttributes, policyConditionAttributeValue, attributeDesignator);
        }

        /// <summary>
        /// This verifies it the XacmlApply is only a bag size function and
        /// does not compare the attribute value only the attribute count.
        /// </summary>
        /// <param name="xacmlApply">The xacmlApply.</param>
        /// <returns>A boolean value telling if it is a baq size only function.</returns>
        private bool IsBagSizeCondition(XacmlApply xacmlApply)
        {
            if (xacmlApply == null)
            {
                return false;
            }

            string applyfunction = xacmlApply.FunctionId.OriginalString;

            switch (applyfunction)
            {
                case XacmlConstants.AttributeBagFunction.TimeBagSize:
                case XacmlConstants.AttributeBagFunction.DateBagSize:
                case XacmlConstants.AttributeBagFunction.DateTimeBagSize:
                    return true;
                default:
                    return false;
            }
        }

        private XacmlAttributeMatchResult Evalute(ICollection<XacmlContextAttributes> contextAttributes, XacmlAttributeValue policyConditionAttributeValue, XacmlAttributeDesignator attributeDesignator)
        {
            bool attributeWithCorrectAttributeIdFound = false;
            foreach (XacmlContextAttributes xacmlContextAttributes in contextAttributes)
            {
                foreach (XacmlAttribute attribute in xacmlContextAttributes.Attributes)
                {
                    if (attribute.AttributeId.Equals(attributeDesignator.AttributeId))
                    {
                        attributeWithCorrectAttributeIdFound = true;
                        if (this.Match(this.FunctionId, attribute, policyConditionAttributeValue))
                        {
                            return XacmlAttributeMatchResult.Match;
                        }
                    }
                }
            }

            if (attributeWithCorrectAttributeIdFound)
            {
                return XacmlAttributeMatchResult.NoMatch;
            }

            return XacmlAttributeMatchResult.RequiredAttributeMissing;
        }

        private XacmlAttributeMatchResult EvaluateBagSize(ICollection<XacmlContextAttributes> contextAttributes, XacmlAttributeValue policyConditionAttributeValue, XacmlApply xacmlApply, XacmlAttributeDesignator attributeDesignator)
        {
            string applyfunction = xacmlApply.FunctionId.OriginalString;

            switch (applyfunction)
            {
                case XacmlConstants.AttributeBagFunction.TimeBagSize:
                case XacmlConstants.AttributeBagFunction.DateBagSize:
                case XacmlConstants.AttributeBagFunction.DateTimeBagSize:
                    int bagSize = this.GetBagSize(contextAttributes, attributeDesignator);
                    if (int.Parse(policyConditionAttributeValue.Value).Equals(bagSize))
                    {
                        return XacmlAttributeMatchResult.Match;
                    }

                    return XacmlAttributeMatchResult.BagSizeConditionFailed;
                default:
                    break;
            }

            return XacmlAttributeMatchResult.BagSizeConditionFailed;
        }

        private int GetBagSize(ICollection<XacmlContextAttributes> contextAttributes, XacmlAttributeDesignator attributeDesignator)
        {
            int attributeCount = 0;

            foreach (XacmlContextAttributes contextAttribute in contextAttributes)
            {
                foreach (XacmlAttribute contextAttributeValue in contextAttribute.Attributes)
                {
                    if (contextAttributeValue.AttributeId.Equals(attributeDesignator.AttributeId))
                    {
                        foreach (XacmlAttributeValue xacmlAttributeValue in contextAttributeValue.AttributeValues)
                        {
                            if (xacmlAttributeValue.DataType.OriginalString.Equals(attributeDesignator.DataType.OriginalString))
                            {
                                attributeCount++;
                            }
                        }
                    }
                }
            }

            return attributeCount;
        }

        private bool ValidateSingleElementInBagCondition(ICollection<XacmlContextAttributes> contextAttributes, XacmlAttributeValue policyConditionAttributeValue, XacmlApply xacmlApply, XacmlAttributeDesignator attributeDesignator)
        {
            bool isSingleFunction = false;

            string applyfunction = this.FunctionId.OriginalString;

            if (xacmlApply != null)
            {
                applyfunction = xacmlApply.FunctionId.OriginalString;
            }

            switch (applyfunction)
            {
                case XacmlConstants.AttributeMatchFunction.IntegerOneAndOnly:
                    isSingleFunction = true;
                    break;
                case XacmlConstants.AttributeMatchFunction.DateOneAndOnly:
                    isSingleFunction = true;
                    break;
                case XacmlConstants.AttributeMatchFunction.DateTimeOneAndOnly:
                    isSingleFunction = true;
                    break;
                default:
                    break;
            }

            if (!isSingleFunction)
            {
                return true;
            }

            int attributeCount = this.GetBagSize(contextAttributes, attributeDesignator);

            if (attributeCount > 1)
            {
                return false;
            }

            return true;
        }

        private bool Match(Uri matchFunction, XacmlAttribute contextAttribute, XacmlAttributeValue policyConditionAttributeValue)
        {
            foreach (XacmlAttributeValue contextAttributeValue in contextAttribute.AttributeValues)
            {
                if (contextAttributeValue.MatchAttributeValues(matchFunction, policyConditionAttributeValue))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
