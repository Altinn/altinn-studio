using System.Collections.Generic;

using Altinn.Platform.Register.Filters;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;

using Moq;

using Xunit;

namespace Altinn.Platform.Register.IntegrationTest.TestingFilters
{
    public class ValidateModelStateAttributeTests
    {
        private ValidateModelStateAttribute target;        

        /// <summary>
        /// Initialises a new instance of the <see cref="ValidateModelStateAttributeTests"/> class.
        /// </summary>
        /// <remarks>
        /// With Xunit the entire test class is initialized again for every test method.
        /// </remarks>
        /// <param name="factory">The WebApplicationFactory to use when creating a test server.</param>
        public ValidateModelStateAttributeTests()
        {
            target = new ValidateModelStateAttribute();
        }

        [Fact]
        public void OnActionExecuting_InputContextAlreadyHaveResult_ReturnsUnchanged()
        {
            // Arrange
            ModelStateDictionary modelState = new ModelStateDictionary();
            modelState.AddModelError("name", "invalid");

            ActionExecutingContext context = CreateActionExecutingContext(modelState, new NotFoundResult());

            // Act
            target.OnActionExecuting(context);

            // Assert
            Assert.IsType<NotFoundResult>(context.Result);
        }

        [Fact]
        public void OnActionExecuting_ModelStateContainsErrors_ReturnsBadRequest()
        {
            // Arrange
            ModelStateDictionary modelState = new ModelStateDictionary();
            modelState.AddModelError("name", "invalid");

            ActionExecutingContext context = CreateActionExecutingContext(modelState);

            // Act
            target.OnActionExecuting(context);

            // Assert
            Assert.IsType<BadRequestObjectResult>(context.Result);
        }

        [Fact]
        public void OnActionExecuting_ModelStateIsEmpty_ReturnsNullResult()
        {
            // Arrange
            ModelStateDictionary modelState = new ModelStateDictionary();

            ActionExecutingContext context = CreateActionExecutingContext(modelState);

            // Act
            target.OnActionExecuting(context);

            // Assert
            Assert.Null(context.Result);
        }

        private ActionExecutingContext CreateActionExecutingContext(ModelStateDictionary modelState, IActionResult result = null)
        {
            ActionExecutingContext context = new ActionExecutingContext(
                new ActionContext(
                    Mock.Of<HttpContext>(),
                    Mock.Of<RouteData>(),
                    Mock.Of<ActionDescriptor>(),
                    modelState
                ),
                new List<IFilterMetadata>(),
                new Dictionary<string, object>(),
                new Mock<Controller>().Object);

            context.Result = result;

            return context;
        }
    }
}
