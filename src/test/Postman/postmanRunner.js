var newman = require('newman'); // require newman in your project

// call newman.run to pass `options` object and wait for callback
newman.run({
    collection: require('./collections/Events.postman_collection.json'),
    environment: 'Platform_Altinn_Cloud.postman_environment.json',
    reporters: 'junit'
}, function (err) {
	if (err) { throw err; }
    console.log('collection run complete!');
});