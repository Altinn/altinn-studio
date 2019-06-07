#Naive runner for newman postman cli tool. Add a new line with your new collection and environment
newman run ./collections/Altinn-platform-SBL-integration.postman_collection.json -e ./environments/Altinn-platform-SBL-bridge.postman_environment -r junit
newman run ./collections/Events.postman_collection.json -e ./environments/Platform_Altinn_Cloud.postman_environment -r junit
newman run ./collections/Events.postman_test_run.json -e ./environments/Platform_Altinn_Cloud.postman_environment -r junit
