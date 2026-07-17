const { Queue, Worker } = require('bullmq');
const crypto = require('crypto');
const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
  console.warn('[EventBus] Redis connection error:', err.message);
});

class EventBus {
  constructor() {
    this.handlers = {}; // { eventName: [ { handlerName, fn } ] }
    this.queue = new Queue('domain_events', { connection });
    
    this.queue.on('error', (err) => {
      console.warn('[EventBus] Queue error:', err.message);
    });

    this.worker = new Worker('domain_events', async (job) => {
      const { eventName, eventData, context } = job.data;
      const handlersForEvent = this.handlers[eventName] || [];
      
      const { ProcessedEvent } = require('../models');

      for (const handler of handlersForEvent) {
        // Idempotency check
        const whereClause = {
          eventId: eventData.id,
          processorName: handler.handlerName
        };
        if (context && context.tenantId) {
          whereClause.CompanyId = context.tenantId;
        }

        const alreadyProcessed = await ProcessedEvent.findOne({ where: whereClause });
        
        if (alreadyProcessed) {
          console.log(`[EventBus] Skipping handler ${handler.handlerName} for ${eventName} - already processed`);
          continue;
        }

        try {
          // Process event
          await handler.fn(eventData);

          // Mark processed
          await ProcessedEvent.create({
            eventId: eventData.id,
            processorName: handler.handlerName,
            CompanyId: context.tenantId || null,
            topic: eventName
          });
        } catch (error) {
          console.error(`[EventBus] Handler ${handler.handlerName} failed for ${eventName}:`, error);
          throw error; // Let BullMQ retry the job
        }
      }
    }, { connection });

    this.worker.on('failed', (job, err) => {
      console.error(`[EventBus] Job ${job.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.warn(`[EventBus] Worker error:`, err.message);
    });
  }

  publish(eventName, payload, context = {}) {
    console.log(`[EventBus] Publishing (BullMQ): ${eventName}`);
    
    const eventData = {
      id: crypto.randomUUID(),
      name: eventName,
      timestamp: new Date().toISOString(),
      payload,
      context
    };

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
    });
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
