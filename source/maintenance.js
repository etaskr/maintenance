var mode;

function maintenance(app, options) {
	var endpoint = false,
		url = '/maintenance',
		accessKey,
		view = 'maintenance.html',
		api = false,
		status = 503,
		message = 'sorry, we are on maintenance',
		whitelist = [],
		templateData = false,
		mode = false;

	if (typeof options === 'boolean') {
		mode = options;
	} else if (typeof options === 'object') {
		mode = options.current || mode;
		endpoint = options.httpEndpoint || endpoint;
		url = options.url || url;
		accessKey = options.accessKey;
		view = options.view || view;
		api = options.api || api;
		status = options.status || status;
		message = options.message || message;
		whitelist = options.whitelist || whitelist;
		templateData = options.templateData || templateData;
	} else {
		throw new Error('unsupported options');
	}

	var checkAccess = function (req, res, next) {
		if (!accessKey) {
			return next();
		}

		var match = req.query.access_key === accessKey;
		if (match) {
			return next();
		}

		res.sendStatus(401);
	};

	var server = function (app) {
		if (endpoint) {
			app.post(url, checkAccess, function (req, res) {
				var message = 'Already in maintenance mode';

				if (!mode) {
					mode = true;
					message = 'Maintenance mode enabled';
				}

				res.status(200);
				res.json({
					maintenance: mode,
					message: message
				});
			});

			app.delete(url, checkAccess, function (req, res) {
				var message = 'Maintenance mode already disabled';

				if (mode) {
					mode = false;
					message = 'Maintenance mode disabled';
				}

				res.status(200);
				res.json({
					maintenance: mode,
					message: message
				});
			});

			app.get(url, checkAccess, function (req, res) {
				res.status(200);
				res.json({
					maintenance: mode
				});
			});
		}
	};

	var handle = function (req, res) {
		var isApi = false;

		if (api && api instanceof Array) {
			api.every(function (item) {
				if (req.url.indexOf(item) === 0) {
					isApi = true;
					return false;
				}

				return true;
			});
		} else {
			isApi = api && req.url.indexOf(api) === 0;
		}

		res.status(status);

		if (isApi) {
			return res.json({message: message});
		}

		if (templateData) {
			return res.render(view, templateData);
		}

		return res.render(view);
	};

	var middleware = function (req, res, next) {
		var allowedAccess = req.session && accessKey && req.query.access_key === accessKey;
		var isWhitelisted = whitelist.filter(function (item) {
			return req.url.indexOf(item) === 0;
		}).length;

		if (mode && req.url.indexOf(url) === -1) {
			if (allowedAccess) {
				if (!req.session.maintenance) {
					req.session.maintenance = accessKey;
				}
			} else {
				if (!req.session || !req.session.maintenance) {
					if (!isWhitelisted) {
						return handle(req, res);
					}
				}
			}
		}

		next();
	};

	var register = function (app) {
		try {
			app.use(middleware);
		} catch (error) {
			throw (error);
		}

		return app;
	};

	return server(register(app));
}

module.exports = maintenance;
module.exports.getMode = function () {
	return mode;
};
