using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Visitor.Json
{
    /// <summary>
    /// A virtual xml tree for building the xml schema
    /// </summary>
    public class XmlSchemaObjectTree
    {
        /// <summary>
        /// The root item, always <see cref="XmlSchema"/>
        /// </summary>
        public XmlSchemaObjectTreeItem Root { get; set; }

        /// <summary>
        /// Create a new instance of the <see cref="XmlSchemaObjectTree"/>
        /// </summary>
        public XmlSchemaObjectTree()
        {
            Root = new XmlSchemaObjectTreeItem
            {
                Builder = new XmlSchemaObjectBuilder(),
                Children = new List<XmlSchemaObjectTreeItem>()
            };
            Root.Builder.Object<XmlSchema>();
        }

        /// <summary>
        /// Get the builder from the item at the given path, the path is from the Json Schema custom keyword <see cref="DataModeling.Json.Keywords.XsdStructureKeyword"/>
        /// </summary>
        /// <param name="path">The path to element</param>
        /// <returns>The builder for the item on the given path</returns>
        public XmlSchemaObjectBuilder GetFromPath(string path)
        {
            return GetItemFromPath(path).Builder;
        }

        /// <summary>
        /// Get the item at the given path, the path is from the Json Schema custom keyword <see cref="DataModeling.Json.Keywords.XsdStructureKeyword"/>
        /// </summary>
        /// <param name="path">The path to element</param>
        /// <returns>The item on the given path</returns>
        public XmlSchemaObjectTreeItem GetItemFromPath(string path)
        {
            var pathParts = ParsePath(path);
            XmlSchemaObjectTreeItem item = Root;

            foreach ((int index, string type) in pathParts.Skip(1))
            {
                EnsureListSize(item.Children, index + 1);

                string elementType = type;
                Action<XmlSchemaObjectBuilderContext> postFilter = null;
                if (string.Equals(type, "extension", StringComparison.InvariantCultureIgnoreCase) || string.Equals(type, "restriction", StringComparison.InvariantCultureIgnoreCase))
                {
                    if (item.Builder.SchemaObjectType == typeof(XmlSchemaComplexContent))
                    {
                        elementType = $"ComplexContent{type}";
                    }

                    if (item.Builder.SchemaObjectType == typeof(XmlSchemaSimpleContent))
                    {
                        elementType = $"SimpleContent{type}";
                    }
                }

                switch (elementType)
                {
                    case "SimpleTypeRestriction":
                    case "SimpleContentRestriction":
                    case "ComplexContentRestriction":
                    case "SimpleContentExtension":
                    case "ComplexContentExtension":
                        postFilter = XmlSchemaObjectBuilderHelpers.SetExtensionOrRestrictionBaseTypeFromParentElementType;
                        break;
                }

                XmlSchemaObjectTreeItem next = item.Children[index];
                if (next == null)
                {
                    next = CreateItem(item, elementType);
                    if (postFilter != null)
                    {
                        next.Builder.PostFilter(postFilter);
                    }
                }
                else
                {
                    VerifyXmlSchemaObjectTypeForItem(next, elementType);
                }

                item.Children[index] = next;
                item = next;
            }

            return item;
        }

        private static void EnsureListSize(List<XmlSchemaObjectTreeItem> list, int minSize)
        {
            int diff = minSize - list.Count;
            if (diff > 0)
            {
                list.AddRange(Enumerable.Repeat<XmlSchemaObjectTreeItem>(null, diff));
            }
        }

        private static XmlSchemaObjectTreeItem CreateItem(XmlSchemaObjectTreeItem parent, string typeName)
        {
            XmlSchemaObjectTreeItem item = new XmlSchemaObjectTreeItem
            {
                Builder = new XmlSchemaObjectBuilder(),
                Parent = parent,
                Children = new List<XmlSchemaObjectTreeItem>()
            };
            item.Builder.Object(GetXmlObjectType(typeName));

            // add filter to remove name from objects when name and ref are the same
            item.Builder.PostFilter(context =>
            {
                switch (context.Item)
                {
                    case XmlSchemaElement x:
                        if (x.Name == x.RefName.Name)
                        {
                            x.Name = null;
                        }

                        break;
                    case XmlSchemaAttribute x:
                        if (x.Name == x.RefName.Name)
                        {
                            x.Name = null;
                        }

                        break;
                }
            });

            return item;
        }

        private static void VerifyXmlSchemaObjectTypeForItem(XmlSchemaObjectTreeItem item, string typeName)
        {
            Type type = GetXmlObjectType(typeName);
            if (item.Builder.SchemaObjectType != type)
            {
                throw new InvalidOperationException($"Expected item to be of type {type.Name} but found {item.Item.GetType().Name}");
            }
        }

        private static Type GetXmlObjectType(string typeName)
        {
            return typeof(XmlSchema).Assembly.GetType($"System.Xml.Schema.XmlSchema{typeName}", true);
        }

        private static IEnumerable<(int index, string type)> ParsePath(string path)
        {
            string[][] parts = path
               .Split('/')
               .Select(part => part.Split('.').ToArray())
               .ToArray();

            return (
                from part in parts
                let index = int.Parse(part[0])
                let type = part[1]
                select (index, type))
               .ToList();
        }

        /// <summary>
        /// Builds all the items in the virtual tree and connects them together properly.
        /// </summary>
        /// <returns>The newly built <see cref="XmlSchema"/></returns>
        public XmlSchema BuildSchema()
        {
            Root.Build();
            Root.PostProcess();
            return (XmlSchema)Root.Item;
        }
    }
}
