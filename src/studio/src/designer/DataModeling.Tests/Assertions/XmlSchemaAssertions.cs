using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;
using System.Xml.Serialization;
using Xunit;
using Xunit.Sdk;

namespace DataModeling.Tests.Assertions
{
    [ExcludeFromCodeCoverage]
    public static class XmlSchemaAssertions
    {
        public static void IsEquivalentTo(XmlSchema expected, XmlSchema actual)
        {
            Assert.Equal(expected.Version, actual.Version);
            Assert.Equal(expected.AttributeFormDefault, actual.AttributeFormDefault);
            Assert.Equal(expected.ElementFormDefault, actual.ElementFormDefault);
            Assert.Equal(expected.BlockDefault, actual.BlockDefault);
            Assert.Equal(expected.FinalDefault, actual.FinalDefault);
            Assert.Equal(expected.Id, actual.Id);

            IsEquivalentTo(expected.Namespaces, actual.Namespaces);
            XmlAttributesIsEquivalentTo(expected.UnhandledAttributes, actual.UnhandledAttributes);

            IsEquivalentTo(expected.Items, actual.Items);
        }

        private static void IsEquivalentTo(XmlSerializerNamespaces expected, XmlSerializerNamespaces actual)
        {
            Dictionary<string, XmlQualifiedName> actualNamespaces = actual.ToArray().ToDictionary(ns => ns.Namespace);

            foreach (XmlQualifiedName expectedNs in expected.ToArray())
            {
                if (!actualNamespaces.TryGetValue(expectedNs.Namespace, out XmlQualifiedName actualNs))
                {
                    throw new ContainsException(expectedNs.Namespace, actual);
                }

                actualNamespaces.Remove(actualNs.Namespace);
            }

            if (actualNamespaces.Count > 0 && actualNamespaces.First().Key != "http://www.w3.org/2001/XMLSchema-instance")
            {
                throw new DoesNotContainException(expected, actualNamespaces.First().Value.ToString());
            }
        }

        private static void IsEquivalentTo(XmlSchemaObjectCollection expected, XmlSchemaObjectCollection actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.Equal(expected.Count, actual.Count);

            for (int i = 0; i < expected.Count; i++)
            {
                IsEquivalentTo(expected[i], actual[i]);
            }
        }

        private static void IsEquivalentTo(XmlSchemaObject expected, XmlSchemaObject actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.NotNull(actual);

            Assert.IsType(expected.GetType(), actual);

            switch (expected)
            {
                case XmlSchemaAll x:
                    Equal(x, (XmlSchemaAll)actual);
                    break;
                case XmlSchemaAnnotation x:
                    Equal(x, (XmlSchemaAnnotation)actual);
                    break;
                case XmlSchemaAny x:
                    Equal(x, (XmlSchemaAny)actual);
                    break;
                case XmlSchemaAnyAttribute x:
                    Equal(x, (XmlSchemaAnyAttribute)actual);
                    break;
                case XmlSchemaAppInfo x:
                    Equal(x, (XmlSchemaAppInfo)actual);
                    break;
                case XmlSchemaAttribute x:
                    Equal(x, (XmlSchemaAttribute)actual);
                    break;
                case XmlSchemaAttributeGroup x:
                    Equal(x, (XmlSchemaAttributeGroup)actual);
                    break;
                case XmlSchemaAttributeGroupRef x:
                    Equal(x, (XmlSchemaAttributeGroupRef)actual);
                    break;
                case XmlSchemaChoice x:
                    Equal(x, (XmlSchemaChoice)actual);
                    break;
                case XmlSchemaComplexContent x:
                    Equal(x, (XmlSchemaComplexContent)actual);
                    break;
                case XmlSchemaComplexContentExtension x:
                    Equal(x, (XmlSchemaComplexContentExtension)actual);
                    break;
                case XmlSchemaComplexContentRestriction x:
                    Equal(x, (XmlSchemaComplexContentRestriction)actual);
                    break;
                case XmlSchemaComplexType x:
                    Equal(x, (XmlSchemaComplexType)actual);
                    break;
                case XmlSchemaDocumentation x:
                    Equal(x, (XmlSchemaDocumentation)actual);
                    break;
                case XmlSchemaElement x:
                    Equal(x, (XmlSchemaElement)actual);
                    break;
                case XmlSchemaGroup x:
                    Equal(x, (XmlSchemaGroup)actual);
                    break;
                case XmlSchemaGroupRef x:
                    Equal(x, (XmlSchemaGroupRef)actual);
                    break;
                case XmlSchemaImport x:
                    Equal(x, (XmlSchemaImport)actual);
                    break;
                case XmlSchemaInclude x:
                    Equal(x, (XmlSchemaInclude)actual);
                    break;
                case XmlSchemaKey x:
                    Equal(x, (XmlSchemaKey)actual);
                    break;
                case XmlSchemaKeyref x:
                    Equal(x, (XmlSchemaKeyref)actual);
                    break;
                case XmlSchemaNotation x:
                    Equal(x, (XmlSchemaNotation)actual);
                    break;
                case XmlSchemaRedefine x:
                    Equal(x, (XmlSchemaRedefine)actual);
                    break;
                case XmlSchemaSequence x:
                    Equal(x, (XmlSchemaSequence)actual);
                    break;
                case XmlSchemaSimpleContent x:
                    Equal(x, (XmlSchemaSimpleContent)actual);
                    break;
                case XmlSchemaSimpleContentExtension x:
                    Equal(x, (XmlSchemaSimpleContentExtension)actual);
                    break;
                case XmlSchemaSimpleContentRestriction x:
                    Equal(x, (XmlSchemaSimpleContentRestriction)actual);
                    break;
                case XmlSchemaSimpleType x:
                    Equal(x, (XmlSchemaSimpleType)actual);
                    break;
                case XmlSchemaSimpleTypeList x:
                    Equal(x, (XmlSchemaSimpleTypeList)actual);
                    break;
                case XmlSchemaSimpleTypeRestriction x:
                    Equal(x, (XmlSchemaSimpleTypeRestriction)actual);
                    break;
                case XmlSchemaSimpleTypeUnion x:
                    Equal(x, (XmlSchemaSimpleTypeUnion)actual);
                    break;
                case XmlSchemaUnique x:
                    Equal(x, (XmlSchemaUnique)actual);
                    break;
                case XmlSchemaXPath x:
                    Equal(x, (XmlSchemaXPath)actual);
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(expected));
            }
        }

        private static void XmlNodeIsEquivalentTo(XmlNode[] expected, XmlNode[] actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.NotNull(actual);

            Assert.Equal(expected.Length, actual.Length);
            for (int i = 0; i < expected.Length; i++)
            {
                XmlNodeEqual(expected[i], actual[i]);
            }
        }

        private static void XmlNodeEqual(XmlNode expected, XmlNode actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.NotNull(actual);

            Assert.IsType(expected.GetType(), actual);
            XDocument expectedXNode = XDocument.Parse(expected.OuterXml);
            XDocument actualXNode = XDocument.Parse(actual.OuterXml);

            if (!XNode.DeepEquals(expectedXNode, actualXNode))
            {
                throw new EqualException(expected.OuterXml, actual.OuterXml);
            }
        }

        private static void Equal(XmlSchemaAll expected, XmlSchemaAll actual)
        {
            ParticleEqual(expected, actual);
            IsEquivalentTo(expected.Items, actual.Items);
        }

        private static void Equal(XmlSchemaAnnotation expected, XmlSchemaAnnotation actual)
        {
            Assert.Equal(expected.Id, actual.Id);
            IsEquivalentTo(expected.Items, actual.Items);
            XmlAttributesIsEquivalentTo(expected.UnhandledAttributes, actual.UnhandledAttributes);
        }

        private static void Equal(XmlSchemaAny expected, XmlSchemaAny actual)
        {
            ParticleEqual(expected, actual);
            Assert.Equal(expected.Namespace, actual.Namespace);
            Assert.Equal(expected.ProcessContents, actual.ProcessContents);
        }

        private static void Equal(XmlSchemaAnyAttribute expected, XmlSchemaAnyAttribute actual)
        {
            AnnotatedEqual(expected, actual);
            Assert.Equal(expected.Namespace, actual.Namespace);
            Assert.Equal(expected.ProcessContents, actual.ProcessContents);
        }

        private static void Equal(XmlSchemaAppInfo expected, XmlSchemaAppInfo actual)
        {
            Assert.Equal(expected.Source, actual.Source);
            XmlNodeIsEquivalentTo(expected.Markup, actual.Markup);
        }

        private static void Equal(XmlSchemaAttribute expected, XmlSchemaAttribute actual)
        {
            AnnotatedEqual(expected, actual);

            Assert.Equal(expected.DefaultValue, actual.DefaultValue);
            Assert.Equal(expected.FixedValue, actual.FixedValue);
            Assert.Equal(expected.Form, actual.Form);
            Assert.Equal(expected.Name, actual.Name);
            Assert.Equal(expected.RefName, actual.RefName);
            Assert.Equal(expected.SchemaTypeName, actual.SchemaTypeName);
            IsEquivalentTo(expected.SchemaType, actual.SchemaType);
            Assert.Equal(expected.Use, actual.Use);
        }

        private static void Equal(XmlSchemaAttributeGroup expected, XmlSchemaAttributeGroup actual)
        {
            AnnotatedEqual(expected, actual);
            
            Assert.Equal(expected.Name, actual.Name);
            IsEquivalentTo(expected.Attributes, actual.Attributes);
            IsEquivalentTo(expected.AnyAttribute, actual.AnyAttribute);
        }

        private static void Equal(XmlSchemaAttributeGroupRef expected, XmlSchemaAttributeGroupRef actual)
        {
            AnnotatedEqual(expected, actual);
            Assert.Equal(expected.RefName, actual.RefName);
        }

        private static void Equal(XmlSchemaChoice expected, XmlSchemaChoice actual)
        {
            ParticleEqual(expected, actual);
            IsEquivalentTo(expected.Items, actual.Items);
        }

        private static void Equal(XmlSchemaComplexContent expected, XmlSchemaComplexContent actual)
        {
            AnnotatedEqual(expected, actual);
            Assert.Equal(expected.IsMixed, actual.IsMixed);
            IsEquivalentTo(expected.Content, actual.Content);
        }

        private static void Equal(XmlSchemaComplexContentExtension expected, XmlSchemaComplexContentExtension actual)
        {
            AnnotatedEqual(expected, actual);
            Assert.Equal(expected.BaseTypeName, actual.BaseTypeName);
            IsEquivalentTo(expected.Particle, actual.Particle);
            IsEquivalentTo(expected.Attributes, actual.Attributes);
            IsEquivalentTo(expected.AnyAttribute, actual.AnyAttribute);
        }

        private static void Equal(XmlSchemaComplexContentRestriction expected, XmlSchemaComplexContentRestriction actual)
        {
            AnnotatedEqual(expected, actual);
            Assert.Equal(expected.BaseTypeName, actual.BaseTypeName);
            IsEquivalentTo(expected.Particle, actual.Particle);
            IsEquivalentTo(expected.Attributes, actual.Attributes);
            IsEquivalentTo(expected.AnyAttribute, actual.AnyAttribute);
        }

        private static void Equal(XmlSchemaComplexType expected, XmlSchemaComplexType actual)
        {
            SchemaTypeEqual(expected, actual);
            Assert.Equal(expected.IsAbstract, actual.IsAbstract);
            Assert.Equal(expected.Block, actual.Block);
            Assert.Equal(expected.Final, actual.Final);
            Assert.Equal(expected.Name, actual.Name);
            Assert.Equal(expected.QualifiedName, actual.QualifiedName);
            IsEquivalentTo(expected.BaseXmlSchemaType, actual.BaseXmlSchemaType);
            Assert.Equal(expected.IsMixed, actual.IsMixed);
            Assert.Equal(expected.TypeCode, actual.TypeCode);
            IsEquivalentTo(expected.ContentModel, actual.ContentModel);
            IsEquivalentTo(expected.Particle, actual.Particle);
            IsEquivalentTo(expected.Attributes, actual.Attributes);
            IsEquivalentTo(expected.AnyAttribute, actual.AnyAttribute);
        }

        private static void Equal(XmlSchemaDocumentation expected, XmlSchemaDocumentation actual)
        {
            Assert.Equal(expected.Source, actual.Source);
            Assert.Equal(expected.Language, actual.Language);
            XmlNodeIsEquivalentTo(expected.Markup, actual.Markup);
        }

        private static void Equal(XmlSchemaElement expected, XmlSchemaElement actual)
        {
            ParticleEqual(expected, actual);
            
            Assert.Equal(expected.IsAbstract, actual.IsAbstract);
            Assert.Equal(expected.Block, actual.Block);
            Assert.Equal(expected.DefaultValue, actual.DefaultValue);
            Assert.Equal(expected.Final, actual.Final);
            Assert.Equal(expected.FixedValue, actual.FixedValue);
            Assert.Equal(expected.Form, actual.Form);
            Assert.Equal(expected.Name, actual.Name);

            // TODO: This should be commented back in when we get support for nillable attribute
            // as described in https://github.com/Altinn/altinn-studio/issues/6749
            // Assert.Equal(expected.IsNillable, actual.IsNillable);
            Assert.Equal(expected.RefName, actual.RefName);
            Assert.Equal(expected.SubstitutionGroup, actual.SubstitutionGroup);
            Assert.Equal(expected.SchemaTypeName, actual.SchemaTypeName);

            IsEquivalentTo(expected.SchemaType, actual.SchemaType);
            IsEquivalentTo(expected.Constraints, actual.Constraints);

            Assert.Equal(expected.QualifiedName, actual.QualifiedName);

            IsEquivalentTo(expected.Constraints, actual.Constraints);
            IsEquivalentTo(expected.ElementSchemaType, actual.ElementSchemaType);
        }

        private static void Equal(XmlSchemaGroup expected, XmlSchemaGroup actual)
        {
            AnnotatedEqual(expected, actual);

            Assert.Equal(expected.Name, actual.Name);
            IsEquivalentTo(expected.Particle, actual.Particle);
            Assert.Equal(expected.QualifiedName, actual.QualifiedName);
        }

        private static void Equal(XmlSchemaGroupRef expected, XmlSchemaGroupRef actual)
        {
            ParticleEqual(expected, actual);
            Assert.Equal(expected.RefName, actual.RefName);
        }

        private static void Equal(XmlSchemaImport expected, XmlSchemaImport actual)
        {
            throw new NotImplementedException();
        }

        private static void Equal(XmlSchemaInclude expected, XmlSchemaInclude actual)
        {
            throw new NotImplementedException();
        }

        private static void Equal(XmlSchemaKey expected, XmlSchemaKey actual)
        {
            throw new NotImplementedException();
        }

        private static void Equal(XmlSchemaKeyref expected, XmlSchemaKeyref actual)
        {
            throw new NotImplementedException();
        }

        private static void Equal(XmlSchemaUnique expected, XmlSchemaUnique actual)
        {
            throw new NotImplementedException();
        }

        private static void Equal(XmlSchemaNotation expected, XmlSchemaNotation actual)
        {
            throw new NotImplementedException();
        }

        private static void Equal(XmlSchemaRedefine expected, XmlSchemaRedefine actual)
        {
            throw new NotImplementedException();
        }

        private static void Equal(XmlSchemaSequence expected, XmlSchemaSequence actual)
        {
            ParticleEqual(expected, actual);
            IsEquivalentTo(expected.Items, actual.Items);
        }

        private static void Equal(XmlSchemaSimpleContent expected, XmlSchemaSimpleContent actual)
        {
            AnnotatedEqual(expected, actual);
            IsEquivalentTo(expected.Content, actual.Content);
        }

        private static void Equal(XmlSchemaSimpleContentExtension expected, XmlSchemaSimpleContentExtension actual)
        {
            AnnotatedEqual(expected, actual);
            Assert.Equal(expected.BaseTypeName, actual.BaseTypeName);
            IsEquivalentTo(expected.Attributes, actual.Attributes);
            IsEquivalentTo(expected.AnyAttribute, actual.AnyAttribute);
        }

        private static void Equal(XmlSchemaSimpleContentRestriction expected, XmlSchemaSimpleContentRestriction actual)
        {
            AnnotatedEqual(expected, actual);
            Assert.Equal(expected.BaseTypeName, actual.BaseTypeName);
            IsEquivalentTo(expected.BaseType, actual.BaseType);
            FacetsEquivalentTo(expected.Facets, actual.Facets);
            IsEquivalentTo(expected.Attributes, actual.Attributes);
            IsEquivalentTo(expected.AnyAttribute, actual.AnyAttribute);
        }

        private static void Equal(XmlSchemaSimpleType expected, XmlSchemaSimpleType actual)
        {
            SchemaTypeEqual(expected, actual);
            IsEquivalentTo(expected.Content, actual.Content);
        }

        private static void Equal(XmlSchemaSimpleTypeList expected, XmlSchemaSimpleTypeList actual)
        {
            AnnotatedEqual(expected, actual);

            Assert.Equal(expected.ItemTypeName, actual.ItemTypeName);
            if (expected.ItemType != null)
            {
                Assert.NotNull(actual.ItemType);
                Equal(expected.ItemType, actual.ItemType);
            }
        }

        private static void Equal(XmlSchemaSimpleTypeRestriction expected, XmlSchemaSimpleTypeRestriction actual)
        {
            AnnotatedEqual(expected, actual);
            Assert.Equal(expected.BaseTypeName, actual.BaseTypeName);
            IsEquivalentTo(expected.BaseType, actual.BaseType);
            FacetsEquivalentTo(expected.Facets, actual.Facets);
        }

        private static void Equal(XmlSchemaSimpleTypeUnion expected, XmlSchemaSimpleTypeUnion actual)
        {
            throw new NotImplementedException();
        }

        private static void Equal(XmlSchemaXPath expected, XmlSchemaXPath actual)
        {
            throw new NotImplementedException();
        }

        private static void XmlAttributesIsEquivalentTo(IReadOnlyCollection<XmlAttribute> expected, IReadOnlyCollection<XmlAttribute> actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.NotNull(actual);

            Assert.Equal(expected.Count, actual.Count);

            Dictionary<string, XmlAttribute> actualAttributes = actual.ToDictionary(attr => attr.Name);
            foreach (XmlAttribute expectedAttribute in expected)
            {
                if (!actualAttributes.TryGetValue(expectedAttribute.Name, out XmlAttribute actualAttribute))
                {
                    throw new ContainsException(expectedAttribute.Name, actual);
                }

                actualAttributes.Remove(actualAttribute.Name);

                Equal(expectedAttribute, actualAttribute);
            }

            if (actualAttributes.Count > 0)
            {
                XmlAttribute actualAttribute = actualAttributes.First().Value;
                throw new DoesNotContainException(expected, $"{actualAttribute.Name}=\"{actualAttribute.Value}\"");
            }
        }

        private static void Equal(XmlAttribute expected, XmlAttribute actual)
        {
            Assert.Equal(expected.NamespaceURI, actual.NamespaceURI);
            Assert.Equal(expected.LocalName, actual.LocalName);
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void AnnotatedEqual(XmlSchemaAnnotated expected, XmlSchemaAnnotated actual)
        {
            Assert.Equal(expected.Id, actual.Id);
            IsEquivalentTo(expected.Annotation, actual.Annotation);
            XmlAttributesIsEquivalentTo(expected.UnhandledAttributes, actual.UnhandledAttributes);
        }

        private static void ParticleEqual(XmlSchemaParticle expected, XmlSchemaParticle actual)
        {
            AnnotatedEqual(expected, actual);
            Assert.Equal(expected.MinOccursString, actual.MinOccursString);
            Assert.Equal(expected.MaxOccursString, actual.MaxOccursString);
        }

        private static void SchemaTypeEqual(XmlSchemaType expected, XmlSchemaType actual)
        {
            AnnotatedEqual(expected, actual);
            Assert.Equal(expected.Name, actual.Name);
            Assert.Equal(expected.Final, actual.Final);
            Assert.Equal(expected.QualifiedName, actual.QualifiedName);
            IsEquivalentTo(expected.BaseXmlSchemaType, actual.BaseXmlSchemaType);
            Assert.Equal(expected.IsMixed, actual.IsMixed);
            Assert.Equal(expected.TypeCode, actual.TypeCode);
        }

        private static void FacetsEquivalentTo(XmlSchemaObjectCollection expected, XmlSchemaObjectCollection actual)
        {
            List<XmlSchemaFacet> actualFacets = actual
                .Cast<XmlSchemaFacet>()
                .ToList();

            foreach (XmlSchemaFacet expectedFacet in expected.Cast<XmlSchemaFacet>())
            {
                bool found = false;
                for (int i = 0; i < actualFacets.Count; i++)
                {
                    if (FacetEquals(expectedFacet, actualFacets[i]))
                    {
                        found = true;
                        actualFacets.RemoveAt(i);
                        break;
                    }
                }

                if (!found)
                {
                    throw new ContainsException(expectedFacet, actual);
                }
            }

            if (actualFacets.Count > 0)
            {
                throw new DoesNotContainException(expected, actualFacets.First());
            }
        }

        private static bool FacetEquals(XmlSchemaFacet facet1, XmlSchemaFacet facet2)
        {
            if (facet1 == null)
            {
                return facet2 == null;
            }

            if (facet2 == null)
            {
                return false;
            }

            if (facet1.GetType() != facet2.GetType())
            {
                return false;
            }

            // TODO: Enum facets are missing comparison of unhandled attributs
            return facet1.IsFixed == facet2.IsFixed && string.Equals(facet1.Value, facet2.Value);
        }
    }
}
