"use client";

import React, { useState, useEffect } from "react";
import { Wallet, Loader2, HeartHandshake, Inbox, Send, Award } from "lucide-react";
import IssueKindnessForm from "../components/IssueKindnessForm";
import KindnessCard from "../components/KindnessCard";
import { useFreighterWallet } from "../hooks/useFreighterWallet";
import { useSorobanContract } from "../hooks/useSorobanContract";
import { useKindnessStore } from "../store/kindnessStore";
import type { KindnessRecord } from "../hooks/useSorobanContract";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "received" | "issued";

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
    const wallet = useFreighterWallet();
    const contract = useSorobanContract();

    const { records, walletAddress, activeProfile, setWalletAddress, addRecord, setActiveProfile } =
        useKindnessStore();

    const [tab, setTab] = useState<Tab>("received");
    const [repScore, setRepScore] = useState<number>(0);
    const [formLoading, setFormLoading] = useState(false);

    // ── Auto-load on wallet connect ──────────────────────────────────────────
    useEffect(() => {
        if (!wallet.publicKey) return;
        setWalletAddress(wallet.publicKey);

        // Load reputation score
        contract.getReputation(wallet.publicKey).then((score) => {
            setRepScore(score);
            setActiveProfile({
                address: wallet.publicKey!,
                reputation_score: score,
                total_received: 0,
                total_issued: 0,
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wallet.publicKey]);

    // ── Submit kindness ──────────────────────────────────────────────────────
    async function handleIssueKindness(data: {
        recipient: string;
        message: string;
        badge: string;
        category: string;
    }) {
        if (!wallet.publicKey) return;
        setFormLoading(true);

        try {
            // In a real flow the XDR would be assembled, signed via Freighter, and submitted.
            // For demo purposes we construct a mock record and add it to local state.
            const newRecord: KindnessRecord = {
                id: Date.now(),
                issuer: wallet.publicKey,
                recipient: data.recipient,
                message: data.message,
                badge: data.badge as KindnessRecord["badge"],
                category: data.category,
                timestamp: Math.floor(Date.now() / 1000),
                verified: false, // will become true once on-chain
            };
            addRecord(newRecord);
        } finally {
            setFormLoading(false);
        }
    }

    // ── Filtered records ─────────────────────────────────────────────────────
    const filteredRecords = records.filter((r) =>
        tab === "received"
            ? r.recipient === walletAddress
            : r.issuer === walletAddress
    );

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <>
            <div className="page-bg" aria-hidden="true" />

            {/* ── Nav ─────────────────────────────────────────────────────────── */}
            <header className="nav">
                <div className="nav-inner">
                    <div className="nav-brand">
                        <HeartHandshake size={28} className="brand-icon" />
                        <span className="brand-name">Proof of Kindness</span>
                    </div>

                    <div className="nav-actions">
                        {wallet.connected && (
                            <div id="reputation-badge" className="rep-badge">
                                <Award size={16} />
                                <span>{repScore} pts</span>
                            </div>
                        )}

                        <button
                            id="wallet-connect-btn"
                            onClick={wallet.connected ? wallet.disconnect : wallet.connect}
                            disabled={wallet.connecting}
                            className={wallet.connected ? "btn-wallet connected" : "btn-wallet"}
                        >
                            {wallet.connecting ? (
                                <Loader2 size={16} className="spin" />
                            ) : (
                                <Wallet size={16} />
                            )}
                            {wallet.connected
                                ? `${wallet.publicKey?.slice(0, 6)}…${wallet.publicKey?.slice(-4)}`
                                : "Connect Freighter"}
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Wallet error banner ─────────────────────────────────────────── */}
            {wallet.error && (
                <div className="error-banner" role="alert">
                    ⚠️ {wallet.error}
                </div>
            )}

            {/* ── Main ─────────────────────────────────────────────────────────── */}
            <main className="main-content">
                {!wallet.connected ? (
                    /* Hero / connect prompt */
                    <section className="hero-section" aria-label="Welcome">
                        <div className="hero-glow" aria-hidden="true" />
                        <div className="hero-content">
                            <div className="hero-emoji">💝</div>
                            <h1 className="hero-title">Proof of Kindness</h1>
                            <p className="hero-subtitle">
                                A decentralised gratitude and reputation protocol built on{" "}
                                <strong>Stellar Soroban</strong>. Every act of kindness is
                                immutably recorded on-chain and earns real reputation.
                            </p>
                            <div className="badge-tier-table">
                                {[
                                    { badge: "Spark", pts: 5, emoji: "⚡" },
                                    { badge: "Flame", pts: 15, emoji: "🔥" },
                                    { badge: "Beacon", pts: 50, emoji: "⭐" },
                                    { badge: "Legend", pts: 100, emoji: "👑" },
                                ].map((t) => (
                                    <div key={t.badge} className="tier-row">
                                        <span className="tier-emoji">{t.emoji}</span>
                                        <span className="tier-badge">{t.badge}</span>
                                        <span className="tier-pts">+{t.pts} pts</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                id="hero-connect-btn"
                                onClick={wallet.connect}
                                disabled={wallet.connecting}
                                className="hero-connect-btn"
                            >
                                {wallet.connecting ? (
                                    <Loader2 size={20} className="spin" />
                                ) : (
                                    <Wallet size={20} />
                                )}
                                Connect Wallet to Get Started
                            </button>
                        </div>
                    </section>
                ) : (
                    /* Dashboard grid */
                    <div className="dashboard-grid">
                        {/* Left — form */}
                        <aside className="form-column">
                            <IssueKindnessForm
                                onSubmit={handleIssueKindness}
                                loading={formLoading}
                            />
                        </aside>

                        {/* Right — feed */}
                        <section className="feed-column" aria-label="Kindness records feed">
                            {/* Tabs */}
                            <div className="tab-bar" role="tablist">
                                <button
                                    id="tab-received"
                                    role="tab"
                                    aria-selected={tab === "received"}
                                    onClick={() => setTab("received")}
                                    className={tab === "received" ? "tab-btn active" : "tab-btn"}
                                >
                                    <Inbox size={16} />
                                    Received
                                </button>
                                <button
                                    id="tab-issued"
                                    role="tab"
                                    aria-selected={tab === "issued"}
                                    onClick={() => setTab("issued")}
                                    className={tab === "issued" ? "tab-btn active" : "tab-btn"}
                                >
                                    <Send size={16} />
                                    Issued
                                </button>
                            </div>

                            {/* Records */}
                            <div className="records-feed" aria-live="polite">
                                {filteredRecords.length === 0 ? (
                                    <div className="empty-state" aria-label="No records yet">
                                        <div className="empty-icon">🫶</div>
                                        <p className="empty-title">No {tab} kindness yet</p>
                                        <p className="empty-sub">
                                            {tab === "received"
                                                ? "Ask a friend to issue you a kindness record!"
                                                : "Use the form to recognise someone special."}
                                        </p>
                                    </div>
                                ) : (
                                    filteredRecords.map((record) => (
                                        <KindnessCard
                                            key={record.id}
                                            record={record}
                                            perspective={tab}
                                        />
                                    ))
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </main>

            {/* ── Footer ──────────────────────────────────────────────────────── */}
            <footer className="footer">
                <p>
                    Built on <strong>Stellar Soroban</strong> · Open source ·{" "}
                    <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-link"
                    >
                        GitHub
                    </a>
                </p>
            </footer>
        </>
    );
}
