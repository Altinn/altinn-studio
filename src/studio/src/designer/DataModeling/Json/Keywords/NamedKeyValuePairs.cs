using System;
using System.Collections.Generic;

using Json.Schema;

namespace Altinn.Studio.DataModeling.Json.Keywords
{
    /// <summary>
    /// A set of keyvalue pairs and the name the belong to.
    /// </summary>
    public sealed class NamedKeyValuePairs : IEquatable<NamedKeyValuePairs>
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

        /// <summary>
        /// Compare this object to another object of the same type and determine if they hold the same values.
        /// </summary>
        /// <param name="obj">The object to compare with.</param>
        /// <returns>true of the objects hold the same values. false otherwise.</returns>
        public override bool Equals(object obj)
        {
            return Equals(obj as NamedKeyValuePairs);
        }

        /// <summary>
        /// Compare this object to another object of the same type and determine if they hold the same values.
        /// </summary>
        /// <param name="other">The object to compare with.</param>
        /// <returns>true of the objects hold the same values. false otherwise.</returns>
        public bool Equals(NamedKeyValuePairs other)
        {
            return other != null &&
                   Name == other.Name &&
                   Properties.ContentsEqual(other.Properties);
        }

        /// <summary>
        /// Serves as the default hash function.
        /// </summary>
        /// <returns>A hash code for the current object.</returns>
        public override int GetHashCode()
        {
            return HashCode.Combine(Name, Properties);
        }
    }
}
