using System;
using System.Xml;
using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Visitor.Json
{
    /// <summary>
    /// Helper methods for working with <see cref="XmlSchemaObjectBuilder"/>
    /// </summary>
    public class XmlSchemaObjectBuilderHelpers
    {
        /// <summary>
        /// Set base type on Extension or Restriction elements from parent element "type" attribute
        /// </summary>
        /// <param name="ctx">The builder context containing the restriction or extenstion element</param>
        public static void SetExtensionOrRestrictionBaseTypeFromParentElementType(XmlSchemaObjectBuilderContext ctx)
        {
            bool hasBaseTypeName;
            switch (ctx.Item)
            {
                case XmlSchemaSimpleContentRestriction item:
                    hasBaseTypeName = !item.BaseTypeName.IsEmpty;
                    break;
                case XmlSchemaSimpleContentExtension item:
                    hasBaseTypeName = !item.BaseTypeName.IsEmpty;
                    break;
                case XmlSchemaComplexContentRestriction item:
                    hasBaseTypeName = !item.BaseTypeName.IsEmpty;
                    break;
                case XmlSchemaComplexContentExtension item:
                    hasBaseTypeName = !item.BaseTypeName.IsEmpty;
                    break;
                default:
                    throw new InvalidOperationException("This post filter is only available for [Simple|Complex]Content[Extension|Restriction]");
            }

            if (hasBaseTypeName)
            {
                return;
            }

            XmlQualifiedName typeName = GetAndRemoveParentElementType(ctx.Item);
            if (typeName == null)
            {
                throw new InvalidOperationException("Could not find parent of type Element");
            }

            if (typeName.IsEmpty)
            {
                throw new InvalidOperationException("Parent of type Element does not have a type specified");
            }

            switch (ctx.Item)
            {
                case XmlSchemaSimpleContentRestriction item:
                    item.BaseTypeName = typeName;
                    break;
                case XmlSchemaSimpleContentExtension item:
                    item.BaseTypeName = typeName;
                    break;
                case XmlSchemaComplexContentRestriction item:
                    item.BaseTypeName = typeName;
                    break;
                case XmlSchemaComplexContentExtension item:
                    item.BaseTypeName = typeName;
                    break;
            }
        }

        private static XmlQualifiedName GetAndRemoveParentElementType(XmlSchemaObject item)
        {
            do
            {
                if (item == null)
                {
                    return null;
                }

                item = item.Parent;
            }
            while (!(item is XmlSchemaElement));

            XmlSchemaElement el = (XmlSchemaElement)item;
            XmlQualifiedName typeName = el.SchemaTypeName;
            if (!typeName.IsEmpty)
            {
                el.SchemaTypeName = XmlQualifiedName.Empty;
            }

            return typeName;
        }
    }
}
