using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Xml;
using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Visitor.Json
{
    /// <summary>
    /// Builder for Xml schema elements
    /// </summary>
    public class XmlSchemaObjectBuilder
    {
        /// <summary>
        /// The decided type of the current Xml schema element
        /// </summary>
        public Type SchemaObjectType { get; private set; }

        private readonly XmlSchemaObjectBuilderContext _context = new XmlSchemaObjectBuilderContext();

        private readonly List<Action<XmlSchemaObjectBuilderContext>> _steps = new List<Action<XmlSchemaObjectBuilderContext>>();
        
        private readonly List<Action<XmlSchemaObjectBuilderContext>> _postFilters = new List<Action<XmlSchemaObjectBuilderContext>>();

        /// <summary>
        /// Add a post filter to the builder. This step will be executed after the full schema is built and connected together
        /// </summary>
        /// <param name="filter">An action to execute</param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder PostFilter(Action<XmlSchemaObjectBuilderContext> filter)
        {
            _postFilters.Add(filter);
            return this;
        }

        /// <summary>
        /// Add a step to the builder
        /// </summary>
        /// <param name="step">An action to execute as a step for the builder</param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder Add(Action<XmlSchemaObjectBuilderContext> step)
        {
            _steps.Add(step);
            return this;
        }

        /// <summary>
        /// Set the name of the element
        /// </summary>
        /// <param name="name">The name</param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder Name(string name)
        {
            return Add(context =>
            {
                switch (context.Item)
                {
                    case XmlSchemaAttribute x:
                        x.Name = name;
                        break;
                    case XmlSchemaAttributeGroup x:
                        x.Name = name;
                        break;
                    case XmlSchemaComplexType x:
                        x.Name = name;
                        break;
                    case XmlSchemaElement x:
                        x.Name = name;
                        break;
                    case XmlSchemaGroup x:
                        x.Name = name;
                        break;
                    case XmlSchemaKey x:
                        x.Name = name;
                        break;
                    case XmlSchemaKeyref x:
                        x.Name = name;
                        break;
                    case XmlSchemaNotation x:
                        x.Name = name;
                        break;
                    case XmlSchemaSimpleType x:
                        x.Name = name;
                        break;
                    case XmlSchemaUnique x:
                        x.Name = name;
                        break;
                    case XmlSchemaIdentityConstraint x:
                        x.Name = name;
                        break;
                    case XmlSchemaType x:
                        x.Name = name;
                        break;
                    default:
                        throw new ArgumentOutOfRangeException($"XML Schema object '{context.Item.GetType().Name}' does not have a name property");
                }
            });
        }

        /// <summary>
        /// Set the element type
        /// </summary>
        /// <typeparam name="T">The type to set, must inherit <see cref="XmlSchemaObject"/></typeparam>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder Object<T>()
            where T : XmlSchemaObject
        {
            return Object(typeof(T));
        }

        /// <summary>
        /// Set the element type
        /// </summary>
        /// <param name="type">The type of the item, must inherit <see cref="XmlSchemaObject"/></param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder Object(Type type)
        {
            if (!type.IsAssignableTo(typeof(XmlSchemaObject)))
            {
                throw new ArgumentException("Type must be a subclass of XmlSchemaObject");
            }

            if (!type.GetConstructors().Any(ci => ci.IsPublic && ci.GetParameters().Length == 0))
            {
                throw new ArgumentException("Type must have a public parameterless constructor");
            }

            SchemaObjectType = type;
            _steps.Insert(0, context =>
            {
                context.Item = (XmlSchemaObject)Activator.CreateInstance(type);
            });
            return this;
        }

        /// <summary>
        /// Set the annotations for the element
        /// </summary>
        /// <param name="annotation">The annotations</param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder Annotation(XmlSchemaAnnotation annotation)
        {
            return Add(context =>
            {
                switch (context.Item)
                {
                    case XmlSchema x:
                        x.Items.Add(annotation);
                        break;
                    case XmlSchemaAnnotated x:
                        x.Annotation = annotation;
                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} does not support annotations");
                }
            });
        }

        /// <summary>
        /// Add items to this object
        /// </summary>
        /// <param name="item">The object to add</param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder AddItem(XmlSchemaObject item)
        {
            return Add(context =>
            {
                switch (context.Item)
                {
                    case XmlSchema x:
                        x.Items.Add(item);
                        break;
                    case XmlSchemaAnnotation x:
                        x.Items.Add(item);
                        break;
                    case XmlSchemaRedefine x:
                        x.Items.Add(item);
                        break;
                    case XmlSchemaGroupBase x: // All | Choice | Sequence
                        x.Items.Add(item);
                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} does not have items");
                }
            });
        }

        /// <summary>
        /// Set the namespaces for this object
        /// </summary>
        /// <param name="prefix">The namespace prefix</param>
        /// <param name="ns">The namespace name</param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder Namespace(string prefix, string ns)
        {
            return Add(context =>
            {
                context.Item.Namespaces.Add(prefix, ns);
            });
        }

        /// <summary>
        /// Set the reference name for the element
        /// </summary>
        /// <param name="type">The type name of the reference</param>
        /// <param name="ns">The namespace of the type name (can be null)</param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder Ref(string type, string ns = null)
        {
            return Add(context =>
            {
                switch (context.Item)
                {
                    case XmlSchemaAttribute x:
                        x.RefName = new XmlQualifiedName(type, ns);
                        break;
                    case XmlSchemaElement x:
                        x.RefName = new XmlQualifiedName(type, ns);
                        break;
                    case XmlSchemaGroupRef x:
                        x.RefName = new XmlQualifiedName(type, ns);
                        break;
                    case XmlSchemaAttributeGroupRef x:
                        x.RefName = new XmlQualifiedName(type, ns);
                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} does not have ref");
                }
            });
        }

        /// <summary>
        /// Set the type of the element
        /// </summary>
        /// <param name="type">The type name to set</param>
        /// <param name="ns">Namespace of the type name, can be null</param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder Type(string type, string ns = null)
        {
            return Add(context =>
            {
                switch (context.Item)
                {
                    case XmlSchemaAttribute x:
                        x.SchemaTypeName = new XmlQualifiedName(type, ns);
                        break;
                    case XmlSchemaElement x:
                        x.SchemaTypeName = new XmlQualifiedName(type, ns);
                        break;
                    case XmlSchemaComplexContentExtension x:
                        x.BaseTypeName = new XmlQualifiedName(type, ns);
                        break;
                    case XmlSchemaComplexContentRestriction x:
                        x.BaseTypeName = new XmlQualifiedName(type, ns);
                        break;
                    case XmlSchemaSimpleContentExtension x:
                        x.BaseTypeName = new XmlQualifiedName(type, ns);
                        break;
                    case XmlSchemaSimpleContentRestriction x:
                        x.BaseTypeName = new XmlQualifiedName(type, ns);
                        break;
                    case XmlSchemaSimpleTypeRestriction x:
                        x.BaseTypeName = new XmlQualifiedName(type, ns);
                        break;
                    case XmlSchemaGroupRef x:
                        x.RefName = new XmlQualifiedName(type, ns);
                        break;
                    case XmlSchemaAttributeGroupRef x:
                        x.RefName = new XmlQualifiedName(type, ns);
                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} does not have type, baseType or ref");
                }
            });
        }

        /// <summary>
        /// Set the item type, only for <see cref="XmlSchemaSimpleTypeList"/>
        /// </summary>
        /// <param name="type">The type name</param>
        /// <param name="ns">Namespace of the type name, can be null</param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder ItemType(string type, string ns = null)
        {
            return Add(context =>
            {
                switch (context.Item)
                {
                    case XmlSchemaSimpleTypeList x:
                        x.ItemTypeName = new XmlQualifiedName(type, ns);
                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} does not have itemType");
                }
            });
        }

        /// <summary>
        /// Add enumeration restriction facet
        /// </summary>
        /// <param name="values">A list of enumeration values to add</param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder Enumeration(IEnumerable<string> values)
        {
            return Add(context =>
            {
                IEnumerable<XmlSchemaEnumerationFacet> facets = values.Select(value => new XmlSchemaEnumerationFacet { Value = value });

                switch (context.Item)
                {
                    case XmlSchemaSimpleContentRestriction x:
                        foreach (XmlSchemaEnumerationFacet facet in facets)
                        {
                            x.Facets.Add(facet);
                        }

                        break;
                    case XmlSchemaSimpleTypeRestriction x:
                        foreach (XmlSchemaEnumerationFacet facet in facets)
                        {
                            x.Facets.Add(facet);
                        }

                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} does not have restriction facets");
                }
            });
        }

        /// <summary>
        /// Add a restriction facet to the restriction element
        /// </summary>
        /// <param name="type">The restriction type</param>
        /// <param name="value">The restriction value</param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder Restriction(string type, string value)
        {
            return Add(context =>
            {
                XmlSchemaObject facet = RestrictionFacet(type, value);

                switch (context.Item)
                {
                    case XmlSchemaSimpleContentRestriction x:
                        x.Facets.Add(facet);
                        break;
                    case XmlSchemaSimpleTypeRestriction x:
                        x.Facets.Add(facet);
                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} does not have restriction facets");
                }
            });
        }

        /// <summary>
        /// Set the default attributeForm for the schema
        /// </summary>
        /// <param name="value">The attribute form value, string value from <see cref="XmlSchemaForm"/></param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder AttributeFormDefault(string value)
        {
            if (!Enum.TryParse(value, true, out XmlSchemaForm enumValue))
            {
                throw new ArgumentException($"{value} is not a valid value for {nameof(XmlSchemaForm)}");
            }

            return Add(context =>
            {
                if (context.Item is XmlSchema schema)
                {
                    schema.AttributeFormDefault = enumValue;
                }
                else
                {
                    throw new InvalidOperationException($"{nameof(AttributeFormDefault)} can only be applied to XmlSchema object");
                }
            });
        }

        /// <summary>
        /// Set the default elementForm for the schema
        /// </summary>
        /// <param name="value">The element form value, string value from <see cref="XmlSchemaForm"/></param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder ElementFormDefault(string value)
        {
            if (!Enum.TryParse(value, true, out XmlSchemaForm enumValue))
            {
                throw new ArgumentException($"{value} is not a valid value for {nameof(XmlSchemaForm)}");
            }

            return Add(context =>
            {
                if (context.Item is XmlSchema schema)
                {
                    schema.ElementFormDefault = enumValue;
                }
                else
                {
                    throw new InvalidOperationException($"{nameof(ElementFormDefault)} can only be applied to XmlSchema object");
                }
            });
        }

        /// <summary>
        /// Set the block value for the schema
        /// </summary>
        /// <param name="value">The block value, string value from <see cref="XmlSchemaDerivationMethod"/></param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder BlockDefault(string value)
        {
            if (!Enum.TryParse(value, true, out XmlSchemaDerivationMethod enumValue))
            {
                throw new ArgumentException($"{value} is not a valid value for {nameof(XmlSchemaDerivationMethod)}");
            }

            return Add(context =>
            {
                if (context.Item is XmlSchema schema)
                {
                    schema.BlockDefault = enumValue;
                }
                else
                {
                    throw new InvalidOperationException($"{nameof(BlockDefault)} can only be applied to XmlSchema object");
                }
            });
        }

        /// <summary>
        /// Set the final value for the schema
        /// </summary>
        /// <param name="value">The final value, string value from <see cref="XmlSchemaDerivationMethod"/></param>
        /// <returns></returns>
        public XmlSchemaObjectBuilder FinalDefault(string value)
        {
            if (!Enum.TryParse(value, true, out XmlSchemaDerivationMethod enumValue))
            {
                throw new ArgumentException($"{value} is not a valid value for {nameof(XmlSchemaDerivationMethod)}");
            }

            return Add(context =>
            {
                if (context.Item is XmlSchema schema)
                {
                    schema.FinalDefault = enumValue;
                }
                else
                {
                    throw new InvalidOperationException($"{nameof(FinalDefault)} can only be applied to XmlSchema object");
                }
            });
        }

        /// <summary>
        /// Add AnyAttribute element to this element
        /// </summary>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder AnyAttribute()
        {
            return Add(context =>
            {
                switch (context.Item)
                {
                    case XmlSchemaAttributeGroup x:
                        x.AnyAttribute = new XmlSchemaAnyAttribute();
                        break;
                    case XmlSchemaComplexContentExtension x:
                        x.AnyAttribute = new XmlSchemaAnyAttribute();
                        break;
                    case XmlSchemaComplexContentRestriction x:
                        x.AnyAttribute = new XmlSchemaAnyAttribute();
                        break;
                    case XmlSchemaComplexType x:
                        x.AnyAttribute = new XmlSchemaAnyAttribute();
                        break;
                    case XmlSchemaSimpleContentExtension x:
                        x.AnyAttribute = new XmlSchemaAnyAttribute();
                        break;
                    case XmlSchemaSimpleContentRestriction x:
                        x.AnyAttribute = new XmlSchemaAnyAttribute();
                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} cannot have AnyAttribute");
                }
            });
        }

        /// <summary>
        /// Add the Any element to this element
        /// </summary>
        /// <returns></returns>
        public XmlSchemaObjectBuilder Any()
        {
            return Add(context =>
            {
                switch (context.Item)
                {
                    case XmlSchema x:
                        x.Items.Add(new XmlSchemaAny());
                        break;
                    case XmlSchemaAll x:
                        x.Items.Add(new XmlSchemaAny());
                        break;
                    case XmlSchemaAnnotation x:
                        x.Items.Add(new XmlSchemaAny());
                        break;
                    case XmlSchemaChoice x:
                        x.Items.Add(new XmlSchemaAny());
                        break;
                    case XmlSchemaRedefine x:
                        x.Items.Add(new XmlSchemaAny());
                        break;
                    case XmlSchemaSequence x:
                        x.Items.Add(new XmlSchemaAny());
                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} cannot have children");
                }
            });
        }

        /// <summary>
        /// Set default value for an attribute or element
        /// </summary>
        /// <param name="defaultValue">The default value</param>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder Default(string defaultValue)
        {
            return Add(context =>
            {
                switch (context.Item)
                {
                    case XmlSchemaAttribute x:
                        x.DefaultValue = defaultValue;
                        break;
                    case XmlSchemaElement x:
                        x.DefaultValue = defaultValue;
                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} cannot have a default value");
                }
            });
        }

        /// <summary>
        /// Set a fixed value for an attribute or element
        /// </summary>
        /// <param name="fixedValue">The fixed value</param>
        /// <returns></returns>
        public XmlSchemaObjectBuilder Fixed(string fixedValue)
        {
            return Add(context =>
            {
                switch (context.Item)
                {
                    case XmlSchemaAttribute x:
                        x.FixedValue = fixedValue;
                        break;
                    case XmlSchemaElement x:
                        x.FixedValue = fixedValue;
                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} cannot have a fixed value");
                }
            });
        }

        /// <summary>
        /// Mark an attribute or element as required
        /// </summary>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder Required()
        {
            return Add(context =>
            {
                switch (context.Item)
                {
                    case XmlSchemaAttribute x:
                        x.Use = XmlSchemaUse.Required;
                        break;
                    case XmlSchemaElement x:
                        x.MinOccursString = null;
                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} cannot be required");
                }
            });
        }

        /// <summary>
        /// Mark an attribute or element as optional
        /// </summary>
        /// <returns>The same instance of the builder for chaining</returns>
        public XmlSchemaObjectBuilder Optional()
        {
            return Add(context =>
            {
                switch (context.Item)
                {
                    case XmlSchemaAttribute x:
                        x.Use = XmlSchemaUse.None;
                        break;
                    case XmlSchemaElement x:
                        x.MinOccursString = "0";
                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} cannot be optional");
                }
            });
        }

        /// <summary>
        /// Template method, copy this when creating a new builder method
        /// </summary>
        /// <returns>The <see cref="XmlSchemaObjectBuilder"/> used for chaining</returns>
        [SuppressMessage("ReSharper", "UnusedVariable", Justification = "This is a template for builder methods and are not in use")]
        public XmlSchemaObjectBuilder Template()
        {
            return Add(context =>
            {
                switch (context.Item)
                {
                    case XmlSchema x:
                        break;
                    case XmlSchemaAll x:
                        break;
                    case XmlSchemaAnnotation x:
                        break;
                    case XmlSchemaAny x:
                        break;
                    case XmlSchemaAnyAttribute x:
                        break;
                    case XmlSchemaAppInfo x:
                        break;
                    case XmlSchemaAttribute x:
                        break;
                    case XmlSchemaAttributeGroup x:
                        break;
                    case XmlSchemaAttributeGroupRef x:
                        break;
                    case XmlSchemaChoice x:
                        break;
                    case XmlSchemaComplexContent x:
                        break;
                    case XmlSchemaComplexContentExtension x:
                        break;
                    case XmlSchemaComplexContentRestriction x:
                        break;
                    case XmlSchemaComplexType x:
                        break;
                    case XmlSchemaDocumentation x:
                        break;
                    case XmlSchemaElement x:
                        break;
                    case XmlSchemaEnumerationFacet x:
                        break;
                    case XmlSchemaFractionDigitsFacet x:
                        break;
                    case XmlSchemaGroup x:
                        break;
                    case XmlSchemaGroupRef x:
                        break;
                    case XmlSchemaImport x:
                        break;
                    case XmlSchemaInclude x:
                        break;
                    case XmlSchemaKey x:
                        break;
                    case XmlSchemaKeyref x:
                        break;
                    case XmlSchemaLengthFacet x:
                        break;
                    case XmlSchemaMaxExclusiveFacet x:
                        break;
                    case XmlSchemaMaxInclusiveFacet x:
                        break;
                    case XmlSchemaMaxLengthFacet x:
                        break;
                    case XmlSchemaMinExclusiveFacet x:
                        break;
                    case XmlSchemaMinInclusiveFacet x:
                        break;
                    case XmlSchemaMinLengthFacet x:
                        break;
                    case XmlSchemaNotation x:
                        break;
                    case XmlSchemaPatternFacet x:
                        break;
                    case XmlSchemaRedefine x:
                        break;
                    case XmlSchemaSequence x:
                        break;
                    case XmlSchemaSimpleContent x:
                        break;
                    case XmlSchemaSimpleContentExtension x:
                        break;
                    case XmlSchemaSimpleContentRestriction x:
                        break;
                    case XmlSchemaSimpleType x:
                        break;
                    case XmlSchemaSimpleTypeList x:
                        break;
                    case XmlSchemaSimpleTypeRestriction x:
                        break;
                    case XmlSchemaSimpleTypeUnion x:
                        break;
                    case XmlSchemaTotalDigitsFacet x:
                        break;
                    case XmlSchemaUnique x:
                        break;
                    case XmlSchemaWhiteSpaceFacet x:
                        break;
                    case XmlSchemaXPath x:
                        break;
                    case XmlSchemaContent x:
                        break;
                    case XmlSchemaContentModel x:
                        break;
                    case XmlSchemaExternal x:
                        break;
                    case XmlSchemaGroupBase x:
                        break;
                    case XmlSchemaIdentityConstraint x:
                        break;
                    case XmlSchemaNumericFacet x:
                        break;
                    case XmlSchemaSimpleTypeContent x:
                        break;
                    case XmlSchemaType x:
                        break;
                    case XmlSchemaFacet x:
                        break;
                    case XmlSchemaParticle x:
                        break;
                    case XmlSchemaAnnotated x:
                        break;
                    default:
                        throw new InvalidOperationException($"{context.Item.GetType().Name} does not ...");
                }
            });
        }

        /// <summary>
        /// Build the schema element
        /// </summary>
        /// <returns>The built element</returns>
        public XmlSchemaObject Build()
        {
            foreach (Action<XmlSchemaObjectBuilderContext> step in _steps)
            {
                step(_context);
            }

            return _context.Item;
        }

        /// <summary>
        /// Run any post filters on the element, called after <see cref="Build"/>
        /// </summary>
        public void PostProcess()
        {
            foreach (Action<XmlSchemaObjectBuilderContext> filter in _postFilters)
            {
                filter(_context);
            }
        }

        private static XmlSchemaObject RestrictionFacet(string type, string value)
        {
            return type switch
            {
                "length" => new XmlSchemaLengthFacet { Value = value },
                "maxLength" => new XmlSchemaMaxLengthFacet { Value = value },
                "minLength" => new XmlSchemaMinLengthFacet { Value = value },
                "pattern" => new XmlSchemaPatternFacet { Value = value },
                "whitespace" => new XmlSchemaWhiteSpaceFacet { Value = value },
                "enumeration" => new XmlSchemaEnumerationFacet { Value = value },
                "minExclusive" => new XmlSchemaMinExclusiveFacet { Value = value },
                "minInclusive" => new XmlSchemaMinExclusiveFacet { Value = value },
                "maxExclusive" => new XmlSchemaMaxExclusiveFacet { Value = value },
                "maxInclusive" => new XmlSchemaMaxInclusiveFacet { Value = value },
                "totalDigits" => new XmlSchemaTotalDigitsFacet { Value = value },
                "fractionDigits" => new XmlSchemaFractionDigitsFacet { Value = value },
                _ => throw new ArgumentOutOfRangeException(nameof(type), "Unknown restriction facet")
            };
        }
    }
}
