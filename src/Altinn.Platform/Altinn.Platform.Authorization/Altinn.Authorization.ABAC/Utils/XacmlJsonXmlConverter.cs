using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;

namespace Altinn.Authorization.ABAC.Utils
{
    /// <summary>
    /// Utility that converts between JSON objects and XML objects.
    /// </summary>
    public class XacmlJsonXmlConverter
    {
        /// <summary>
        /// Converts JSON request.
        /// </summary>
        /// <param name="xacmlJsonRequest">The JSON Request.</param>
        /// <returns></returns>
        public static XacmlContextRequest ConvertRequest(XacmlJsonRequest xacmlJsonRequest)
        {
            Guard.ArgumentNotNull(xacmlJsonRequest, nameof(xacmlJsonRequest));

            ICollection<XacmlContextAttributes> contextAttributes = new Collection<XacmlContextAttributes>();

            ConvertCategoryAttributes(xacmlJsonRequest.AccessSubject, XacmlConstants.MatchAttributeCategory.Subject, contextAttributes);
            ConvertCategoryAttributes(xacmlJsonRequest.Action, XacmlConstants.MatchAttributeCategory.Action, contextAttributes);
            ConvertCategoryAttributes(xacmlJsonRequest.Resource, XacmlConstants.MatchAttributeCategory.Resource, contextAttributes);
            ConvertCategoryAttributes(xacmlJsonRequest.Category, null, contextAttributes);

            XacmlContextRequest xacmlContextRequest = new XacmlContextRequest(false, false, contextAttributes);

            return xacmlContextRequest;
        }

        /// <summary>
        ///  Converts a Xacml XML response to a JSON object response.
        /// </summary>
        /// <param name="xacmlContextResponse">The context response.</param>
        /// <returns>The json response.</returns>
        public static XacmlJsonResponse ConvertResponse(XacmlContextResponse xacmlContextResponse)
        {
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();

            foreach (XacmlContextResult xacmlResult in xacmlContextResponse.Results)
            {
                XacmlJsonResult jsonResult = new XacmlJsonResult();
                jsonResult.Decision = xacmlResult.Decision.ToString();
                jsonResult.Status = new XacmlJsonStatus();
                jsonResult.Status.StatusCode = new XacmlJsonStatusCode();
                jsonResult.Status.StatusCode.Value = xacmlResult.Status.StatusCode.Value.OriginalString;

                jsonResult.Obligations = ConvertObligations(xacmlResult.Obligations);

                response.Response.Add(jsonResult);
            }

            return response;
        }

        private static List<XacmlJsonObligationOrAdvice> ConvertObligations(ICollection<XacmlObligation> obligations)
        {
            if (obligations == null || obligations.Count == 0)
            {
                return null;
            }

            List<XacmlJsonObligationOrAdvice> jsonObligations = new List<XacmlJsonObligationOrAdvice>();

            foreach (XacmlObligation obligation in obligations)
            {
                jsonObligations.Add(ConvertObligation(obligation));
            }

            return jsonObligations;
        }

        private static XacmlJsonObligationOrAdvice ConvertObligation(XacmlObligation obligation)
        {
            XacmlJsonObligationOrAdvice xacmlJsonObligationOrAdvice = new XacmlJsonObligationOrAdvice();
            xacmlJsonObligationOrAdvice.Id = obligation.ObligationId.OriginalString;
            xacmlJsonObligationOrAdvice.AttributeAssignment = ConvertToAttributeAssignments(obligation.AttributeAssignment);

            return xacmlJsonObligationOrAdvice;
        }

        private static List<XacmlJsonAttributeAssignment> ConvertToAttributeAssignments(ICollection<XacmlAttributeAssignment> attributeAssignments)
        {
            if (attributeAssignments == null || attributeAssignments.Count == 0)
            {
                return null;
            }

            List<XacmlJsonAttributeAssignment> jsonAttributeAssignments = new List<XacmlJsonAttributeAssignment>();

            foreach (XacmlAttributeAssignment attributeAssignment in attributeAssignments)
            {
                jsonAttributeAssignments.Add(ConvertAttributeAssignment(attributeAssignment));
            }

            return jsonAttributeAssignments;
        }

        private static XacmlJsonAttributeAssignment ConvertAttributeAssignment(XacmlAttributeAssignment attributeAssignment)
        {
            if (attributeAssignment == null)
            {
                return null;
            }

            XacmlJsonAttributeAssignment xacmlJsonAttributeAssignment = new XacmlJsonAttributeAssignment()
            {
                AttributeId = attributeAssignment.AttributeId.OriginalString,
                Category = attributeAssignment.Category.OriginalString,
                DataType = attributeAssignment.DataType.OriginalString,
                Issuer = attributeAssignment.Issuer,
                Value = attributeAssignment.Value,
            };

            return xacmlJsonAttributeAssignment;
        }

        private static void ConvertCategoryAttributes(List<XacmlJsonCategory> categoryList, string categoryId, ICollection<XacmlContextAttributes> contextAttributes)
        {
            if (categoryList == null)
            {
                return;
            }

            foreach (XacmlJsonCategory subjectCategory in categoryList)
            {
                if (!string.IsNullOrEmpty(subjectCategory.CategoryId))
                {
                    categoryId = subjectCategory.CategoryId;
                }

                XacmlContextAttributes xacmlContextAttributes = new XacmlContextAttributes(new Uri(categoryId));

                XacmlAttribute xacmlAttribute = null;

                ICollection<XacmlAttributeValue> attributeValues = new Collection<XacmlAttributeValue>();

                foreach (XacmlJsonAttribute jsonAttribute in subjectCategory.Attribute)
                {
                    if (xacmlAttribute == null)
                    {
                        xacmlAttribute = new XacmlAttribute(new Uri(jsonAttribute.AttributeId), jsonAttribute.IncludeInResult);
                    }

                    XacmlAttributeValue xacmlAttributeValue = new XacmlAttributeValue(new Uri(ConvertDataType(jsonAttribute)), jsonAttribute.Value);
                    xacmlAttribute.AttributeValues.Add(xacmlAttributeValue);
                    xacmlContextAttributes.Attributes.Add(xacmlAttribute);
            }

                contextAttributes.Add(xacmlContextAttributes);
            }
        }

        private static string ConvertDataType(XacmlJsonAttribute jsonAttribute)
        {
            if (string.IsNullOrEmpty(jsonAttribute.DataType))
            {
                return XacmlConstants.DataTypes.XMLString;
            }

            switch (jsonAttribute.DataType)
            {
                case "string":
                    return XacmlConstants.DataTypes.XMLString;
                case XacmlConstants.DataTypes.XMLString:
                    return XacmlConstants.DataTypes.XMLString;
                case "anyURI":
                case XacmlConstants.DataTypes.XMLAnyURI:
                    return XacmlConstants.DataTypes.XMLAnyURI;
                default:
                    throw new Exception("Not supported");
            }
        }
    }
}
