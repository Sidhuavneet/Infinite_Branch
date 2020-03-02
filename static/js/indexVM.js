var vm = new Vue({
    el: "#TreePlayground",
    data: {
        availTreeTypes: { "BinTree": true, "BST": true, "AVL": false, "Splay": false, "RedBlack": false },
        curTreeType: "BinTree",
        treeClassMap: { "BinTree": BinTree, "BST": BST },
        trees: { "BinTree": null, "BST": null },
        // tree: null,
        structInfo: {
            nodes: [],
            extrNodes: [],
            edges: [[], []],
            extrEdges: [[], []],
        },
        trvlParams: {
            sequence: [],
            interval: 600,
            lock: false
        },
        BSTParams: {
            allowExtrInsert: false,
        },
    },
    methods: {
        init() {
            console.log("Init " + this.curTreeType);
            if (localStorage["temp" + this.curTreeType]) {
                console.log("Recover tree from localStorage.")
                let jsonTreeObj = JSON.retrocycle(JSON.parse(localStorage["temp" + this.curTreeType]));
                this.tree = this.curTreeClass.buildFromTreeJsonObj(jsonTreeObj);
            }
            else {
                console.log("Load default tree.")
                this.loadSampleTree();
            }
        },
        reset() {
            console.log("Reset");
            this.trvlParams.lock = false;
            this.update();
        },
        update() {
            console.log("Update");
            this.trvlParams.lock = false;
            Object.assign(this.structInfo, this.tree.calStructInfo())
            // Save to localStorage
            localStorage["temp" + this.curTreeType] = JSON.stringify(JSON.decycle(this.tree));
            localStorage.curTreeType = this.curTreeType;
        },

        saveToHistory() {

        },
        loadFromHistory() {

        },
        loadSampleTree() {
            this.tree = this.curTreeClass.genSampleTree();
            this.update();
        },
        traversal(method) {
            if (this.trvlParams.lock) return false;
            this.trvlParams.lock = true;
            if (method === 0)
                sequence = BinTree.preorderTraversal(this.tree.root());
            else if (method == 1)
                sequence = BinTree.inorderTraversal(this.tree.root());
            else if (method == 2)
                sequence = BinTree.postorderTraversal(this.tree.root());
            else if (method == 3)
                sequence = BinTree.levelTraversal(this.tree.root());
            this.trvlParams.sequence = [];
            this._printSequenceAsyc(sequence);
        },
        _printSequenceAsyc(sequence) {
            if (sequence.length == 0) {
                this.trvlParams.lock = false;
                return;
            }
            if (!this.trvlParams.lock) return false;
            let x = sequence.shift();
            this.trvlParams.sequence.push(x);
            x.active = true;
            setTimeout(() => {
                x.active = false;
                this._printSequenceAsyc(sequence);
            }, this.trvlParams.interval);
        },

        // Events Handlers
        onExtrInsert(args) {
            console.log("onExtrInsert");
            let node = args[0];
            let insertion = args[1];

            if (this.curTreeType !== "BinTree" && this.curTreeType !== "BST") return false;
            if (this.curTreeType === "BST") {
                if (this.tree.search(insertion)) {  // Decline duplicate
                    alert("Already exists!");
                    return false;
                }
                if (node.is_lc === true && insertion > node.parent.data || node.is_lc === false && insertion < node.parent.data) {
                    alert("Must maintain order.");
                    return false;
                }
                if (!this.BSTParams.allowExtrInsert) {
                    if (!confirm("Enable external insertion for BST?")) return false;
                    else this.BSTParams.allowExtrInsert = true;
                }
            }
            if (node.is_root)
                this.tree.insertAsRoot(insertion);
            else if (node.is_lc)
                this.tree.insertAsLC(node.parent, insertion);
            else
                this.tree.insertAsRC(node.parent, insertion);

            this.update();
        },
        onRemoveBelow(node) {
            console.log("onRemoveBelow");
            this.tree.removeBelow(node);
            this.update();
        },
        onRemoveOne(node) {
            console.log("onRemoveOne");
            this.tree.removeAt(node);
            this.update();
        },
        onMouseDown(event) {
            this.is_moving = true;
        },
        onMouseMove: function (event) {
            if (this.is_moving) {
                event.target.style.left = event.x - 0 + 'px';
                event.target.style.top = event.y - 15 + 'px';
            }
        },
        onMouseLeave(e) {
            this.is_moving = false;
        },
        // Validators
        assertInt(x) {
            x = parseInt(x);
            if (isNaN(x)) return null;
            return x;
        }
    },
    computed: {
        tree: {
            get() {
                return this.trees[this.curTreeType];
            },
            set(newTree) {
                this.trees[this.curTreeType] = newTree;
                this.update();
            }
        },
        curTreeClass() {
            return this.treeClassMap[this.curTreeType];
        }
    },
    watch: {
        tree: {
            handler(oldV, newV) {
                console.log("Detect Change in tree.");
                // this.update();
            },
            deep: true,
        },
        // Init tree object when tree type changes.
        curTreeType() {
            this.init();
        }
    },
    mounted() {
        this.curTreeType = localStorage.curTreeType;
        if (this.availTreeTypes[this.curTreeType] == undefined) this.curTreeType = "BinTree";
        this.init();
    },
})