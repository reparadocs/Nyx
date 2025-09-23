import { Connection } from "@solana/web3.js";

class SimpleWallet {
  constructor(payer) {
    this.payer = payer;
    this.connection = new Connection(process.env.RPC_URL);
  }

  get publicKey() {
    return this.payer.publicKey;
  }

  async signTransaction(tx) {
    tx.partialSign(this.payer);
    return tx;
  }

  async signAllTransactions(txs) {
    txs.forEach((tx) => tx.partialSign(this.payer));
    return txs;
  }

  async getRawBalance() {
    const balance = await this.connection.getBalance(this.publicKey);
    return balance;
  }

  async getBalance() {
    const balance = await this.getRawBalance();
    return balance / 1e9;
  }
}

export default SimpleWallet;
