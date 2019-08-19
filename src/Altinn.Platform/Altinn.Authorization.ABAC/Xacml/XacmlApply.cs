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
       /// The collection of parameters for the Apply object
       /// </summary>
        public ICollection<IXacmlExpression> Parameters
        {
            get
            {
                return this.parameters;
            }
        }

        /// <summary>
        /// The identifier of the function to be applied to the arguments.XACML-defined functions are described in Appendix A.3 of the XACML documentation
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
        /// Evauluate the Apply 
        /// </summary>
        /// <param name="request">The context request</param>
        /// <returns></returns>
        public XacmlAttributeMatchResult Evalute(XacmlContextRequest request)
        {
            XacmlAttributeValue policyConditionAttributeValue = null;
            XacmlAttributeDesignator xacmlAttributeDesignator = null;
            XacmlApply xacmlApply = null;

            foreach (IXacmlExpression xacmlExpression in Parameters)
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
           
            return Evaluate(request, policyConditionAttributeValue, xacmlAttributeDesignator, xacmlApply);
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

            if (!ValidateSingleElementCondition(xacmlContextAttributes, policyConditionAttributeValue, xacmlApply, attributeDesignator))
            {
                return XacmlAttributeMatchResult.ToManyAttributes;
            }

            if (!ValidateBagFunction(xacmlContextAttributes, policyConditionAttributeValue, xacmlApply, attributeDesignator))
            {
                return XacmlAttributeMatchResult.ToManyAttributes;
            }

            return Evalute(xacmlContextAttributes, policyConditionAttributeValue, attributeDesignator);
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
                        if (Match(FunctionId, attribute, policyConditionAttributeValue))
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

        private bool ValidateBagFunction(ICollection<XacmlContextAttributes> contextAttributes, XacmlAttributeValue policyConditionAttributeValue, XacmlApply xacmlApply, XacmlAttributeDesignator attributeDesignator)
        {
            if (xacmlApply == null)
            {
                // If there is noe xacmlApply there is no bag function. (at least my understanding now)
                return true;
            }

            string applyfunction = xacmlApply.FunctionId.OriginalString;

            switch (applyfunction)
            {
                case XacmlConstants.MatchTypeIdentifiers.TimeBagSize:
                    int bagSize = GetBagSize(contextAttributes, attributeDesignator);
                    if (int.Parse(policyConditionAttributeValue.Value).Equals(bagSize))
                    {
                        return true;
                    }

                    return false;
                default:
                    break;
            }

            return true;
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

        private bool ValidateSingleElementCondition(ICollection<XacmlContextAttributes> contextAttributes, XacmlAttributeValue policyConditionAttributeValue, XacmlApply xacmlApply, XacmlAttributeDesignator attributeDesignator)
        {
            bool isSingleFunction = false;

            string applyfunction = FunctionId.OriginalString;

            if (xacmlApply != null)
            {
                applyfunction = xacmlApply.FunctionId.OriginalString;
            }

            switch (applyfunction)
            {
                case XacmlConstants.MatchTypeIdentifiers.IntegerOneAndOnly:
                    isSingleFunction = true;
                    break;
                default:
                    break;
            }

            if (!isSingleFunction)
            {
                return true;
            }

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
