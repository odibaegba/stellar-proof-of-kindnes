"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { Loader2, Send, Star, Flame, Zap, Crown } from "lucide-react";
import type { BadgeType } from "../hooks/useSorobanContract";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
    recipient: string;
    message: string;
    badge: BadgeType;
    category: string;
}

interface IssueKindnessFormProps {
    onSubmit: (data: FormData) => Promise<void>;
    loading: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BADGE_OPTIONS: { type: BadgeType; label: string; points: number; icon: React.ReactNode; color: string }[] = [
    { type: "Spark", label: "Spark", points: 5, icon: <Zap size={16} />, color: "badge-spark" },
    { type: "Flame", label: "Flame", points: 15, icon: <Flame size={16} />, color: "badge-flame" },
    { type: "Beacon", label: "Beacon", points: 50, icon: <Star size={16} />, color: "badge-beacon" },
    { type: "Legend", label: "Legend", points: 100, icon: <Crown size={16} />, color: "badge-legend" },
];

const CATEGORIES = [
    "community", "mentorship", "helpfulness",
    "creativity", "courage", "empathy", "other",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function IssueKindnessForm({ onSubmit, loading }: IssueKindnessFormProps) {
    const [form, setForm] = useState<FormData>({
        recipient: "",
        message: "",
        badge: "Spark",
        category: "community",
    });

    const messageLen = form.message.length;
    const canSubmit = messageLen >= 5 && form.recipient.trim().length > 0 && !loading;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        await onSubmit(form);
        setForm((prev) => ({ ...prev, recipient: "", message: "" }));
    }

    return (
        <form
            id="issue-kindness-form"
            onSubmit={handleSubmit}
            className="form-card"
        >
            <div className="form-header">
                <span className="form-icon">💝</span>
                <div>
                    <h2 className="form-title">Issue Kindness</h2>
                    <p className="form-subtitle">Recognise someone who made a difference</p>
                </div>
            </div>

            {/* Recipient */}
            <div className="field-group">
                <label htmlFor="recipient" className="field-label">
                    Recipient Stellar Address
                </label>
                <input
                    id="recipient"
                    type="text"
                    placeholder="G… (Stellar public key)"
                    value={form.recipient}
                    onChange={(e) => setForm((p) => ({ ...p, recipient: e.target.value }))}
                    className="field-input"
                    required
                />
            </div>

            {/* Message */}
            <div className="field-group">
                <label htmlFor="kindness-message" className="field-label">
                    Your Message
                </label>
                <textarea
                    id="kindness-message"
                    placeholder="Describe the act of kindness… (5–280 characters)"
                    value={form.message}
                    onChange={(e) =>
                        setForm((p) => ({ ...p, message: e.target.value.slice(0, 280) }))
                    }
                    className="field-textarea"
                    rows={4}
                    required
                />
                <div className={clsx("char-counter", { "char-warn": messageLen > 250 })}>
                    {messageLen} / 280
                </div>
            </div>

            {/* Badge selector */}
            <div className="field-group">
                <label className="field-label">Badge Tier</label>
                <div className="badge-grid">
                    {BADGE_OPTIONS.map((opt) => (
                        <button
                            key={opt.type}
                            type="button"
                            id={`badge-${opt.type.toLowerCase()}`}
                            onClick={() => setForm((p) => ({ ...p, badge: opt.type }))}
                            className={clsx("badge-btn", opt.color, { "badge-selected": form.badge === opt.type })}
                        >
                            <span className="badge-icon">{opt.icon}</span>
                            <span className="badge-name">{opt.label}</span>
                            <span className="badge-points">+{opt.points} pts</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Category */}
            <div className="field-group">
                <label htmlFor="category" className="field-label">Category</label>
                <select
                    id="category"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="field-select"
                >
                    {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Submit */}
            <button
                id="submit-kindness"
                type="submit"
                disabled={!canSubmit}
                className="submit-btn"
            >
                {loading ? (
                    <>
                        <Loader2 size={18} className="spin" />
                        Submitting to Soroban…
                    </>
                ) : (
                    <>
                        <Send size={18} />
                        Issue Kindness
                    </>
                )}
            </button>
        </form>
    );
}
