using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Tests.Features.Validators.Default;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;
using DataType = Altinn.Platform.Storage.Interface.Models.DataType;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.SubForm;

public class SubFormTests : IClassFixture<DataAnnotationsTestFixture>
{
    private record MainFormModel(
        [Required] string? Name,
        [MinLength(44)] string? Address,
        string? Phone,
        string? Email
    );

    private record SubFormModel(
        [Required] string? Name,
        string? Address,
        [RegularExpression(@"^\+47\d+")] string? Phone,
        string? Email,
        bool? RequireEmail = false
    );

    private readonly ITestOutputHelper _output;

    private const string Org = "ttd";
    private const string App = "test";
    private const int InstanceOwnerPartyId = 123;
    private const string DefaultDataType = "default";
    private const string MainLayoutId = "layout";
    private const string SubformDataType = "subform";
    private const string SubLayoutId = "subFormLayout";
    private const string TaskId = "Task_1";

    private static readonly string _classRefMain = typeof(MainFormModel).FullName!;
    private static readonly string _classRefSub = typeof(SubFormModel).FullName!;
    private static readonly Guid _instanceGuid = Guid.Parse("12345678-1234-1234-1234-123456789012");
    private static readonly Guid _mainDataElementGuid = Guid.Parse("12345678-1234-1234-1234-123456789013");
    private static readonly Guid _subFormGuid1 = Guid.Parse("12345678-1234-1234-1234-123456789014");
    private static readonly Guid _subFormGuid2 = Guid.Parse("12345678-1234-1234-1234-123456789015");
    private static readonly Guid _subFormGuid3 = Guid.Parse("12345678-1234-1234-1234-123456789016");

    private readonly Instance _instance = new()
    {
        AppId = $"{Org}/{App}",
        Org = Org,
        Id = $"{InstanceOwnerPartyId}/{_instanceGuid}",
        InstanceOwner = new InstanceOwner() { PartyId = InstanceOwnerPartyId.ToString() },
        Data =
        [
            new DataElement() { Id = $"{_mainDataElementGuid}", DataType = DefaultDataType },
            new DataElement() { Id = $"{_subFormGuid1}", DataType = SubformDataType },
            new DataElement() { Id = $"{_subFormGuid2}", DataType = SubformDataType },
            new DataElement() { Id = $"{_subFormGuid3}", DataType = SubformDataType },
        ],
    };

    private static readonly ApplicationMetadata _applicationMetadata = new($"{Org}/{App}")
    {
        Org = Org,
        Id = $"{Org}/{App}",
        DataTypes =
        [
            new DataType()
            {
                Id = DefaultDataType,
                TaskId = TaskId,
                AppLogic = new ApplicationLogic() { ClassRef = _classRefMain },
            },
            new DataType()
            {
                Id = SubformDataType,
                TaskId = TaskId,
                AppLogic = new ApplicationLogic() { ClassRef = _classRefSub },
            },
        ],
    };

    private readonly IOptions<GeneralSettings> _generalSettings = Options.Create(new GeneralSettings());

    private static readonly LayoutSetComponent _mainLayoutComponent = new(
        [
            ParsePage(
                MainLayoutId,
                "MainPage",
                $$"""
                {
                    "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                    "data": {
                      "layout": [
                        {
                          "id": "Name",
                          "type": "Input",
                          "dataModelBindings": {
                            "simpleBinding": "Name"
                          },
                          "required": true
                        },
                        {
                          "id": "Address",
                          "type": "Input",
                          "dataModelBindings": {
                            "simpleBinding": "Address"
                          },
                          "required": true
                        },
                        {
                          "id": "Phone",
                          "type": "Input",
                          "dataModelBindings": {
                            "simpleBinding": "Phone"
                          },
                          "required": true
                        },
                        {
                          "id": "SubForm",
                          "type": "SubForm",
                          "layoutSet": "{{SubLayoutId}}"
                        }
                      ]
                    }
                }
                """
            ),
        ],
        MainLayoutId,
        _applicationMetadata.DataTypes[0]
    );

    private static readonly LayoutSetComponent _subLayoutComponent = new(
        [
            ParsePage(
                SubLayoutId,
                "SubPage",
                """
                {
                "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                "data": {
                  "layout": [
                    {
                      "id": "Name",
                      "type": "Input",
                      "dataModelBindings": {
                        "simpleBinding": {
                          "field": "Name",
                          "dataType": "subform"
                        }
                      },
                      "required": true
                    },
                    {
                      "id": "Address",
                      "type": "Input",
                      "dataModelBindings": {
                        "simpleBinding": "Address"
                      },
                      "required": true
                    },
                    {
                      "id": "Phone",
                      "type": "Input",
                      "dataModelBindings": {
                        "simpleBinding": "Phone"
                      },
                      "required": true
                    },
                    {
                      "id": "Email",
                      "type": "Input",
                      "dataModelBindings": {
                        "simpleBinding": "Email"
                      },
                      "required": ["dataModel", "RequireEmail"]
                    }
                  ]
                }}
                """
            ),
        ],
        SubLayoutId,
        _applicationMetadata.DataTypes[1]
    );

    private static readonly string _defaultValidationConfig = Json(
        """
        {
          "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/validation/validation.schema.v1.json",
          "validations": {
              "Phone": [
              "Phone-is-not-allowed",
              "Phone-is-allowed"
              ]
            },
            "definitions": {
              "Phone-is-not-allowed": {
                "message": "Phone should not be \"Phone\"",
                "severity": "error",
                "condition": ["equals", ["dataModel", ["argv", 0]], "Phone"]
              },
              "Phone-is-allowed": {
                "message": "Phone should be \"Phone\"",
                "severity": "error",
                "condition": ["notEquals", ["dataModel", ["argv", 0]], "Phone"]
              }
            }
        }
        """
    );

    private static readonly string _subformValidationConfig = Json(
        """
        {
          "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/validation/validation.schema.v1.json",
          "validations": {
              "Phone": ["phone2-is-not-allowed"],
              "missing-in-model": ["none-is-not-allowed"]
            },
            "definitions": {
              "phone2-is-not-allowed": {
                "message": "Phone should not be \"Phone2\", but only single error when not null",
                "severity": "error",
                "condition": ["equals", ["dataModel", ["argv", 0]], "Phone2"]
              },
              "none-is-not-allowed": {
                "message": "none is not allowed",
                "severity": "error",
                "condition": true
              }
            }
        }
        """
    );

    private readonly Mock<IAppResources> _appResourcesMock = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);
    private readonly Mock<ITranslationService> _translationServiceMock = new(MockBehavior.Loose);
    private readonly Mock<IHttpContextAccessor> _httpContextAccessorMock = new(MockBehavior.Loose);
    private readonly Mock<IDataElementAccessChecker> _dataElementAccessCheckerMock = new(MockBehavior.Strict);

    private readonly IServiceCollection _services = new ServiceCollection();
    private static readonly JsonSerializerOptions _options = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };
    private VerifySettings _verifySettings
    {
        get
        {
            var settings = new VerifySettings();
            settings.AddNamedGuid(_mainDataElementGuid, "MainDataElementGuid");
            settings.AddNamedGuid(_subFormGuid1, "SubForm1_Guid");
            settings.AddNamedGuid(_subFormGuid2, "SubForm2_Guid");
            settings.AddNamedGuid(_subFormGuid3, "SubForm3_Guid");
            return settings;
        }
    }

    public SubFormTests(ITestOutputHelper output, DataAnnotationsTestFixture fixture)
    {
        _dataElementAccessCheckerMock
            .Setup(x => x.CanRead(It.IsAny<Instance>(), It.IsAny<DataType>()))
            .ReturnsAsync(true);

        _output = output;
        _services.AddAppImplementationFactory();
        _services.AddSingleton(_appResourcesMock.Object);
        _services.AddSingleton(_appMetadataMock.Object);
        _services.AddSingleton(_translationServiceMock.Object);
        _services.AddSingleton(_httpContextAccessorMock.Object);
        _services.AddSingleton(_dataElementAccessCheckerMock.Object);
        _services.AddSingleton(fixture.App.Services.GetRequiredService<IObjectModelValidator>());
        _services.AddSingleton(_generalSettings);
        _services.AddTransient<IValidationService, ValidationService>();
        _services.AddTransient<IValidatorFactory, ValidatorFactory>();
        _services.AddTransient<ILayoutEvaluatorStateInitializer, LayoutEvaluatorStateInitializer>();

        _services.AddFakeLoggingWithXunit(output);
        _appMetadataMock.Setup(m => m.GetApplicationMetadata()).ReturnsAsync(_applicationMetadata);
        _appResourcesMock
            .Setup(ar => ar.GetLayoutModelForTask(TaskId))
            .Returns(new LayoutModel([_mainLayoutComponent, _subLayoutComponent], null));
        _appResourcesMock
            .Setup(ar => ar.GetLayoutSet())
            .Returns(
                new LayoutSets()
                {
                    Sets =
                    [
                        new LayoutSet()
                        {
                            Id = "layoutId",
                            Tasks = [TaskId],
                            DataType = DefaultDataType,
                        },
                    ],
                }
            );
        _appResourcesMock.Setup(ar => ar.GetValidationConfiguration(DefaultDataType)).Returns(_defaultValidationConfig);
        _appResourcesMock.Setup(ar => ar.GetValidationConfiguration(SubformDataType)).Returns(_subformValidationConfig);
        _httpContextAccessorMock.SetupGet(hca => hca.HttpContext).Returns(new DefaultHttpContext());
    }

    [Fact]
    public async Task Test1()
    {
        _services.AddTransient<IValidator, RequiredLayoutValidator>();
        _services.AddTransient<IFormDataValidator, DataAnnotationValidator>();
        _services.AddTransient<IValidator, ExpressionValidator>();
        using var serviceProvider = _services.BuildStrictServiceProvider();

        var validationService = serviceProvider.GetRequiredService<IValidationService>();
        var dataAccessor = new InstanceDataAccessorFake(_instance, _applicationMetadata)
        {
            { _instance.Data[0], new MainFormModel("Name", "Address", "Phone", null) },
            { _instance.Data[1], new SubFormModel(null, null, null, null, false) },
            { _instance.Data[2], new SubFormModel("Name2", "Address2", "Phone2", null, true) },
            { _instance.Data[3], new SubFormModel(null, null, null, null, null) },
        };

        var issues = await validationService.ValidateInstanceAtTask(dataAccessor, TaskId, null, null, null);
        _output.WriteLine(JsonSerializer.Serialize(issues, _options));

        // Order of issues is not guaranteed, so we sort them before verification
        await Verify(issues.OrderBy(i => JsonSerializer.Serialize(i)), _verifySettings);
    }

    private static PageComponent ParsePage(string layoutId, string pageName, [StringSyntax("json")] string json)
    {
        PageComponentConverter.SetAsyncLocalPageName(layoutId, pageName);
        return JsonSerializer.Deserialize<PageComponent>(json) ?? throw new JsonException("Deserialization failed");
    }

    private static string Json([StringSyntax("json")] string json) => json;

    ~SubFormTests()
    {
        _appResourcesMock?.Verify();
        _appMetadataMock?.Verify();
    }
}
