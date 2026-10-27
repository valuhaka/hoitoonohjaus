import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm'

// Runs the model off the main thread so the processing animation stays smooth
const handler = new WebWorkerMLCEngineHandler()
self.onmessage = (message: MessageEvent) => handler.onmessage(message)
