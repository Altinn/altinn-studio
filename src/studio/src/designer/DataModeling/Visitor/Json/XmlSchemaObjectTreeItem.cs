using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Visitor.Json
{
    /// <summary>
    /// Item for the virtual xml schema tree <see cref="XmlSchemaObjectTree"/>
    /// </summary>
    [DebuggerDisplay("{" + nameof(Item) + ",nq}")]
    public class XmlSchemaObjectTreeItem
    {
        /// <summary>
        /// The actual <see cref="XmlSchemaObject"/>
        /// </summary>
        public XmlSchemaObject Item { get; set; }

        /// <summary>
        /// The builder used to build this item in the xml schema tree
        /// </summary>
        public XmlSchemaObjectBuilder Builder { get; set; }

        /// <summary>
        /// The parent item for this item in the virtual xml schema tree
        /// </summary>
        public XmlSchemaObjectTreeItem Parent { get; set; }

        /// <summary>
        /// The child items for this item in the virtual xml schema tree
        /// </summary>
        public List<XmlSchemaObjectTreeItem> Children { get; set; }

        /// <summary>
        /// Build the <see cref="XmlSchemaObject"/> and all of the children
        /// </summary>
        public void Build()
        {
            Item = Builder.Build();

            if (Children.Count == 0)
            {
                return;
            }

            switch (Item)
            {
                case XmlSchema item:
                    foreach (XmlSchemaObjectTreeItem child in Children)
                    {
                        child.Build();
                        item.Items.Add(child.Item);
                    }

                    break;
                case XmlSchemaGroupBase item: // All, Choice, Sequence
                    foreach (XmlSchemaObjectTreeItem child in Children)
                    {
                        child.Build();
                        item.Items.Add(child.Item);
                    }

                    break;
                case XmlSchemaGroup item:
                    if (Children.Count > 1)
                    {
                        throw new InvalidOperationException("A Group can only have one particle: Choice, All or Sequence");
                    }

                    Children[0].Build();
                    item.Particle = (XmlSchemaGroupBase)Children[0].Item;
                    break;
                case XmlSchemaAttribute item:
                    if (Children.Count > 1)
                    {
                        throw new InvalidOperationException("Attribute can only have one child: SimpleType");
                    }

                    Children[0].Build();
                    item.SchemaType = (XmlSchemaSimpleType)Children[0].Item;
                    break;
                case XmlSchemaAttributeGroup item:
                    foreach (XmlSchemaObjectTreeItem child in Children)
                    {
                        child.Build();
                        item.Attributes.Add(child.Item);
                    }

                    break;

                case XmlSchemaComplexContent item:
                    if (Children.Count > 1)
                    {
                        throw new InvalidOperationException("ComplexContent can only have one child: Extension or Restriction");
                    }

                    Children[0].Build();
                    item.Content = (XmlSchemaContent)Children[0].Item;
                    break;
                case XmlSchemaComplexContentExtension item:
                    foreach (XmlSchemaObjectTreeItem child in Children)
                    {
                        child.Build();
                        switch (child.Item)
                        {
                            case XmlSchemaParticle particle:
                                item.Particle = particle;
                                break;
                            case XmlSchemaAttribute:
                            case XmlSchemaAttributeGroupRef:
                                item.Attributes.Add(child.Item);
                                break;
                            default:
                                throw new InvalidOperationException($"{child.Item.GetType().Name} is invalid child of ComplexContentExtension");
                        }
                    }

                    break;
                case XmlSchemaComplexContentRestriction item:
                    foreach (XmlSchemaObjectTreeItem child in Children)
                    {
                        child.Build();
                        switch (child.Item)
                        {
                            case XmlSchemaParticle particle:
                                item.Particle = particle;
                                break;
                            case XmlSchemaAttribute:
                            case XmlSchemaAttributeGroupRef:
                                item.Attributes.Add(child.Item);
                                break;
                            default:
                                throw new InvalidOperationException($"{child.Item.GetType().Name} is invalid child of ComplexContentRestriction");
                        }
                    }

                    break;
                case XmlSchemaComplexType item:
                    foreach (XmlSchemaObjectTreeItem child in Children)
                    {
                        child.Build();
                        switch (child.Item)
                        {
                            case XmlSchemaContentModel content:
                                item.ContentModel = content;
                                break;
                            case XmlSchemaParticle particle:
                                item.Particle = particle;
                                break;
                            case XmlSchemaAttribute:
                            case XmlSchemaAttributeGroupRef:
                                item.Attributes.Add(child.Item);
                                break;
                            default:
                                throw new InvalidOperationException($"{child.Item.GetType().Name} is invalid child of ComplexContentRestriction");
                        }
                    }

                    break;
                case XmlSchemaElement item:
                    if (Children.Count > 1)
                    {
                        throw new InvalidOperationException("Element can only have one child: SimpleType or ComplexType");
                    }

                    Children[0].Build();
                    item.SchemaType = (XmlSchemaType)Children[0].Item;
                    break;
                case XmlSchemaSimpleContent item:
                    if (Children.Count > 1)
                    {
                        throw new InvalidOperationException("SimpleContent can only have one child: Extension or Restriction");
                    }

                    Children[0].Build();
                    item.Content = (XmlSchemaContent)Children[0].Item;
                    break;
                case XmlSchemaSimpleContentExtension item:
                    foreach (XmlSchemaObjectTreeItem child in Children)
                    {
                        child.Build();
                        item.Attributes.Add(child.Item);
                    }

                    break;
                case XmlSchemaSimpleContentRestriction item:
                    foreach (XmlSchemaObjectTreeItem child in Children)
                    {
                        child.Build();
                        item.Attributes.Add(child.Item);
                    }

                    break;
                case XmlSchemaSimpleType item:
                    if (Children.Count > 1)
                    {
                        throw new InvalidOperationException("SimpleContent can only have one child: Restriction, List or Union");
                    }

                    Children[0].Build();
                    item.Content = (XmlSchemaSimpleTypeContent)Children[0].Item;
                    break;
                case XmlSchemaSimpleTypeUnion item:
                    foreach (XmlSchemaObjectTreeItem child in Children)
                    {
                        child.Build();
                        item.BaseTypes.Add(child.Item);
                    }

                    break;
                default:
                    if (Children.Count > 0)
                    {
                        throw new InvalidOperationException($"{Item.GetType().Name} cannot have any children");
                    }

                    break;
            }

            foreach (XmlSchemaObjectTreeItem child in Children)
            {
                child.Item.Parent = Item;
            }
        }

        /// <summary>
        /// Run all post processing filters on this item and all its children
        /// </summary>
        public void PostProcess()
        {
            Builder.PostProcess();
            foreach (XmlSchemaObjectTreeItem child in Children)
            {
                child.PostProcess();
            }
        }
    }
}
