type Listener = (channel: string) => void;

const listeners = new Set<Listener>();

export function emit(channel: string): void {
  for (const listener of listeners) {
    listener(channel);
  }
}

export function subscribe(listener: Listener): void {
  listeners.add(listener);
}

export function unsubscribe(listener: Listener): void {
  listeners.delete(listener);
}
