import { ChangesObserver } from '../../src/changes-observer';
import { CancelEvent, ChangesEvent } from '../../src/events';
import { skip } from 'rxjs/operators';

interface TestObject {
  name: string;
  inner?: {
    field1: number,
    field2: Array<string>
  };
}

const testObj: TestObject = {
  name: 'test',
  inner: {
    field1: 5,
    field2: [
      'some1',
      'some2'
    ]
  }
} as TestObject;
describe('ChangesObserver', () => {
  let data: TestObject = null;
  beforeEach(() => {
    data = JSON.parse(JSON.stringify(testObj));
  });

  it('should generate proxy for observed object', () => {
    const observer = new ChangesObserver<TestObject>(data);
    expect(observer.getProxy()).toBeTruthy();
    expect(data === observer.getProxy()).toBeFalsy();
    expect(data.name).toBe(observer.getProxy().name);
    expect(data.inner.field1).toBe(observer.getProxy().inner.field1);
  });

  it('when change field on the object valueChanged event should be triggered with changes', (done: DoneFn) => {
    const observer = new ChangesObserver<TestObject>(data);
    const proxy = observer.getProxy();
    expect(proxy.name).toBe('test');
    observer.valueChanged.subscribe((event: ChangesEvent<TestObject>) => {
      expect(event.changesCount).toBe(1);
      done();
    });
    proxy.name = 'changed';
  });

  it('when splice an array element, changes should be accounted correctly', (done: DoneFn) => {
    const observer = new ChangesObserver<TestObject>(data);
    const proxy = observer.getProxy();

    observer.valueChanged.subscribe((event: ChangesEvent<TestObject>) => {
      expect(event.changesCount).toBe(1);
      expect(proxy.inner.field2.length).toBe(1);
      done();
    });
    proxy.inner.field2.splice(0, 1);
  });

  it('when change field on nested object , changes should be accounted correctly', (done: DoneFn) => {
    const observer = new ChangesObserver<TestObject>(data);
    const proxy = observer.getProxy();

    observer.valueChanged.subscribe((event: ChangesEvent<TestObject>) => {
      expect(event.changesCount).toBe(1);
      expect(proxy.inner.field1).toBe(10);
      done();
    });
    proxy.inner.field1 = 10;
  });

  it('for each changed field only one change should be accounted', (done: DoneFn) => {
    const observer = new ChangesObserver<TestObject>(data);
    const proxy = observer.getProxy();

    observer.valueChanged.pipe(skip(3)).subscribe((event: CancelEvent) => {
      expect(observer.countChanges).toBe(2);
      done();
    });
    proxy.inner.field2.splice(0, 1);
    proxy.name = 'changed';
  });


  it('state should reset to initial when cancelChanges is called', (done: DoneFn) => {
    const observer = new ChangesObserver<TestObject>(data);
    const proxy = observer.getProxy();

    observer.changesCancelled.subscribe((event: CancelEvent) => {
      expect(proxy.inner.field2.length).toBe(data.inner.field2.length);
      expect(observer.countChanges).toBe(0);
      done();
    });
    proxy.inner.field2.splice(0, 1);
    observer.cancelChanges();
  });


});
