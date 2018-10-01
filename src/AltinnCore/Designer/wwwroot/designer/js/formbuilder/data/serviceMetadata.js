define([
       "jquery"
], function ($) {
    var that = this;
    return {
        initialize: function () {
            that = this;
        },
        getServiceMetadata: function (org, service, edition, callback) {
            $.getJSON("/designer/" + org + "/" + service + "/" + edition + "/Edition/GetMetadata",
                {
                },
                callback
            );
        }
    };
});
