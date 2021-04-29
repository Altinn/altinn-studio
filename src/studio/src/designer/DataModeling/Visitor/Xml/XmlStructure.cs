namespace Altinn.Studio.DataModeling.Visitor.Xml
{
    /// <summary>
    /// Helper class for keeping track of XML tree structure, the paths from this helper class is used in the custom Json Schema keyword @xsdStructure
    /// </summary>
    public class XmlStructure
    {
        /// <summary>
        /// The root item
        /// </summary>
        public XmlStructureItem Root { get; private set; }

        /// <summary>
        /// Current item in the xml structure, get the path of the structure item using <see cref="XmlStructureItem.GetPath()"/>
        /// </summary>
        public XmlStructureItem Current { get; private set; }

        /// <summary>
        /// Push a new element by name and set it as current
        /// </summary>
        /// <param name="name">the name of the item</param>
        public void Push(string name)
        {
            XmlStructureItem item = new XmlStructureItem
            {
                Name = name,
                Index = Current?.Children.Count ?? 0,
                Parent = Current
            };

            Current?.Children.Add(item);
            Current = item;

            Root ??= Current;
        }

        /// <summary>
        /// Set current item to the parent item
        /// </summary>
        public void Pop()
        {
            Current = Current.Parent;
        }
    }
}
