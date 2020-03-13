import "./js/cycle.js";
import Vue from "../node_modules/vue/dist/vue.min"
import IntrBinnode from "./components/binnode.vue"
import ExtrBinnode from "./components/extr-binnode.vue"
import TopBinnode from "./components/top-binnode.vue"
import { RBColor, NStatus, TreeUtil, BinNode } from "./js/BinNode"
import { BinTree } from "./js/BinTree"
import { BST } from "./js/BST"
import { AVL } from "./js/AVL"
import { Splay } from "./js/Splay"
import { RedBlack } from "./js/RedBlack"

var tp = new Vue({
    el: "#TreePlayground",
    data: {
        availTreeTypes: { "BinTree": true, "BST": true, "AVL": true, "Splay": true, "RedBlack": true },
        commonParams: {
            curTreeType: "BST", // Important : Always use as `this.curTreeType`.
            treeScale: 100, // in %
            interval: 500   // in ms
        },
        messages: {
            left: "", right: ""
        },
        treeClassMap: { "BinTree": BinTree, "BST": BST, "AVL": AVL, "Splay": Splay, "RedBlack": RedBlack },
        trees: { "BinTree": null, "BST": null, "AVL": null, "Splay": null, "RedBlack": null },
        structInfo: {
            nodes: [],
            extrNodes: [],
            edges: [[], []],
            extrEdges: [[], []],
        },
        opLock: false,  // Operation Lock
        locks: {    // TODO : seperate trvlLock and searchLock. this can wait.
            trvlLock: false,
            rotateLock: false,
            srchLock: false
        },
        topSequence: [],
        BSTParams: {
            allowExtrInsert: false,
        },
        alertTag: 0,
        messageTag: 0
    },
    components: {
        'binnode': IntrBinnode,
        'extr-binnode': ExtrBinnode,
        'top-binnode': TopBinnode
    },
    methods: {
        // Init, called when change curTreeType & first mounted
        init() {
            this.alertAsync("Init " + this.curTreeType, 100, false);
            if (localStorage["temp" + this.curTreeType]) {
                this.alertAsync("Read localStorage.", 100, false)
                try {
                    let jsonTreeObj = JSON.retrocycle(JSON.parse(localStorage["temp" + this.curTreeType]));
                    this.tree = this.curTreeClass.buildFromTreeJsonObj(jsonTreeObj);
                } catch (err) {
                    this.alertAsync("Error reading localStorage.")
                    this.loadSampleTree();
                }
            }
            else {
                this.alertAsync("Load default tree.", 100, false)
                this.loadSampleTree();
            }
            this.reset(false);
        },
        // Reset, clear all messages and lock. Will call update() inside.
        reset(all = true) {
            if (all) {
                this.messages = { left: "", right: "" };
                this.topSequence = [];
            }
            this.alertAsync("Reset", 150, false);
            this.isDragging = false;
            for (let lock in this.locks) this.locks[lock] = false;
            this.opLock = false;
            this.update();
        },
        // Update, update tree structure ONLY! Then save to LocalStorage. Please Always call explicitly!!!
        update() {
            console.log("Update");
            this.structInfo = this.tree.calStructInfo();
            // Save to localStorage
            localStorage["temp" + this.curTreeType] = JSON.stringify(JSON.decycle(this.tree));
            localStorage.commonParams = JSON.stringify(this.commonParams);
        },
        // Generate new sample.
        loadSampleTree() {
            this.showMessage(`Load Sample ${this.curTreeType}`, 1000);
            this.tree = this.curTreeClass.genSampleTree();
        },
        // non-blocking message box on the right side. `time` <= 0 means forever.
        alertAsync(message, time = 1500, forceAlert = true) {
            if (this.messages.right === "" || forceAlert) {
                this.messages.right = message;
                let tag = ++this.alertTag;
                if (time > 0) {
                    setTimeout((e = tag) => {
                        if (e === this.alertTag) this.messages.right = "";
                    }, time);
                }
            } else setTimeout(() => { this.alertAsync(message, time, false) }, 100);
        },
        // Show message on left side. Similar to `alertAsync()` but default forever
        showMessage(message, time = -1, forceAlert = true) {
            if (this.messages.left === "" || forceAlert) {
                this.messages.left = message;
                let tag = ++this.messageTag;
                if (time > 0) {
                    setTimeout((e = tag) => {
                        if (e === this.messageTag) this.messages.left = "";
                    }, time);
                }
            } else setTimeout(() => { this.showMessage(message, time, false) }, 100);
        },
        // Traversal and Display in Async way.
        async traversal(method) {
            if (this.isAnyLocked()) return false;
            this.update();
            let sequence;
            switch (method) {
                case 0: sequence = BinTree.preorderTraversal(this.tree.root()); break;
                case 1: sequence = BinTree.inorderTraversal(this.tree.root()); break;
                case 2: sequence = BinTree.postorderTraversal(this.tree.root()); break;
                case 3: sequence = BinTree.levelTraversal(this.tree.root()); break;
            }
            // Display traversal sequence
            this.topSequence = [];
            this.messages.left = method == 0 ? "先序遍历" : (method == 1 ? "中序遍历" :
                (method == 2 ? "后续遍历" : (method == 3 ? "层次遍历" : "")));
            this.opLock = true;
            await this.printSequenceAsyc(sequence).catch(() => { this.update(); });
            this.opLock = false;
            this.messages.left = "";
        },
        // Print sequence Async & Recur, and push to `topSequence`
        async printSequenceAsyc(sequence) {
            return new Promise(async (resolve, reject) => {
                if (!this.opLock) { reject(); return false; }
                // Push data in `sequence` to `topSequence` one by one
                // Set color of node in the meantime
                while (sequence.length > 0) {
                    if (!this.opLock) { reject(); return false; }
                    let node = sequence.shift();
                    this.topSequence.push(node.data);
                    node.status = NStatus.active;
                    await new Promise((res) => {
                        setTimeout(() => {
                            node.status = NStatus.visited; res();
                        }, this.commonParams.interval);
                    })
                }
                // Call `this.update()` to reset color
                await new Promise((res) => {
                    setTimeout(() => {
                        this.update(); res();
                    }, 2 * this.commonParams.interval);
                })
                if (!this.opLock) { reject(); return false; }
                this.opLock = false;
                resolve();
            });
        },

        /****************************************/
        /*           Events Handlers            */
        /****************************************/

        // Internal node requests for value update.  See `binnode.vue`.
        onIntrUpdate(args) {
            if (this.opLock) return false;
            let [node, updation] = args;

            let successMessage = `Change ${node.data} to ${updation}`;
            if (this.curTreeType !== "BinTree") {
                if (this.tree.staticSearch(updation)) {
                    this.alertAsync(`${updation} Exists!`);
                    return false;
                }
                if (!this.checkNodeOrder(node, updation)) return false;
            }
            node.data = updation;
            this.update();
            this.showMessage(successMessage);
            node.status = NStatus.active;   // Caution: Mark recent active
        },
        // External node requests for value insertion. See `extr-binnode.vue`.
        onExtrInsert(args) {
            this.update();
            let [node, insertion, callback] = args;
            let curTreeType = this.curTreeType;

            if (curTreeType === "Splay") {
                this.alertAsync("Can't insert at external nodes in SplayTree.", 3000);
                return false;
            }
            if (curTreeType !== "BinTree") {
                if (this.tree.staticSearch(insertion)) {  // Decline duplicate
                    this.alertAsync(`${insertion} Exists!`);
                    return false;
                }
                // check new order
                if (!this.checkNodeOrder(node, insertion)) return false;
            }
            var updateH, retNode;
            if (curTreeType === "BinTree" || curTreeType === "BST")
                updateH = true;
            else
                updateH = false;

            if (node.isRoot)
                retNode = this.tree.insertAsRoot(insertion, updateH);
            else if (node.isLC)
                retNode = this.tree.insertAsLC(node.parent, insertion, updateH);
            else
                retNode = this.tree.insertAsRC(node.parent, insertion, updateH);

            if (curTreeType === "AVL") {    // Caution: _hot already in position?
                this.tree.solveInsertUnbalance();   // TODO: change to async
            } else if (curTreeType === "RedBlack") {
                this.tree.solveDoubleRed(retNode);
            }
            this.update();
            retNode.status = NStatus.active;  // Caution: Mark recent active
            this.messages.left = `Insert ${insertion}`;
            if (typeof callback === "function") callback(true);
        },
        // Remove whole subtree
        onRemoveBelow(node) {
            if (this.isAnyLocked()) return false;
            this.tree.removeBelow(node);
            this.update();
            this.showMessage(`Remove Below ${node.data}`);
        },
        // Remove one node
        async onRemoveOne(node) {
            if (this.isAnyLocked()) return false;
            this.showMessage(`Remove ${node.data}`);
            if ("RedBlack" === this.curTreeType) {  // TODO: No Vigor to write async version anymore using callback
                this.tree.remove(node.data);        // Maybe change everything to await promise in the future.
                this.update();
            }
            else if ("Splay" === this.curTreeType) {  // Exception : Deal with Splay
                this.alertAsync(`Step 1: Splay ${node.data}`, -1);
                node.status = NStatus.active;
                setTimeout(() => {
                    // Splay RM Step 1
                    this.locks.rotateLock = true;
                    this._splayAsync(node, (rootOrNull) => {
                        if (rootOrNull === undefined) return false;
                        if (rootOrNull === null) throw "Error in RemoveOne";
                        let v = rootOrNull;
                        let tree = this.tree;
                        tree._size--;
                        if (!v.rc || !v.rc) {  // Splay RM Step 2a
                            if (!v.rc) { if (tree._root = v.lc) tree._root.parent = null; }
                            else { if (tree._root = v.rc) tree._root.parent = null; }
                            this.alertAsync(`Final: remove ${node.data}`, 2500);
                            this.update();
                        } else {  // Splay RM Step 2b
                            node.status = NStatus.deprecated;

                            this.alertAsync(`Step 2: Elevate Succ of ${node.data}`, -1);

                            this.locks.trvlLock = true;
                            // this.locks.srchLock = true;
                            // let srchRes = await 

                            this._searchAsync(v.rc, v.data, (_, hot) => {
                                this.locks.rotateLock = true;
                                this._splayAsync(hot, (newRoot) => {
                                    // Splay RM Step 3
                                    this.alertAsync(`Step 3: Finally remove ${node.data}`, 2500);
                                    tree.reAttachAsLC(newRoot, v.lc);
                                    this.update();
                                })
                            })
                        }
                    })
                }, this.commonParams.interval);
            } else {  // Deal with other trees
                if (!node.lc || !node.rc) { // Other Trees: Simple Situation
                    this.tree.removeAt(node); this.tree._size--;
                    this.alertAsync(`${node.data} Removed.`, 2500);
                    this.update();
                    if ("AVL" === this.curTreeType) {
                        this.alertAsync(`${node.data} Removed, solve AVL Unbalance`, -1);
                        setTimeout(() => {
                            this.locks.rotateLock = true;
                            this.avlRmRotateAsync(this.tree._hot, () => {
                                this.alertAsync(`AVL Balanced again.`);
                                this.update();
                            });
                        }, this.commonParams.interval);
                    }
                } else { // Other Trees: Complex situation
                    // RM Step 1: Find Succ
                    this.alertAsync(`Step 1: Find Succ`, -1);
                    let succ = node.succ();
                    node.status = NStatus.deprecated;
                    this.locks.trvlLock = true; // TODO : change to srchLock
                    this._searchAsync(node, succ.data, () => { // assert res === true
                        // RM Step 2: Swap with Succ
                        this.alertAsync(`Step 2: Swap with Succ`, -1);
                        this.update();
                        node.status = NStatus.deprecated;
                        succ.status = NStatus.active;
                        setTimeout(() => {
                            let t = node.data; node.data = succ.data; succ.data = t;
                            node.status = NStatus.active;
                            succ.status = NStatus.deprecated;
                            // RM Step 3: Remove
                            this.alertAsync(`Step 3: Remove ${t}`, 2500);
                            setTimeout(() => {
                                this.tree.removeAt(succ);
                                this.update();
                                // RM Step 4 : AVL reBalance
                                if ("AVL" === this.curTreeType) {
                                    this.alertAsync(`Step 4: AVL reBalance`, -1);
                                    if (this.tree._hot) this.tree._hot.status = NStatus.active;
                                    setTimeout(() => {
                                        this.locks.rotateLock = true;
                                        this.avlRmRotateAsync(this.tree._hot, () => {
                                            this.alertAsync(`AVL Balanced again.`);
                                            this.update();
                                        });
                                    }, this.commonParams.interval);
                                }
                            }, this.commonParams.interval);
                        }, this.commonParams.interval);
                    })
                }
            }
        },
        // Async version of AVL.solveRemoveUnbalance
        avlRmRotateAsync(node, callback) { // Important: SET rotateLock BEFORE START
            if (!node || !this.locks.rotateLock || "AVL" !== this.curTreeType) {
                this.locks.rotateLock = false;
                if (typeof callback == "function") callback();
                return;
            }
            node.status = NStatus.active;
            setTimeout(() => {
                let interval = this.commonParams.interval;
                if (!AVL.avlBalanced(node))
                    this.tree.rotateAt(TreeUtil.tallerChild(TreeUtil.tallerChild(node)));
                else interval = 0;
                this.tree.updateHeight(node);
                this.update();
                node.status = NStatus.active;
                setTimeout(() => {
                    node.status = NStatus.normal;
                    this.avlRmRotateAsync(node.parent, callback);
                }, interval);
            }, this.commonParams.interval)
        },
        // Proper Rebuild
        onTopBuild(sequence) {
            if (this.curTreeType !== "BinTree")
                this.alertAsync("请自行保证合法性, 不合法的树会造成操作异常.", 2500);
            this.tree.buildFromBinSequence(sequence);
            this.update();
            this.messages.left = "真二叉树层次序列构建";
            let res = this.curTreeClass.checkValidity(this.tree);
            if (!res[0]) this.alertAsync(res[1], 2500);
        },
        // Insert `topSequence` by calling async
        onTopInsert(sequence) {
            if (this.isAnyLocked()) return false;
            // if (this.isAnyLocked) return false;
            if ("BinTree" === this.curTreeType) { this.alertAsync("BinTree can't insert."); return false; }
            console.log("Insert by sequence");
            this.update();
            this.topSequence = sequence;
            this.insertSequnceAsync();
        },
        // Insert `topSequence` Async & Recur
        async insertSequnceAsync() {
            while (this.topSequence.length > 0 && this.topSequence[0] === null) this.topSequence.shift();
            if (this.topSequence.length === 0) { this.locks.trvlLock = false; return false; }
            let num = this.topSequence.shift();
            this.messages.left = `Insert ${num}`;
            this.alertAsync(`Step 1: Search ${num}`, -1);
            this.locks.trvlLock = true;
            this.tree._hot = null; // Important: reset _hot before search
            this._searchAsync(this.tree.root(), num, (res, nodeOrHot) => {
                let recentNode = null;
                // Exception : Deal with Splay
                if ("Splay" === this.curTreeType) { // Caution & Important & TODO : May need change
                    this.alertAsync(nodeOrHot ? `Step 2: Splay at ${nodeOrHot.data}` : "", -1);
                    // Wait & Splay & Insert in callback
                    setTimeout(() => {
                        this.locks.rotateLock = true;
                        this._splayAsync(nodeOrHot, (rootOrNull) => {
                            if (!res) {
                                if (rootOrNull === undefined) return false; // `rotateLock` has been reset.
                                this.alertAsync(`Final: ${num} Inserted`, 2500);
                                if (rootOrNull === null) recentNode = this.tree.insertAsRoot(num);
                                else recentNode = this.tree.insertSplitRoot(num);  // Splay ONLY!!!
                            }
                            else { this.alertAsync(`${num} Exists`); recentNode = nodeOrHot; }
                            /* ----------------------------------- SAME BLOCK 0000 ------------------------------------------------- */
                            setTimeout(() => {
                                this.update();
                                if (this.topSequence.length === 0) {
                                    recentNode.status = NStatus.active;  // Caution: Mark recent active
                                    this.locks.trvlLock = false; return false;
                                } else this.insertSequnceAsync();
                            }, this.commonParams.interval);
                            /* ----------------------------------------------------------------------------------------------------- */
                        });
                    }, this.commonParams.interval);
                }
                // Deal with Other trees
                else {
                    if (res) { this.alertAsync(`${num} Exists`); recentNode = nodeOrHot; }
                    else {
                        recentNode = this.tree.insert(num);
                        this.alertAsync(`Final: ${num} Inserted`, 2500);
                    }
                    /* ------------------------------------- SAME BLOCK 0000 ----------------------------------------------- */
                    setTimeout(() => {
                        this.update();
                        if (this.topSequence.length === 0) {
                            recentNode.status = NStatus.active;  // Caution: Mark recent active
                            this.locks.trvlLock = false; return true;
                        } else this.insertSequnceAsync();
                    }, this.commonParams.interval);
                    /* ----------------------------------------------------------------------------------------------------- */
                }
            })
        },
        // Search value
        async onTopSearch(num) {
            if (this.opLock) return false;
            this.update();
            this.messages.left = `Search ${num}`;

            this.opLock = true;
            let srchRes = await this.tree.searchAsync(num, this).
                catch(() => { this.update(); });
            this.opLock = false;
            if (!srchRes) return false;

            let [found, nodeOrHot] = srchRes;
            if (found) this.alertAsync(`${num} Found`);
            else Math.random() < 0.5 ? this.alertAsync(`${num} Not Found`) : this.alertAsync(`${num} 404`);

            if (this.curTreeType === "Splay") {  // Exception & Important : Splay
                setTimeout(() => {
                    this.alertAsync(nodeOrHot ? `Splay at ${nodeOrHot.data}` : "", 2000);
                    this.opLock = true;
                    this.tree.splayAsync(nodeOrHot, this).catch(() => { this.update(); });
                }, this.commonParams.interval);
            }
        },

        // Search Async & Recur. Callback: (true, target) if found else (false, _hot)
        _searchAsync(node, num, callback) { // Important: SET LOCK BEFORE START! 
            if (!this.locks.trvlLock || !node) {
                this.locks.trvlLock = false;
                if (typeof callback === "function") callback(false, this.tree._hot);
                return false;
            }
            node.status = NStatus.active;
            if (num === node.data) {
                this.locks.trvlLock = false; {
                    if (typeof callback === "function") callback(true, node);
                    return true;
                }
            } else {
                this.tree._hot = node;  // Important: set _hot
                setTimeout(() => {
                    node.status = NStatus.visited;
                    if (num < node.data) node = node.lc;
                    else node = node.rc;
                    this._searchAsync(node, num, callback);
                }, this.commonParams.interval);
            }
        },
        // Splay Async & Recur. Callback: (null) if !v, (undefined) if locked, (_root) if success
        _splayAsync(v, callback) { // Important: SET `rotateLock` BEFORE START! 
            if (!v) {
                this.locks.rotateLock = false;
                if (typeof callback === "function") callback(null);
                return false;
            }
            if (!this.locks.rotateLock) {
                if (typeof callback === "function") callback(undefined);
                return false;
            }
            let p, g;
            if ((p = v.parent) && (g = p.parent)) {
                this.tree.splayDoubleLayer(v, p, g);
            } else if (p = v.parent) {
                this.tree.splaySingleLayer(v, p);
                v.parent = null; // Important!!! Missing will cause dead loop.
            }
            if (!v.parent) {
                this.tree._root = v;
                this.update();
                v.status = NStatus.active;
                this.locks.rotateLock = false;
                setTimeout(() => {
                    if (typeof callback === "function") callback(v);
                }, this.commonParams.interval);
            } else {
                this.update();
                v.status = NStatus.active;
                setTimeout(() => {
                    this._splayAsync(v, callback);
                }, this.commonParams.interval);
            }
        },
        // Show help message.
        onTopHelp(message) {
            this.alertAsync(message, 5000);
        },
        // Proper Binary Tree Sequence
        onTopProper() {
            let sequence = BinTree.properTraversal(this.tree.root());
            for (let i = 0; i < sequence.length; i++) sequence[i] = sequence[i] ? sequence[i].data : null;
            let last = sequence.length - 1;
            while (sequence[last] === null) last--;
            sequence.splice(last + 1);
            this.topSequence = sequence;
        },
        /****************************************/
        /*               Dragger                */
        /****************************************/
        onTreeMouseDown(event) {
            if (event.button !== 0 && event.type !== "touchstart") {
                this.isDragging = false; return false;
            }
            console.log("Start dragging")
            this.treeXY = [this.$refs.tree.offsetLeft, this.$refs.tree.offsetTop];
            switch (event.type) {
                case "mousedown": this.mouseXY = [event.clientX, event.clientY]; break;
                case "touchstart":
                    this.mouseXY = [event.touches[0].clientX, event.touches[0].clientY];
                    break;
                default: return;
            }
            this.isDragging = true;
        },
        onTPMouseMove(event) {
            if (this.isDragging) {
                let newXY;
                switch (event.type) {
                    case "mousemove": newXY = [event.clientX, event.clientY]; break;
                    case "touchmove":
                        newXY = [event.touches[0].clientX, event.touches[0].clientY];
                        break;
                    default: return;
                }
                this.$refs.tree.style.left = this.treeXY[0] + newXY[0] - this.mouseXY[0] + "px";
                this.$refs.tree.style.top = this.treeXY[1] + newXY[1] - this.mouseXY[1] + "px";
            }
        },
        onTPMouseUp(e) {
            if (this.isDragging) {
                console.log("End dragging")
                this.isDragging = false;
            }
        },

        /****************************************/
        /*              Validators              */
        /****************************************/
        assertNumber(x) {
            if (typeof x === "string") x = x.trim();
            if (x === "") return null;
            x = Number(x);
            if (isNaN(x)) return null;
            if (x > 666666666666) return 666666666666;
            if (x < -52013141516) return -52013141516;
            return x;
        },
        strToArr(str) {
            str = str.trim();
            if (str === "") return null;
            let arr = str.split(/,|，/);
            for (let i = 0; i < arr.length; i++) {
                arr[i] = this.assertNumber(arr[i]);
            }
            return arr;
        },
        isAnyLocked() {
            for (let lock in this.locks) {
                if (this.locks[lock]) { alert("In Operation! Dont do this again!"); return true; }
            }
            return this.opLock;
        },
        checkNodeOrder(node, newV) {
            let pred, succ;
            let isLC = node.isLC || TreeUtil.isLC(node);
            if (node.lc === undefined) {  // External nodes
                if (isLC === true && newV > node.parent.data ||
                    isLC === true && (pred = node.parent.pred()) && newV < pred.data ||
                    isLC === false && newV < node.parent.data ||
                    isLC === false && (succ = node.parent.succ()) && newV > succ.data) {
                    this.alertAsync("Must maintain order.", 2500);
                    return false;
                }
            } else {    // Internal nodes
                if ((pred = node.pred()) && newV < pred.data ||
                    (succ = node.succ()) && newV > succ.data) {
                    this.alertAsync("Must maintain order.", 2500);
                    return false;
                }
            }
            return true;
        },

        /****************************************/
        /*                Others                */
        /****************************************/
        nodeColorClass(color) {
            if (this.curTreeType === "RedBlack") return color == RBColor.Red ? "red-node" : "black-node";
            return "normal-color-node";
        },
    },
    computed: {
        tree: {
            get() { return this.trees[this.curTreeType]; },
            set(newTree) {
                this.trees[this.curTreeType] = newTree;
            }
        },
        curTreeType: {
            get() { return this.commonParams.curTreeType; },
            set(newV) { this.commonParams.curTreeType = newV; this.init(); } // Important
        },
        treeScale: {
            get() { return this.commonParams.treeScale; },
            set(newV) { this.commonParams.treeScale = newV; }
        },
        curTreeClass() {
            return this.treeClassMap[this.curTreeType];
        },
        adjustScale() {
            let scale = this.treeScale / 100;
            return `transform:scale(${scale})`;
        },
    },
    watch: {
        // tree: {
        //     handler() {
        //         console.log("Detect Change in tree.");
        //     },
        //     deep: true,
        // },
        commonParams: {
            handler() {
                localStorage.commonParams = JSON.stringify(this.commonParams);
            }, deep: true
        },
    },
    mounted() {
        try { this.commonParams = JSON.parse(localStorage.commonParams); }
        catch (err) { }
        if (this.availTreeTypes[this.curTreeType] == undefined) this.curTreeType = "BST";
        this.init();
    },
});

window.tp = tp;