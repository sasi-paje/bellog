export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'

interface RealtimeEvent {
  id: string
  table: string
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  timestamp: number
  payload: any
  new?: any
  old?: any
}

type RealtimeEventHandler = (event: RealtimeEvent) => void

class RealtimeChannel {
  private supabase: any
  private table: string
  private channel: any = null
  private handlers: Set<RealtimeEventHandler> = new Set()
  private isSubscribed = false

  constructor(supabase: any, table: string) {
    this.supabase = supabase
    this.table = table
  }

  subscribe(handler: RealtimeEventHandler): () => void {
    this.handlers.add(handler)

    if (!this.isSubscribed) {
      this.connect()
    }

    return () => {
      this.handlers.delete(handler)
      if (this.handlers.size === 0) {
        this.disconnect()
      }
    }
  }

  private connect(): void {
    this.channel = this.supabase.channel(`${this.table}-realtime-${Date.now()}`)

    this.channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: this.table,
    }, (payload: any) => {
      const event: RealtimeEvent = {
        id: `${payload.commit_timestamp}-${payload.new?.id ?? payload.old?.id}`,
        table: this.table,
        event: payload.eventType as any,
        timestamp: Date.now(),
        payload: payload.new ?? payload.old,
        new: payload.new,
        old: payload.old,
      }

      this.handlers.forEach(handler => handler(event))
    })

    this.channel.subscribe((status: string) => {
      this.isSubscribed = status === 'SUBSCRIBED'
      console.log(`[RealtimeChannel] ${this.table} subscription status:`, status)
    })
  }

  private disconnect(): void {
    if (this.channel) {
      this.supabase.removeChannel(this.channel)
      this.channel = null
      this.isSubscribed = false
    }
  }
}

export class RealtimeManager {
  private static instance: RealtimeManager | null = null
  private supabase: any
  private channels: Map<string, RealtimeChannel> = new Map()
  private connectionStatus: ConnectionStatus = 'disconnected'
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 10
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private listeners: Map<string, Set<Function>> = new Map()
  private processedMessageIds: Set<string> = new Set()

  private constructor(supabaseUrl: string, supabaseKey: string) {
    const { createClient } = require('@supabase/supabase-js')
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.setupConnectionMonitor()
  }

  static getInstance(supabaseUrl?: string, supabaseKey?: string): RealtimeManager {
    if (!RealtimeManager.instance && supabaseUrl && supabaseKey) {
      RealtimeManager.instance = new RealtimeManager(supabaseUrl, supabaseKey)
    }
    if (!RealtimeManager.instance) {
      throw new Error('RealtimeManager not initialized. Call getInstance with URL and key first.')
    }
    return RealtimeManager.instance
  }

  static resetInstance(): void {
    if (RealtimeManager.instance) {
      const instance = RealtimeManager.instance
      instance.disconnect()
      RealtimeManager.instance = null
    }
  }

  subscribe<T>(table: string, handler: RealtimeEventHandler): () => void {
    let channel = this.channels.get(table)

    if (!channel) {
      channel = new RealtimeChannel(this.supabase, table)
      this.channels.set(table, channel)
    }

    return channel.subscribe(handler)
  }

  getStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    return this.on('statusChange', callback)
  }

  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => this.listeners.get(event)?.delete(callback)
  }

  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(cb => cb(...args))
  }

  private setupConnectionMonitor(): void {
    this.supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') {
        this.handleDisconnection()
      }
    })
  }

  private handleDisconnection(): void {
    this.connectionStatus = 'disconnected'
    this.emit('statusChange', this.connectionStatus)
    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionStatus = 'error'
      this.emit('statusChange', this.connectionStatus)
      this.emit('maxReconnectAttemptsReached')
      return
    }

    this.connectionStatus = 'reconnecting'
    this.emit('statusChange', this.connectionStatus)

    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      30000
    )

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++
      this.attemptReconnect()
    }, delay)
  }

  private async attemptReconnect(): Promise<void> {
    try {
      const { error } = await this.supabase.from('trx_fiscal_invoice').select('id').limit(1)

      if (error) throw error

      this.reconnectAttempts = 0
      this.connectionStatus = 'connected'
      this.emit('statusChange', this.connectionStatus)
      this.emit('reconnected')
      this.startHeartbeat()
      this.resubscribeChannels()
    } catch (err) {
      console.error('[RealtimeManager] Reconnect failed:', err)
      this.scheduleReconnect()
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.supabase.from('trx_fiscal_invoice').select('id').limit(1)
      } catch {
        this.handleDisconnection()
      }
    }, 30000)
  }

  private resubscribeChannels(): void {
    this.channels.forEach(channel => {
      channel.subscribe(() => {})
    })
  }

  private disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    this.channels.forEach(channel => channel.subscribe(() => {}))
    this.channels.clear()
  }
}