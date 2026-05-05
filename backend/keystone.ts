import { config } from '@keystone-6/core'
import { lists } from './schema'
import { withAuth, session } from './auth'

const sseClients: Set<(data: string) => void> = new Set();

export function heartbeat() {
  for (const send of sseClients) {
    send(":heartbeat\n\n")
  }
}

export const notifyClients = (type: string, data: any) => {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(send => send(payload));
};


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

        app.get('/api/events', (req, res) => {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.flushHeaders();

          const send = (data: string) => res.write(data);
          sseClients.add(send);

          req.on('close', () => {
            sseClients.delete(send);
            res.end();
          });
        });
      },
    },
  })
)
