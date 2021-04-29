using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Visitor
{
    /// <summary>
    /// Visitor interface for an XmlSchema
    /// </summary>
    public interface IXmlSchemaVisitor
    {
        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaNode(XmlSchema item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaAnnotation(XmlSchemaAnnotation item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaAttribute(XmlSchemaAttribute item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaAttributeGroup(XmlSchemaAttributeGroup item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaAttributeGroupRef(XmlSchemaAttributeGroupRef item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaElement(XmlSchemaElement item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaChoice(XmlSchemaChoice item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaAll(XmlSchemaAll item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaSequence(XmlSchemaSequence item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaGroup(XmlSchemaGroup item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaGroupRef(XmlSchemaGroupRef item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaSimpleType(XmlSchemaSimpleType item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaSimpleTypeList(XmlSchemaSimpleTypeList item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaSimpleTypeRestriction(XmlSchemaSimpleTypeRestriction item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaSimpleTypeUnion(XmlSchemaSimpleTypeUnion item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaComplexType(XmlSchemaComplexType item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaSimpleContent(XmlSchemaSimpleContent item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaComplexContent(XmlSchemaComplexContent item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaSimpleContentExtension(XmlSchemaSimpleContentExtension item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaSimpleContentRestriction(XmlSchemaSimpleContentRestriction item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaComplexContentExtension(XmlSchemaComplexContentExtension item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaComplexContentRestriction(XmlSchemaComplexContentRestriction item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaAny(XmlSchemaAny item);

        /// <summary>
        /// Visit the schema object
        /// </summary>
        /// <param name="item">The object to visit</param>
        void VisitSchemaAnyAttribute(XmlSchemaAnyAttribute item);
    }
}
