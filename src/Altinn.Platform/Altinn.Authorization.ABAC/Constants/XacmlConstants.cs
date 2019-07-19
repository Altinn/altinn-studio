using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.Authorization.ABAC.Constants
{
    /// <summary>
    /// Constants for XACML 
    /// </summary>
    public sealed class XacmlConstants
    {
        /// <summary>
        /// Element names in XACML 
        /// </summary>
        public sealed class ElementNames
        {
            /// <summary>
            /// ActionAttributeDesignator Xacml 3.0 element name
            /// </summary>
            public const string ActionAttributeDesignator = "ActionAttributeDesignator";

            /// <summary>
            /// AdviceExpression Xacml 3.0 element name
            /// </summary>
            public const string AdviceExpression = "AdviceExpression";

            /// <summary>
            /// AdviceExpressions Xacml 3.0 element name
            /// </summary>
            public const string AdviceExpressions = "AdviceExpressions";

            /// <summary>
            /// AnyOf Xacml 3.0 element name
            /// </summary>
            public const string AnyOf = "AnyOf";

            /// <summary>
            /// AllOf Xacml 3.0 element name
            /// </summary>
            public const string AllOf = "AllOf";

            /// <summary>
            /// Apply Xacml 3.0 element name
            /// </summary>
            public const string Apply = "Apply";

            /// <summary>
            /// Attribute Xacml 3.0 element name
            /// </summary>
            public const string Attribute = "Attribute";

            /// <summary>
            /// AttributeAssignmentExpression Xacml 3.0 element name
            /// </summary>
            public const string AttributeAssignmentExpression = "AttributeAssignmentExpression";

            /// <summary>
            /// AttributeDesignator Xacml 3.0 element name
            /// </summary>
            public const string AttributeDesignator = "AttributeDesignator";

            /// <summary>
            /// AttributeSelector Xacml 3.0 element name
            /// </summary>
            public const string AttributeSelector = "AttributeSelector";

            /// <summary>
            /// AttributeValue Xacml 3.0 element name
            /// </summary>
            public const string AttributeValue = "AttributeValue";

            /// <summary>
            /// CombinerParameter 
            /// </summary>
            public const string CombinerParameter = "CombinerParameter";

            /// <summary>
            /// CombinerParameters Xacml 3.0 element name
            /// </summary>
            public const string CombinerParameters = "CombinerParameters";

            /// <summary>
            /// Condition Xacml 3.0 element name
            /// </summary>
            public const string Condition = "Condition";

            /// <summary> 
            /// Content Xacml 3.0 element name
            /// </summary>
            public const string Content = "Content";

            /// <summary>
            /// Description Xacml 3.0 element name
            /// </summary>
            public const string Description = "Description";

            /// <summary>
            /// EnvironmentAttributeDesignator Xacml 3.0 element name
            /// </summary>
            public const string EnvironmentAttributeDesignator = "EnvironmentAttributeDesignator";

            /// <summary>
            /// Function Xacml 3.0 element name
            /// </summary>
            public const string Function = "Function";

            /// <summary>
            /// Match Xacml 3.0 element name
            /// </summary>
            public const string Match = "Match";

            /// <summary>
            /// ObligationExpressions Xacml 3.0 element name
            /// </summary>
            public const string ObligationExpressions = "ObligationExpressions";

            /// <summary>
            /// ObligationExpression Xacml 3.0 element name
            /// </summary>
            public const string ObligationExpression = "ObligationExpression";

            /// <summary>
            /// Policy Xacml 3.0 element name
            /// </summary>
            public const string Policy = "Policy";

            /// <summary>
            /// PolicyDefaults Xacml 3.0 element name
            /// </summary>
            public const string PolicyDefaults = "PolicyDefaults";

            /// <summary>
            /// PolicyIssuer Xacml 3.0 element name
            /// </summary>
            public const string PolicyIssuer = "PolicyIssuer";

            /// <summary>
            /// PolicySet Xacml 3.0 element name
            /// </summary>
            public const string PolicySet = "PolicySet";

            /// <summary>
            /// ResourceAttributeDesignator Xacml 3.0 element name
            /// </summary>
            public const string ResourceAttributeDesignator = "ResourceAttributeDesignator";

            /// <summary>
            /// Rule Xacml 3.0 element name
            /// </summary>
            public const string Rule = "Rule";

            /// <summary>
            /// RuleCombinerParameters Xacml 3.0 element name
            /// </summary>
            public const string RuleCombinerParameters = "RuleCombinerParameters";

            /// <summary>
            /// SubjectAttributeDesignator Xacml 3.0 element name
            /// </summary>
            public const string SubjectAttributeDesignator = "SubjectAttributeDesignator";

            /// <summary>
            /// Target Xacml 3.0 element name
            /// </summary>
            public const string Target = "Target";

            /// <summary>
            /// VariableDefinition Xacml 3.0 element name
            /// </summary>
            public const string VariableDefinition = "VariableDefinition";

            /// <summary>
            /// VariableReference Xacml 3.0 element name
            /// </summary>
            public const string VariableReference = "VariableReference";

            /// <summary>
            /// XPathVersion Xacml 3.0 element name
            /// </summary>
            public const string XPathVersion = "XPathVersion";
        }

        /// <summary>
        /// Attribute names constant
        /// </summary>
        public sealed class AttributeNames
        {
            /// <summary>
            /// AdviceId Xacml 3.0 attribute name
            /// </summary>
            public const string AdviceId = "AdviceId";

            /// <summary>
            /// AppliesTo Xacml 3.0 attribute name
            /// </summary>
            public const string AppliesTo = "AppliesTo";

            /// <summary>
            /// AttributeId Xacml 3.0 attribute name
            /// </summary>
            public const string AttributeId = "AttributeId";

            /// <summary>
            /// Category Xacml 3.0 attribute name
            /// </summary>
            public const string Category = "Category";

            /// <summary>
            /// DataType Xacml 3.0 attribute name
            /// </summary>
            public const string DataType = "DataType";

            /// <summary>
            /// Effect Xacml 3.0 attribute name
            /// </summary>
            public const string Effect = "Effect";

            /// <summary>
            /// FulfillOn Xacml 3.0 attribute name
            /// </summary>
            public const string FulfillOn = "FulfillOn";

            /// <summary>
            /// FunctionId Xacml 3.0 attribute name
            /// </summary>
            public const string FunctionId = "FunctionId";

            /// <summary>
            /// IncludeInResult Xacml 3.0 attribute name
            /// </summary>
            public const string IncludeInResult = "IncludeInResult";

            /// <summary>
            /// Issuer Xacml 3.0 attribute name
            /// </summary>
            public const string Issuer = "Issuer";

            /// <summary>
            /// ObligationId Xacml 3.0 attribute name
            /// </summary>
            public const string ObligationId = "ObligationId";

            /// <summary>
            /// ParameterName Xacml 3.0 attribute name
            /// </summary>
            public const string ParameterName = "ParameterName";

            /// <summary>
            /// Path Xacml 3.0 attribute name
            /// </summary>
            public const string Path = "Path";

            /// <summary>
            /// PolicyId Xacml 3.0 attribute name
            /// </summary>
            public const string PolicyId = "PolicyId";

            /// <summary>
            /// RequestContextPath Xacml 3.0 attribute name
            /// </summary>
            public const string RequestContextPath = "RequestContextPath";

            /// <summary>
            /// RuleCombiningAlgId Xacml 3.0 attribute name
            /// </summary>
            public const string RuleCombiningAlgId = "RuleCombiningAlgId";

            /// <summary>
            /// RuleId Xacml 3.0 attribute name
            /// </summary>
            public const string RuleId = "RuleId";

            /// <summary>
            /// RuleIdRef Xacml 3.0 attribute name
            /// </summary>
            public const string RuleIdRef = "RuleIdRef";

            /// <summary>
            /// MaxDelegationDepth Xacml 3.0 attribute name
            /// </summary>
            public const string MaxDelegationDepth = "MaxDelegationDepth";

            /// <summary>
            /// MatchId Xacml 3.0 attribute name
            /// </summary>
            public const string MatchId = "MatchId";

            /// <summary>
            /// MustBePresent Xacml 3.0 attribute name
            /// </summary>
            public const string MustBePresent = "MustBePresent";

            /// <summary>
            /// VariableId Xacml 3.0 attribute name
            /// </summary>
            public const string VariableId = "VariableId";

            /// <summary>
            /// Version Xacml 3.0 attribute name
            /// </summary>
            public const string Version = "Version";
        }
    }
}
