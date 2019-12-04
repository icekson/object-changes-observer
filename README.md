### Changes observer

Main purpose of this component to observe all the changes on an object including nested data, by creating `Proxy` of original object

#### Example

```javascript

interface SomeType {
    name: string; 
}

const obj = { name: 'test' };

const observer = new ChangesObserver<SomeType>(obj);
const proxy = observer.getProxy();
observer.valueChanged.subscribe((event: ChangesEvent<SomeType>) => {
    console.log('count of changed fields: ', event.changesCount);
});

proxy.name = 'changed';

```

Additionally it provides ability to `cancel` all the changes

```javascript

observer.changesCancelled.subscribe((cancelEvent: CancelEvent) => {
    console.log('changes are cancelled')
});
observer.cancelChanges();

```


And ability to reset all the changes and `apply` the changes

```javascript

observer.changesApplied.subscribe((applyEvent: ApplyEvent<SomeType>) => {
    console.log('changes are applied')
    console.log('updated object: ', applyEvent.target); 
});
observer.applyChanges();

```