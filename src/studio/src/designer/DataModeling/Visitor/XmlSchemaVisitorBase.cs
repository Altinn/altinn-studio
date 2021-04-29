using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Visitor
{
    /// <summary>
    /// Base class for XML schema visitors
    /// </summary>
    public abstract class XmlSchemaVisitorBase : IXmlSchemaVisitor
    {
        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaNode(XmlSchema item)
        {
            foreach (XmlSchemaObject child in item.Items)
            {
                child.Accept(this);
            }
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaAnnotation(XmlSchemaAnnotation item)
        {
            foreach (XmlSchemaObject child in item.Items)
            {
                child.Accept(this);
            }
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaAttribute(XmlSchemaAttribute item)
        {
            item.Annotation?.Accept(this);
            item.SchemaType?.Accept(this);
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaAttributeGroup(XmlSchemaAttributeGroup item)
        {
            item.Annotation?.Accept(this);

            foreach (XmlSchemaObject child in item.Attributes)
            {
                child.Accept(this);
            }

            item.AnyAttribute?.Accept(this);
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaAttributeGroupRef(XmlSchemaAttributeGroupRef item)
        {
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaElement(XmlSchemaElement item)
        {
            item.SchemaType?.Accept(this);
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaChoice(XmlSchemaChoice item)
        {
            foreach (XmlSchemaObject child in item.Items)
            {
                child.Accept(this);
            }
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaAll(XmlSchemaAll item)
        {
            foreach (XmlSchemaObject child in item.Items)
            {
                child.Accept(this);
            }
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaSequence(XmlSchemaSequence item)
        {
            foreach (XmlSchemaObject child in item.Items)
            {
                child.Accept(this);
            }
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaGroup(XmlSchemaGroup item)
        {
            item.Particle?.Accept(this);
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaGroupRef(XmlSchemaGroupRef item)
        {
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaSimpleType(XmlSchemaSimpleType item)
        {
            item.Content?.Accept(this);
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaSimpleTypeList(XmlSchemaSimpleTypeList item)
        {
            item.ItemType?.Accept(this);
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaSimpleTypeRestriction(XmlSchemaSimpleTypeRestriction item)
        {
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaSimpleTypeUnion(XmlSchemaSimpleTypeUnion item)
        {
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaComplexType(XmlSchemaComplexType item)
        {
            item.ContentModel?.Accept(this);
            item.Particle?.Accept(this);
            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                attribute.Accept(this);
            }

            item.AnyAttribute?.Accept(this);
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaSimpleContent(XmlSchemaSimpleContent item)
        {
            item.Content?.Accept(this);
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaComplexContent(XmlSchemaComplexContent item)
        {
            item.Content?.Accept(this);
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaSimpleContentExtension(XmlSchemaSimpleContentExtension item)
        {
            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                attribute.Accept(this);
            }

            item.AnyAttribute?.Accept(this);
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaSimpleContentRestriction(XmlSchemaSimpleContentRestriction item)
        {
            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                attribute.Accept(this);
            }

            item.AnyAttribute?.Accept(this);
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaComplexContentExtension(XmlSchemaComplexContentExtension item)
        {
            item.Particle?.Accept(this);
            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                attribute.Accept(this);
            }

            item.AnyAttribute?.Accept(this);
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaComplexContentRestriction(XmlSchemaComplexContentRestriction item)
        {
            item.Particle?.Accept(this);
            foreach (XmlSchemaObject attribute in item.Attributes)
            {
                attribute.Accept(this);
            }

            item.AnyAttribute?.Accept(this);
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaAny(XmlSchemaAny item)
        {
        }

        /// <summary>
        /// Visit the XML schema item and all of its children. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="item">The item to visit</param>
        public virtual void VisitSchemaAnyAttribute(XmlSchemaAnyAttribute item)
        {
        }
    }
}
