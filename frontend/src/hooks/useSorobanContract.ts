import {
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  scValToNative,
  nativeToScVal,
  Address,
  Keypair,
} from "@stellar/stellar-sdk";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeType = "Spark" | "Flame" | "Beacon" | "Legend";

export interface KindnessRecord {
  id: number;
  issuer: string;
  recipient: string;
  message: string;
  badge: BadgeType;
  category: string;
  timestamp: number;
  verified: boolean;
}

export interface UserProfile {
  address: string;
  reputation_score: number;
  total_received: number;
  total_issued: number;
}

// ─── Config from env ──────────────────────────────────────────────────────────

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
  "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
  Networks.TESTNET;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSorobanContract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const server = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

  /**
   * Build, sign, simulate, and submit the `issue_kindness` transaction.
   */
  async function issueKindness(
    issuerKeypair: Keypair,
    recipientAddress: string,
    message: string,
    badge: BadgeType,
    category: string
  ): Promise<number | null> {
    setLoading(true);
    setError(null);
    try {
      const account = await server.getAccount(issuerKeypair.publicKey());

      // Build ScVal arguments
      const badgeScVal = xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol(badge),
      ]);

      const args = [
        new Address(issuerKeypair.publicKey()).toScVal(),
        new Address(recipientAddress).toScVal(),
        nativeToScVal(message, { type: "string" }),
        // Badge enum variant
        xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(badge)]),
        xdr.ScVal.scvSymbol(category),
      ];

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          // @ts-ignore – dynamic contract invocation
          require("@stellar/stellar-sdk").Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: "issue_kindness",
            args,
          })
        )
        .setTimeout(30)
        .build();

      // Simulate
      const simResult = await server.simulateTransaction(tx);
      if (SorobanRpc.Api.isSimulationError(simResult)) {
        throw new Error(simResult.error);
      }

      // Assemble + sign
      const assembled = SorobanRpc.assembleTransaction(
        tx,
        simResult
      ).build();
      assembled.sign(issuerKeypair);

      // Submit
      const sendResult = await server.sendTransaction(assembled);
      if (sendResult.status === "ERROR") {
        throw new Error(sendResult.errorResult?.toXDR("base64") ?? "Unknown error");
      }

      // Poll for finality
      let getResult = await server.getTransaction(sendResult.hash);
      while (getResult.status === "NOT_FOUND") {
        await new Promise((r) => setTimeout(r, 2000));
        getResult = await server.getTransaction(sendResult.hash);
      }

      if (getResult.status === "SUCCESS" && getResult.returnValue) {
        return Number(scValToNative(getResult.returnValue));
      }
      return null;
    } catch (e: any) {
      setError(e?.message ?? "Transaction failed");
      return null;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Read-only simulation of `get_record`.
   */
  async function getRecord(recordId: number): Promise<KindnessRecord | null> {
    setLoading(true);
    setError(null);
    try {
      const account = await server.getAccount(
        "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN" // fee-free source
      );
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          // @ts-ignore
          require("@stellar/stellar-sdk").Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: "get_record",
            args: [nativeToScVal(recordId, { type: "u64" })],
          })
        )
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (SorobanRpc.Api.isSimulationError(sim)) {
        throw new Error(sim.error);
      }
      const result = (sim as SorobanRpc.Api.SimulateTransactionSuccessResponse).result;
      if (!result) return null;
      return scValToNative(result.retval) as KindnessRecord;
    } catch (e: any) {
      setError(e?.message ?? "Failed to fetch record");
      return null;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Read-only simulation of `get_reputation`.
   */
  async function getReputation(address: string): Promise<number> {
    setLoading(true);
    setError(null);
    try {
      const account = await server.getAccount(
        "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"
      );
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          // @ts-ignore
          require("@stellar/stellar-sdk").Operation.invokeContractFunction({
            contract: CONTRACT_ID,
            function: "get_reputation",
            args: [new Address(address).toScVal()],
          })
        )
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (SorobanRpc.Api.isSimulationError(sim)) return 0;
      const result = (sim as SorobanRpc.Api.SimulateTransactionSuccessResponse).result;
      if (!result) return 0;
      return Number(scValToNative(result.retval));
    } catch {
      return 0;
    } finally {
      setLoading(false);
    }
  }

  return { issueKindness, getRecord, getReputation, loading, error };
}
