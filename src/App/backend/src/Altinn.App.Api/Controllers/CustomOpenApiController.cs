using System.Globalization;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using Altinn.App.Api.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Extensions;
using Microsoft.OpenApi.Models;
using Microsoft.OpenApi.Services;
using Swashbuckle.AspNetCore.SwaggerGen;
using DataType = Altinn.Platform.Storage.Interface.Models.DataType;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Generate custom OpenAPI documentation for the app that includes all the data types and operations
/// </summary>
[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
public class CustomOpenApiController : Controller
{
    private readonly IAppMetadata _appMetadata;
    private readonly IAppResources _appResources;
    private readonly IAppModel _appModel;
    private readonly SchemaGenerator _schemaGenerator;
    private readonly SchemaRepository _schemaRepository;
    private readonly IProcessReader _processReader;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly AppSettings _settings;

    /// <summary>
    /// Constructor with services from dependency injection
    /// </summary>
    public CustomOpenApiController(
        IAppResources appResources,
        IAppModel appModel,
        IAppMetadata appMetadata,
        ISerializerDataContractResolver dataContractResolver,
        IProcessReader processReader,
        IServiceProvider serviceProvider,
        IOptions<AppSettings> settings
    )
    {
        _appResources = appResources;
        _appModel = appModel;
        _appMetadata = appMetadata;
        _processReader = processReader;
        _schemaGenerator = new SchemaGenerator(
            new SchemaGeneratorOptions() { SupportNonNullableReferenceTypes = true },
            dataContractResolver
        );
        _schemaRepository = new SchemaRepository();
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
        _settings = settings.Value;
    }

    internal static readonly OpenApiSpecVersion SpecVersion = OpenApiSpecVersion.OpenApi3_0;
    internal static readonly OpenApiFormat SpecFormat = OpenApiFormat.Json;

    /// <summary>
    /// Shared text that should be shown in the description of the OpenAPI documentation.
    /// </summary>
    public static string InfoDescriptionWarningText =>
        """
            App API description for both end users and service owners, as well as open metadata information<br><br>All operations* described within this document require authentication and authorization. Read more at <a href="https://docs.altinn.studio/authentication/guides">https://docs.altinn.studio/authentication/guides</a><br><br><strong>All GET operations* and POST operations may return or contain, respectively, personally identifiable information (PII; national identity numbers and names).</strong><br><br>For more information about this product, see <a href="https://docs.altinn.studio/api/apps">https://docs.altinn.studio/api/apps</a><br><br><em>* Except the metadata APIs</em>

            """;

    /// <summary>
    /// Generate the custom OpenAPI documentation for the app
    /// </summary>
    [HttpGet("/{org}/{app}/v1/customOpenapi.json")]
    public async Task<ActionResult> Index()
    {
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var document = new OpenApiDocument()
        {
            Info = new()
            {
                Title =
                    "Altinn 3 App API for "
                    + (
                        appMetadata.Title.TryGetValue("en", out var englishTitle) ? englishTitle
                        : appMetadata.Title.TryGetValue("nb", out var norwegianTitle) ? norwegianTitle
                        : appMetadata.Id
                    ),
                Contact = new()
                {
                    Name = "Digitaliseringsdirektoratet (altinn)",
                    Url = new("https://altinn.slack.com"),
                },
                Version = appMetadata.AltinnNugetVersion,
                Description = GetIntroDoc(appMetadata),
            },
            ExternalDocs = new() { Description = "Altinn 3 Documentation", Url = new("https://docs.altinn.studio") },
            Paths = [], // Add to this later
            Components = new OpenApiComponents()
            {
                Schemas = _schemaRepository.Schemas,
                SecuritySchemes =
                {
                    [Snippets.AltinnTokenSecurityScheme.Reference.Id] = Snippets.AltinnTokenSecurityScheme,
                },
                Responses = { [Snippets.ProblemDetailsResponseReference.Id] = Snippets.ProblemDetailsResponseSchema },
                Parameters = Snippets.CommonParameters,
            },
            SecurityRequirements = [new OpenApiSecurityRequirement() { [Snippets.AltinnTokenSecurityScheme] = [] }],
            Servers =
            {
                new OpenApiServer() { Url = $"http://local.altinn.cloud", Description = "Local development server" },
                new OpenApiServer()
                {
                    Url = $"https://{appMetadata.Org}.apps.tt02.altinn.no",
                    Description = "TT02 server",
                },
                new OpenApiServer()
                {
                    Url = $"https://{appMetadata.Org}.apps.altinn.no",
                    Description = "Production server",
                },
            },
        };

        AddCommonRoutes(document, appMetadata);

        foreach (var dataType in appMetadata.DataTypes)
        {
            AddRoutsForDataType(document, appMetadata, dataType);
        }

        // Fix issues in the schemas
        var walker = new OpenApiWalker(new SchemaPostVisitor());
        walker.Walk(document);

        return Content(document.Serialize(SpecVersion, SpecFormat), "application/json");
    }

    private string GetIntroDoc(ApplicationMetadata appMetadata)
    {
        StringBuilder sb = new();
        sb.AppendLine(InfoDescriptionWarningText);

        sb.AppendLine("This is the API for an Altinn 3 app. The API is based on the OpenAPI 3.0 specification.");
        sb.AppendLine("This app has the following data types:");
        sb.AppendLine("| DataTypeId | Type | Allowed number | MimeTypes | TaskId |");
        sb.AppendLine("|------------|------|----------------|-----------|--------|");
        foreach (var dataType in appMetadata.DataTypes)
        {
            sb.Append('|');
            sb.Append(dataType.Id);
            sb.Append('|');
            if (dataType.AppLogic?.ClassRef is null)
            {
                sb.Append("Attachment");
            }
            else
            {
                sb.Append("FormData");
                if (dataType.AppLogic?.AutoCreate == true)
                {
                    sb.Append(" (AutoCreate)");
                }
            }
            sb.Append('|');
            if (dataType.MaxCount == dataType.MinCount)
            {
                if (dataType.MaxCount == 0)
                {
                    sb.Append('-');
                }
                else
                {
                    sb.Append(dataType.MaxCount);
                }
            }
            else if (dataType.MaxCount > 0 && dataType.MinCount > 0)
            {
                sb.Append(CultureInfo.InvariantCulture, $"{dataType.MinCount}-{dataType.MaxCount}");
            }
            else if (dataType.MaxCount > 0)
            {
                sb.Append(CultureInfo.InvariantCulture, $"0-{dataType.MaxCount}");
            }
            else if (dataType.MinCount > 0)
            {
                sb.Append(CultureInfo.InvariantCulture, $"{dataType.MinCount}-∞");
            }
            else
            {
                sb.Append('-');
            }
            sb.Append('|');
            if (dataType.AllowedContentTypes is not null)
            {
                sb.Append(string.Join(", ", dataType.AllowedContentTypes.Distinct()));
            }
            else
            {
                sb.Append('*');
            }
            sb.Append('|');
            sb.Append(dataType.TaskId);
            sb.Append('|');
            sb.AppendLine();
        }

        var processTasks = _processReader.GetProcessTasks();
        sb.Append(
            """

            ## This app has the following process tasks:
            | TaskId | Name | Type | Actions |
            |--------|------|------|---------|

            """
        );
        foreach (var processTask in processTasks)
        {
            sb.Append("| ");
            sb.Append(processTask.Id);
            sb.Append(" | ");
            sb.Append(processTask.Name);
            sb.Append(" | ");
            sb.Append(processTask.ExtensionElements?.TaskExtension?.TaskType ?? processTask.Name);
            sb.Append(" | ");
            if (processTask.ExtensionElements?.TaskExtension?.AltinnActions is { } actions)
            {
                int i = 0;
                foreach (var action in actions)
                {
                    if (i++ == 1)
                    {
                        sb.Append(", ");
                    }
                    sb.Append(action.Value);
                }
            }
            else
            {
                sb.Append("[no actions]");
            }

            sb.AppendLine(" |");
        }

        return sb.ToString();
    }

    private void AddCommonRoutes(OpenApiDocument document, ApplicationMetadata appMetadata)
    {
        OpenApiTag[] instanceTags = [new() { Name = "Instances", Description = "Operations on instances" }];
        var instanceSchema = _schemaGenerator.GenerateSchema(typeof(Instance), _schemaRepository);
        document.Components.Schemas.Add("InstanceWrite", Snippets.InstanceWriteSchema);
        var instanceWriteSchema = new OpenApiSchema()
        {
            Reference = new OpenApiReference() { Id = "InstanceWrite", Type = ReferenceType.Schema },
        };

        OpenApiMediaType multipartMediaType = new OpenApiMediaType()
        {
            Schema = new OpenApiSchema() { Type = "object", Properties = { ["instance"] = instanceWriteSchema } },
            Encoding = { ["instance"] = new OpenApiEncoding() { ContentType = "application/json" } },
        };
        foreach (var dataType in appMetadata.DataTypes)
        {
            multipartMediaType.Schema.Properties.Add(
                dataType.Id,
                new OpenApiSchema() { Type = "string", Format = "binary" }
            );
            multipartMediaType.Encoding.Add(
                dataType.Id,
                new OpenApiEncoding()
                {
                    ContentType = dataType.AllowedContentTypes is [.. var contentTypes]
                        ? string.Join(' ', contentTypes)
                        : "application/octet-stream",
                }
            );
        }
        document.Paths.Add(
            $"/{appMetadata.Id}/instances",
            new OpenApiPathItem()
            {
                Summary = "Operations for instances",
                Description = "CRUD operations for instances",
                Operations =
                {
                    [OperationType.Post] = new OpenApiOperation()
                    {
                        Tags = instanceTags,
                        Summary = "Create new instance",
                        Description = "The main api for creating new instances. ",
                        Parameters =
                        {
                            new OpenApiParameter(Snippets.InstanceOwnerPartyIdParameterReference)
                            {
                                // Use snippet, but override
                                Description =
                                    "The party id of the instance owner (use either this or an instance document in the body)",
                                In = ParameterLocation.Query,
                                Required = false,
                            },
                            Snippets.LanguageParameterReference,
                        },
                        RequestBody = new OpenApiRequestBody()
                        {
                            Required = false,
                            Description = """
                            Instance document, formData and attachments

                            Any mime type that is not ``"application/json"`` or ``"multipart/form-data"`` with an instance document
                            will require the ``instanceOwnerPartyId`` parameter. Otherwise you must use the simplified instance document to specify instance owner.
                            Either using ``instanceOwner.partyId`` or ``instanceOwner.personNumber`` or ``instanceOwner.organisationNumber`` (or ``instanceOwner.username`` see [app-lib-dotnet/#652](https://github.com/Altinn/app-lib-dotnet/issues/652)).
                            """,
                            Content =
                            {
                                ["empty"] = new OpenApiMediaType()
                                {
                                    Schema = new OpenApiSchema() { Type = "null", Example = new OpenApiNull() },
                                },
                                ["application/json"] = new OpenApiMediaType() { Schema = instanceWriteSchema },
                                ["multipart/form-data"] = multipartMediaType,
                            },
                        },
                        Responses = Snippets.AddCommonErrorResponses(
                            HttpStatusCode.Created,
                            new OpenApiResponse()
                            {
                                Description = "Instance created",
                                Content = { ["application/json"] = new OpenApiMediaType() { Schema = instanceSchema } },
                            }
                        ),
                    },
                },
            }
        );
        document.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}",
            new OpenApiPathItem()
            {
                Summary = "Operations for instance",
                Description = "CRUD operations for a specific instance",
                Operations =
                {
                    [OperationType.Get] = new OpenApiOperation()
                    {
                        Tags = instanceTags,
                        OperationId = "GetInstance",
                        Summary = "Get instance",
                        Description = "Get a specific instance",
                        Responses = Snippets.AddCommonErrorResponses(
                            HttpStatusCode.OK,
                            new OpenApiResponse()
                            {
                                Description = "Instance found",
                                Content = { ["application/json"] = new OpenApiMediaType() { Schema = instanceSchema } },
                            }
                        ),
                    },
                    [OperationType.Delete] = new OpenApiOperation()
                    {
                        Tags = instanceTags,
                        Summary = "Delete instance",
                        Description = "Delete a specific instance",
                        Responses = Snippets.AddCommonErrorResponses(
                            HttpStatusCode.NoContent,
                            new OpenApiResponse() { Description = "Instance deleted" }
                        ),
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );

        document.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/data",
            new OpenApiPathItem()
            {
                Summary = "Operations for data elements",
                Description = "CRUD operations for data elements in an instance",
                Operations =
                {
                    [OperationType.Patch] = new OpenApiOperation()
                    {
                        Tags = instanceTags,
                        Summary = "Patch data elements on instance",
                        RequestBody = new OpenApiRequestBody()
                        {
                            Required = true,
                            Content =
                            {
                                ["application/json"] = new OpenApiMediaType() { Schema = Snippets.PatchSchema },
                            },
                        },
                        Responses = Snippets.AddCommonErrorResponses(
                            new OpenApiResponses()
                            {
                                ["200"] = new OpenApiResponse()
                                {
                                    Description = "Data elements patched",
                                    Content =
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(DataPatchResponseMultiple),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                                ["409"] = new OpenApiResponse()
                                {
                                    Description = "Precondition in patch failed",
                                    Content =
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(DataPatchError),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                                ["422"] = new OpenApiResponse()
                                {
                                    Description = "JsonPatch operation failed",
                                    Content =
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(DataPatchError),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                            }
                        ),
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );

        document.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/data/{{dataGuid}}",
            new OpenApiPathItem()
            {
                Summary = $"Delete data element",
                Operations =
                {
                    [OperationType.Delete] = new OpenApiOperation()
                    {
                        Tags = instanceTags,
                        Summary = "Delete data element",
                        Description = "Delete data for a specific data element",
                        Responses = new()
                        {
                            ["204"] = new OpenApiResponse() { Description = "Data deleted" },
                            ["404"] = new OpenApiResponse() { Description = "Data not found" },
                        },
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.DataGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );

        document.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/process/next",
            new OpenApiPathItem()
            {
                Summary = "Move instance to next process step",
                Operations =
                {
                    [OperationType.Put] = new OpenApiOperation()
                    {
                        Tags = instanceTags,
                        Summary = "Move instance to next process step",
                        Description = "Move the instance to the next process step",
                        RequestBody = new OpenApiRequestBody()
                        {
                            Required = false,
                            Description = "Optional body with specification of the action to perform",
                            Content =
                            {
                                ["application/json"] = new OpenApiMediaType()
                                {
                                    Schema = _schemaGenerator.GenerateSchema(typeof(ProcessNext), _schemaRepository),
                                },
                            },
                        },
                        Responses = Snippets.AddCommonErrorResponses(
                            new OpenApiResponses()
                            {
                                ["200"] = new OpenApiResponse()
                                {
                                    Description = "Instance moved to next process step. Returns the new process state",
                                    Content =
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(AppProcessState),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                                ["409"] = new OpenApiResponse()
                                {
                                    Description = "Precondition failed",
                                    Reference = Snippets.ProblemDetailsResponseReference,
                                },
                            }
                        ),
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );

        var commonTags = new[]
        {
            new OpenApiTag() { Name = "Static", Description = "Static info about the application" },
        };

        document.Paths.Add(
            $"/{appMetadata.Id}/api/v1/applicationmetadata",
            new OpenApiPathItem()
            {
                Summary = "Get application metadata",
                Description = "Get the metadata for the application",
                Operations =
                {
                    [OperationType.Get] = new OpenApiOperation()
                    {
                        Tags = commonTags,
                        Summary = "Get application metadata",
                        Description = "Get the metadata for the application",
                        Security = { },
                        Responses = new()
                        {
                            ["200"] = new OpenApiResponse()
                            {
                                Description = "Application metadata found",
                                Content =
                                {
                                    ["application/json"] = new OpenApiMediaType()
                                    {
                                        Schema = _schemaGenerator.GenerateSchema(
                                            typeof(ApplicationMetadata),
                                            _schemaRepository
                                        ),
                                    },
                                },
                            },
                        },
                    },
                },
            }
        );
        // Auth exchange endpoint
        var authTags = new[]
        {
            new OpenApiTag()
            {
                Name = "Authentication",
                Description = "Operations for exchanging Maskinporten or ID-Porten tokens to Altinn tokens",
            },
        };
        document.Paths.Add(
            "/authentication/api/v1/exchange/{tokenProvider}",
            new OpenApiPathItem()
            {
                Operations =
                {
                    [OperationType.Get] = new OpenApiOperation()
                    {
                        Tags = authTags,
                        Summary =
                            "Action for exchanging a JWT generated by a trusted token provider with a new JWT for further use as authentication against rest of Altinn.",
                        Parameters =
                        {
                            new OpenApiParameter()
                            {
                                Name = "tokenProvider",
                                In = ParameterLocation.Path,
                                Required = true,
                                Schema = new OpenApiSchema()
                                {
                                    Type = "string",
                                    Enum = [new OpenApiString("maskinporten"), new OpenApiString("id-porten")],
                                },
                            },
                            new OpenApiParameter()
                            {
                                Name = "Authorization",
                                Description =
                                    "Bearer token from the selected token provider to exchange for an Altinn token",
                                In = ParameterLocation.Header,
                                Example = new OpenApiString("Bearer <token>"),
                                Required = true,
                                Schema = new OpenApiSchema() { Type = "string" },
                            },
                            // Test parameter is not relevant for external users?
                            // new OpenApiParameter()
                            // {
                            //     Name = "test",
                            //     In = ParameterLocation.Query,
                            //     Schema = new OpenApiSchema()
                            //     {
                            //         Type = "boolean"
                            //     }
                            // }
                        },
                        Responses = new OpenApiResponses()
                        {
                            ["200"] = new OpenApiResponse()
                            {
                                Description = "Exchanged token",
                                Content =
                                {
                                    ["text/plain"] = new OpenApiMediaType()
                                    {
                                        Schema = new OpenApiSchema()
                                        {
                                            Type = "string",
                                            Example = new OpenApiString(
                                                "eyJraWQiOiJIdFlaMU1UbFZXUGNCV0JQVWV3TmxZd1RCRklicU1Hb081O"
                                            ),
                                        },
                                    },
                                },
                            },
                            ["401"] = new OpenApiResponse() { Description = "Unauthorized" },
                            ["400"] = new OpenApiResponse() { Description = "Bad Request" },
                            ["429"] = new OpenApiResponse() { Description = "Too Many Requests" },
                        },
                    },
                },
                Servers =
                [
                    new OpenApiServer { Description = "Production environment", Url = "https://platform.altinn.no" },
                    new OpenApiServer { Description = "Test environment", Url = "https://platform.tt02.altinn.no" },
                ],
            }
        );
        document.Paths.Add(
            "/Home/GetTestUserToken",
            new OpenApiPathItem()
            {
                Description = "Get a test user token for use in the local development environment",
                Operations =
                {
                    [OperationType.Get] = new OpenApiOperation()
                    {
                        Tags = authTags,
                        Parameters =
                        [
                            new OpenApiParameter()
                            {
                                Name = "userId",
                                Description = "The user id of the test user",
                                In = ParameterLocation.Query,
                                Required = true,
                                Schema = new OpenApiSchema() { Type = "integer", Example = new OpenApiInteger(1337) },
                            },
                            new OpenApiParameter()
                            {
                                Name = "authenticationLevel",
                                Description = "The authentication level of the test user",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema()
                                {
                                    Type = "integer",
                                    Enum =
                                    [
                                        new OpenApiInteger(0),
                                        new OpenApiInteger(1),
                                        new OpenApiInteger(2),
                                        new OpenApiInteger(3),
                                        new OpenApiInteger(4),
                                        new OpenApiInteger(5),
                                    ],
                                    Default = new OpenApiInteger(3),
                                },
                                Required = true,
                            },
                        ],
                        Responses = new OpenApiResponses()
                        {
                            ["200"] = new OpenApiResponse()
                            {
                                Description = "Test user token",
                                Content =
                                {
                                    ["text/plain"] = new OpenApiMediaType()
                                    {
                                        Schema = new OpenApiSchema()
                                        {
                                            Type = "string",
                                            Example = new OpenApiString(
                                                "eyJraWQiOiJIdFlaMU1UbFZXUGNCV0JQVWV3TmxZd1RCRklicU1Hb081O"
                                            ),
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                Servers = [new OpenApiServer { Url = "http://local.altinn.cloud" }],
            }
        );

        // Options endpoint
        var optionsTags = new[]
        {
            new OpenApiTag { Name = "Options", Description = "Operations for getting app options" },
        };
        var allOptionsSchemaCollection = GetInstanceAppOptionsSchemaCollection();
        allOptionsSchemaCollection.AddRange(GetAppOptionsSchemaCollection(appMetadata));
        document.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/options/{{optionsId}}",
            new OpenApiPathItem()
            {
                Summary = "Get instance app options",
                Operations =
                {
                    [OperationType.Get] = new()
                    {
                        Tags = optionsTags,
                        OperationId = "GetInstanceAppOptions",
                        Summary = "Get instance app options",
                        Description =
                            "Exposes options related to the app and logged in user. The tags field is only populated when requesting library code lists.",
                        Parameters =
                        [
                            Snippets.InstanceOwnerPartyIdParameterReference,
                            Snippets.InstanceGuidParameterReference,
                            new()
                            {
                                Name = "optionsId",
                                Description = "OptionsId from a layout component.",
                                In = ParameterLocation.Path,
                                Schema = new OpenApiSchema() { Type = "string", Enum = allOptionsSchemaCollection },
                            },
                            new()
                            {
                                Name = "queryParams",
                                Description = "Query parameters supplied.",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema()
                                {
                                    Type = "object",
                                    AdditionalProperties = new OpenApiSchema() { Type = "string" },
                                    Example = new OpenApiObject() { ["key"] = new OpenApiString("value") },
                                },
                            },
                            new()
                            {
                                Name = "language",
                                Description = "The language selected by the user (ISO 639-1, e.g., 'nb').",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema() { Type = "string", Example = new OpenApiString("nb") },
                            },
                        ],
                        Responses = Snippets.AddCommonErrorResponses(
                            new OpenApiResponses
                            {
                                ["200"] = new()
                                {
                                    Description = "AppOptions",
                                    Content =
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(List<AppOption>),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                            }
                        ),
                    },
                },
            }
        );
        var appOptionsSchemaCollection = GetAppOptionsSchemaCollection(appMetadata);
        document.Paths.Add(
            $"/{appMetadata.Id}/api/options/{{optionsId}}",
            new OpenApiPathItem()
            {
                Summary = "Get app options",
                Operations =
                {
                    [OperationType.Get] = new()
                    {
                        Tags = optionsTags,
                        OperationId = "GetAppOptions",
                        Summary = "Get app options",
                        Description =
                            "Api that exposes app related options. The tags field is only populated when requesting library code lists.",
                        Parameters =
                        [
                            new()
                            {
                                Name = "optionsId",
                                Description = "OptionsId from a layout component.",
                                In = ParameterLocation.Path,
                                Schema = new OpenApiSchema() { Type = "string", Enum = appOptionsSchemaCollection },
                            },
                            new()
                            {
                                Name = "queryParams",
                                Description = "Query parameters supplied.",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema()
                                {
                                    Type = "object",
                                    AdditionalProperties = new OpenApiSchema() { Type = "string" },
                                    Example = new OpenApiObject() { ["key"] = new OpenApiString("value") },
                                },
                            },
                            new()
                            {
                                Name = "language",
                                Description = "The language selected by the user (ISO 639-1, e.g., 'nb').",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema() { Type = "string", Example = new OpenApiString("nb") },
                            },
                        ],
                        Responses = Snippets.AddCommonErrorResponses(
                            new OpenApiResponses
                            {
                                ["200"] = new()
                                {
                                    Description = "AppOptions",
                                    Content =
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(List<AppOption>),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                            }
                        ),
                    },
                },
            }
        );

        // Validation endpoint
        var validationTags = new[]
        {
            new OpenApiTag { Name = "Validation", Description = "Operations for validating" },
        };
        document.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/validate",
            new()
            {
                Summary = "Validate an app instance",
                Operations =
                {
                    [OperationType.Get] = new()
                    {
                        Tags = validationTags,
                        OperationId = "ValidateInstance",
                        Summary = "Validate an app instance",
                        Description =
                            "This will validate all individual data elements, both the binary elements and the elements bound to a model, and then finally the state of the instance.",
                        Parameters =
                        [
                            Snippets.InstanceOwnerPartyIdParameterReference,
                            Snippets.InstanceGuidParameterReference,
                            new()
                            {
                                Name = "ignoredValidators",
                                Description = "Comma separated list of validators to ignore",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema()
                                {
                                    Type = "string",
                                    Example = new OpenApiString(
                                        "DataAnnotations, Altinn.App.Models.model.ModelValidation_FormData"
                                    ),
                                },
                            },
                            new()
                            {
                                Name = "onlyIncrementalValidators",
                                Description =
                                    "When true, only run incremental validators (those that run on PATCH requests)",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema() { Type = "boolean", Example = new OpenApiBoolean(false) },
                            },
                            new()
                            {
                                Name = "language",
                                Description = "The currently used language by the user (or null if not available)",
                                In = ParameterLocation.Query,
                                Schema = new OpenApiSchema() { Type = "string", Example = new OpenApiString("nb") },
                            },
                        ],
                        Responses = Snippets.AddCommonErrorResponses(
                            new OpenApiResponses
                            {
                                ["200"] = new()
                                {
                                    Description = "Validation result",
                                    Content =
                                    {
                                        ["application/json"] = new OpenApiMediaType()
                                        {
                                            Schema = _schemaGenerator.GenerateSchema(
                                                typeof(List<ValidationIssueWithSource>),
                                                _schemaRepository
                                            ),
                                        },
                                    },
                                },
                                ["409"] = new()
                                {
                                    Description = "Validation cannot be performed (e.g., no active task)",
                                    Reference = Snippets.ProblemDetailsResponseReference,
                                },
                            }
                        ),
                    },
                },
            }
        );
    }

    private List<IOpenApiAny> GetInstanceAppOptionsSchemaCollection()
    {
        var optionsIds = _appImplementationFactory.GetAll<IInstanceAppOptionsProvider>().Select(a => a.Id);

        return optionsIds.Select(optionsId => new OpenApiString(optionsId)).Cast<IOpenApiAny>().ToList();
    }

    private List<IOpenApiAny> GetAppOptionsSchemaCollection(ApplicationMetadata appMetadata)
    {
        // Get Altinn 3 library code lists references configured in ApplicationMetadata:
        const string libraryRefRegex =
            @"^lib\*\*(?<org>[a-zA-Z0-9]+)\*\*(?<codeListId>[a-zA-Z0-9_-]+)\*\*(?<version>[a-zA-Z0-9._-]+)$";
        var optionsIds = appMetadata
            .DataTypes.Select(d => d.TaskId)
            .Distinct()
            .Select(taskId => _appResources.GetLayoutModelForTask(taskId))
            .SelectMany(layout => layout?.AllComponents.OfType<OptionsComponent>().Select(oc => oc.OptionsId) ?? [])
            .Where(o => !string.IsNullOrWhiteSpace(o) && Regex.IsMatch(o, libraryRefRegex))
            .Distinct()
            .ToList();

        // Get all ids from IAppOptionsProviders:
        optionsIds.AddRange(_appImplementationFactory.GetAll<IAppOptionsProvider>().Select(a => a.Id));

        // Get Json file names:
        string jsonOptionsFolderPath = Path.Join(_settings.AppBasePath, _settings.OptionsFolder);
        if (Directory.Exists(jsonOptionsFolderPath))
        {
            optionsIds.AddRange(
                Directory
                    .GetFiles(jsonOptionsFolderPath)
                    .Where(x => x.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
                    .Select(Path.GetFileNameWithoutExtension)
            );
        }

        return optionsIds.Select(optionsId => new OpenApiString(optionsId)).Cast<IOpenApiAny>().ToList();
    }

    private void AddRoutsForDataType(OpenApiDocument doc, ApplicationMetadata appMetadata, DataType dataType)
    {
        var tags = new[]
        {
            new OpenApiTag()
            {
                Name = $"{(dataType.AppLogic?.ClassRef is null ? "FileData" : "FormData")} {dataType.Id}",
                Description = $"Operations on data elements of type {dataType.Id}",
            },
        };
        var schema = GetSchemaForDataType(dataType);
        if (schema is not null)
        {
            AddOperationsForFormData(doc, tags, schema, dataType, appMetadata);
        }
        else
        {
            AddRoutesForAttachmentDataType(doc, tags, dataType, appMetadata);
        }
    }

    private void AddOperationsForFormData(
        OpenApiDocument doc,
        OpenApiTag[] tags,
        OpenApiSchema schema,
        DataType dataType,
        ApplicationMetadata appMetadata
    )
    {
        var jsonType = new OpenApiMediaType() { Schema = schema };
        var xmlType = new OpenApiMediaType()
        {
            Schema = new OpenApiSchema()
            {
                Type = "string",
                Format = "binary",
                Title = "Xml",
                Description = $"""See xml schema""",
            },
        };
        doc.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/data/{{dataGuid}}/type/{dataType.Id}",
            new OpenApiPathItem()
            {
                Summary = $"Operations for {dataType.Id}",
                Description = $"CRUD operations for data of type {dataType.Id}",
                Operations =
                {
                    [OperationType.Get] = new OpenApiOperation()
                    {
                        Tags = tags,
                        Summary = "Get data",
                        Description = $"""
                        Get data for a specific data element

                        see [JSON Schema](/{appMetadata.Id}/api/jsonschema/{dataType.Id})
                        """,
                        Responses = Snippets.AddCommonErrorResponses(
                            HttpStatusCode.OK,
                            new OpenApiResponse()
                            {
                                Description = """
                                # Data found

                                The response body contains the data in the format specified by the Accept header.


                                """,
                                Content = { ["application/json"] = jsonType, ["application/xml"] = xmlType },
                            }
                        ),
                    },
                    [OperationType.Put] = new OpenApiOperation()
                    {
                        Tags = tags,
                        Summary = "Replace data element content",
                        Description = "Update data for a specific data element",
                        RequestBody = new OpenApiRequestBody()
                        {
                            Required = true,
                            Content = { ["application/json"] = jsonType, ["application/xml"] = xmlType },
                        },
                        Responses = Snippets.AddCommonErrorResponses(
                            HttpStatusCode.OK,
                            new OpenApiResponse() { Description = "Data replaced" }
                        ),
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.DataGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );
        doc.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/data/type/{dataType.Id}",
            new OpenApiPathItem()
            {
                Summary = $"Operations for {dataType.Id}",
                Description = $"CRUD operations for data of type {dataType.Id}",
                Operations =
                {
                    [OperationType.Post] = new OpenApiOperation()
                    {
                        Tags = tags,
                        Summary = "Create data",
                        Description = "Create data for a specific data element",
                        RequestBody = new OpenApiRequestBody()
                        {
                            Required = true,
                            Content = { ["application/json"] = jsonType, ["application/xml"] = xmlType },
                        },
                        Responses = new()
                        {
                            ["201"] = new OpenApiResponse()
                            {
                                Description = "Data created",
                                Content =
                                {
                                    ["text/json"] = new OpenApiMediaType()
                                    {
                                        Schema = _schemaGenerator.GenerateSchema(
                                            typeof(DataPostResponse),
                                            _schemaRepository
                                        ),
                                    },
                                },
                            },
                            ["400"] = new OpenApiResponse()
                            {
                                Description = "Failed to add data element",
                                Content =
                                {
                                    ["application/json"] = new OpenApiMediaType()
                                    {
                                        Schema = _schemaGenerator.GenerateSchema(
                                            typeof(DataPostErrorResponse),
                                            _schemaRepository
                                        ),
                                    },
                                },
                            },
                        },
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.DataGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );
    }

    private static void AddRoutesForAttachmentDataType(
        OpenApiDocument doc,
        OpenApiTag[] tags,
        DataType dataType,
        ApplicationMetadata appMetadata
    )
    {
        doc.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/data/{{dataGuid}}/type/{dataType.Id}",
            new OpenApiPathItem()
            {
                Summary = $"Operations for {dataType.Id}",
                Description = $"CRUD operations for data of type {dataType.Id}",
                Operations =
                {
                    [OperationType.Get] = new OpenApiOperation()
                    {
                        Tags = tags,
                        Summary = "Get attachment",
                        Description = "Get attachment for a specific data element",
                        Responses = new()
                        {
                            ["200"] = new OpenApiResponse()
                            {
                                Description = "Attachment found",
                                Content =
                                {
                                    ["application/octet-stream"] = new OpenApiMediaType()
                                    {
                                        Schema = new OpenApiSchema() { Format = "binary" },
                                    },
                                },
                            },
                            ["404"] = new OpenApiResponse() { Description = "Attachment not found" },
                        },
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.DataGuidParameterReference,
                    Snippets.LanguageParameterReference,
                ],
            }
        );
        doc.Paths.Add(
            $"/{appMetadata.Id}/instances/{{instanceOwnerPartyId}}/{{instanceGuid}}/data/type/{dataType.Id}",
            new OpenApiPathItem()
            {
                Summary = $"Operations for {dataType.Id}",
                Description = $"CRUD operations for data of type {dataType.Id}",
                Operations =
                {
                    [OperationType.Post] = new OpenApiOperation()
                    {
                        Tags = tags,
                        Summary = "Create attachment",
                        RequestBody = new OpenApiRequestBody()
                        {
                            Required = true,
                            Content =
                                dataType
                                    .AllowedContentTypes?.Distinct()
                                    .ToDictionary(contentType => contentType, contentType => new OpenApiMediaType())
                                ?? new Dictionary<string, OpenApiMediaType>()
                                {
                                    ["application/octet-stream"] = new OpenApiMediaType(),
                                },
                        },
                        Responses = new() { ["201"] = new OpenApiResponse() { Description = "Attachment created" } },
                    },
                },
                Parameters =
                [
                    Snippets.InstanceOwnerPartyIdParameterReference,
                    Snippets.InstanceGuidParameterReference,
                    Snippets.DataGuidParameterReference,
                ],
            }
        );
    }

    private OpenApiSchema? GetSchemaForDataType(DataType dataType)
    {
        var classRef = dataType.AppLogic?.ClassRef;
        if (classRef == null)
        {
            return null;
        }
        var model = _appModel.GetModelType(classRef);
        if (model == null)
        {
            return null;
        }
        var schema = _schemaGenerator.GenerateSchema(model, _schemaRepository);
        schema.Title = dataType.Id;
        schema.Description =
            dataType.Description?.GetValueOrDefault("en")
            ?? dataType.Description?.GetValueOrDefault("nb")
            ?? dataType.Description?.FirstOrDefault().Value;
        return schema;
    }
}

/// <summary>
/// Common parts from the schema generator
/// </summary>
public static class Snippets
{
    /// <summary>
    /// Schema for the POST endpoint for creating a new instance
    /// </summary>
    public static OpenApiSchema InstanceWriteSchema =>
        new()
        {
            Title = "InstanceWrite",
            Properties =
            {
                ["instanceOwner"] = new OpenApiSchema()
                {
                    Type = "object",
                    Title = "Alternate ways to specify the instance owner",
                    Description = "Only one of these should be specified when creating a new instance",
                    Properties =
                    {
                        ["partyId"] = new OpenApiSchema()
                        {
                            Type = "string",
                            Nullable = true,
                            Format = "int32",
                        },
                        ["personNumber"] = new OpenApiSchema()
                        {
                            Type = "string",
                            Nullable = true,
                            Pattern = @"^\d{11}$",
                        },
                        ["organisationNumber"] = new OpenApiSchema()
                        {
                            Type = "string",
                            Nullable = true,
                            Pattern = @"^\d{9}$",
                        },
                        ["username"] = new OpenApiSchema()
                        {
                            Type = "string",
                            Nullable = true,
                            Description =
                                "Initialization based on username is not yet supported (https://github.com/Altinn/app-lib-dotnet/issues/652)",
                        },
                    },
                },
                ["dueBefore"] = new OpenApiSchema() { Type = "string", Format = "date-time" },
                ["visibleAfter"] = new OpenApiSchema() { Type = "string", Format = "date-time" },
            },
        };

    /// <summary>
    /// Schema for patching multiple data elements at once
    /// </summary>
    public static OpenApiSchema PatchSchema =>
        new()
        {
            Title = "Run patches on multiple Form data elements at once",
            Type = "object",
            Properties =
            {
                ["patches"] = new()
                {
                    Type = "array",
                    Items = new()
                    {
                        Type = "object",
                        Required = new HashSet<string>(["dataElementId", "patch"]),
                        Properties =
                        {
                            ["dataElementId"] = new()
                            {
                                Type = "string",
                                Format = "guid",
                                Nullable = false,
                            },
                            ["patch"] = new()
                            {
                                Type = "array",
                                Title = "Json patch",
                                Description = "A standard RFC 6902 document describing changes to one data element",
                                Nullable = false,
                                Items = new()
                                {
                                    Type = "object",
                                    Required = new HashSet<string>() { "op", "path" },
                                    Nullable = false,
                                    Properties =
                                    {
                                        ["op"] = new()
                                        {
                                            Title = "Patch operation",
                                            Type = "string",
                                            Enum =
                                            [
                                                new OpenApiString("add"),
                                                new OpenApiString("remove"),
                                                new OpenApiString("replace"),
                                                new OpenApiString("move"),
                                                new OpenApiString("copy"),
                                                new OpenApiString("test"),
                                            ],
                                        },
                                        ["from"] = new() { Title = "JsonPointer", Type = "string" },
                                        ["path"] = new() { Title = "JsonPointer", Type = "string" },
                                        ["value"] = new()
                                        {
                                            Title = "the value",
                                            Description = "The value to add or replace",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                ["ignoredValidators"] = new()
                {
                    Title = "List of validators to not run incrementally",
                    Description =
                        "This is used for saving server resources, when frontend has a duplicated version of the validator. The validators will be executed on process/next anyway",
                    Items = new() { Type = "string" },
                    Type = "array",
                },
            },
            Required = new HashSet<string>(["patches"]),
        };

    /// <summary>
    /// Reference to the shared instance owner party id parameter
    /// </summary>
    public static OpenApiParameter InstanceOwnerPartyIdParameterReference =>
        new()
        {
            Reference = new OpenApiReference() { Id = "instanceOwnerPartyId", Type = ReferenceType.Parameter },
        };

    /// <summary>
    /// Reference to the shared instance guid parameter
    /// </summary>
    public static OpenApiParameter InstanceGuidParameterReference =>
        new()
        {
            Reference = new OpenApiReference() { Id = "instanceGuid", Type = ReferenceType.Parameter },
        };

    /// <summary>
    /// Reference to the shared data guid parameter
    /// </summary>
    public static OpenApiParameter DataGuidParameterReference =>
        new()
        {
            Reference = new OpenApiReference() { Id = "dataGuid", Type = ReferenceType.Parameter },
        };

    /// <summary>
    /// Reference to the shared language parameter
    /// </summary>
    public static OpenApiParameter LanguageParameterReference =>
        new()
        {
            Reference = new OpenApiReference() { Id = "language", Type = ReferenceType.Parameter },
        };

    /// <summary>
    /// Common parameters that are used multiple places in the api
    /// </summary>
    public static IDictionary<string, OpenApiParameter> CommonParameters =>
        new Dictionary<string, OpenApiParameter>
        {
            [InstanceOwnerPartyIdParameterReference.Reference.Id] = new()
            {
                Name = "instanceOwnerPartyId",
                Description =
                    "PartyId for the owner of the instance, this is Altinn's internal id for the organisation, person or self registered user. Might be the current user, or a party the user has rights to represent.",
                In = ParameterLocation.Path,
                Required = true,
                Schema = new OpenApiSchema() { Type = "integer" },
            },
            [InstanceGuidParameterReference.Reference.Id] = new()
            {
                Name = "instanceGuid",
                Description = "The guid part of instance.Id",
                In = ParameterLocation.Path,
                Required = true,
                Schema = new OpenApiSchema() { Type = "string", Format = "guid" },
            },
            ["dataGuid"] = new()
            {
                Name = "dataGuid",
                Description = "Id of this data element that belongs to an instance",
                In = ParameterLocation.Path,
                Required = true,
                Schema = new OpenApiSchema() { Type = "string", Format = "guid" },
            },
            ["language"] = new()
            {
                Name = "language",
                In = ParameterLocation.Query,
                AllowEmptyValue = false,
                Example = new OpenApiString("nb"),
                Description =
                    "Some apps make changes to the data models or validation based on the active language of the user",
                Required = false,
                Schema = new OpenApiSchema() { Type = "string", Pattern = @"\w\w" },
            },
        };

    /// <summary>
    /// Schema for problem details
    /// </summary>
    public static OpenApiResponse ProblemDetailsResponseSchema =>
        new OpenApiResponse()
        {
            Description = "Problem details",
            Content =
            {
                ["application/problem+json"] = new OpenApiMediaType()
                {
                    Schema = new()
                    {
                        Type = "object",
                        Properties =
                        {
                            ["type"] = new OpenApiSchema()
                            {
                                Type = "string",
                                Nullable = true,
                                Example = new OpenApiString("https://datatracker.ietf.org/doc/html/rfc6902/"),
                            },
                            ["title"] = new OpenApiSchema()
                            {
                                Type = "string",
                                Nullable = true,
                                Example = new OpenApiString("Error in data processing"),
                            },
                            ["status"] = new OpenApiSchema()
                            {
                                Type = "integer",
                                Format = "int32",
                                Nullable = true,
                                Example = new OpenApiInteger(400),
                            },
                            ["detail"] = new OpenApiSchema()
                            {
                                Type = "string",
                                Nullable = true,
                                Example = new OpenApiString("Actually useful description of the error"),
                            },
                            ["instance"] = new OpenApiSchema() { Type = "string", Nullable = true },
                            ["traceId"] = new OpenApiSchema() { Type = "string", Nullable = true },
                        },
                        AdditionalProperties = new()
                        {
                            Title = "Additional properties",
                            Description = "Additional properties can be added to the problem details",
                        },
                    },
                },
            },
        };

    /// <summary>
    /// Security scheme for Altinn token
    /// </summary>
    public static readonly OpenApiSecurityScheme AltinnTokenSecurityScheme = new()
    {
        Reference = new OpenApiReference() { Id = General.AppTokenName, Type = ReferenceType.SecurityScheme },
        Scheme = AuthorizationSchemes.Bearer,
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Description = """
            Get a token for [localtest](http://local.altinn.cloud/Home/Tokens)
            or by exchanging a Maskinporten token with the [token exchange endpoint](https://docs.altinn.studio/api/authentication/spec/#/Authentication/get_exchange__tokenProvider_)
            """,
    };

    /// <summary>
    /// Reference to the ProblemDetails common response
    /// </summary>
    public static readonly OpenApiReference ProblemDetailsResponseReference = new()
    {
        Id = "ProblemDetails",
        Type = ReferenceType.Response,
    };

    /// <summary>
    /// Add common error responses to a response collection
    /// </summary>
    public static OpenApiResponses AddCommonErrorResponses(HttpStatusCode statusCode, OpenApiResponse response)
    {
        var responses = new OpenApiResponses()
        {
            [((int)statusCode).ToString(CultureInfo.InvariantCulture)] = response,
        };
        return AddCommonErrorResponses(responses);
    }

    /// <summary>
    /// Add common error responses to a response collection
    /// </summary>
    public static OpenApiResponses AddCommonErrorResponses(OpenApiResponses responses)
    {
        responses.TryAdd(
            "400",
            new OpenApiResponse() { Description = "Bad request", Reference = ProblemDetailsResponseReference }
        );
        responses.TryAdd(
            "401",
            new OpenApiResponse() { Description = "Unauthorized", Reference = ProblemDetailsResponseReference }
        );
        responses.TryAdd(
            "403",
            new OpenApiResponse() { Description = "Forbidden", Reference = ProblemDetailsResponseReference }
        );
        responses.TryAdd(
            "404",
            new OpenApiResponse() { Description = "Not found", Reference = ProblemDetailsResponseReference }
        );
        responses.TryAdd(
            "500",
            new OpenApiResponse() { Description = "Internal server error", Reference = ProblemDetailsResponseReference }
        );
        return responses;
    }
}

/// <summary>
/// Visitor that modifies the schema after it has been generated
/// </summary>
public class SchemaPostVisitor : OpenApiVisitorBase
{
    /// <inheritdoc />
    public override void Visit(OpenApiSchema schema)
    {
        // Remove `altinnRowId` from the data element schema (they are not intended for external usage)
        schema.Properties.Remove("altinnRowId");

        // openapi has xml extensions, but they can't represent tags with both attributes and values
        // <tag orid="323">value</tag>, so we just zero properties from SwaggerGen
        schema.Xml = null;

        // Mark the id property as required
        if (schema.Properties.TryGetValue("id", out var property))
        {
            property.Nullable = false;
            schema.Required.Add("id");
        }

        // Don't allow additional properties on objects, when the type of the addional properties is not specified
        if (schema.Type == "object" && schema.AdditionalProperties is null)
        {
            schema.AdditionalPropertiesAllowed = false;
        }

        base.Visit(schema);
    }
}
