import { Hono } from 'hono'
import { createRuntimeAuth } from './lib/createRuntimeAuth'
import { AuthVariables } from '../auth'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

app.use('*', async (c, next) => {
  const auth = createRuntimeAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    c.set('user', null)
    c.set('session', null)
    return next()
  }

  c.set('user', session.user)
  c.set('session', session.session)
  return next()
})

app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  const auth = createRuntimeAuth(c.env)
  return auth.handler(c.req.raw)
})

app.get('/api/', (c) =>
  c.json({
    name: JSON.stringify({ user: c.get('user'), session: c.get('session') }),
  }),
)

export default app
