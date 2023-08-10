// https://github.com/IceFreez3r/huffman-string-to-string
"use strict";
class HuffmanEncoding {
    constructor() {}
    static encode(text) {
        if (text.length === 0) {
            return { compressed: "", codes: {}, skipLast: 0 };
        }
        const frequencies = this.getFrequencies(text);
        const tree = this.treeFromFrequencies(frequencies);
        const codes = this.codesFromTree(tree);
        return this.encodeString(text, codes);
    }
    static getFrequencies(text) {
        return text.split("").reduce((result, char) => {
            var _a;
            (_a = result[char]) !== null && _a !== void 0 ? _a : (result[char] = 0);
            result[char]++;
            return result;
        }, {});
    }
    static treeFromFrequencies(frequencies) {
        const tree = Object.entries(frequencies);
        if (tree.length === 1) {
            return tree[0][0];
        }
        while (tree.length > 1) {
            tree.sort((a, b) => b[1] - a[1]);
            const right = tree.pop();
            const left = tree.pop();
            tree.push([[left[0], right[0]], left[1] + right[1]]);
        }
        return tree[0][0];
    }
    static codesFromTree(tree) {
        const codes = {};
        const recurse = (node, prefix, length) => {
            if (typeof node === "string") {
                codes[node] = [prefix, Math.max(length, 1)];
            } else {
                recurse(node[0], prefix << 1, length + 1);
                recurse(node[1], (prefix << 1) + 1, length + 1);
            }
        };
        recurse(tree, 0, 0);
        return codes;
    }
    static encodeString(input, codes) {
        let intermediate = 0;
        let currentLength = 0;
        let compressed = "";
        let skipLast = 0;
        for (const char of input) {
            const [prefix, length] = codes[char];
            intermediate = (intermediate << length) + prefix;
            currentLength += length;
            while (currentLength >= 16) {
                currentLength -= 16;
                compressed += String.fromCharCode(intermediate >> currentLength);
                intermediate &= (1 << currentLength) - 1;
            }
        }
        if (currentLength > 0) {
            intermediate <<= 16 - currentLength;
            compressed += String.fromCharCode(intermediate);
            skipLast = 16 - currentLength;
        }
        return { compressed, codes, skipLast };
    }
    static decode(compressed, codes, skipLast) {
        const tree = this.treeFromCodes(codes);
        return this.decodeString(compressed, tree, skipLast);
    }
    static treeFromCodes(codes) {
        const tree = ["", ""];
        for (const [char, [prefix, length]] of Object.entries(codes)) {
            let node = tree;
            for (let i = 0; i < length; i++) {
                const bit = (prefix >> (length - i - 1)) & 1;
                if (i === length - 1) {
                    node[bit] = char;
                } else {
                    node[bit] || (node[bit] = ["", ""]);
                    node = node[bit];
                }
            }
        }
        return tree;
    }
    static decodeString(compressed, tree, skipLast) {
        let result = "";
        let node = tree;
        for (let i = 0; i < compressed.length; i++) {
            const char = compressed.charCodeAt(i);
            for (let j = 0; j < 16 - (i === compressed.length - 1 ? skipLast : 0); j++) {
                const bit = (char >> (15 - j)) & 1;
                node = node[bit];
                if (typeof node === "string") {
                    result += node;
                    node = tree;
                }
            }
        }
        return result;
    }
}
