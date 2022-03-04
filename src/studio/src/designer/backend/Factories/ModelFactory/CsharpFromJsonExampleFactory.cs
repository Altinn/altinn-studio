using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Altinn.Studio.Designer.Factories.ModelFactory
{
    /// <summary>
    /// The c# from JSON example factory.
    /// </summary>
    public class CsharpFromJsonExampleFactory : ICsharpFromJsonExampleFactory
    {
        /// <summary>
        /// The name from property.
        /// </summary>
        /// <param name="root">
        /// The root.
        /// </param>
        /// <param name="rootObjectName">
        /// The root object name.
        /// </param>
        public static void NameFromProperty(TypeDescription root, string rootObjectName)
        {
            if (!string.IsNullOrWhiteSpace(rootObjectName))
            {
                root.AssignedName = SafeIdentifier(rootObjectName);
            }

            var allTreeNodes = root.AllTypeDescriptions().ToList();

            var allChids =
                allTreeNodes.Where(p => p.Parent != null)
                    .Select(
                        p =>
                            new
                            {
                                SafeParentName = SafeIdentifier(p.ParentName, true),
                                ParentIsArray = p.Parent != null && p.Parent.IsArray,
                                Type = p,
                            })
                    .GroupBy(d => d.SafeParentName)
                    .ToList();

            foreach (var namedCollection in allChids)
            {
                var items = namedCollection.ToList();
                if (items.Count == 1)
                {
                    namedCollection.Single().Type.AssignedName = namedCollection.Key;
                }
                else
                {
                    var index = 0;
                    foreach (var item in items)
                    {
                        item.Type.AssignedName = $"{namedCollection.Key}{index++:000}";
                    }
                }
            }
        }

        /// <inheritdoc />
        public string Build(string input)
        {
            return Build(input, null);
        }

        /// <inheritdoc />
        public string Build(string input, Action<TypeDescription> navneStrategi)
        {
            var rawJson = (JObject)JsonConvert.DeserializeObject(input);
            var root = Build(rawJson);
            navneStrategi?.Invoke(root);
            var allClasses = root.AllClassDeclarations();
            var result = string.Join(Environment.NewLine + Environment.NewLine, allClasses);
            return result;
        }

        private static TypeDescription Build(JObject obj)
        {
            var index = 0;
            return Build(null, obj, () => System.Threading.Interlocked.Increment(ref index));
        }

        private static TypeDescription Build(PropertyDescription parent, JObject obj, Func<int> indexer)
        {
            var item = new TypeDescription { Nr = indexer(), Parent = parent };

            foreach (var p in obj.Properties())
            {
                var prop = new PropertyDescription { Name = p.Name, Token = p.Value };
                if (prop.Type == JTokenType.Object)
                {
                    prop.ObjectType = Build(prop, prop.Token.Value<JObject>(), indexer);
                }
                else if (prop.Type == JTokenType.Array)
                {
                    foreach (var arrayItem in p.Values())
                    {
                        if (arrayItem.Type == JTokenType.Object)
                        {
                            item.CollectionChildTypes.Add(Build(prop, arrayItem.Value<JObject>(), indexer));
                        }
                    }
                }

                item.Properties.Add(prop);
            }

            return item;
        }

        private static string GenerateProperty(PropertyDescription property)
        {
            var safeName = SafeIdentifier(property.Name);
            var sb = new StringBuilder("public ");
            if (property.Type == JTokenType.String)
            {
                sb.Append("string");
            }
            else if (property.Type == JTokenType.Object)
            {
                sb.Append(property.ObjectType?.Name ?? "object");
            }
            else if (property.Type == JTokenType.Array)
            {
                sb.Append("IList<object>");
            }
            else
            {
                throw new NotImplementedException("St�tter bare streng n�...");
            }

            sb.Append(" ").Append(safeName).Append(" { get; set; }");
            return sb.ToString();
        }

        private static string SafeIdentifier(string name, bool upperCaseFirstCharacter = false)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException("Null or whitespace", nameof(name));
            }

            return new string(SafeCsNameCharacters(name, upperCaseFirstCharacter).ToArray());
        }

        private static IEnumerable<char> SafeCsNameCharacters(string name, bool upperCaseFirstCharacter)
        {
            if (string.IsNullOrEmpty(name))
            {
                yield break;
            }

            var first = true;
            foreach (var c in name)
            {
                if (first)
                {
                    if (c == '_' || char.IsLetter(c))
                    {
                        yield return upperCaseFirstCharacter ? char.ToUpper(c) : c;
                    }
                    else
                    {
                        yield return '_';
                    }

                    first = false;
                }
                else
                {
                    yield return c == '_' || char.IsLetterOrDigit(c) ? c : '_';
                }
            }
        }

        /// <summary>
        /// type description for json object to csharp
        /// </summary>
        public class TypeDescription
        {
            /// <summary>
            /// name
            /// </summary>
            public string Name => string.IsNullOrWhiteSpace(AssignedName) ? $"Class{Nr:000}" : AssignedName;

            /// <summary>
            /// assigned na,e
            /// </summary>
            public string AssignedName { get; set; }

            /// <summary>
            /// number
            /// </summary>
            public int Nr { get; set; }

            /// <summary>
            /// parent
            /// </summary>
            public PropertyDescription Parent { get; set; }

            /// <summary>
            /// parent name
            /// </summary>
            public string ParentName => Parent?.Name ?? string.Empty;

            /// <summary>
            /// properties
            /// </summary>
            public IList<PropertyDescription> Properties { get; } = new List<PropertyDescription>();

            /// <summary>
            /// collection child types
            /// </summary>
            public IList<TypeDescription> CollectionChildTypes { get; } = new List<TypeDescription>();

            /// <summary>
            /// class declaration
            /// </summary>
            /// <returns>The string builder for the class declaration</returns>
            public string ClassDeclaration()
            {
                const string Indent = "    ";
                var sb =
                    new StringBuilder(Indent).Append("public class ").AppendLine(Name).Append(Indent).AppendLine("{");

                foreach (var propertyDeclaration in PropertyDeclarations)
                {
                    sb.Append(Indent).Append(Indent).AppendLine(propertyDeclaration);
                }

                sb.Append(Indent).AppendLine("}");

                return sb.ToString();
            }

            /// <summary>
            /// all class declaration
            /// </summary>
            /// <returns>The all the class declarations</returns>
            public IEnumerable<string> AllClassDeclarations()
            {
                return AllTypeDescriptions().Select(p => p.ClassDeclaration());
            }

            /// <summary>
            /// description of types
            /// </summary>
            /// <returns>All the type descriptions</returns>
            public IEnumerable<TypeDescription> AllTypeDescriptions()
            {
                var children = from p in Properties where p.IsClass && p.ObjectType != null select p.ObjectType;
                return ThisTypeDescriptions().Union(CollectionChildTypes).Union(children);
            }

            private IEnumerable<TypeDescription> ThisTypeDescriptions()
            {
                yield return this;
            }

            private IEnumerable<string> PropertyDeclarations
                => Properties.Select(CsharpFromJsonExampleFactory.GenerateProperty);
        }

        /// <summary>
        /// property description
        /// </summary>
        public class PropertyDescription : ItemDescription
        {
            /// <summary>
            /// Gets or sets name
            /// </summary>
            public string Name { get; set; }
        }

        /// <summary>
        /// item description
        /// </summary>
        public abstract class ItemDescription
        {
            /// <summary>
            /// tokem
            /// </summary>
            public JToken Token { get; set; }

            /// <summary>
            /// type
            /// </summary>
            public JTokenType Type => Token?.Type ?? JTokenType.None;

            /// <summary>
            /// object type
            /// </summary>
            public TypeDescription ObjectType { get; set; }

            /// <summary>
            /// is class
            /// </summary>
            public bool IsClass => Type == JTokenType.Object;

            /// <summary>
            /// is array
            /// </summary>
            public bool IsArray => Type == JTokenType.Array;
        }

        /// <summary>
        /// description for array item
        /// </summary>
        public class ArrayItemDescription : ItemDescription
        {
            /// <summary>
            /// parent array
            /// </summary>
            public JToken ParentArray { get; set; }
        }
    }
}
