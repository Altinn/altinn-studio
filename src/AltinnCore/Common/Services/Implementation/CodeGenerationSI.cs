using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;

using AltinnCore.Common.Configuration;
using AltinnCore.Common.Constants;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Class containing all operations related to code generation for a service
    /// </summary>
    public class CodeGenerationSI : ICodeGeneration
    {
        private const string MODEL_NAME = CodeGeneration.DefaultServiceModelName;

        private readonly ServiceRepositorySettings _settings;
        private readonly GeneralSettings _generalSettings;
        private readonly IRepository _repository;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="CodeGenerationSI"/> class
        /// </summary>
        /// <param name="generalSettings">The general application settings</param>
        /// <param name="settings">The service repository settings</param>
        /// <param name="repositoryService">The service repository service</param>
        public CodeGenerationSI(IOptions<GeneralSettings> generalSettings, IOptions<ServiceRepositorySettings> settings,
            IRepository repositoryService, IHttpContextAccessor httpContextAccessor)
        {
            _generalSettings = generalSettings.Value;
            _settings = settings.Value;
            _repository = repositoryService;
            _httpContextAccessor = httpContextAccessor;
        }
        
        /// <summary>
        /// Method which generates a class containing calculation and validation logic for a service based on the
        /// given input
        /// </summary>
        /// <param name="org">The organization code</param>
        /// <param name="service">The service code</param>
        /// <param name="edition">The service edition</param>
        /// <param name="ruleContainers">The rule containers to generate logic based on</param>
        /// <param name="serviceMetadata">The service metadata of the service to generate the class for</param>
        public void CreateCalculationsAndValidationsClass(
            string org, string service, string edition,
            List<RuleContainer> ruleContainers, ServiceMetadata serviceMetadata)
        {
            List<char> reservedIndexNames = new List<char>();
            Dictionary<string, Iterator> allIterators = new Dictionary<string, Iterator>();
            Dictionary<string, string> allMethods = new Dictionary<string, string>();

            string finalRule = string.Empty;
            foreach (RuleContainer ruleContainer in ruleContainers)
            {
                finalRule += CreateRulesRecursive(ruleContainer, allIterators, allMethods, serviceMetadata, reservedIndexNames);
            }

            var eventLogic = new Dictionary<ServiceEventType, string>
            {
                { ServiceEventType.BeforeRender, string.Empty },
                { ServiceEventType.Calculation, finalRule }, // TODO: Add option to choose which event rules should be linked to
                { ServiceEventType.Instantiation, string.Empty },
                { ServiceEventType.ValidateInstantiation, string.Empty },
                { ServiceEventType.Validation, string.Empty }
            };
            CreateClassFromTemplate(org, service, edition, eventLogic, allMethods, serviceMetadata);
        }
        
        /// <summary>
        /// Gets details about all available rule types
        /// </summary>
        /// <returns>A list of available rule types</returns>
        public List<RuleType> GetRuleTypes()
        {
            var ruleTypes = new List<RuleType>
            {
                new RuleType
                {
                    Name = "Legg til valideringsfeil",
                    Id = 1,
                    Template = MODEL_NAME + @".AddModelError(
                                x => x.{0},
                                {1},
                                modelState);",
                    Parameters = new List<ParameterDetails>
                {
                    new ParameterDetails
                    {
                        Index = 1,
                        Description = "Felt/gruppe feilen skal legges til",
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.ModelProperty
                        }
                    },
                    new ParameterDetails
                    {
                        Index = 2,
                        Description = "Feilmelding (ressurstekst)",
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.String
                        }
                    }
                }
                },

                new RuleType
                {
                    Name = "Sett verdi",
                    Id = 2,
                    Template = "{0} = {1};",
                    Parameters = new List<ParameterDetails>
                {
                    new ParameterDetails
                    {
                        Index = 1,
                        Description = "Feltet som skal få satt verdi",
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.ModelProperty
                        }
                    },
                    new ParameterDetails
                    {
                        Index = 2,
                        Description = "Verdi (egendefinert eller fra annet felt)",
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.ModelProperty,
                            Models.ValueType.Decimal,
                            Models.ValueType.Int32,
                            Models.ValueType.Int64,
                            Models.ValueType.String
                        }
                    }
                }
                },

                new RuleType
                {
                    Name = "Blank ut alle felter i gruppe",
                    Id = 3,
                    Template = string.Empty,
                    Parameters = new List<ParameterDetails>
                {
                    new ParameterDetails
                    {
                        Index = 1,
                        Description = "Gruppen som skal blankes ut"
                    }
                }
                }
            };
            return ruleTypes;
        }

        /// <summary>
        /// Gets details about all the available condition types
        /// </summary>
        /// <returns>A list of available condition types</returns>
        public List<ConditionType> GetConditionTypes()
        {
            List<ConditionType> conditionTypes = new List<ConditionType>
            {

                // Equal to
                new ConditionType
                {
                    Id = 1,
                    Name = "=",
                    Description = "Sjekk om to verdier er like",
                    Template = "{0} == {1}",
                    Parameters = new List<ParameterDetails>
                {
                    new ParameterDetails
                    {
                        Description = "Første verdi",
                        Index = 1,
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.String,
                            Models.ValueType.Decimal,
                            Models.ValueType.Int32,
                            Models.ValueType.Int64
                        }
                    },
                    new ParameterDetails
                    {
                        Description = "Andre verdi",
                        Index = 2,
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.String,
                            Models.ValueType.Decimal,
                            Models.ValueType.Int32,
                            Models.ValueType.Int64
                        }
                    }
                }
                },

                // Greater than
                new ConditionType
                {
                    Id = 2,
                    Name = ">",
                    Description = "Sjekk om første verdi er større enn andre verdi",
                    Template = "{0} > {1}",
                    Parameters = new List<ParameterDetails>
                {
                    new ParameterDetails
                    {
                        Description = "Verdien som skal være størst",
                        Index = 1,
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.Decimal,
                            Models.ValueType.Int32,
                            Models.ValueType.Int64
                        }
                    },
                    new ParameterDetails
                    {
                        Description = "Verdien som skal være minst",
                        Index = 2,
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.Decimal,
                            Models.ValueType.Int32,
                            Models.ValueType.Int64
                        }
                    }
                }
                },

                // Greater than or equal
                new ConditionType
                {
                    Id = 3,
                    Name = ">=",
                    Description = "Sjekk om første verdi er større enn eller like andre verdi",
                    Template = "{0} >= {1}",
                    Parameters = new List<ParameterDetails>
                {
                    new ParameterDetails
                    {
                        Description = "Verdien som skal være størst",
                        Index = 1,
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.Decimal,
                            Models.ValueType.Int32,
                            Models.ValueType.Int64
                        }
                    },
                    new ParameterDetails
                    {
                        Description = "Verdien som skal være minst",
                        Index = 2,
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.Decimal,
                            Models.ValueType.Int32,
                            Models.ValueType.Int64
                        }
                    }
                }
                },

                // Less than
                new ConditionType
                {
                    Id = 4,
                    Name = "<",
                    Description = "Sjekk om første verdi er mindre enn andre verdi",
                    Template = "{0} < {1}",
                    Parameters = new List<ParameterDetails>
                {
                    new ParameterDetails
                    {
                        Description = "Verdien som skal være minst",
                        Index = 1,
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.Decimal,
                            Models.ValueType.Int32,
                            Models.ValueType.Int64
                        }
                    },
                    new ParameterDetails
                    {
                        Description = "Verdien som skal være størst",
                        Index = 2,
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.Decimal,
                            Models.ValueType.Int32,
                            Models.ValueType.Int64
                        }
                    }
                }
                },

                // Less than or equal
                new ConditionType
                {
                    Id = 5,
                    Name = "<=",
                    Description = "Sjekk om første verdi er mindre eller like andre verdi",
                    Template = "{0} <= {1}",
                    Parameters = new List<ParameterDetails>
                {
                    new ParameterDetails
                    {
                        Description = "Verdien som skal være minst",
                        Index = 1,
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.Decimal,
                            Models.ValueType.Int32,
                            Models.ValueType.Int64
                        }
                    },
                    new ParameterDetails
                    {
                        Description = "Verdien som skal være størst",
                        Index = 2,
                        SupportedTypes = new List<Models.ValueType>
                        {
                            Models.ValueType.Decimal,
                            Models.ValueType.Int32,
                            Models.ValueType.Int64
                        }
                    }
                }
                }
            };
            return conditionTypes;
        }

        private void CreateClassFromTemplate(
            string org, string service, string edition, Dictionary<ServiceEventType, string> eventLogic, 
            Dictionary<string, string> methods, ServiceMetadata serviceMetadata)
        {
            eventLogic.OrderBy(x => x.Key);
            
            // Read the serviceImplemenation template
            string textData = File.ReadAllText(_generalSettings.GeneratedMethodsTemplate, Encoding.UTF8);

            // Replace the template default namespace
            List<string> formattingElements = eventLogic.Values.ToList();
            formattingElements.Add(string.Join("\n", methods.Values));

            textData = textData.Replace(CodeGeneration.ServiceNamespaceTemplateDefault, string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service, edition));
            textData = string.Format(textData, formattingElements.ToArray());

            // Create the service implementation folder
            Directory.CreateDirectory(_settings.GetImplementationPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)));

            // Get the file path
            string generatedMethodsFilePath = _settings.GetImplementationPath(org, service, edition, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext))
                + _settings.GeneratedMethodsFileName;

            textData = textData.Replace(CodeGeneration.DefaultServiceModelName, serviceMetadata.Elements.Values.First(el => el.ParentElement == null).ID);
            
            File.WriteAllText(generatedMethodsFilePath, textData, Encoding.UTF8);
        }

        private string CreateRulesRecursive(RuleContainer ruleContainer, Dictionary<string, Iterator> existingIterators,
            Dictionary<string, string> existingMethods,
            ServiceMetadata serviceMetadata, List<char> reservedIndexNames)
        {
            Dictionary<string, Iterator> iterators = new Dictionary<string, Iterator>();
            CreateIterators(ruleContainer, iterators, serviceMetadata, reservedIndexNames);
            StringBuilder bodyBuilder = new StringBuilder();

            StringBuilder iteratorBuilder = new StringBuilder();
            Dictionary<string, Iterator> newIterators = new Dictionary<string, Iterator>();
            
            foreach (KeyValuePair<string, Iterator> iterator in iterators.Where(x => !existingIterators.ContainsKey(x.Key)))
            {
                existingIterators.Add(iterator.Key, iterator.Value);
                newIterators.Add(iterator.Key, iterator.Value);
            }

            string condition = CreateConditionRecursive(ruleContainer.Id, ruleContainer.Conditions, existingIterators, existingMethods, serviceMetadata);

            if (ruleContainer.Rules != null)
            {
                foreach (Rule rule in ruleContainer.Rules)
                {
                    bodyBuilder.AppendLine(CreateRule(ruleContainer.Id, rule, existingIterators, serviceMetadata));
                }
            }

            if (ruleContainer.ChildContainers != null)
            {
                foreach (RuleContainer childContainer in ruleContainer.ChildContainers)
                {
                    bodyBuilder.AppendLine(CreateRulesRecursive(childContainer, existingIterators, existingMethods, serviceMetadata, reservedIndexNames));
                }
            }

            string body = bodyBuilder.ToString();

            string finalBody = string.Format(
                    "if ({0}) {{ {1} }}",
                    condition,
                    body);
            
            // TODO: Check which iterators has been added to this specific rule container
            if (newIterators.Any())
            {
                string iteratorCode = CreateIteratorCode(newIterators.Values.ToList());
                return string.Format(iteratorCode.Replace("{", "{{").Replace("}", "}}").Replace("{{0}}", "{0}"), finalBody);
            }
            else
            {
                return finalBody;
            }
        }

        private string CreateIteratorCode(List<Iterator> iterators)
        {
            Iterator firstIterator = iterators.First();
            iterators.Remove(firstIterator);
            if (iterators.Any())
            {
                string iteratorCode = CreateIteratorCode(iterators);
                return string.Format(firstIterator.Template, iteratorCode);
            }
            else
            {
                return firstIterator.Template.Replace("{{", "{").Replace("}}", "}");
            }
        }

        private string CreateRule(int ruleContainerId, Rule rule, Dictionary<string, Iterator> allIterators, ServiceMetadata serviceMetadata)
        {
            Dictionary<string, Iterator> currentIterators = allIterators.Where(i => i.Key.EndsWith($"_{ruleContainerId}")).ToDictionary(x => x.Key, x => x.Value);
            
            return string.Format(
                GetRuleType(rule.RuleTypeId).Template,
                rule.Parameters.OrderBy(x => x.Index).Select(x => !serviceMetadata.Elements.ContainsKey(x.Value) ? "\"" + x.Value + "\"" : GetIndexedElementId(x.Value, currentIterators)).ToArray());
        }

        private Dictionary<string, Iterator> CreateIterators(RuleContainer ruleContainer, Dictionary<string, Iterator> iterators,
            ServiceMetadata serviceMetadata, List<char> reservedIndexNames)
        {
            foreach (Condition condition in ruleContainer.Conditions)
            {
                foreach (Parameter parameter in condition.Parameters.Where(x => !String.IsNullOrEmpty(x.Value)))
                {
                    string elementId = parameter.Value;

                    if (serviceMetadata.Elements.ContainsKey(elementId))
                    {
                        iterators = CreateIterator(ruleContainer.Id, elementId, serviceMetadata, reservedIndexNames, iterators);
                    }
                }
            }

            return iterators;
        }

        private Dictionary<string, Iterator> CreateIterator(
            int containerId, string elementId, ServiceMetadata serviceMetadata,
            List<char> reservedIndexNames, Dictionary<string, Iterator> iterators)
        {
            List<string> idParts = elementId.Split('.').ToList();
            string currentId = idParts[0];

            for (int i = 0; i < idParts.Count; i++)
            {
                ElementMetadata currentElement = serviceMetadata.Elements[currentId];
                if (currentElement.MaxOccurs > 1)
                {
                    // Need iterator
                    if (!iterators.ContainsKey($"{currentId}_{containerId}")) 
                    {
                        iterators.Add($"{currentId}_{containerId}", CreateIterator(currentId, iterators, serviceMetadata, reservedIndexNames));
                    }
                }

                if ((i + 1) < idParts.Count)
                {
                    currentId += '.' + idParts[i + 1];
                }
            }

            return iterators;
        }

        private Iterator CreateIterator(string elementId, Dictionary<string, Iterator> existingIterators,
            ServiceMetadata serviceMetadata, List<char> reservedIndexNames)
        {
            ElementMetadata elementMetadata = serviceMetadata.Elements[elementId];

            string variableName = elementId;
            foreach (Iterator i in existingIterators.Values)
            {
                // Property -> Property[a] etc. when there are parent iterators
                variableName = variableName.Replace(i.ElementNameLastPart + '.', i.ElementNameWithIndexLastPart + '.');
            }

            string indexName = GetFirstAvailableIndexName(reservedIndexNames).ToString();

            var iterator = new Iterator
            {
                IndexName = indexName,
                ElementName = variableName
            };
            return iterator;
        }

        private char GetFirstAvailableIndexName(List<char> reservedIndexNames)
        {
            bool found = false;
            char indexName = 'a';

            while (!found)
            {
                if (!reservedIndexNames.Contains(indexName))
                {
                    found = true;
                }
                else
                {
                    indexName++;
                }
            }

            reservedIndexNames.Add(indexName);
            return indexName;
        }

        private string CreateConditionRecursive(int ruleContainerId, List<Condition> conditions,
            Dictionary<string, Iterator> allIterators,
            Dictionary<string, string> allMethods,
            ServiceMetadata serviceMetadata)
        {
            Dictionary<string, Iterator> currentIterators = allIterators.Where(i => i.Key.EndsWith($"_{ruleContainerId}")).ToDictionary(x => x.Key, x => x.Value);
            
            StringBuilder conditionBuilder = new StringBuilder();
            for (int i = 0; i < conditions.Count(); i++)
            {
                Condition currentPart = conditions[i];

                // This part is a group of conditions, handle recursively
                if (currentPart.ConditionGroup != null)
                {
                    conditionBuilder.Append('(');
                    conditionBuilder.Append(CreateConditionRecursive(
                        ruleContainerId,
                        currentPart.ConditionGroup.Condition,
                        allIterators,
                        allMethods,
                        serviceMetadata));

                    conditionBuilder.Append(')');
                }
                else
                {
                    ConditionType conditionType = GetConditionType(currentPart.ConditionTypeId);

                    List<string> formattedParameters = GetFormattedParameters(conditionType.Parameters, currentPart.Parameters, currentIterators, allMethods, serviceMetadata);

                    //This is an actual condition part
                    conditionBuilder.Append(
                        string.Format(
                            conditionType.Template,
                            formattedParameters.ToArray()));

                    //conditionBuilder.Append(
                    //    string.Format(
                    //        conditionType.Template,
                    //        currentPart.Parameters.OrderBy(x => x.Index).Select(x => ProcessValue(x.Value, serviceMetadata, currentIterators, allMethods)).ToArray()));
                }

                if ((i + 1) < conditions.Count())
                {
                    conditionBuilder.Append(currentPart.Delimiter.Value);
                }
            }

            return conditionBuilder.ToString();
        }

        private List<string> GetFormattedParameters(
            List<ParameterDetails> conditionTypeParameters, 
            List<Parameter> submittedParameters, 
            Dictionary<string, Iterator> currentIterators, 
            Dictionary<string, string> allMethods,
            ServiceMetadata serviceMetadata)
        {
            List<string> result = new List<string>();

            conditionTypeParameters = conditionTypeParameters.OrderBy(x => x.Index).ToList();
            submittedParameters = submittedParameters.OrderBy(x => x.Index).ToList();

            for (int i = 0; i < conditionTypeParameters.Count; i++)
            {
                ParameterDetails details = conditionTypeParameters[i];
                Parameter submittedValue = submittedParameters[i];

                string value = string.Empty;
                bool valid = false;

                string method = submittedValue.Value.StartsWith("$") ? submittedValue.Value.Substring(1, submittedValue.Value.IndexOf('(') - 1) : null;
                string elementId = method == null
                    ? submittedValue.Value
                    : submittedValue.Value.Substring($"${method}(".Length, submittedValue.Value.Length - 1 - $"${method}(".Length);

                bool isProperty = method == null
                    ? serviceMetadata.Elements.ContainsKey(submittedValue.Value)
                    : serviceMetadata.Elements.ContainsKey(submittedValue.Value.Substring($"${method}(".Length, submittedValue.Value.Length - 1 - $"${method}(".Length));

                string processedValue = ProcessValue(submittedValue.Value, serviceMetadata, currentIterators, allMethods);
                
                foreach (Models.ValueType supportedType in details.SupportedTypes)
                {
                    if (supportedType == Models.ValueType.Decimal)
                    {
                        if (isProperty)
                        {
                            if (serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.Decimal
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.Int
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.Integer
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.NegativeInteger
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.NonNegativeInteger
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.PositiveInteger
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.Short)
                            {
                                value = processedValue + ".ToString()";
                                valid = true;
                                break;
                            }
                        }
                        else if (decimal.TryParse(submittedValue.Value, out decimal parsedDecimal))
                        {
                            value = $"\"{parsedDecimal.ToString()}\"";
                            valid = true;
                            break;
                        }
                    }
                    else if (supportedType == Models.ValueType.Int32)
                    {
                        if (isProperty)
                        {
                            if (serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.Int
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.Integer
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.NegativeInteger
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.NonNegativeInteger
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.PositiveInteger
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.Short)
                            {
                                value = processedValue + ".ToString()";
                                valid = true;
                                break;
                            }
                        }
                        else if (int.TryParse(submittedValue.Value, out int parsedInt))
                        {
                            value = $"\"{parsedInt.ToString()}\"";
                            valid = true;
                            break;
                        }
                    }
                    else if (supportedType == Models.ValueType.Int64)
                    {
                        if (isProperty)
                        {
                            if (serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.Int
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.Integer
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.NegativeInteger
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.NonNegativeInteger
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.PositiveInteger
                                || serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.Short)
                            {
                                value = processedValue + ".ToString()";
                                valid = true;
                                break;
                            }
                        }
                        else if (long.TryParse(submittedValue.Value, out long parsedLong))
                        {
                            value = $"\"{parsedLong.ToString()}\"";
                            valid = true;
                            break;
                        }
                    }
                    else if (supportedType == Models.ValueType.ModelProperty)
                    {
                        if (isProperty && method == null)
                        {
                            value = processedValue + ".ToString()";
                            valid = true;
                            break;
                        }
                    }
                    else if (supportedType == Models.ValueType.String)
                    {
                        if (isProperty)
                        {
                            if (serviceMetadata.Elements[elementId].XsdValueType == BaseValueType.String)
                            {
                                value = processedValue;
                            }
                            else
                            {
                                value = processedValue + ".ToString()";
                            }

                            valid = true;
                            break;
                        }
                        else
                        {
                            value = $"\"{submittedValue.Value}\"";
                            valid = true;
                            break;
                        }
                    }
                }

                if (valid)
                {
                    result.Add(value);
                }
                else
                {
                    throw new Exception("Unsupported value type");
                }
            }
            
            return result;
        }
        
        private string ProcessValue(string value, ServiceMetadata serviceMetadata, Dictionary<string, Iterator> allIterators, Dictionary<string, string> allMethods)
        {
            if (!serviceMetadata.Elements.ContainsKey(value))
            {
                if (value.StartsWith("$sum("))
                {
                    string elementId = value.Substring("$sum(".Length, value.Length - 1 - "$sum(".Length);

                    if (!allMethods.ContainsKey("GetSum_" + elementId))
                    {
                        allMethods.Add("GetSum_" + elementId, GenerateGetSum(elementId, serviceMetadata));
                    }

                    return $"GetSum_{GetCodeFriendlyElementId(elementId)}({serviceMetadata.Elements.Values.First(el => el.ParentElement == null).Name})";
                }
                else if (value.StartsWith("$count("))
                {
                    string elementId = value.Substring("$count(".Length, value.Length - 1 - "$count(".Length);

                    if (!allMethods.ContainsKey("GetCount_" + elementId))
                    {
                        allMethods.Add("GetCount_" + elementId, GenerateGetCount(elementId, serviceMetadata));
                    }

                    return $"GetCount_{GetCodeFriendlyElementId(elementId)}({serviceMetadata.Elements.Values.First(el => el.ParentElement == null).Name})";
                }
                else
                {
                    return null;
                }
            }
            else
            {
                return GetIndexedElementId(value, allIterators);
            }
        }
        
        private string GetIndexedElementId(string oldId, Dictionary<string, Iterator> allIterators)
        {
            foreach (Iterator iterator in allIterators.Values)
            {
                // Property -> Property[a] etc. when there are parent iterators
                oldId = oldId.Replace(iterator.ElementNameLastPart + '.', iterator.ElementNameWithIndexLastPart + '.');
            }

            return oldId;
        }

        private ConditionType GetConditionType(int id)
        {
            return GetConditionTypes().FirstOrDefault(ct => ct.Id == id);
        }

        private RuleType GetRuleType(int id)
        {
            return GetRuleTypes().FirstOrDefault(rt => rt.Id == id);
        }

        private string GenerateGetSum(string fieldId, ServiceMetadata serviceMetadata)
        {
            if (!serviceMetadata.Elements.ContainsKey(fieldId)
                || serviceMetadata.Elements[fieldId].Type != ElementType.Field)
            {
                throw new Exception("Cannot create sum method for property which is not a field");
            }

            string method = GenerateAritmeticMethod(fieldId, "GetSum", "sum += {0};\n", "decimal", "sum", serviceMetadata);

            return method;
        }

        private string GenerateGetCount(string fieldId, ServiceMetadata serviceMetadata)
        {
            if (!serviceMetadata.Elements.ContainsKey(fieldId) || serviceMetadata.Elements[fieldId].MaxOccurs <= 1)
            {
                throw new Exception("Cannot create count method for property which is not a list");
            }

            string method = GenerateAritmeticMethod(fieldId, "GetCount", "count += {0}.Count;\n", "int", "count", serviceMetadata);

            return method;
        }

        private string GenerateAritmeticMethod(string fieldId, string methodName, string body,
            string variableType, string variableName, ServiceMetadata serviceMetadata)
        {
            Dictionary<string, Iterator> iterators = new Dictionary<string, Iterator>();
            List<char> reservedIndexNames = new List<char>();

            iterators = CreateIterator(1, fieldId, serviceMetadata, reservedIndexNames, iterators);

            string modelName = serviceMetadata.Elements.Values.First(v => string.IsNullOrEmpty(v.ParentElement)).ID;
            string methodWrapper = "public " + variableType + " " + methodName + "_{0}({1} {2}) {3}";
            string variable = variableType + " " + variableName + " = 0;\n";

            body = string.Format(body, GetIndexedElementId(fieldId, iterators));

            string codeFriendlyElementId = GetCodeFriendlyElementId(fieldId);
            string iteratorCode = CreateIteratorCode(iterators.Values.ToList());
            string iterator = string.Format(iteratorCode.Replace("{", "{{").Replace("}", "}}").Replace("{{0}}", "{0}"), body);

            return string.Format(
                methodWrapper,
                codeFriendlyElementId,
                modelName,
                modelName,
                "{\n" + variable + "\n" + iterator + "\n return " + variableName + ";\n}");
        }

        private string GetCodeFriendlyElementId(string fieldId)
        {
            string[] idParts = fieldId.Split('.');
            string finalString = string.Empty;

            foreach (string idPart in idParts)
            {
                finalString += FirstLetterToUpper(idPart);
            }

            return finalString;
        }

        private string FirstLetterToUpper(string str)
        {
            if (str == null)
            {
                return null;
            }

            if (str.Length > 1)
            {
                return char.ToUpper(str[0]) + str.Substring(1);
            }

            return str.ToUpper();
        }
    }
    
    /// <summary>
    /// Internal helper class for creating iterators
    /// </summary>
    internal class Iterator
    {
        /// <summary>
        /// Gets or sets the name of the element this iterator was created for
        /// </summary>
        public string ElementName { get; set; }

        /// <summary>
        /// Gets the name of the element this iterator was created for, with the index parameter appended
        /// </summary>
        public string ElementNameWithIndex
        {
            get
            {
                return ElementName + '[' + IndexName + ']';
            }
        }

        /// <summary>
        /// Gets the last part of the element name of the element this iterator was created for
        /// </summary>
        public string ElementNameLastPart
        {
            get
            {
                return ElementName.Substring(ElementName.LastIndexOf('.') + 1);
            }
        }

        /// <summary>
        /// Gets the last part of the element name of the element this iterator was created for,
        /// with the index parameter appended
        /// </summary>
        public string ElementNameWithIndexLastPart
        {
            get
            {
                return ElementNameWithIndex.Substring(ElementName.LastIndexOf('.') + 1);
            }
        }

        /// <summary>
        /// Gets or sets the index variable name for this iterator
        /// </summary>
        public string IndexName { get; set; }

        /// <summary>
        /// Gets the iterator template
        /// </summary>
        public string Template
        {
            get
            {
                return "for (int "
                    + IndexName + " = 0; "
                    + IndexName + " < "
                    + ElementName + "?.Count; "
                    + IndexName + "++) {{ {0} }}";
            }
        }
    }
}
