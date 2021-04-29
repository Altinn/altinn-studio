using System;
using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Visitor
{
    /// <summary>
    /// Extension methods for working with <see cref="XmlSchema"/> and <see cref="IXmlSchemaVisitor"/>
    /// </summary>
    public static class XmlSchemaVisitorExtensions
    {
        /// <summary>
        /// Accept a visitor on this xml schema object, it will call the appropriate VisitXXX on the visitor for the type.
        /// </summary>
        /// <param name="o">The xml schema object</param>
        /// <param name="visitor">The visitor to accept</param>
        public static void Accept(this XmlSchemaObject o, IXmlSchemaVisitor visitor)
        {
            switch (o)
            {
                case XmlSchema item:
                    visitor.VisitSchemaNode(item);
                    break;
                case XmlSchemaAnnotation item:
                    visitor.VisitSchemaAnnotation(item);
                    break;
                case XmlSchemaAttribute item:
                    visitor.VisitSchemaAttribute(item);
                    break;
                case XmlSchemaAttributeGroup item:
                    visitor.VisitSchemaAttributeGroup(item);
                    break;
                case XmlSchemaAttributeGroupRef item:
                    visitor.VisitSchemaAttributeGroupRef(item);
                    break;
                case XmlSchemaElement item:
                    visitor.VisitSchemaElement(item);
                    break;
                case XmlSchemaChoice item:
                    visitor.VisitSchemaChoice(item);
                    break;
                case XmlSchemaAll item:
                    visitor.VisitSchemaAll(item);
                    break;
                case XmlSchemaSequence item:
                    visitor.VisitSchemaSequence(item);
                    break;
                case XmlSchemaGroup item:
                    visitor.VisitSchemaGroup(item);
                    break;
                case XmlSchemaGroupRef item:
                    visitor.VisitSchemaGroupRef(item);
                    break;
                case XmlSchemaSimpleType item:
                    visitor.VisitSchemaSimpleType(item);
                    break;
                case XmlSchemaSimpleTypeList item:
                    visitor.VisitSchemaSimpleTypeList(item);
                    break;
                case XmlSchemaComplexType item:
                    visitor.VisitSchemaComplexType(item);
                    break;
                case XmlSchemaSimpleContent item:
                    visitor.VisitSchemaSimpleContent(item);
                    break;
                case XmlSchemaComplexContent item:
                    visitor.VisitSchemaComplexContent(item);
                    break;
                case XmlSchemaSimpleContentExtension item:
                    visitor.VisitSchemaSimpleContentExtension(item);
                    break;
                case XmlSchemaSimpleContentRestriction item:
                    visitor.VisitSchemaSimpleContentRestriction(item);
                    break;
                case XmlSchemaComplexContentExtension item:
                    visitor.VisitSchemaComplexContentExtension(item);
                    break;
                case XmlSchemaComplexContentRestriction item:
                    visitor.VisitSchemaComplexContentRestriction(item);
                    break;
                case XmlSchemaAny item:
                    visitor.VisitSchemaAny(item);
                    break;
                case XmlSchemaAnyAttribute item:
                    visitor.VisitSchemaAnyAttribute(item);
                    break;
                case XmlSchemaSimpleTypeRestriction item:
                    visitor.VisitSchemaSimpleTypeRestriction(item);
                    break;
                case XmlSchemaSimpleTypeUnion item:
                    visitor.VisitSchemaSimpleTypeUnion(item);
                    break;
                default:
                    throw new IndexOutOfRangeException($"Unknown schema object type '{o.GetType().Name}'");
            }
        }
    }
}
