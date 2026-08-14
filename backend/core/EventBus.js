const crypto = require('crypto');

const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true' || 
  (!!process.env.REDIS_URL && process.env.REDIS_ENABLED !== 'false');

let Queue, Worker, Redis;
let useRedisQueue = false;

if (REDIS_ENABLED) {
  try {
    const bullmq = require('bullmq');
    Queue = bullmq.Queue;
    Worker = bullmq.Worker;
    Redis = require('ioredis');
    useRedisQueue = true;
  } catch (e) {
    console.warn('[EventBus] BullMQ is not installed. Falling back to in-memory EventBus.');
  }
} else {
  console.log('[EventBus] Redis is disabled. Using in-memory EventBus.');
}

class EventBus {
  constructor() {
    this.handlers = {}; // { eventName: [ { handlerName, fn } ] }
    this.fallbackMode = !useRedisQueue;

    if (!this.fallbackMode) {
      try {
        const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
        this.connection = new Redis(REDIS_URL, {
          maxRetriesPerRequest: null,
        });

        this.connection.on('error', (err) => {
          console.warn('[EventBus] Redis connection error:', err.message);
        });

        this.queue = new Queue('domain_events', { connection: this.connection });
        
        this.queue.on('error', (err) => {
          console.warn('[EventBus] Queue error:', err.message);
        });

        this.worker = new Worker('domain_events', async (job) => {
          const { eventName, eventData, context } = job.data;
          await this.executeHandlers(eventName, eventData, context);
        }, { connection: this.connection });

        this.worker.on('failed', (job, err) => {
          console.error(`[EventBus] Job ${job.id} failed:`, err);
        });

        this.worker.on('error', (err) => {
          console.warn(`[EventBus] Worker error:`, err.message);
        });
      } catch (err) {
        console.error('[EventBus] Failed to initialize BullMQ. Falling back to in-memory EventBus:', err.message);
        this.fallbackMode = true;
      }
    }
  }

  async executeHandlers(eventName, eventData, context) {
    const handlersForEvent = this.handlers[eventName] || [];
    
    // Lazy load ProcessedEvent model to prevent circular references on boot
    let ProcessedEvent;
    try {
      ProcessedEvent = require('../models').ProcessedEvent;
    } catch (e) {
      console.warn('[EventBus] Could not load ProcessedEvent model for idempotency check:', e.message);
    }

    for (const handler of handlersForEvent) {
      if (ProcessedEvent) {
        // Idempotency check
        const whereClause = {
          eventId: eventData.id,
          processorName: handler.handlerName
        };
        if (context && context.tenantId) {
          whereClause.CompanyId = context.tenantId;
        }

        try {
          const alreadyProcessed = await ProcessedEvent.findOne({ where: whereClause });
          if (alreadyProcessed) {
            console.log(`[EventBus] Skipping handler ${handler.handlerName} for ${eventName} - already processed`);
            continue;
          }
        } catch (e) {
          console.error('[EventBus] Idempotency check query failed:', e.message);
        }
      }

      try {
        // Process event
        await handler.fn(eventData);

        // Mark processed
        if (ProcessedEvent) {
          await ProcessedEvent.create({
            eventId: eventData.id,
            processorName: handler.handlerName,
            CompanyId: context.tenantId || null,
            topic: eventName
          }).catch(err => console.error('[EventBus] Failed to mark event processed in DB:', err.message));
        }
      } catch (error) {
        console.error(`[EventBus] Handler ${handler.handlerName} failed for ${eventName}:`, error);
        if (!this.fallbackMode) {
          throw error; // Let BullMQ retry the job
        }
      }
    }
  }

  publish(eventName, payload, context = {}) {
    const eventData = {
      id: crypto.randomUUID(),
      name: eventName,
      timestamp: new Date().toISOString(),
      payload,
      context
    };

    if (this.fallbackMode) {
      console.log(`[EventBus] Publishing (In-Memory): ${eventName}`);
      // Process in-memory asynchronously using setImmediate/setTimeout to prevent blocking the main thread
      setImmediate(async () => {
        try {
          await this.executeHandlers(eventName, eventData, context);
        } catch (err) {
          console.error(`[EventBus] In-Memory event processing failed for ${eventName}:`, err.message);
        }
      });
    } else {
      console.log(`[EventBus] Publishing (BullMQ): ${eventName}`);
      // Add job to BullMQ
      this.queue.add(eventName, {
        eventName,
        eventData,
        context
      }, {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }).catch(err => {
        console.error(`[EventBus] Failed to add job to BullMQ queue, executing in-memory fallback for ${eventName}:`, err.message);
        setImmediate(() => this.executeHandlers(eventName, eventData, context));
      });
    }
  }

  subscribe(eventName, handlerName, handlerFn) {
    console.log(`[EventBus] Subscribing to: ${eventName} [${handlerName}]`);
    if (!this.handlers[eventName]) {
      this.handlers[eventName] = [];
    }
    
    // Add handler if not exists
    const exists = this.handlers[eventName].find(h => h.handlerName === handlerName);
    if (!exists) {
      this.handlers[eventName].push({ handlerName, fn: handlerFn });
    }
  }
}

module.exports = new EventBus();
