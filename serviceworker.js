var swVersion = 5;
var cacheNS = 'crisis-service-checkin';
var currentCaches = [];
var shellResources = [
	'',
	'style/base.css',
	'js/app.js',
	'https://cdn.jsdelivr.net/pouchdb/3.2.0/pouchdb.min.js'
];

console.log("SW startup, version " + swVersion);

// On install, create a cache for the application shell.  This is versioned to avoid interfering with existing caches of previous versions of the application, which should not be overwritten to avoid causing errors in earlier versions of the serviceworker that may still be controlling open tabs
self.addEventListener('install', function(event) {
	var cacheName = cacheNS+'_shell_v'+swVersion;
	currentCaches.push(cacheName);
	event.waitUntil(
		caches.open(cacheName).then(function(cache) {
			return Promise.all(
				shellResources.map(function(path) {
					fetch(path).then(function(response) {
						cache.put(path, response);
					})
				})
			);
		}).then(function() {
			console.log("Installed");
		})
	);
});

// When activate triggers, any previous version of the serviceworker is now gone, so cleanup can now be done
// TODO: Does this really need to block serving requests?
self.addEventListener('activate', function(event) {
	event.waitUntil(
		caches.keys().then(function(cacheNames) {
			return Promise.all(
				cacheNames.map(function(cacheName) {
					if (cacheName.indexOf(cacheNS) === 0 && currentCaches.indexOf(cacheName) === -1) {
						console.log('Deleting obsolete cache: '+cacheName);
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
});

self.addEventListener('fetch', function(event) {
	if (event.request.method === 'GET') {
		console.log('Checking cache for', event.request.url);
		event.respondWith(
			caches.match(event.request)
				.then(function(response) {
					console.log("Cache result", response);
					console.log('From cache', event.request.url);
					return response;
				}, function(err) {
					console.log("Could not get response from network", err);
					console.log('From network', event.request.url);
					return fetch(event.request.url);
				});
		);

	} else {
		console.log('Non-GET request', event.request.method, event.request.url);
	}
});
