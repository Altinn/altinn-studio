.PHONY: check run

check:
	node --check server.js
	node --check db.js
	node --check gh.js
	node --check browser.js
	node --check app.js

run:
	node --experimental-sqlite server.js
