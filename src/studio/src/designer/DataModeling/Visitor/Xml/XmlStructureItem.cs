using System.Collections.Generic;

namespace Altinn.Studio.DataModeling.Visitor.Xml
{
    /// <summary>
    /// The item use in <see cref="XmlStructure"/>
    /// </summary>
    public class XmlStructureItem
    {
        /// <summary>
        /// The name of the item
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// The index of the
        /// </summary>
        public int Index { get; set; }

        /// <summary>
        /// The parent item in the structure tree
        /// </summary>
        public XmlStructureItem Parent { get; set; }

        /// <summary>
        /// A list of children of this item in the structure tree
        /// </summary>
        public List<XmlStructureItem> Children { get; } = new List<XmlStructureItem>();

        /// <summary>
        /// Get the structure path of the current item, used in the custom Json Schema keyword @xsdStructure
        /// </summary>
        /// <returns>A string representation of the path to this item in the structure tree</returns>
        public string GetPath()
        {
            if (Parent == null)
            {
                return $"{Index}.{Name}";
            }

            return $"{Parent.GetPath()}/{Index}.{Name}";
        }
    }
}
