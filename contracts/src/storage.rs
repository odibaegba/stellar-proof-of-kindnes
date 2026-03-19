use soroban_sdk::{Address, Env, Vec, contracttype};

use crate::errors::ContractError;
use crate::types::KindnessRecord;

// ─── Storage key namespaces ───────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum StorageKey {
    RecordCounter,
    Record(u64),
    IssuerHistory(Address),
    RecipientHistory(Address),
    Reputation(Address),
}

const RECORD_TTL_LEDGERS: u32 = 17_280 * 365; // ~1 year at 5s/ledger

// ─── Counter ─────────────────────────────────────────────────────────────────

/// Allocates and returns the next record ID (1-based).
pub fn next_record_id(env: &Env) -> u64 {
    let key = StorageKey::RecordCounter;
    let current: u64 = env
        .storage()
        .instance()
        .get(&key)
        .unwrap_or(0u64);
    let next = current + 1;
    env.storage().instance().set(&key, &next);
    next
}

/// Reads the current highest allocated record ID without incrementing.
pub fn current_record_id(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&StorageKey::RecordCounter)
        .unwrap_or(0u64)
}

// ─── Record storage ───────────────────────────────────────────────────────────

/// Persists a `KindnessRecord` with a long-lived TTL extension.
pub fn save_record(env: &Env, id: u64, record: &KindnessRecord) {
    let key = StorageKey::Record(id);
    env.storage().persistent().set(&key, record);
    env.storage()
        .persistent()
        .extend_ttl(&key, RECORD_TTL_LEDGERS, RECORD_TTL_LEDGERS);
}

/// Retrieves a `KindnessRecord` by ID, returning `RecordNotFound` if absent.
pub fn get_record(env: &Env, id: u64) -> Result<KindnessRecord, ContractError> {
    let key = StorageKey::Record(id);
    env.storage()
        .persistent()
        .get(&key)
        .ok_or(ContractError::RecordNotFound)
}

// ─── Issuer history ───────────────────────────────────────────────────────────

/// Appends a record ID to the issuer's history list.
pub fn add_to_issuer_history(env: &Env, issuer: &Address, record_id: u64) {
    let key = StorageKey::IssuerHistory(issuer.clone());
    let mut history: Vec<u64> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));
    history.push_back(record_id);
    env.storage().persistent().set(&key, &history);
    env.storage()
        .persistent()
        .extend_ttl(&key, RECORD_TTL_LEDGERS, RECORD_TTL_LEDGERS);
}

/// Returns all record IDs issued by `issuer`.
pub fn get_issuer_history(env: &Env, issuer: &Address) -> Vec<u64> {
    env.storage()
        .persistent()
        .get(&StorageKey::IssuerHistory(issuer.clone()))
        .unwrap_or_else(|| Vec::new(env))
}

// ─── Recipient history ────────────────────────────────────────────────────────

/// Appends a record ID to the recipient's history list.
pub fn add_to_recipient_history(env: &Env, recipient: &Address, record_id: u64) {
    let key = StorageKey::RecipientHistory(recipient.clone());
    let mut history: Vec<u64> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));
    history.push_back(record_id);
    env.storage().persistent().set(&key, &history);
    env.storage()
        .persistent()
        .extend_ttl(&key, RECORD_TTL_LEDGERS, RECORD_TTL_LEDGERS);
}

/// Returns all record IDs received by `recipient`.
pub fn get_recipient_history(env: &Env, recipient: &Address) -> Vec<u64> {
    env.storage()
        .persistent()
        .get(&StorageKey::RecipientHistory(recipient.clone()))
        .unwrap_or_else(|| Vec::new(env))
}

// ─── Reputation ───────────────────────────────────────────────────────────────

/// Adds `points` to `user`'s reputation, saturating on overflow.
pub fn increment_reputation(env: &Env, user: &Address, points: u64) {
    let key = StorageKey::Reputation(user.clone());
    let current: u64 = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or(0u64);
    let new_score = current.saturating_add(points);
    env.storage().persistent().set(&key, &new_score);
    env.storage()
        .persistent()
        .extend_ttl(&key, RECORD_TTL_LEDGERS, RECORD_TTL_LEDGERS);
}

/// Returns the current reputation score for `user` (0 if never set).
pub fn get_reputation(env: &Env, user: &Address) -> u64 {
    env.storage()
        .persistent()
        .get(&StorageKey::Reputation(user.clone()))
        .unwrap_or(0u64)
}
