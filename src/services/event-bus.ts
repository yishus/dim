import { TypedEventEmitter } from "../typed-event-emitter";
import type { SessionEvents } from "../types";

export class EventBus extends TypedEventEmitter<SessionEvents> {}
