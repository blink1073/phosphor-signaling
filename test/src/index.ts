/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import expect = require('expect.js');

import {
  ISignal, Signal, clearSignalData, disconnectReceiver, disconnectSender
} from '../../lib/index';


class TestObject {

  static oneSignal = new Signal<TestObject, void>();

  static twoSignal = new Signal<TestObject, number>();

  static threeSignal = new Signal<TestObject, string[]>();

  get one(): ISignal<TestObject, void> {
    return TestObject.oneSignal.bind(this);
  }

  get two(): ISignal<TestObject, number> {
    return TestObject.twoSignal.bind(this);
  }

  get three(): ISignal<TestObject, string[]> {
    return TestObject.threeSignal.bind(this);
  }
}


class ExtendedObject extends TestObject {

  notifyCount = 0;

  onNotify(): void {
    this.notifyCount++;
  }
}


class TestHandler {

  name = '';

  oneCount = 0;

  twoValue = 0;

  twoSender: TestObject = null;

  onOne(): void {
    this.oneCount++;
  }

  onTwo(sender: TestObject, args: number): void {
    this.twoSender = sender;
    this.twoValue = args;
  }

  onThree(sender: TestObject, args: string[]): void {
    args.push(this.name);
  }

  onThrow(): void {
    throw new Error();
  }
}


describe('phosphor-signaling', () => {

  describe('ISignal', () => {

    describe('#connect()', () => {

      it('should return true on success', () => {
        var obj = new TestObject();
        var handler = new TestHandler();
        var c1 = obj.one.connect(handler.onOne, handler);
        expect(c1).to.be(true);
      });

      it('should return false on failure', () => {
        var obj = new TestObject();
        var handler = new TestHandler();
        var c1 = obj.one.connect(handler.onOne, handler);
        var c2 = obj.one.connect(handler.onOne, handler);
        expect(c1).to.be(true);
        expect(c2).to.be(false);
      });

      it('should connect plain functions', () => {
        var obj = new TestObject();
        var handler = new TestHandler();
        var c1 = obj.one.connect(handler.onThrow);
        expect(c1).to.be(true);
      });

      it('should ignore duplicate connections', () => {
        var obj = new TestObject();
        var handler = new TestHandler();
        var c1 = obj.one.connect(handler.onOne, handler);
        var c2 = obj.one.connect(handler.onOne, handler);
        var c3 = obj.two.connect(handler.onTwo, handler);
        var c4 = obj.two.connect(handler.onTwo, handler);
        obj.one.emit(void 0);
        obj.two.emit(42);
        expect(c1).to.be(true);
        expect(c2).to.be(false);
        expect(c3).to.be(true);
        expect(c4).to.be(false);
        expect(handler.oneCount).to.be(1);
        expect(handler.twoValue).to.be(42);
      });

    });

    describe('#disconnect()', () => {

      it('should return true on success', () => {
        var obj = new TestObject();
        var handler = new TestHandler();
        obj.one.connect(handler.onOne, handler);
        var d1 = obj.one.disconnect(handler.onOne, handler);
        expect(d1).to.be(true);
      });

      it('should return false on failure', () => {
        var obj = new TestObject();
        var handler = new TestHandler();
        var d1 = obj.one.disconnect(handler.onOne, handler);
        expect(d1).to.be(false);
      });

      it('should disconnect plain functions', () => {
        var obj = new TestObject();
        var handler = new TestHandler();
        obj.one.connect(handler.onThrow);
        expect(obj.one.disconnect(handler.onThrow)).to.be(true);
        expect(() => obj.one.emit(void 0)).to.not.throwError();
      });

      it('should disconnect a specific signal', () => {
        var obj1 = new TestObject();
        var obj2 = new TestObject();
        var obj3 = new TestObject();
        var handler1 = new TestHandler();
        var handler2 = new TestHandler();
        var handler3 = new TestHandler();
        obj1.one.connect(handler1.onOne, handler1);
        obj2.one.connect(handler2.onOne, handler2);
        obj1.one.connect(handler3.onOne, handler3);
        obj2.one.connect(handler3.onOne, handler3);
        obj3.one.connect(handler3.onOne, handler3);
        var d1 = obj1.one.disconnect(handler1.onOne, handler1);
        var d2 = obj1.one.disconnect(handler1.onOne, handler1);
        var d3 = obj2.one.disconnect(handler3.onOne, handler3);
        obj1.one.emit(void 0);
        obj2.one.emit(void 0);
        obj3.one.emit(void 0);
        expect(d1).to.be(true);
        expect(d2).to.be(false);
        expect(d3).to.be(true);
        expect(handler1.oneCount).to.be(0);
        expect(handler2.oneCount).to.be(1);
        expect(handler3.oneCount).to.be(2);
      });

    });

    describe('#emit()', () => {

      it('should pass the sender and args to the handlers', () => {
        var obj = new TestObject();
        var handler1 = new TestHandler();
        var handler2 = new TestHandler();
        obj.two.connect(handler1.onTwo, handler1);
        obj.two.connect(handler2.onTwo, handler2);
        obj.two.emit(15);
        expect(handler1.twoSender).to.be(obj);
        expect(handler2.twoSender).to.be(obj);
        expect(handler1.twoValue).to.be(15);
        expect(handler2.twoValue).to.be(15);
      });

      it('should invoke handlers in connection order', () => {
        var obj1 = new TestObject();
        var handler1 = new TestHandler();
        var handler2 = new TestHandler();
        var handler3 = new TestHandler();
        handler1.name = 'foo';
        handler2.name = 'bar';
        handler3.name = 'baz';
        obj1.three.connect(handler1.onThree, handler1);
        obj1.one.connect(handler1.onOne, handler1);
        obj1.three.connect(handler2.onThree, handler2);
        obj1.three.connect(handler3.onThree, handler3);
        var names: string[] = [];
        obj1.three.emit(names);
        obj1.one.emit(void 0);
        expect(names).to.eql(['foo', 'bar', 'baz']);
        expect(handler1.oneCount).to.be(1);
        expect(handler2.oneCount).to.be(0);
      });

      it('should immediately propagate a handler exception', () => {
        var obj1 = new TestObject();
        var handler1 = new TestHandler();
        var handler2 = new TestHandler();
        var handler3 = new TestHandler();
        handler1.name = 'foo';
        handler2.name = 'bar';
        handler3.name = 'baz';
        obj1.three.connect(handler1.onThree, handler1);
        obj1.three.connect(handler2.onThrow, handler2);
        obj1.three.connect(handler3.onThree, handler3);
        var threw = false;
        var names1: string[] = [];
        try {
          obj1.three.emit(names1);
        } catch (e) {
          threw = true;
        }
        obj1.three.disconnect(handler2.onThrow, handler2);
        var names2: string[] = [];
        obj1.three.emit(names2);
        expect(threw).to.be(true);
        expect(names1).to.eql(['foo']);
        expect(names2).to.eql(['foo', 'baz']);
      });

      it('should not invoke signals added during emission', () =>  {
        var obj1 = new TestObject();
        var handler1 = new TestHandler();
        var handler2 = new TestHandler();
        var handler3 = new TestHandler();
        handler1.name = 'foo';
        handler2.name = 'bar';
        handler3.name = 'baz';
        var adder = {
          add: () => {
            obj1.three.connect(handler3.onThree, handler3);
          },
        };
        obj1.three.connect(handler1.onThree, handler1);
        obj1.three.connect(handler2.onThree, handler2);
        obj1.three.connect(adder.add, adder);
        var names1: string[] = [];
        obj1.three.emit(names1);
        obj1.three.disconnect(adder.add, adder);
        var names2: string[] = [];
        obj1.three.emit(names2);
        expect(names1).to.eql(['foo', 'bar']);
        expect(names2).to.eql(['foo', 'bar', 'baz']);
      });

      it('should not invoke signals removed during emission', () => {
        var obj1 = new TestObject();
        var handler1 = new TestHandler();
        var handler2 = new TestHandler();
        var handler3 = new TestHandler();
        handler1.name = 'foo';
        handler2.name = 'bar';
        handler3.name = 'baz';
        var remover = {
          remove: () => {
            obj1.three.disconnect(handler3.onThree, handler3);
          },
        };
        obj1.three.connect(handler1.onThree, handler1);
        obj1.three.connect(handler2.onThree, handler2);
        obj1.three.connect(remover.remove, remover);
        obj1.three.connect(handler3.onThree, handler3);
        var names: string[] = [];
        obj1.three.emit(names);
        expect(names).to.eql(['foo', 'bar']);
      });

    });

    context('https://github.com/phosphorjs/phosphor-signaling/issues/5', () => {

      it('should handle connect after disconnect and emit', () => {
        var obj = new TestObject();
        var handler = new TestHandler();
        var c1 = obj.one.connect(handler.onOne, handler);
        expect(c1).to.be(true);
        obj.one.disconnect(handler.onOne, handler);
        obj.one.emit(void 0);
        var c2 = obj.one.connect(handler.onOne, handler);
        expect(c2).to.be(true);
      });

    });

  });

  describe('disconnectSender()', () => {

    it('should disconnect all signals from a specific sender', () => {
      var obj1 = new TestObject();
      var obj2 = new TestObject();
      var handler1 = new TestHandler();
      var handler2 = new TestHandler();
      obj1.one.connect(handler1.onOne, handler1);
      obj1.one.connect(handler2.onOne, handler2);
      obj2.one.connect(handler1.onOne, handler1);
      obj2.one.connect(handler2.onOne, handler2);
      disconnectSender(obj1);
      obj1.one.emit(void 0);
      obj2.one.emit(void 0);
      expect(handler1.oneCount).to.be(1);
      expect(handler2.oneCount).to.be(1);
    });

    it('should be a no-op if the sender is not connected', () => {
      expect(() => disconnectSender({})).to.not.throwError();
    });

  });

  describe('disconnectReceiver()', () => {

    it('should disconnect all signals from a specific receiver', () => {
      var obj1 = new TestObject();
      var obj2 = new TestObject();
      var handler1 = new TestHandler();
      var handler2 = new TestHandler();
      obj1.one.connect(handler1.onOne, handler1);
      obj1.one.connect(handler2.onOne, handler2);
      obj2.one.connect(handler1.onOne, handler1);
      obj2.one.connect(handler2.onOne, handler2);
      obj2.two.connect(handler1.onTwo, handler1);
      obj2.two.connect(handler2.onTwo, handler2);
      disconnectReceiver(handler1);
      obj1.one.emit(void 0);
      obj2.one.emit(void 0);
      obj2.two.emit(42);
      expect(handler1.oneCount).to.be(0);
      expect(handler2.oneCount).to.be(2);
      expect(handler1.twoValue).to.be(0);
      expect(handler2.twoValue).to.be(42);
    });

    it('should be a no-op if the receiver is not connected', () => {
      expect(() => disconnectReceiver({})).to.not.throwError();
    });

  });

  describe('clearSignalData()', () => {

    it('should clear all signal data associated with an object', () => {
      var counter = 0;
      var onCount = () => { counter++ };
      var ext1 = new ExtendedObject();
      var ext2 = new ExtendedObject();
      ext1.one.connect(ext1.onNotify, ext1);
      ext1.one.connect(ext2.onNotify, ext2);
      ext1.one.connect(onCount);
      ext2.one.connect(ext1.onNotify, ext1);
      ext2.one.connect(ext2.onNotify, ext2);
      ext2.one.connect(onCount);
      clearSignalData(ext1);
      ext1.one.emit(void 0);
      ext2.one.emit(void 0);
      expect(ext1.notifyCount).to.be(0);
      expect(ext2.notifyCount).to.be(1);
      expect(counter).to.be(1);
    });

  });

});
