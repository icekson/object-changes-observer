/**
 * @author Alexey.Itsekson
 * @description Object changes observer. Main purpose is deeply observe all the changes on a object fields, 
 * counting changes and provide ability to cancell/apply changes
 */

import { ChangesEvent, CancelEvent, AppliedEvent } from './events';
import { Observable, Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import * as sha256 from 'sha256';
import { CountChangesStrategy } from './count-changes-strategy';
import { CancelationToken } from './cancelation-token';
import { ApplyChangesToken } from './apply-changes-token';
import { Changes } from './changes';
import { TextEncoder } from 'util';

export class ChangesObserver<T extends Object> implements CancelationToken, ApplyChangesToken {
    private readonly _id: string;
    private proxy: T;
    private handlers: Array<any> = [];
    private changes: Array<Changes<T, any>> = [];
    private readonly onChanges: Subject<ChangesEvent<T>>;
    private readonly onCanceled: Subject<CancelEvent>;
    private readonly onApplied: Subject<AppliedEvent<T>>;
    private original: T;
    private countStrategy: CountChangesStrategy = CountChangesStrategy.CountFields;

    constructor(private o: any, strategy?: CountChangesStrategy) {
        if (strategy !== undefined) {
            this.countStrategy = strategy;
        }
        this.original = Object.create(o);
        this._id = uuid();
        this.onChanges = new Subject();
        this.onCanceled = new Subject();
        this.onApplied = new Subject();
        this.proxy = this.createProxy(o);
    }

    /**
     * @description Id of observation
     */
    get id(): string {
        return this._id;
    }

    /**
     * @description Returns Proxy for observed object, should be used instead of original observed object
     */
    getProxy(): T {
        return this.proxy;
    }

    /**
    * @description cancel all the changes since observation has been started
    */
    cancelChanges() {
        this.changes.reverse().forEach((change) => {
            change.cancel();
        });
        this.handlers.forEach((h) => {
            h.changed = false;
        });
        this.changes = [];
        this.onChanges.next({ id: this.id, changesCount: this.countChanges });
        this.onCanceled.next({ id: this.id });
    }

    /**
    * @description Apply all the changes since observation has been started, reset changes for original observed object state
    */
    applyChanges() {
        this.changes = [];
        this.handlers = [];
        this.original = JSON.parse(JSON.stringify(this.proxy));
        this.proxy = this.createProxy(JSON.parse(JSON.stringify(this.original)));
        this.onChanges.next({ id: this.id, changesCount: this.countChanges });
        this.onApplied.next({ id: this.id, target: this.original, proxy: this.proxy });
    }

    /**
     * @description Values changes event, triggied each time when some field is changed or state is cancelled
     */
    get valueChanged(): Observable<ChangesEvent<T>> {
        return this.onChanges.asObservable();
    }

    /**
     * @description Triggired when changes are applied
     */
    get changesApplied(): Observable<AppliedEvent<T>> {
        return this.onApplied.asObservable();
    }

    /**
     * @description Triggired when changes are cancelled
     */
    get changesCancelled(): Observable<CancelEvent> {
        return this.onCanceled.asObservable();
    }

    /**
     * @description Get count of changes
     */
    get countChanges(): number {
        let count = 0;
        if (this.countStrategy === CountChangesStrategy.CountFields) {
            for (let i = 0; i < this.handlers.length; i++) {
                const handler = this.handlers[i];
                if (handler.changed) {
                    count++;
                }
            }
        } else {
            count = this.changes.length;
        }
        return count;
    }

    /**
     * @description Create deep proxy of object
     */
    private createProxy(object: any): any {
        if (object instanceof Array) {
            object = object.map((o) => this.createProxy(o));
        } else if (typeof object === 'object' && object !== null) {
            Object.keys(object).forEach((key) => {
                object[key] = this.createProxy(object[key]);
            });
        } else {
            return object;
        }

        const handleChange = async (obj: any, prop: string, value?: any) => {
            this.changes.push(new Changes(obj, prop, value));
            if (prop !== '__id') {
                const original = await this.getHash(JSON.stringify(handler.original));
                const mutable = await this.getHash(JSON.stringify(obj));
                const prevCount = this.countChanges;
                handler.changed = (original !== mutable);
                if (this.countStrategy === CountChangesStrategy.CountAllChanges ||
                    this.countStrategy === CountChangesStrategy.CountFields && (prevCount !== this.countChanges)) {
                    this.onChanges.next({ id: this._id, changedObject: obj, property: prop, value: value, changesCount: this.countChanges });
                }
            }
            return true;
        };

        const handler: any = {
            changed: false,
            original: { ...object },
            set: handleChange,
            deleteProperty: handleChange,
        };

        this.handlers.push(handler);
        object = new Proxy(object, handler);
        return object;
    }

    /**
     * @description get hash for string
     * */
    private getHash(str, algo = 'SHA-256'): PromiseLike<string> {
        return Promise.resolve(sha256(str));
    }
}
