define([
       "jquery",
       "bootstrap",
       "jqueryui",
       "lib/rivets",
       "modelautocomplete"
], function ($, bootstrap, ui, Rivets, modelautocomplete) {
    var that = this;
    return {
        initialize: function () {
            that = this;
            that.orgId = $('#orgId').val();
            that.serviceId = $('#serviceId').val();
            that.editionId = $('#editionId').val();

            if ($('#ruleId')) {
                that.ruleId = $('#ruleId').val();
            }

            Rivets.formatters.longerthan = function (value, arg) {
                return value.length > arg.length;
            };

            Rivets.formatters.gt = function (value, arg) {
                console.log(arg);
                return value > arg.length - 2;
            }
 
            var rulecontainers = [
                {
                    name: "",
                    conditions: [{
                        parameters: [],
                        delimiter: {value:""}
                    }],
                    rules: [{
                        parameters: []
                    }]
                }
            ];

            var delimitertypes = [
                {
                    Name: "and",
                    Value: " && "
                },
                {
                    Name: "or",
                    Value: " || "
                }
            ];

            var generateRule = function () {
                var url = '/designer/Rules/Create?org=' + that.orgId + '&service=' + that.serviceId + '&edition=' + that.editionId;
                $.ajax({
                    type: 'POST',
                    contentType: "application/json; charset=UTF-8",
                    url: url,
                    data: JSON.stringify(rulecontainers[0]),
                    success: function (e) {
                        location.href = "/designer/Rules/Update/" + that.orgId + "/" + that.serviceId + "/" + that.editionId + "?id=" + e.id;
                        $('#outputTarget').text(e);
                    },
                });
            }

            var saveRule = function () {
                var url = '/designer/Rules/Update?org=' + that.orgId + '&service=' + that.serviceId + '&edition=' + that.editionId + '&id=' + that.ruleId;
                $.ajax({
                    type: 'POST',
                    contentType: "application/json; charset=UTF-8",
                    url: url,
                    data: JSON.stringify(rulecontainers[0]),
                    success: function (e) {
                        $('#saveConfirmation').show();
                    },
                });
            }

            var conditiontypes = [];
            var ruletypes = {};
            var serviceMetadata = {};
            

            var addCondition = function () {
                rulecontainers[0].conditions.push({
                    parameters: [],
                    delimiter: {value: ""}
                });
                $('.model-autocomplete').autocomplete({ modelAutocomplete: true, serviceMetadata: serviceMetadata });
            }

            var addRule = function() {
                rulecontainers[0].rules.push({
                    parameters: []
                });
                $('.model-autocomplete').autocomplete({ modelAutocomplete: true, serviceMetadata: serviceMetadata });
            }

            var actionChanged = function(e, item) {
                var index = $(this).parent().children('.indexInput').val();
                var that = this;
                rulecontainers[0].rules[index].ruleTypeId = $(this).val();
                $.each(ruletypes, function () {
                    if (this.id == $(that).val()) {
                        rulecontainers[0].rules[index].ruleType = this;
                        rulecontainers[0].rules[index].parameters = [];
                        $.each(this.parameters, function () {
                            rulecontainers[0].rules[index].parameters.push({
                                index: this.index,
                                desc: this.description
                            });
                        });
                    }
                });

                $('.model-autocomplete').autocomplete({ modelAutocomplete: true, serviceMetadata: serviceMetadata });
            }
            
            var conditionChanged = function (e, item) {
                var index = $(this).parent().children('.indexInput').val();
                var that = this;
                rulecontainers[0].conditions[index].conditionTypeId = $(this).val();
                $.each(conditiontypes, function () {
                    if (this.id == $(that).val()) {
                        rulecontainers[0].conditions[index].conditionType = this;
                        rulecontainers[0].conditions[index].parameters = [];
                        $.each(this.parameters, function () {
                            rulecontainers[0].conditions[index].parameters.push({
                                index: this.index,
                                desc: this.description
                            });
                        });
                    }
                });

                $('.model-autocomplete').autocomplete({ modelAutocomplete: true, serviceMetadata: serviceMetadata });
            }

            Rivets.formatters.index = function (arr, indexParam) {
                if (indexParam + 1 < arr.length) {
                    return [arr[indexParam]];
                }
            }

            $.getJSON("/designer/Rules/GetById",
               {
                   org: that.orgId,
                   service: that.serviceId,
                   edition: that.editionId,
                   id: that.ruleId
               },
               function (data) {
                   rulecontainers = [data]
               }
           )

            $.when(
                $.getJSON("/designer/Rules/GetConditionTypes/",
                    {
                        org: that.orgId,
                        service: that.serviceId,
                        edition: that.editionId
                    },
                    function (data) {
                        conditiontypes = data;
                    }
                ),
                $.getJSON("/designer/Rules/GetRuleTypes/",
                    {
                        org: that.orgId,
                        service: that.serviceId,
                        edition: that.editionId
                    },
                    function (data) {
                        ruletypes = data;
                    }
                 ),
                 $.getJSON("/designer/Edition/GetMetadata/",
                    {
                        org: that.orgId,
                        service: that.serviceId,
                        edition: that.editionId
                    },
                    function (data) {
                        serviceMetadata = data;
                    }
                 )
            ).then(function () {
                $('#ruleAutoComplete').autocomplete({ ruleCreator: true, serviceMetadata: serviceMetadata });

                for (var x = 0; x < rulecontainers[0].conditions.length; x++) {
                    $.each(conditiontypes, function () {
                        if (this.id === rulecontainers[0].conditions[x].conditionTypeId) {
                            rulecontainers[0].conditions[x].conditiontype = this;
                            $.each(this.parameters, function () {
                                var configParam = this;
                                $.each(rulecontainers[0].conditions[x].parameters, function () {
                                    if (this.index === configParam.index) {
                                        this.desc = configParam.description;
                                    }
                                })
                            });
                        }
                    });
                }

                for (var i = 0; i < rulecontainers[0].rules.length; i++) {
                    $.each(ruletypes, function () {
                        if (this.id === rulecontainers[0].rules[i].ruleTypeId) {
                            rulecontainers[0].rules[i].ruletype = this;
                            $.each(this.parameters, function () {
                                var configParam = this;
                                $.each(rulecontainers[0].rules[i].parameters, function () {
                                    if (this.index === configParam.index) {
                                        this.desc = configParam.description;
                                    }
                                })
                            });
                        }
                    });
                }

                Rivets.bind($('#rules'), {
                    rulecontainers: rulecontainers,
                    conditiontypes: conditiontypes,
                    ruletypes: ruletypes,
                    conditionChanged: conditionChanged,
                    actionChanged: actionChanged,
                    delimitertypes: delimitertypes
                });

                $('#addConditionBtn').on('click', function () { addCondition(); });
                $('#addRuleBtn').on('click', function () { addRule(); });
                $('#generateRuleBtn').on('click', function () { generateRule(); });
                $('#saveRuleBtn').on('click', function () { saveRule(); });

                $('#loadingContainer').hide();
                $('#ruleContainer').show();
                $('.model-autocomplete').autocomplete({ modelAutocomplete: true, serviceMetadata: serviceMetadata });
            }).fail(function () {
                console.log('Initialization failed....');
            });
        }
    };
});