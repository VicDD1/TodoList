import { config } from '@keystone-6/core'
import { lists } from './schema'
import { withAuth, session } from './auth'

export default withAuth(
  config({
    db: {
      provider: 'sqlite',
      url: 'file:./keystone.db',
    },
    lists,
    session,
    ui: {
      isAccessAllowed: (context) => !!context.session?.data,
      
    },
    server: {
      cors: { 
        origin: [
          'https://todoliststage.share.zrok.io', 
          'http://localhost:5173'
        ], 
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      },
      extendExpressApp: (app) => {
        app.set('trust proxy', true);
      },
    },
  })
)
