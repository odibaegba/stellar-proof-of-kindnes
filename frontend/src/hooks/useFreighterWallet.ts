import {
    isConnected,
    getPublicKey,
    signTransaction,
    isAllowed,
} from "@stellar/freighter-api";
import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FreighterState {
    connected: boolean;
    publicKey: string | null;
    network: string | null;
    connecting: boolean;
    error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFreighterWallet() {
    const [state, setState] = useState<FreighterState>({
        connected: false,
        publicKey: null,
        network: null,
        connecting: false,
        error: null,
    });

    // On mount, check if Freighter is already connected and auto-load the key.
    useEffect(() => {
        (async () => {
            try {
                const allowed = await isAllowed();
                if (!allowed) return;

                const connected = await isConnected();
                if (connected) {
                    const key = await getPublicKey();
                    setState((prev) => ({
                        ...prev,
                        connected: true,
                        publicKey: key || null,
                    }));
                }
            } catch {
                // Freighter not installed – silently ignore
            }
        })();
    }, []);

    /**
     * Prompt the user to connect Freighter and load their public key.
     */
    const connect = useCallback(async () => {
        setState((prev) => ({ ...prev, connecting: true, error: null }));
        try {
            const connected = await isConnected();
            if (!connected) {
                setState((prev) => ({
                    ...prev,
                    connecting: false,
                    error: "Freighter extension is not installed. Please install it from freighter.app",
                }));
                return;
            }

            const key = await getPublicKey();
            setState({
                connected: true,
                publicKey: key || null,
                network: process.env.NEXT_PUBLIC_NETWORK || "TESTNET",
                connecting: false,
                error: null,
            });
        } catch (e: any) {
            setState((prev) => ({
                ...prev,
                connecting: false,
                error: e?.message ?? "Failed to connect wallet",
            }));
        }
    }, []);

    /**
     * Clear the connected wallet state (does NOT revoke Freighter permissions).
     */
    const disconnect = useCallback(() => {
        setState({
            connected: false,
            publicKey: null,
            network: null,
            connecting: false,
            error: null,
        });
    }, []);

    /**
     * Sign a Stellar XDR transaction with Freighter.
     */
    const sign = useCallback(
        async (xdr: string): Promise<string | null> => {
            try {
                const result = await signTransaction(xdr, {
                    network: process.env.NEXT_PUBLIC_NETWORK || "TESTNET",
                    networkPassphrase:
                        process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
                        "Test SDF Network ; September 2015",
                });
                return result;
            } catch (e: any) {
                setState((prev) => ({
                    ...prev,
                    error: e?.message ?? "Transaction signing failed",
                }));
                return null;
            }
        },
        []
    );

    return {
        ...state,
        connect,
        disconnect,
        sign,
    };
}
