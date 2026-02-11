import EventEmitter from "events";

/**
 * Type-safe wrapper around Node's EventEmitter.
 * Uses composition to prevent untyped base method access.
 */
export class TypedEventEmitter<
  T extends { [K in keyof T]: T[K] },
> {
  private emitter = new EventEmitter();

  emit<K extends keyof T & string>(
    ...args: T[K] extends void ? [event: K] : [event: K, payload: T[K]]
  ): boolean {
    return this.emitter.emit(
      args[0],
      ...(args.length > 1 ? [args[1]] : []),
    );
  }

  on<K extends keyof T & string>(
    event: K,
    listener: T[K] extends void ? () => void : (payload: T[K]) => void,
  ): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  off<K extends keyof T & string>(
    event: K,
    listener: T[K] extends void ? () => void : (payload: T[K]) => void,
  ): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  removeAllListeners<K extends keyof T & string>(event?: K): this {
    this.emitter.removeAllListeners(event);
    return this;
  }
}
