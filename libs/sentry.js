const Sentry = require("@sentry/node");
const { SENTRY_DSN, ENV } = process.env;
Sentry.init({
    environment: ENV,
    dsn: SENTRY_DSN,
    integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: require('express') }),
    ],
    tracesSampleRate: 1.0,
});

module.exports = Sentry;