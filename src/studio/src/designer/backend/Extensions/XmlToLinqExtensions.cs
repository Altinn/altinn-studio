using System;
using System.Linq;
using System.Linq.Expressions;
using System.Xml.Linq;
using Altinn.Studio.Designer.ModelMetadatalModels;

namespace Altinn.Studio.Designer.Extensions
{
    /// <summary>
    /// XML to LINQ helper extensions
    /// </summary>
    public static class XmlToLinqExtensions
    {
        #region Public Methods and Operators

        /// <summary>
        /// Adds a new XAttribute to the current XElement, and returns the current XElement (Fluent)
        /// </summary>
        /// <param name="element">
        /// This XElement
        /// </param>
        /// <param name="attributeName">
        /// New Attribute Name
        /// </param>
        /// <param name="value">
        /// Attribute value
        /// </param>
        /// <returns>
        /// This updated XML Element
        /// </returns>
        public static XElement AddAttribute(this XElement element, string attributeName, object value)
        {
            element.Add(new XAttribute(attributeName, value.ToString()));
            return element;
        }

        /// <summary>
        /// Adds a new XElement to the current XElement, and returns the new XElement
        /// </summary>
        /// <param name="element">
        /// This XElement
        /// </param>
        /// <param name="elementName">
        /// New element name
        /// </param>
        /// <param name="elementValue">
        /// Add element, will be used as string via ToString()
        /// </param>
        /// <returns>
        /// The added XElement instance
        /// </returns>
        public static XElement AddElement(this XElement element, string elementName, object elementValue)
        {
            element.Add(new XElement(elementName, elementValue.ToString()));
            return element;
        }

        /// <summary>
        /// Adds the properties as X element.
        /// </summary>
        /// <typeparam name="T">
        /// Type of object
        /// </typeparam>
        /// <param name="element">
        /// The element.
        /// </param>
        /// <param name="experssions">
        /// The expressions.
        /// </param>
        /// <returns>
        /// XML element
        /// </returns>
        public static XElement AddPropertiesAsXElement<T>(this XElement element, params Expression<Func<T>>[] experssions)
        {
            foreach (Expression<Func<T>> experssion in experssions)
            {
                element.AddPropertiesAsXElement(experssion);
            }

            return element;
        }

        /// <summary>
        /// Adds the property as X element.
        /// </summary>
        /// <param name="element">
        /// The element.
        /// </param>
        /// <param name="exp">
        /// The expression.
        /// </param>
        /// <returns>
        /// XML element
        /// </returns>
        public static XElement AddPropertyAsXElement(this XElement element, Expression<Func<object>> exp)
        {
            string name = string.Empty;
            MemberExpression body = exp.Body as MemberExpression;
            if (body == null)
            {
                UnaryExpression ubody = (UnaryExpression)exp.Body;
                body = ubody.Operand as MemberExpression;
                if (body != null)
                {
                    name = body.Member.Name;
                }
            }
            else
            {
                name = body.Member.Name;
            }

            object value = exp.Compile().Invoke();
            if (value != null)
            {
                element.Add(new XElement(name, value));
            }

            return element;
        }

        /// <summary>
        /// Adds the rule as X element.
        /// </summary>
        /// <param name="element">
        /// The element.
        /// </param>
        /// <param name="exp">
        /// The expression.
        /// </param>
        /// <returns>
        /// XML element
        /// </returns>
        public static XElement AddRuleAsXElement(this XElement element, Expression<Func<object>> exp)
        {
            string name = string.Empty;
            MemberExpression body = exp.Body as MemberExpression;
            if (body == null)
            {
                UnaryExpression ubody = (UnaryExpression)exp.Body;
                body = ubody.Operand as MemberExpression;
                if (body != null)
                {
                    name = body.Member.Name;
                }
            }
            else
            {
                name = body.Member.Name;
            }

            object value = exp.Compile().Invoke();
            if (value != null)
            {
                element.Add(new XElement("rule", new XAttribute("type", name), new XAttribute("value", value)));
            }

            return element;
        }

        /// <summary>
        /// Get the Attribute value.
        /// </summary>
        /// <param name="element">
        /// The element.
        /// </param>
        /// <param name="xName">
        /// Name of the x.
        /// </param>
        /// <returns>
        /// attribute value
        /// </returns>
        public static string AttributeValue(this XElement element, XName xName)
        {
            if (element == null)
            {
                return string.Empty;
            }

            XAttribute attribute = element.Attribute(xName);
            return attribute == null ? string.Empty : attribute.Value;
        }

        /// <summary>
        /// Attributes the value.
        /// </summary>
        /// <param name="element">
        /// The element.
        /// </param>
        /// <param name="attributeName">
        /// Name of the attribute.
        /// </param>
        /// <returns>
        /// attribute value
        /// </returns>
        public static string AttributeValue(this XElement element, string attributeName)
        {
            return element.AttributeValue(XName.Get(attributeName));
        }
 
        /// <summary>
        /// Creates the culture string from X element.
        /// </summary>
        /// <param name="element">
        /// The element.
        /// </param>
        /// <returns>
        /// culture string
        /// </returns>
        public static CultureString CreateCultureStringFromXElement(this XElement element)
        {
            CultureString cs = new CultureString();
            foreach (XElement content in element.Elements("content"))
            {
                XAttribute xAttribute = content.Attribute("lang");
                if (xAttribute != null && !string.IsNullOrEmpty(xAttribute.Value))
                {
                    cs[xAttribute.Value] = content.Value;
                }
            }

            return cs;
        }

        /// <summary>
        /// Gets the element value.
        /// </summary>
        /// <param name="element">
        /// The element.
        /// </param>
        /// <param name="xName">
        /// Name of the x.
        /// </param>
        /// <returns>
        /// element value
        /// </returns>
        public static string ElementValue(this XElement element, XName xName)
        {
            if (element == null)
            {
                return string.Empty;
            }

            XElement item = element.Element(xName);
            return item == null ? string.Empty : item.Value;
        }

        /// <summary>
        /// Gets the restriction value.
        /// </summary>
        /// <param name="restrictionElement">
        /// The restriction element.
        /// </param>
        /// <param name="searchElement">
        /// The search element.
        /// </param>
        /// <param name="value">
        /// The value.
        /// </param>
        /// <returns>
        /// restriction value
        /// </returns>
        public static bool GetRestrictionValue(this XElement restrictionElement, XName searchElement, out int value)
        {
            XElement element = restrictionElement.Descendants(searchElement).FirstOrDefault();
            string stringValue = element != null ? element.AttributeValue("value") : string.Empty;
            return int.TryParse(stringValue, out value);
        }

        /// <summary>
        /// Determines whether [is same as attribute value] [the specified element].
        /// </summary>
        /// <param name="element">
        /// The element.
        /// </param>
        /// <param name="sourceAttribute">
        /// The source attribute.
        /// </param>
        /// <param name="attributeValue">
        /// The attribute value.
        /// </param>
        /// <returns>
        /// <c>true</c> if [is same as attribute value] [the specified element]; otherwise, <c>false</c>.
        /// </returns>
        public static bool IsSameAsAttributeValue(this XElement element, string sourceAttribute, string attributeValue)
        {
            if (element == null || sourceAttribute == null || attributeValue == null)
            {
                return false;
            }

            XAttribute thisAttributeValue = element.Attribute(sourceAttribute);
            if (thisAttributeValue == null)
            {
                return false;
            }

            return thisAttributeValue.Value == attributeValue;
        }

        #endregion
    }
}
