import type {
  AppRouter,
  QueryProcedure,
  MutationProcedure,
  SubscriptionProcedure,
} from "../../backend/api"

// ---- Client-side type mapping ----

type ClientQuery<P> = P extends QueryProcedure<void, infer O>
  ? { query: () => Promise<O> }
  : P extends QueryProcedure<infer I, infer O>
  ? { query: (input: I) => Promise<O> }
  : never

type ClientMutation<P> = P extends MutationProcedure<void, infer O>
  ? { mutate: () => Promise<O> }
  : P extends MutationProcedure<infer I, infer O>
  ? { mutate: (input: I) => Promise<O> }
  : never

type ClientSubscription<P> = P extends SubscriptionProcedure<infer O>
  ? { subscribe: (opts: { onData: (data: O) => void }) => () => void }
  : never

type ClientProcedure<P> = P extends QueryProcedure<any, any>
  ? ClientQuery<P>
  : P extends MutationProcedure<any, any>
  ? ClientMutation<P>
  : P extends SubscriptionProcedure<any>
  ? ClientSubscription<P>
  : never

export type ClientRouter = {
  [NS in keyof AppRouter]: {
    [K in keyof AppRouter[NS]]: ClientProcedure<AppRouter[NS][K]>
  }
}

// ---- Runtime proxy ----

const DEV_URL = "http://localhost:3131"

declare global {
  interface Window {
    __PERRY_IPC__?: {
      invoke: (channel: string, input?: unknown) => Promise<unknown>
      on: (channel: string, cb: (data: unknown) => void) => () => void
    }
  }
}

function createProcedureClient(ns: string, name: string) {
  const channel = `${ns}.${name}`
  const ipc = window.__PERRY_IPC__

  return {
    query: async (input?: unknown) => {
      if (ipc) return ipc.invoke(channel, input)
      const qs = input !== undefined ? `?input=${encodeURIComponent(JSON.stringify(input))}` : ""
      return fetch(`${DEV_URL}/trpc/${channel}${qs}`).then((r) => r.json())
    },
    mutate: async (input?: unknown) => {
      if (ipc) return ipc.invoke(channel, input)
      return fetch(`${DEV_URL}/trpc/${channel}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }).then((r) => r.json())
    },
    subscribe: (opts: { onData: (data: unknown) => void }) => {
      if (ipc) return ipc.on(channel, opts.onData)
      const es = new EventSource(`${DEV_URL}/trpc/${channel}/subscribe`)
      es.onmessage = (e) => opts.onData(JSON.parse(e.data))
      return () => es.close()
    },
  }
}

export const api: ClientRouter = new Proxy({} as ClientRouter, {
  get(_, ns: string) {
    return new Proxy({}, {
      get(_, name: string) {
        return createProcedureClient(ns, name)
      },
    })
  },
})
