/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';


/**
 * An object used for type-safe inter-object communication.
 *
 * #### Notes
 * Signals provide a type-safe implementation of the publish-subscribe
 * pattern. An object (publisher) declares which signals it will emit,
 * and consumers connect callbacks (subscribers) to those signals. The
 * subscribers are invoked whenever the publisher emits the signal.
 *
 * A `Signal` object must be bound to a sender in order to be useful.
 * A common pattern is to declare a `Signal` object as a static class
 * member, along with a convenience getter which binds the signal to
 * the `this` instance on-demand.
 *
 * #### Example
 * ```typescript
 * import { ISignal, Signal } from 'phosphor-signaling';
 *
 * class MyClass {
 *
 *   static valueChangedSignal = new Signal<MyClass, number>();
 *
 *   constructor(name: string) {
 *     this._name = name;
 *   }
 *
 *   get valueChanged(): ISignal<MyClass, number> {
 *     return MyClass.valueChangedSignal.bind(this);
 *   }
 *
 *   get name(): string {
 *     return this._name;
 *   }
 *
 *   get value(): number {
 *     return this._value;
 *   }
 *
 *   set value(value: number) {
 *     if (value !== this._value) {
 *       this._value = value;
 *       this.valueChanged.emit(value);
 *     }
 *   }
 *
 *   private _name: string;
 *   private _value = 0;
 * }
 *
 * function logger(sender: MyClass, value: number): void {
 *   console.log(sender.name, value);
 * }
 *
 * let m1 = new MyClass('foo');
 * let m2 = new MyClass('bar');
 *
 * m1.valueChanged.connect(logger);
 * m2.valueChanged.connect(logger);
 *
 * m1.value = 42;  // logs: foo 42
 * m2.value = 17;  // logs: bar 17
 * ```
 */
export
class Signal<T, U> {
  /**
   * Bind the signal to a specific sender.
   *
   * @param sender - The sender object to bind to the signal.
   *
   * @returns The bound signal object which can be used for connecting,
   *   disconnecting, and emitting the signal.
   */
  bind(sender: T): ISignal<T, U> {
    return new BoundSignal(this, sender);
  }
}


/**
 * A type alias for a signal callback function.
 *
 * @param T - The type of the sender.
 *
 * @param U - The type of the signal args.
 */
export
type Slot<T, U> = (sender: T, args: U) => void;


/**
 * A signal object which is bound to a specific sender.
 *
 * #### Notes
 * User code will not create instances of `ISignal` directly. They are
 * created on demand by calling the [[bind]] method of a [[Signal]].
 */
export
interface ISignal<T, U> {
  /**
   * Connect a callback to the signal.
   *
   * @param callback - The function to invoke whenever the signal is
   *   emitted. It will be passed the sender object and the emit args.
   *
   * @param thisArg - The object to use as the `this` context in the
   *   callback. If provided, this must be a non-primitive object.
   *
   * @returns `true` if the connection succeeds, `false` otherwise.
   *
   * #### Notes
   * Connected callbacks are invoked synchronously, in the order in
   * which they are connected.
   *
   * Signal connections are unique. If a connection already exists for
   * the given `callback` and `thisArg`, this function returns `false`.
   *
   * A newly connected callback will not be invoked until the next time
   * the signal is emitted, even if it is connected while the signal is
   * being emitted.
   *
   * #### Example
   * ```typescript
   * // connect a method
   * someObject.valueChanged.connect(myObject.onValueChanged, myObject);
   *
   * // connect a plain function
   * someObject.valueChanged.connect(myCallback);
   * ```
   */
  connect(callback: Slot<T, U>, thisArg?: any): boolean;

  /**
   * Disconnect a callback from the signal.
   *
   * @param callback - The function connected to the signal.
   *
   * @param thisArg - The `this` context for the callback.
   *
   * @returns `true` if the connection is broken, `false` otherwise.
   *
   * #### Notes
   * A disconnected callback will no longer be invoked, even if it
   * is disconnected while the signal is being emitted.
   *
   * If no connection exists for the given `callback` and `thisArg`,
   * this function returns `false`.
   *
   * #### Example
   * ```typescript
   * // disconnect a method
   * someObject.valueChanged.disconnect(myObject.onValueChanged, myObject);
   *
   * // disconnect a plain function
   * someObject.valueChanged.disconnect(myCallback);
   * ```
   */
  disconnect(callback: Slot<T, U>, thisArg?: any): boolean;

  /**
   * Emit the signal and invoke the connected callbacks.
   *
   * @param args - The args object to pass to the callbacks.
   *
   * #### Notes
   * Exceptions thrown by connected callbacks will be logged.
   *
   * #### Example
   * ```typescript
   * this.valueChanged.emit(42);
   * ```
   */
  emit(args: U): void;
}


/**
 * Remove all connections where the given object is the sender.
 *
 * @param sender - The sender object of interest.
 *
 * #### Example
 * ```typescript
 * disconnectSender(someObject);
 * ```
 */
export
function disconnectSender(sender: any): void {
  let list = senderMap.get(sender);
  if (!list) {
    return;
  }
  let conn = list.first;
  while (conn !== null) {
    removeFromSendersList(conn);
    conn.callback = null;
    conn.thisArg = null;
    conn = conn.nextReceiver;
  }
  senderMap.delete(sender);
}


/**
 * Remove all connections where the given object is the receiver.
 *
 * @param receiver - The receiver object of interest.
 *
 * #### Notes
 * If a `thisArg` is provided when connecting a signal, that object
 * is considered the receiver. Otherwise, the `callback` is used as
 * the receiver.
 *
 * #### Example
 * ```typescript
 * // disconnect a regular object receiver
 * disconnectReceiver(myObject);
 *
 * // disconnect a plain callback receiver
 * disconnectReceiver(myCallback);
 * ```
 */
export
function disconnectReceiver(receiver: any): void {
  let conn = receiverMap.get(receiver);
  if (!conn) {
    return;
  }
  while (conn !== null) {
    let next = conn.nextSender;
    conn.callback = null;
    conn.thisArg = null;
    conn.prevSender = null;
    conn.nextSender = null;
    conn = next;
  }
  receiverMap.delete(receiver);
}


/**
 * Clear all signal data associated with the given object.
 *
 * @param obj - The object for which the signal data should be cleared.
 *
 * #### Notes
 * This removes all signal connections where the object is used as
 * either the sender or the receiver.
 *
 * #### Example
 * ```typescript
 * clearSignalData(someObject);
 * ```
 */
export
function clearSignalData(obj: any): void {
  disconnectSender(obj);
  disconnectReceiver(obj);
}


/**
 * A concrete implementation of ISignal.
 */
class BoundSignal<T, U> implements ISignal<T, U> {
  /**
   * Construct a new bound signal.
   */
  constructor(signal: Signal<T, U>, sender: T) {
    this._signal = signal;
    this._sender = sender;
  }

  /**
   * Connect a callback to the signal.
   */
  connect(callback: Slot<T, U>, thisArg?: any): boolean {
    return connect(this._sender, this._signal, callback, thisArg);
  }

  /**
   * Disconnect a callback from the signal.
   */
  disconnect(callback: Slot<T, U>, thisArg?: any): boolean {
    return disconnect(this._sender, this._signal, callback, thisArg);
  }

  /**
   * Emit the signal and invoke the connected callbacks.
   */
  emit(args: U): void {
    emit(this._sender, this._signal, args);
  }

  private _signal: Signal<T, U>;
  private _sender: T;
}


/**
 * A struct which holds connection data.
 */
class Connection {
  /**
   * The signal for the connection.
   */
  signal: Signal<any, any> = null;

  /**
   * The callback connected to the signal.
   */
  callback: Slot<any, any> = null;

  /**
   * The `this` context for the callback.
   */
  thisArg: any = null;

  /**
   * The next connection in the singly linked receivers list.
   */
  nextReceiver: Connection = null;

  /**
   * The next connection in the doubly linked senders list.
   */
  nextSender: Connection = null;

  /**
   * The previous connection in the doubly linked senders list.
   */
  prevSender: Connection = null;
}


/**
 * The list of receiver connections for a specific sender.
 */
class ConnectionList {
  /**
   * The ref count for the list.
   */
  refs = 0;

  /**
   * The first connection in the list.
   */
  first: Connection = null;

  /**
   * The last connection in the list.
   */
  last: Connection = null;
}


/**
 * A mapping of sender object to its receiver connection list.
 */
var senderMap = new WeakMap<any, ConnectionList>();


/**
 * A mapping of receiver object to its sender connection list.
 */
var receiverMap = new WeakMap<any, Connection>();


/**
 * Create a connection between a sender, signal, and callback.
 */
function connect<T, U>(sender: T, signal: Signal<T, U>, callback: Slot<T, U>, thisArg: any): boolean {
  // Coerce a `null` thisArg to `undefined`.
  thisArg = thisArg || void 0;

  // Search for an equivalent connection and bail if one exists.
  let list = senderMap.get(sender);
  if (list && findConnection(list, signal, callback, thisArg)) {
    return false;
  }

  // Create a new connection.
  let conn = new Connection();
  conn.signal = signal;
  conn.callback = callback;
  conn.thisArg = thisArg;

  // Add the connection to the receivers list.
  if (!list) {
    list = new ConnectionList();
    list.first = conn;
    list.last = conn;
    senderMap.set(sender, list);
  } else if (list.last === null) {
    list.first = conn;
    list.last = conn;
  } else {
    list.last.nextReceiver = conn;
    list.last = conn;
  }

  // Add the connection to the senders list.
  let receiver = thisArg || callback;
  let head = receiverMap.get(receiver);
  if (head) {
    head.prevSender = conn;
    conn.nextSender = head;
  }
  receiverMap.set(receiver, conn);

  return true;
}


/**
 * Break the connection between a sender, signal, and callback.
 */
function disconnect<T, U>(sender: T, signal: Signal<T, U>, callback: Slot<T, U>, thisArg: any): boolean {
  // Coerce a `null` thisArg to `undefined`.
  thisArg = thisArg || void 0;

  // Search for an equivalent connection and bail if none exists.
  let list = senderMap.get(sender);
  if (!list) {
    return false;
  }
  let conn = findConnection(list, signal, callback, thisArg);
  if (!conn) {
    return false;
  }

  // Remove the connection from the senders list. It will be removed
  // from the receivers list the next time the signal is emitted.
  removeFromSendersList(conn);

  // Clear the connection data so it becomes a dead connection.
  conn.callback = null;
  conn.thisArg = null;

  return true;
}


/**
 * Emit a signal and invoke the connected callbacks.
 */
function emit<T, U>(sender: T, signal: Signal<T, U>, args: U): void {
  let list = senderMap.get(sender);
  if (!list) {
    return;
  }
  list.refs++;
  try {
    var dirty = invokeList(list, sender, signal, args);
  } finally {
    list.refs--;
  }
  if (dirty && list.refs === 0) {
    cleanList(list);
  }
}


/**
 * Find a matching connection in the given connection list.
 *
 * Returns `null` if no matching connection is found.
 */
function findConnection<T, U>(list: ConnectionList, signal: Signal<T, U>, callback: Slot<T, U>, thisArg: any): Connection {
  let conn = list.first;
  while (conn !== null) {
    if (conn.signal === signal &&
        conn.callback === callback &&
        conn.thisArg === thisArg) {
      return conn;
    }
    conn = conn.nextReceiver;
  }
  return null;
}


/**
 * Invoke the callbacks for the matching signals in the list.
 *
 * Connections added during dispatch will not be invoked. This returns
 * `true` if there are dead connections in the list, `false` otherwise.
 */
function invokeList<T, U>(list: ConnectionList, sender: T, signal: Signal<T, U>, args: U): boolean {
  let dirty = false;
  let last = list.last;
  let conn = list.first;
  while (conn !== null) {
    if (!conn.callback) {
      dirty = true;
    } else if (conn.signal === signal) {
      conn.callback.call(conn.thisArg, sender, args);
    }
    if (conn === last) {
      break;
    }
    conn = conn.nextReceiver;
  }
  return dirty;
}


/**
 * Remove the dead connections from the given connection list.
 */
function cleanList(list: ConnectionList): void {
  let prev: Connection;
  let conn = list.first;
  while (conn !== null) {
    let next = conn.nextReceiver;
    if (!conn.callback) {
      conn.nextReceiver = null;
    } else if (!prev) {
      list.first = conn;
      prev = conn;
    } else {
      prev.nextReceiver = conn;
      prev = conn;
    }
    conn = next;
  }
  if (!prev) {
    list.first = null;
    list.last = null;
  } else {
    prev.nextReceiver = null;
    list.last = prev;
  }
}


/**
 * Remove a connection from the doubly linked list of senders.
 */
function removeFromSendersList(conn: Connection): void {
  let receiver = conn.thisArg || conn.callback;
  if (!receiver) {
    return;
  }
  let prev = conn.prevSender;
  let next = conn.nextSender;
  if (prev === null && next === null) {
    receiverMap.delete(receiver);
  } else if (prev === null) {
    receiverMap.set(receiver, next);
    next.prevSender = null;
  } else if (next === null) {
    prev.nextSender = null;
  } else {
    prev.nextSender = next;
    next.prevSender = prev;
  }
  conn.prevSender = null;
  conn.nextSender = null;
}
