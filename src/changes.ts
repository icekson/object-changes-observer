export class Changes<T, V> {
    private readonly before: V;

    constructor(private target: T, private prop: string, value?: V) {
        this.before = this.target[prop] as V;
        if (value !== undefined) { 
            this.target[prop] = value;
        } else {
            delete this.target[prop];
        }
    }

    cancel(): void {
        this.target[this.prop] = this.before;
    }
}
