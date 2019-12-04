export class ChangesEvent<T> {
    id: string;
    changesCount: number;
    changedObject?: any;
    property?: string;
    value?: any;
}
