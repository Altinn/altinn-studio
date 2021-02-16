using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.AppLogic;
using Altinn.App.AppLogic.Calculation;
using Altinn.App.AppLogic.Print;
using Altinn.App.AppLogic.Validation;
using Altinn.App.Common.Enums;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Implementation
{
    public class TestBase
    {
#pragma warning disable SA1401 // Fields should be private
        protected readonly Mock<IOptions<PlatformSettings>> platformSettingsOptions;
        protected readonly Mock<IOptionsMonitor<AppSettings>> appSettingsOptions;
        protected readonly Mock<HttpMessageHandler> handlerMock;
        protected readonly Mock<IHttpContextAccessor> contextAccessor;
        protected readonly Mock<ILogger<TestApp>> logger;
        protected readonly Mock<IAppResources> resourceService;
        protected readonly Mock<IData> dataService;
        protected readonly Mock<IProcess> processService;
        protected readonly Mock<IPDF> pdfService;
        protected readonly Mock<IPrefill> prefillService;
        protected readonly Mock<IInstance> instanceService;
        protected readonly Mock<IRegister> registerService;
        protected readonly Mock<IOptions<GeneralSettings>> settings;
        protected readonly Mock<IProfile> profileService;
        protected readonly Mock<IText> textService;

        protected static readonly string TASK_ID_1 = "Task_1";
        protected static readonly string DATATYPE_ID_1 = "datatype1";
        protected static readonly string DATAELEMENT_ID_1 = "00000000-0000-0000-0000-000000000001";
        protected static readonly string DATAELEMENT_ID_2 = "00000000-0000-0000-0000-000000000002";
        protected static readonly string INSTANCE_OWNER_ID = "12345";
        protected static readonly int PARTY_ID = 12345;
        protected static readonly string COOKIE_NAME = "cookiename";
#pragma warning restore SA1401 // Fields should be private

        public TestBase()
        {
            platformSettingsOptions = new Mock<IOptions<PlatformSettings>>();
            appSettingsOptions = new Mock<IOptionsMonitor<AppSettings>>();
            handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            contextAccessor = new Mock<IHttpContextAccessor>();

            var userContext2 = new Mock<HttpContext>();
            var cookieCollection = new Mock<IRequestCookieCollection>();
            var cookieList = new List<KeyValuePair<string, string>>
            {
                new KeyValuePair<string,string>("cookiename", "cookievalue")
            };
            cookieCollection.Setup(m => m.GetEnumerator()).Returns(cookieList.GetEnumerator());
            cookieCollection.Setup(m => m.ContainsKey(COOKIE_NAME)).Returns(true);
            userContext2.Setup(m => m.Request.Cookies).Returns(cookieCollection.Object);

            userContext2.Setup(m => m.User).Returns(new ClaimsPrincipal(new List<ClaimsIdentity>
            {
                new ClaimsIdentity(new List<Claim>
                {
                    new Claim(AltinnCoreClaimTypes.UserName, "mr test")
                })
            }));

            contextAccessor.Setup(m => m.HttpContext).Returns(userContext2.Object);
            logger = new Mock<ILogger<TestApp>>();
            resourceService = new Mock<IAppResources>();
            resourceService.Setup(m => m.GetApplication()).Returns(new Application()
            {
                DataTypes = new List<DataType>
                {
                    new DataType
                    {
                        TaskId = TASK_ID_1,
                        Id = DATATYPE_ID_1,
                        AppLogic = new ApplicationLogic { ClassRef = typeof(DummyForm).FullName }
                    }
                }
            });
            
            resourceService.Setup(m => m.GetOptions(It.IsAny<string>())).Returns(new List<AppOption>
            {
                new AppOption { Label = "label", Value = "value" }
            });
            dataService = new Mock<IData>();
            processService = new Mock<IProcess>();
            pdfService = new Mock<IPDF>();
            Stream stream = new MemoryStream(Encoding.UTF8.GetBytes("whatever"));
            pdfService.Setup(m => m.GeneratePDF(It.IsAny<PDFContext>()).Result).Returns(stream);
            prefillService = new Mock<IPrefill>();
            instanceService = new Mock<IInstance>();
            registerService = new Mock<IRegister>();
            settings = new Mock<IOptions<GeneralSettings>>();

            settings.Setup(m => m.Value).Returns(new GeneralSettings
            {
                AltinnPartyCookieName = COOKIE_NAME
            });
            profileService = new Mock<IProfile>();

            profileService.Setup(m => m.GetUserProfile(It.IsAny<int>()).Result).Returns(new UserProfile
            {
                Party = new Party
                {
                    PartyId = PARTY_ID
                },
                ProfileSettingPreference = new ProfileSettingPreference
                {
                    Language = "nb"
                }
            });
            textService = new Mock<IText>();
            textService.Setup(m => m.GetText(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()).Result)
                .Returns(new TextResource
                {
                    Id = "TestId",
                    Language = "nb",
                    Org = "test",
                    Resources = new List<TextResourceElement>
                    {
                        new TextResourceElement { Id = "TestId", Value = "Test string" }
                    }
                });
        }

        protected Instance GetInstance(Guid instanceId)
        {
            return new Instance
            {
                Id = INSTANCE_OWNER_ID + "/" + instanceId,
                AppId = "test/testapp",
                Org = "test",
                InstanceOwner = new InstanceOwner { PartyId = PARTY_ID.ToString() },
                Data = new List<DataElement>
                {
                    new DataElement()
                    {
                        DataType = DATATYPE_ID_1,
                        Id = DATAELEMENT_ID_1
                    },
                    new DataElement()
                    {
                        DataType = DATATYPE_ID_1,
                        Id = DATAELEMENT_ID_2
                    }
                }
            };
        }

        protected IAltinnApp GetApp()
        {
            return new TestApp(
                resourceService.Object,
                logger.Object,
                dataService.Object,
                processService.Object,
                pdfService.Object,
                profileService.Object,
                registerService.Object,
                prefillService.Object,
                instanceService.Object,
                settings.Object,
                textService.Object,
                contextAccessor.Object);
        }
    }

    public class DummyForm
    {
        public string Hello { get; set; }
    }

    public class TestApp : AppBase, IAltinnApp
    {
        private readonly ILogger<TestApp> _logger;
        private readonly ValidationHandler _validationHandler;
        private readonly CalculationHandler _calculationHandler;
        private readonly InstantiationHandler _instantiationHandler;
        private readonly PdfHandler _pdfHandler;

        public TestApp(
            IAppResources appResourcesService,
            ILogger<TestApp> logger,
            IData dataService,
            IProcess processService,
            IPDF pdfService,
            IProfile profileService,
            IRegister registerService,
            IPrefill prefillService,
            IInstance instanceService,
            IOptions<GeneralSettings> settings,
            IText textService,
            IHttpContextAccessor httpContextAccessor) : base(
                appResourcesService,
                logger,
                dataService,
                processService,
                pdfService,
                prefillService,
                instanceService,
                registerService,
                settings,
                profileService,
                textService,
                httpContextAccessor)
        {
            _logger = logger;
            _validationHandler = new ValidationHandler(httpContextAccessor);
            _calculationHandler = new CalculationHandler();
            _instantiationHandler = new InstantiationHandler(profileService, registerService);
            _pdfHandler = new PdfHandler();
        }

        public override object CreateNewAppModel(string classRef)
        {
            Type appType = Type.GetType(classRef);
            return Activator.CreateInstance(appType);
        }

        /// <inheritdoc />
        public override Type GetAppModelType(string classRef)
        {
            return Type.GetType(classRef);
        }

        public override async Task<bool> RunAppEvent(AppEventType appEvent, object model, ModelStateDictionary modelState = null)
        {
            return await Task.FromResult(true);
        }

        public override async Task RunDataValidation(object data, ModelStateDictionary validationResults)
        {
            await _validationHandler.ValidateData(data, validationResults);
        }

        public override async Task RunTaskValidation(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            await _validationHandler.ValidateTask(instance, taskId, validationResults);
        }

        public override async Task<bool> RunCalculation(object data)
        {
            return await _calculationHandler.Calculate(data);
        }

        public override async Task<InstantiationValidationResult> RunInstantiationValidation(Instance instance)
        {
            return await _instantiationHandler.RunInstantiationValidation(instance);
        }

        public override async Task RunDataCreation(Instance instance, object data)
        {
            await _instantiationHandler.DataCreation(instance, data);
        }

        public override Task<AppOptions> GetOptions(string id, AppOptions options)
        {
            return Task.FromResult(options);
        }

        public override async Task RunProcessTaskEnd(string taskId, Instance instance)
        {
            await Task.CompletedTask;
        }

        public override async Task<LayoutSettings> FormatPdf(LayoutSettings layoutSettings, object data)
        {
            return await _pdfHandler.FormatPdf(layoutSettings, data);
        }
    }
}
