using System.Linq;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Visitor
{
    /// <summary>
    /// Base class for Json schema visitors
    /// </summary>
    public abstract class JsonSchemaVisitorBase : IJsonSchemaVisitor
    {
        /// <summary>
        /// Visit the Json Schema and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema to visit</param>
        /// <param name="parent">The parent schema</param>
        public virtual void VisitSchema(JsonSchema schema, JsonSchema parent)
        {
            foreach (IJsonSchemaKeyword keyword in schema.Keywords ?? Enumerable.Empty<IJsonSchemaKeyword>())
            {
                keyword.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitAdditionalItemsKeyword(JsonSchema schema, AdditionalItemsKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitAdditionalPropertiesKeyword(JsonSchema schema, AdditionalPropertiesKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitAllOfKeyword(JsonSchema schema, AllOfKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitAnchorKeyword(JsonSchema schema, AnchorKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitAnyOfKeyword(JsonSchema schema, AnyOfKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitCommentKeyword(JsonSchema schema, CommentKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitConstKeyword(JsonSchema schema, ConstKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitContainsKeyword(JsonSchema schema, ContainsKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitContentMediaEncodingKeyword(JsonSchema schema, ContentMediaEncodingKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitContentMediaTypeKeyword(JsonSchema schema, ContentMediaTypeKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitContentSchemaKeyword(JsonSchema schema, ContentSchemaKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitDefaultKeyword(JsonSchema schema, DefaultKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitDefinitionsKeyword(JsonSchema schema, DefinitionsKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitDefsKeyword(JsonSchema schema, DefsKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitDependenciesKeyword(JsonSchema schema, DependenciesKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitDependentRequiredKeyword(JsonSchema schema, DependentRequiredKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitDependentSchemasKeyword(JsonSchema schema, DependentSchemasKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitDeprecatedKeyword(JsonSchema schema, DeprecatedKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitDescriptionKeyword(JsonSchema schema, DescriptionKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitDynamicAnchorKeyword(JsonSchema schema, DynamicAnchorKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitDynamicRefKeyword(JsonSchema schema, DynamicRefKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitEnumKeyword(JsonSchema schema, EnumKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitExamplesKeyword(JsonSchema schema, ExamplesKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitExclusiveMaximumKeyword(JsonSchema schema, ExclusiveMaximumKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitExclusiveMinimumKeyword(JsonSchema schema, ExclusiveMinimumKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitFormatKeyword(JsonSchema schema, FormatKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitIdKeyword(JsonSchema schema, IdKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitIfKeyword(JsonSchema schema, IfKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitElseKeyword(JsonSchema schema, ElseKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitThenKeyword(JsonSchema schema, ThenKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitItemsKeyword(JsonSchema schema, ItemsKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitMaxContainsKeyword(JsonSchema schema, MaxContainsKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitMaximumKeyword(JsonSchema schema, MaximumKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitMaxItemsKeyword(JsonSchema schema, MaxItemsKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitMaxLengthKeyword(JsonSchema schema, MaxLengthKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitMaxPropertiesKeyword(JsonSchema schema, MaxPropertiesKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitMinContainsKeyword(JsonSchema schema, MinContainsKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitMinimumKeyword(JsonSchema schema, MinimumKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitMinItemsKeyword(JsonSchema schema, MinItemsKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitMinLengthKeyword(JsonSchema schema, MinLengthKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitMinPropertiesKeyword(JsonSchema schema, MinPropertiesKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitMultipleOfKeyword(JsonSchema schema, MultipleOfKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitNotKeyword(JsonSchema schema, NotKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitOneOfKeyword(JsonSchema schema, OneOfKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitPatternKeyword(JsonSchema schema, PatternKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitPatternPropertiesKeyword(JsonSchema schema, PatternPropertiesKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitPrefixItemsKeyword(JsonSchema schema, PrefixItemsKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitPropertiesKeyword(JsonSchema schema, PropertiesKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitPropertyNamesKeyword(JsonSchema schema, PropertyNamesKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitReadOnlyKeyword(JsonSchema schema, ReadOnlyKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitRecursiveAnchorKeyword(JsonSchema schema, RecursiveAnchorKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitRecursiveRefKeyword(JsonSchema schema, RecursiveRefKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitRefKeyword(JsonSchema schema, RefKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitRequiredKeyword(JsonSchema schema, RequiredKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitSchemaKeyword(JsonSchema schema, SchemaKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitTitleKeyword(JsonSchema schema, TitleKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitTypeKeyword(JsonSchema schema, TypeKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitUnevaluatedItemsKeyword(JsonSchema schema, UnevaluatedItemsKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitUnevaluatedPropertiesKeyword(JsonSchema schema, UnevaluatedPropertiesKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitUniqueItemsKeyword(JsonSchema schema, UniqueItemsKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitVocabularyKeyword(JsonSchema schema, VocabularyKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitWriteOnlyKeyword(JsonSchema schema, WriteOnlyKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitInfoKeyword(JsonSchema schema, InfoKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitXsdAnyAttributeKeyword(JsonSchema schema, XsdAnyAttributeKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitXsdAnyKeyword(JsonSchema schema, XsdAnyKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitXsdAttributeKeyword(JsonSchema schema, XsdAttributeKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitXsdRestrictionsKeyword(JsonSchema schema, XsdRestrictionsKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitXsdStructureKeyword(JsonSchema schema, XsdStructureKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitXsdTypeKeyword(JsonSchema schema, XsdTypeKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitXsdSchemaAttributesKeyword(JsonSchema schema, XsdSchemaAttributesKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitXsdUnhandledAttributesKeyword(JsonSchema schema, XsdUnhandledAttributesKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }

        /// <summary>
        /// Visit the Json Schema keyword and all sub schemas. In an implementation call this base method to process children in the schema tree.
        /// </summary>
        /// <param name="schema">The schema that has the keyword</param>
        /// <param name="item">The keyword to visit</param>
        public virtual void VisitXsdNamespacesKeyword(JsonSchema schema, XsdNamespacesKeyword item)
        {
            foreach (JsonSchema subschema in item.GetSubschemas())
            {
                subschema.Accept(schema, this);
            }
        }
    }
}
