using System;
using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Utils
{
    /// <summary>
    /// Extension methods for working with XmlSchemaObject
    /// </summary>
    public static class XmlSchemaObjectExtensions
    {
        /// <summary>
        /// Placeholder
        /// </summary>
        public static string GetName(this XmlSchemaObject item)
        {
            switch (item)
            {
                case XmlSchemaElement x:
                    return x.Name;
                case XmlSchemaAttribute x:
                    return x.Name;
                case XmlSchemaComplexType x:
                    return x.Name;
                case XmlSchemaSimpleType x:
                    return x.Name;
                case XmlSchemaGroup x:
                    return x.Name;
                case XmlSchemaAttributeGroup x:
                    return x.Name;
                default:
                    throw new Exception($"Item of type '{item.GetType().Name}' cannot have a name");
            }
        }
    }
}
