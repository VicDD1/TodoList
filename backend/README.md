

Welcome to Keystone!

Run

```
npm run dev
```

To view the config for your new app, look at [./keystone.ts](./keystone.ts)

This project starter is designed to give you a sense of the power Keystone can offer you, and show off some of its main features. It's also a pretty simple setup if you want to build out from it.

We recommend you use this alongside our [getting started walkthrough](https:

If you want an overview of all the features Keystone offers, check out our [features](https:





We've set you up with an [SQLite database](https://keystonejs.com/docs/apis/config#sqlite) for ease-of-use. If you're wanting to use PostgreSQL, you can!

Just change the `db` property on line 16 of the Keystone file [./keystone.ts](./keystone.ts) to

```typescript
db: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL || 'DATABASE_URL_TO_REPLACE',
}
```

And provide your database url from PostgreSQL.

For more on database configuration, check out or [DB API Docs](https:



We've put auth into its own file to make this humble starter easier to navigate. To explore it without auth turned on, comment out the `isAccessAllowed` on line 21 of the Keystone file [./keystone.ts](./keystone.ts).

For more on auth, check out our [Authentication API Docs](https:



As a Headless CMS, Keystone can be used with any frontend that uses GraphQL. It provides a GraphQL endpoint you can write queries against at `/api/graphql` (by default [http:

A walkthrough on how to do this is forthcoming, but in the meantime our [todo example](https:



While Keystone works as a standalone app, you can embed your Keystone app into a [Next.js](https:
