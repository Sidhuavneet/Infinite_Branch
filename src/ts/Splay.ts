import { BinNode, NStatus } from "./BinNode";
import { BST } from "./BST";

export class Splay<T> extends BST<T> {
    protected splay(v: BinNode<T>): BinNode<T> {
        if (!v) return null;
        let p: BinNode<T>, g: BinNode<T>;
        while ((p = v.parent) && (g = p.parent)) {
            this.splayDoubleLayer(v, p, g);
        }
        // if v not reach root
        if (p = v.parent) {
            this.splaySingleLayer(v, p);
        }
        v.parent = null;
        return v;
    }

    protected splayAsync(v: BinNode<T>, tp: any): Promise<any> {
        return new Promise(async (resolve, reject) => {
            if (!tp.opLock) { reject(); return false; }  // check lock
            if (!v) { tp.opLock = false; resolve(null); return false; }
            tp.update();
            let p: BinNode<T>, g: BinNode<T>;
            while ((p = v.parent) && (g = p.parent)) {
                v.status = NStatus.active;
                if (!tp.opLock) { reject(); return false; }
                await new Promise((res) => {
                    setTimeout(() => {
                        this.splayDoubleLayer(v, p, g);
                        res();
                    }, tp.commonParams.interval);
                })
                tp.update();
            }
            if (!tp.opLock) { reject(); return false; }
            if (p = v.parent) {
                v.status = NStatus.active;
                await new Promise((res) => {
                    setTimeout(() => {
                        this.splaySingleLayer(v, p);
                        res();
                    }, tp.commonParams.interval);
                })
            }
            v.parent = null;
            this._root = v;
            tp.update();
            v.status = NStatus.active;
            if (!tp.opLock) { reject(); return false; }
            tp.opLock = false;
            resolve(v);
            return true;
        })
    }

    public splayDoubleLayer(v: BinNode<T>, p: BinNode<T>, g: BinNode<T>): BinNode<T> {
        let gg: BinNode<T> = g.parent;
        if (v == p.lc) {
            if (p == g.lc) {  // zig(p) zig(g)
                this.reAttachAsLC(g, p.rc);
                this.reAttachAsLC(p, v.rc);
                this.reAttachAsRC(p, g);
                this.reAttachAsRC(v, p);
            } else {    // zip(p) zag(g)
                this.connect34(g, v, p, g.lc, v.lc, v.rc, p.rc);
            }
        } else if (p == g.lc) { // zag(p) zig(g)
            this.connect34(p, v, g, p.lc, v.lc, v.rc, g.rc);
        } else { // zag(p) zag(g)
            this.reAttachAsRC(g, p.lc);
            this.reAttachAsRC(p, v.lc);
            this.reAttachAsLC(p, g);
            this.reAttachAsLC(v, p);
        }
        // bi-connect (vpg) & gg
        if (gg) (g == gg.lc) ? this.reAttachAsLC(gg, v) : this.reAttachAsRC(gg, v);
        else v.parent = null;
        this.updateHeight(g);
        this.updateHeight(p);
        this.updateHeight(v);
        return v;
    }

    public splaySingleLayer(v: BinNode<T>, p: BinNode<T>): BinNode<T> {
        if (v == p.lc) { this.reAttachAsLC(p, v.rc); this.reAttachAsRC(v, p); }
        else { this.reAttachAsRC(p, v.lc); this.reAttachAsLC(v, p); }
        this.updateHeight(p);
        this.updateHeight(v);
        return v;
    }

    public search(e: T): BinNode<T> {
        let v: BinNode<T> = this.searchIn(this._root, e);
        return this._root = this.splay(v ? v : this._hot);
    }

    // NEVER USED. Not sure about correctness!!!
    public insert(e: T): BinNode<T> {
        if (!this._root) {
            this._size++;
            return this._root = new BinNode<T>(e);
        }
        if (e == this.search(e).data) return this._root;

        return this.insertSplitRoot(e);
    }

    public insertSplitRoot(e: T): BinNode<T> {
        let v: BinNode<T> = new BinNode<T>(e);

        if (this._root.data < e) {
            this.reAttachAsRC(v, this._root.rc);
            this.reAttachAsLC(v, this._root);
            this._root.rc = null;
        } else {
            this.reAttachAsLC(v, this._root.lc);
            this.reAttachAsRC(v, this._root);
            this._root.lc = null
        }
        this._size++;
        this.updateHeightAbove(this._root);
        return this._root = v;
    }

    public remove(e: T): boolean {  // NEVER USED.
        if (!this._root || e != this.search(e).data) return false;
        let v: BinNode<T> = this._root;

        if (!v.rc) {
            if (this._root = v.lc) this._root.parent = null;
        } else if (!v.lc) {
            if (this._root = v.rc) this._root.parent = null;
        } else {
            this._root = v.rc;
            this._root.parent = null;
            this.search(e);
            this.reAttachAsLC(this._root, v.lc);
        }
        this._size--;
        if (this._root) this.updateHeight(this._root);
        return true;
    }


    // static genSampleTree() inherited from BST<T>
    // static checkValidity() inherited from BST<T>

}

window['Splay'] = Splay;
