using Altinn.App.Api.Helpers.RequestHandling;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Api.Tests.Helpers.RequestHandling;

public class DataRestrictionValidationTests
{
    [Fact]
    public void CompliesWithDataRestrictions_returns_false_with_badrequest_if_contentdisposition_not_set()
    {
        var httpContext = new DefaultHttpContext();
        (bool valid, List<ValidationIssue> errors) = DataRestrictionValidation.CompliesWithDataRestrictions(
            httpContext.Request,
            new DataType()
        );
        valid.Should().BeFalse();
        errors.Should().NotBeNull();
        errors.FirstOrDefault().Should().BeOfType(typeof(ValidationIssue));
        errors
            .FirstOrDefault()
            ?.Description.Should()
            .BeEquivalentTo("Invalid data provided. Error: The request must include a Content-Disposition header");
    }

    [Fact]
    public void CompliesWithDataRestrictions_returns_false_with_413_status_if_contentlength_greater_than_maxSize()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.ContentLength = 1000000000000;
        httpContext.Request.Headers.ContentDisposition = "attachment; filename=test.pdf";
        var dataType = new DataType() { MaxSize = 1 };
        (bool valid, List<ValidationIssue> errors) = DataRestrictionValidation.CompliesWithDataRestrictions(
            httpContext.Request,
            dataType
        );
        valid.Should().BeFalse();
        errors.Should().NotBeNull();
        errors.Should().BeOfType(typeof(List<ValidationIssue>));
        errors
            .FirstOrDefault()!
            .Description.Should()
            .BeEquivalentTo("Invalid data provided. Error: Binary attachment exceeds limit of 1048576");
    }

    [Fact]
    public void CompliesWithDataRestrictions_returns_false_with_badrequest_status_if_filename_not_supplied()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.ContentLength = 1000;
        httpContext.Request.Headers.ContentDisposition = "attachment";
        var dataType = new DataType() { MaxSize = 1 };
        (bool valid, List<ValidationIssue> errors) = DataRestrictionValidation.CompliesWithDataRestrictions(
            httpContext.Request,
            dataType
        );
        valid.Should().BeFalse();
        errors.Should().NotBeNull();
        errors.Should().BeOfType(typeof(List<ValidationIssue>));
        errors
            .FirstOrDefault()!
            .Description.Should()
            .BeEquivalentTo(
                "Invalid data provided. Error: The Content-Disposition header must contain a valid filename"
            );
    }

    [Fact]
    public void CompliesWithDataRestrictions_returns_false_with_badrequest_status_if_filename_without_extension()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.ContentLength = 1000;
        httpContext.Request.Headers.ContentDisposition = "attachment; filename=test";
        var dataType = new DataType() { MaxSize = 1 };
        (bool valid, List<ValidationIssue> errors) = DataRestrictionValidation.CompliesWithDataRestrictions(
            httpContext.Request,
            dataType
        );
        valid.Should().BeFalse();
        errors.Should().NotBeNull();
        errors.Should().BeOfType(typeof(List<ValidationIssue>));
        errors
            .FirstOrDefault()!
            .Description.Should()
            .BeEquivalentTo(
                "Invalid data provided. Error: Invalid format for filename: test. Filename is expected to end with '.{filetype}'."
            );
    }

    [Fact]
    public void CompliesWithDataRestrictions_returns_true_if_contentdisposition_filesize_and_no_allowed_datatypes_set_on_datatype()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.ContentLength = 1000;
        httpContext.Request.Headers.ContentDisposition = "attachment; filename=test.pdf";
        var dataType = new DataType() { MaxSize = 1 };
        (bool valid, List<ValidationIssue> errors) = DataRestrictionValidation.CompliesWithDataRestrictions(
            httpContext.Request,
            dataType
        );
        valid.Should().BeTrue();
        errors.Should().BeEmpty();
    }

    [Fact]
    public void CompliesWithDataRestrictions_returns_true_if_contentdisposition_filesize_and_emptylist_allowed_datatypes_set_on_datatype()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.ContentLength = 1000;
        httpContext.Request.Headers.ContentDisposition = "attachment; filename=test.pdf";
        var dataType = new DataType() { MaxSize = 1, AllowedContentTypes = new List<string>() };
        (bool valid, List<ValidationIssue> errors) = DataRestrictionValidation.CompliesWithDataRestrictions(
            httpContext.Request,
            dataType
        );
        valid.Should().BeTrue();
        errors.Should().BeEmpty();
    }

    [Fact]
    public void CompliesWithDataRestrictions_returns_false_if_contenttype_not_set_and_allowedcontenttypes_defined()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.ContentLength = 1000;
        httpContext.Request.Headers.ContentDisposition = "attachment; filename=test.pdf";
        var dataType = new DataType()
        {
            MaxSize = 1,
            AllowedContentTypes = new List<string>() { "application/pdf" },
        };
        (bool valid, List<ValidationIssue> errors) = DataRestrictionValidation.CompliesWithDataRestrictions(
            httpContext.Request,
            dataType
        );
        valid.Should().BeFalse();
        errors.Should().NotBeNull();
        errors.Should().BeOfType(typeof(List<ValidationIssue>));
        errors
            .FirstOrDefault()!
            .Description.Should()
            .BeEquivalentTo("Invalid data provided. Error: Content-Type header must be included in request.");
    }

    [Fact]
    public void CompliesWithDataRestrictions_returns_false_if_contenttype_not_defined_in_allowedcontenttypes()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.ContentLength = 1000;
        httpContext.Request.Headers.ContentDisposition = "attachment; filename=test.json";
        httpContext.Request.Headers.ContentType = "application/json";
        var dataType = new DataType()
        {
            MaxSize = 1,
            AllowedContentTypes = new List<string>() { "application/pdf" },
        };
        (bool valid, List<ValidationIssue> errors) = DataRestrictionValidation.CompliesWithDataRestrictions(
            httpContext.Request,
            dataType
        );
        valid.Should().BeFalse();
        errors.Should().NotBeNull();
        errors.Should().BeOfType(typeof(List<ValidationIssue>));
        errors
            .FirstOrDefault()!
            .Description.Should()
            .BeEquivalentTo(
                "Invalid data provided. Error: Invalid content type: application/json. Please try another file. Permitted content types include: application/pdf"
            );
    }

    [Fact]
    public void CompliesWithDataRestrictions_returns_false_if_fileextension_not_matching_contenttype()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.ContentLength = 1000;
        httpContext.Request.Headers.ContentDisposition = "attachment; filename=test.json";
        httpContext.Request.Headers.ContentType = "application/pdf";
        var dataType = new DataType()
        {
            MaxSize = 1,
            AllowedContentTypes = new List<string>() { "application/pdf", "application/json" },
        };
        (bool valid, List<ValidationIssue> errors) = DataRestrictionValidation.CompliesWithDataRestrictions(
            httpContext.Request,
            dataType
        );
        valid.Should().BeFalse();
        errors.Should().NotBeNull();
        errors.Should().BeOfType(typeof(List<ValidationIssue>));
        errors
            .FirstOrDefault()!
            .Description.Should()
            .BeEquivalentTo(
                "Invalid data provided. Error: Content type header application/pdf does not match mime type application/json for uploaded file. Please fix header or upload another file."
            );
    }

    [Fact]
    public void CompliesWithDataRestrictions_returns_true_when_all_checks_pass()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.ContentLength = 1000;
        httpContext.Request.Headers.ContentDisposition = "attachment; filename=test.json";
        httpContext.Request.Headers.ContentType = "application/json";
        var dataType = new DataType()
        {
            MaxSize = 1,
            AllowedContentTypes = new List<string>() { "application/pdf", "application/json" },
        };
        (bool valid, List<ValidationIssue> errors) = DataRestrictionValidation.CompliesWithDataRestrictions(
            httpContext.Request,
            dataType
        );
        valid.Should().BeTrue();
        errors.Should().BeEmpty();
    }

    [Fact]
    public void CompliesWithDataRestrictions_returns_true_when_octetstream_in_allow_list()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.ContentLength = 1000;
        httpContext.Request.Headers.ContentDisposition = "attachment; filename=test.json";
        httpContext.Request.Headers.ContentType = "application/json";
        var dataType = new DataType()
        {
            MaxSize = 1,
            AllowedContentTypes = new List<string>() { "application/pdf", "application/octet-stream" },
        };
        (bool valid, List<ValidationIssue> errors) = DataRestrictionValidation.CompliesWithDataRestrictions(
            httpContext.Request,
            dataType
        );
        valid.Should().BeTrue();
        errors.Should().BeEmpty();
    }

    [Fact]
    public void CompliesWithDataRestrictions_returns_true_when_octetstream_in_allow_list_and_content_type_is_octetstream()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers.ContentLength = 1000;
        httpContext.Request.Headers.ContentDisposition = "attachment; filename=test.json";
        httpContext.Request.Headers.ContentType = "application/octet-stream";
        var dataType = new DataType()
        {
            MaxSize = 1,
            AllowedContentTypes = new List<string>() { "application/pdf", "application/octet-stream" },
        };
        (bool valid, List<ValidationIssue> errors) = DataRestrictionValidation.CompliesWithDataRestrictions(
            httpContext.Request,
            dataType
        );
        valid.Should().BeTrue();
        errors.Should().BeEmpty();
    }
}
