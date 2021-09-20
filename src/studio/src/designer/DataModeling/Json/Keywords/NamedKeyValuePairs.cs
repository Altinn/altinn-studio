using System.Collections.Generic;

namespace Altinn.Studio.DataModeling.Json.Keywords
{
    /// <summary>
    /// A set of keyvalue pairs and the name the belong to.
    /// </summary>
    public class NamedKeyValuePairs
    {
        private readonly List<(string key, string value)> _properties;

        /// <summary>
        /// Initializes a new instance of the <see cref="NamedKeyValuePairs"/> class.
        /// </summary>
        public NamedKeyValuePairs(string name)
        {
            Name = name;
            _properties = new List<(string, string)>();
        }

        /// <summary>
        /// The name, or identifier, for this set of name value pairs.
        /// </summary>
        public string Name { get; }

        /// <summary>
        /// A list of key/value pairs belonging to this name/identifier.
        /// </summary>
        public IReadOnlyList<(string key, string value)> Properties
        {
            get { return _properties; }
        }

        /// <summary>
        /// Adds a new key/value pair entry to the named list.
        /// </summary>
        /// <param name="key">Key</param>
        /// <param name="value">Value</param>
        public void Add(string key, string value)
        {
            _properties.Add((key, value));
        }
    }
}
