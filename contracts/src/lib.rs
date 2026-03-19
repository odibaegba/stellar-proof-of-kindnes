#![no_std]

mod errors;
mod storage;
mod types;
mod validation;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};

pub use errors::ContractError;
pub use types::{BadgeType, KindnessRecord, UserProfile};

use storage::{
    add_to_issuer_history, add_to_recipient_history, current_record_id, get_issuer_history,
    get_recipient_history, get_reputation as storage_get_reputation, increment_reputation,
    next_record_id, save_record,
};
use validation::{validate_message, validate_parties};

#[contract]
pub struct ProofOfKindnessContract;

#[contractimpl]
impl ProofOfKindnessContract {
    /// Issues a new kindness act on-chain.
    ///
    /// * Requires the `issuer` to authorise the call.
    /// * Validates message length and prevents self-kindness.
    /// * Persists a `KindnessRecord`, updates history + reputation, and emits an event.
    ///
    /// Returns the newly allocated record ID.
    pub fn issue_kindness(
        env:       Env,
        issuer:    Address,
        recipient: Address,
        message:   soroban_sdk::String,
        badge:     BadgeType,
        category:  Symbol,
    ) -> Result<u64, ContractError> {
        // Auth gate
        issuer.require_auth();

        // Input validation
        validate_message(&env, &message)?;
        validate_parties(&issuer, &recipient)?;

        // Allocate record ID
        let record_id = next_record_id(&env);

        // Build record
        let record = KindnessRecord {
            id:        record_id,
            issuer:    issuer.clone(),
            recipient: recipient.clone(),
            message,
            badge,
            category:  category.clone(),
            timestamp: env.ledger().timestamp(),
            verified:  true,
        };

        // Persist
        save_record(&env, record_id, &record);
        add_to_issuer_history(&env, &issuer, record_id);
        add_to_recipient_history(&env, &recipient, record_id);
        increment_reputation(&env, &recipient, badge.reputation_points());

        // Emit event
        env.events().publish(
            (soroban_sdk::symbol_short!("kindness"), soroban_sdk::symbol_short!("issued")),
            (issuer, recipient, record_id, category),
        );

        Ok(record_id)
    }

    /// Fetches a single `KindnessRecord` by its ID.
    pub fn get_record(env: Env, record_id: u64) -> Result<KindnessRecord, ContractError> {
        storage::get_record(&env, record_id)
    }

    /// Returns the list of record IDs issued by `issuer`.
    pub fn get_issued_by(env: Env, issuer: Address) -> Vec<u64> {
        get_issuer_history(&env, &issuer)
    }

    /// Returns the list of record IDs received by `recipient`.
    pub fn get_received_by(env: Env, recipient: Address) -> Vec<u64> {
        get_recipient_history(&env, &recipient)
    }

    /// Returns the reputation score for `user`.
    pub fn get_reputation(env: Env, user: Address) -> u64 {
        storage_get_reputation(&env, &user)
    }

    /// Returns an aggregated `UserProfile` for `user`.
    pub fn get_profile(env: Env, user: Address) -> UserProfile {
        let reputation_score = storage_get_reputation(&env, &user);
        let total_issued     = get_issuer_history(&env, &user).len() as u64;
        let total_received   = get_recipient_history(&env, &user).len() as u64;

        UserProfile {
            address: user,
            reputation_score,
            total_received,
            total_issued,
        }
    }

    /// Returns the total number of kindness records ever issued.
    pub fn total_records(env: Env) -> u64 {
        current_record_id(&env)
    }
}

// ─── Inline tests (requires --features testutils) ────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        Env,
    };

    fn setup() -> (Env, ProofOfKindnessContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, ProofOfKindnessContract);
        let client = ProofOfKindnessContractClient::new(&env, &contract_id);
        (env, client)
    }

    fn str(env: &Env, s: &str) -> soroban_sdk::String {
        soroban_sdk::String::from_str(env, s)
    }

    fn cat(env: &Env) -> Symbol {
        Symbol::new(env, "community")
    }

    /// 1. Basic success path – first record ID must be 1.
    #[test]
    fn test_issue_kindness_success() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);

        let id = client
            .issue_kindness(
                &alice,
                &bob,
                &str(&env, "You helped me move – thank you!"),
                &BadgeType::Spark,
                &cat(&env),
            )
            .unwrap();

        assert_eq!(id, 1u64);
    }

    /// 2. Record fields are stored and retrieved correctly.
    #[test]
    fn test_record_content_is_correct() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);

        let id = client
            .issue_kindness(
                &alice,
                &bob,
                &str(&env, "Great neighbour, always there for a chat!"),
                &BadgeType::Flame,
                &cat(&env),
            )
            .unwrap();

        let record = client.get_record(&id).unwrap();

        assert_eq!(record.id,        id);
        assert_eq!(record.issuer,    alice);
        assert_eq!(record.recipient, bob);
        assert_eq!(record.badge,     BadgeType::Flame);
        assert!(record.verified);
    }

    /// 3. Reputation increments correctly when multiple badges are issued.
    #[test]
    fn test_reputation_increments_correctly() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);

        client
            .issue_kindness(&alice, &bob, &str(&env, "Spark kindness act here"), &BadgeType::Spark, &cat(&env))
            .unwrap();
        client
            .issue_kindness(&alice, &bob, &str(&env, "Flame kindness act here!"), &BadgeType::Flame, &cat(&env))
            .unwrap();

        let score = client.get_reputation(&bob);
        assert_eq!(score, 5 + 15);
    }

    /// 4. Self-kindness must be rejected.
    #[test]
    fn test_try_issue_self_kindness_fails() {
        let (env, client) = setup();
        let alice = Address::generate(&env);

        let result = client.try_issue_kindness(
            &alice,
            &alice,
            &str(&env, "Patting myself on the back"),
            &BadgeType::Spark,
            &cat(&env),
        );

        assert_eq!(result, Err(Ok(ContractError::SelfKindnessNotAllowed)));
    }

    /// 5. Message shorter than 5 characters must be rejected.
    #[test]
    fn test_try_issue_message_too_short_fails() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);

        let result = client.try_issue_kindness(
            &alice,
            &bob,
            &str(&env, "Hi"),
            &BadgeType::Spark,
            &cat(&env),
        );

        assert_eq!(result, Err(Ok(ContractError::MessageTooShort)));
    }

    /// 6. Fetching a non-existent record returns RecordNotFound.
    #[test]
    fn test_try_get_nonexistent_record_fails() {
        let (env, client) = setup();
        let result = client.try_get_record(&9999u64);
        assert_eq!(result, Err(Ok(ContractError::RecordNotFound)));
    }

    /// 7. Issuer and recipient history lists are populated correctly.
    #[test]
    fn test_issued_and_received_history() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);
        let carol = Address::generate(&env);

        client
            .issue_kindness(&alice, &bob,   &str(&env, "Kindness for Bob here!"),   &BadgeType::Spark, &cat(&env))
            .unwrap();
        client
            .issue_kindness(&alice, &carol, &str(&env, "Kindness for Carol here!"), &BadgeType::Flame, &cat(&env))
            .unwrap();

        let issued     = client.get_issued_by(&alice);
        let bob_recv   = client.get_received_by(&bob);
        let carol_recv = client.get_received_by(&carol);

        assert_eq!(issued.len(),     2);
        assert_eq!(bob_recv.len(),   1);
        assert_eq!(carol_recv.len(), 1);
    }

    /// 8. get_profile aggregates reputation and history lengths correctly.
    #[test]
    fn test_profile_aggregates_correctly() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);

        client
            .issue_kindness(&alice, &bob, &str(&env, "Bob is an absolute legend!"), &BadgeType::Legend, &cat(&env))
            .unwrap();

        let profile = client.get_profile(&bob);

        assert_eq!(profile.reputation_score, 100);
        assert_eq!(profile.total_received,   1);
        assert_eq!(profile.total_issued,     0);
    }

    /// 9. total_records counter reflects the real number of issued records.
    #[test]
    fn test_total_records_counter() {
        let (env, client) = setup();
        assert_eq!(client.total_records(), 0u64);

        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);
        let carol = Address::generate(&env);

        client
            .issue_kindness(&alice, &bob,   &str(&env, "First kindness record!"),  &BadgeType::Spark,  &cat(&env))
            .unwrap();
        client
            .issue_kindness(&alice, &carol, &str(&env, "Second kindness record!"), &BadgeType::Beacon, &cat(&env))
            .unwrap();

        assert_eq!(client.total_records(), 2u64);
    }
}
