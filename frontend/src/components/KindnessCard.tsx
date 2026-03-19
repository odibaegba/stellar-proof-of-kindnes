"use client";

import React from "react";
import clsx from "clsx";
import { ShieldCheck, Zap, Flame, Star, Crown, Tag, Clock } from "lucide-react";
import type { KindnessRecord, BadgeType } from "../hooks/useSorobanContract";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KindnessCardProps {
    record: KindnessRecord;
    perspective: "issued" | "received";
}

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<
    BadgeType,
    { label: string; icon: React.ReactNode; colorClass: string }
> = {
    Spark: { label: "Spark", icon: <Zap size={14} />, colorClass: "pill-spark" },
    Flame: { label: "Flame", icon: <Flame size={14} />, colorClass: "pill-flame" },
    Beacon: { label: "Beacon", icon: <Star size={14} />, colorClass: "pill-beacon" },
    Legend: { label: "Legend", icon: <Crown size={14} />, colorClass: "pill-legend" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortAddr(addr: string): string {
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTimestamp(ts: number): string {
    return new Date(ts * 1000).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KindnessCard({ record, perspective }: KindnessCardProps) {
    const badge = BADGE_CONFIG[record.badge] ?? BADGE_CONFIG.Spark;
    const peerAddr = perspective === "received" ? record.issuer : record.recipient;
    const peerLabel = perspective === "received" ? "From" : "To";

    return (
        <article
            id={`kindness-card-${record.id}`}
            className="kindness-card"
            role="article"
            aria-label={`Kindness record ${record.id}`}
        >
            {/* Header row */}
            <div className="card-header">
                <span className={clsx("badge-pill", badge.colorClass)}>
                    {badge.icon}
                    {badge.label}
                </span>

                {record.verified && (
                    <span className="verified-badge" title="On-chain verified">
                        <ShieldCheck size={14} />
                        Verified
                    </span>
                )}
            </div>

            {/* Message */}
            <blockquote className="card-message">
                "{record.message}"
            </blockquote>

            {/* Meta row */}
            <div className="card-meta">
                <span className="meta-peer">
                    <span className="meta-label">{peerLabel}:</span>{" "}
                    <code className="addr-code">{shortAddr(peerAddr)}</code>
                </span>

                <span className="meta-category">
                    <Tag size={12} />
                    {record.category}
                </span>

                <span className="meta-time">
                    <Clock size={12} />
                    {formatTimestamp(record.timestamp)}
                </span>
            </div>
        </article>
    );
}
