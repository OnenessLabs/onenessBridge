import {ethers as ethers_1} from 'ethers'
const MESON_PROTOCOL_VERSION = 1;
const swapStruct = [
    { name: 'version', type: 'uint8' },
    { name: 'amount', type: 'uint40' },
    { name: 'salt', type: 'uint80' },
    { name: 'fee', type: 'uint40' },
    { name: 'expireTs', type: 'uint40' },
    { name: 'outChain', type: 'bytes2' },
    { name: 'outToken', type: 'uint8' },
    { name: 'inChain', type: 'bytes2' },
    { name: 'inToken', type: 'uint8' },
];
class Swap {
    constructor(data) {
        this._encoded = '';
        try {
            this.amount = ethers_1.BigNumber.from(data.amount);
        }
        catch (_a) {
            throw new Error('Invalid amount');
        }
        try {
            this.fee = ethers_1.BigNumber.from(data.fee || 0);
        }
        catch (_b) {
            throw new Error('Invalid fee');
        }
        if (this.amount.lte(0)) {
            throw new Error('Amount must be positive');
        }
        else if (this.fee.lt(0)) {
            throw new Error('Fee must be non-negative');
        }
        else if (!data.expireTs) {
            throw new Error('Missing expireTs');
        }
        else if (!data.inChain) {
            throw new Error('Missing inChain');
        }
        else if (typeof data.inToken !== 'number') {
            throw new Error('Invalid inToken');
        }
        else if (!data.outChain) {
            throw new Error('Missing outChain');
        }
        else if (typeof data.outToken !== 'number') {
            throw new Error('Invalid outToken');
        }
        this.version = typeof data.version === 'number' ? data.version : MESON_PROTOCOL_VERSION;
        this.salt = this._makeFullSalt(data.salt);
        this.expireTs = data.expireTs;
        this.inChain = data.inChain;
        this.inToken = data.inToken;
        this.outChain = data.outChain;
        this.outToken = data.outToken;
    }
    static decode(encoded) {
        if (typeof encoded !== 'string') {
            encoded = ethers_1.utils.hexZeroPad(encoded.toHexString(), 32);
        }
        if (!encoded.startsWith('0x') || encoded.length !== 66) {
            throw new Error('encoded swap should be a hex string of length 66');
        }
        const version = parseInt(`0x${encoded.substring(2, 4)}`, 16);
        const amount = ethers_1.BigNumber.from(`0x${encoded.substring(4, 14)}`);
        const salt = `0x${encoded.substring(14, 34)}`;
        const fee = ethers_1.BigNumber.from(`0x${encoded.substring(34, 44)}`);
        const expireTs = parseInt(`0x${encoded.substring(44, 54)}`, 16);
        const outChain = `0x${encoded.substring(54, 58)}`;
        const outToken = parseInt(`0x${encoded.substring(58, 60)}`, 16);
        const inChain = `0x${encoded.substring(60, 64)}`;
        const inToken = parseInt(`0x${encoded.substring(64, 66)}`, 16);
        return new Swap({ version, amount, salt, fee, expireTs, inChain, inToken, outChain, outToken });
    }
    _makeFullSalt(salt) {
        if (salt) {
            if (!ethers_1.utils.isHexString(salt) || salt.length > 22) {
                throw new Error('The given salt is invalid');
            }
            return `${salt}${this._randomHex(22 - salt.length)}`;
        }
        return `0x0000${this._randomHex(16)}`;
    }
    _randomHex(strLength) {
        if (strLength === 0) {
            return '';
        }
        const randomLength = Math.min((strLength / 2), 4);
        return ethers_1.utils.hexZeroPad(ethers_1.utils.randomBytes(randomLength), strLength / 2).replace('0x', '');
    }
    get encoded() {
        if (!this._encoded) {
            const types = swapStruct.map(i => i.type);
            const values = swapStruct.map(i => this[i.name]);
            this._encoded = ethers_1.utils.solidityPack(types, values);
        }
        return this._encoded;
    }
    get deprecatedEncoding() {
        return this.salt.startsWith('0x00') || this.salt.startsWith('0xff');
    }
    get willWaiveFee() {
        return (parseInt(this.salt[2], 16) % 8) >= 4;
    }
    get serviceFee() {
        if (this.deprecatedEncoding) {
            return ethers_1.BigNumber.from(0);
        }
        return this.willWaiveFee ? ethers_1.BigNumber.from(0) : this.amount.div(1000);
    }
    get platformFee() {
        // deprecated
        return this.serviceFee;
    }
    get totalFee() {
        return this.serviceFee.add(this.fee);
    }
    toObject() {
        return {
            encoded: this.encoded,
            version: this.version,
            amount: this.amount.toNumber(),
            salt: this.salt,
            fee: this.fee.toNumber(),
            expireTs: this.expireTs,
            inChain: this.inChain,
            inToken: this.inToken,
            outChain: this.outChain,
            outToken: this.outToken,
        };
    }
    separateSignature(signature) {
      const r = '0x' + signature.substring(2, 66)
      const s = '0x' + signature.substring(66, 130)
      const v = parseInt(signature.substring(130, 132), 16)
      return [r, s, v]
    }
}
export default Swap;
