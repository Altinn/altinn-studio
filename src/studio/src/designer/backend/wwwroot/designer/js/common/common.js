jQuery.validator.setDefaults({
    errorClass: 'form-control-error',
    validClass: 'form-control-success',
    errorElement: 'span',
    highlight: function (element, errorClass, validClass) {
        $(element).closest('.form-group').addClass('has-danger').removeClass('has-success');
        $(element).removeClass('form-control-success').addClass('form-control-danger');
    },
    unhighlight: function (element, errorClass, validClass) {
        $(element).closest('.form-group').addClass('has-success').removeClass('has-danger');
        $(element).removeClass('form-control-danger').addClass('form-control-success');
    }
});