using Altinn.App.Api.Controllers;
using Altinn.App.Core.Internal.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.App.Api.Infrastructure.Filters;

internal sealed class InstanceStateConflictExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is not InstanceStateConflictException exception)
        {
            return;
        }

        context.Result = new ConflictObjectResult(InstanceStateConflictResult.Create(exception));
        context.ExceptionHandled = true;
    }
}
