// Integration test file — mirrors the inline unit tests in src/lib.rs.
// Run with: cargo test --features testutils
//
// Note: Soroban's generated *Client and *ContractClient types are only
// available when the crate is compiled with the `testutils` feature.
// All contracts register via env.register_contract and interact through
// the generated client, so these tests live as an integration suite.

#[cfg(test)]
mod contract_tests {
    use proof_of_kindness::{BadgeType, ContractError, ProofOfKindnessContract};
    use soroban_sdk::{
        testutils::Address as _,
        Address, Env, Symbol,
    };

    // The generated client type is: proof_of_kindness::ProofOfKindnessContractClient
    // It is created by soroban-sdk's macro when `testutils` feature is enabled.
    use proof_of_kindness::ProofOfKindnessContractClient;

    fn setup() -> (Env, ProofOfKindnessContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, ProofOfKindnessContract);
        let client = ProofOfKindnessContractClient::new(&env, &contract_id);
        (env, client)
    }

    fn s(env: &Env, txt: &str) -> soroban_sdk::String {
        soroban_sdk::String::from_str(env, txt)
    }

    fn cat(env: &Env) -> Symbol {
        Symbol::new(env, "community")
    }

    #[test]
    fn test_issue_kindness_success() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);
        let id = client
            .issue_kindness(&alice, &bob, &s(&env, "You helped me move – thank you!"), &BadgeType::Spark, &cat(&env))
            .unwrap();
        assert_eq!(id, 1u64);
    }

    #[test]
    fn test_record_content_is_correct() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);
        let id = client
            .issue_kindness(&alice, &bob, &s(&env, "Great neighbour, always there for a chat!"), &BadgeType::Flame, &cat(&env))
            .unwrap();
        let record = client.get_record(&id).unwrap();
        assert_eq!(record.id, id);
        assert_eq!(record.issuer, alice);
        assert_eq!(record.recipient, bob);
        assert_eq!(record.badge, BadgeType::Flame);
        assert!(record.verified);
    }

    #[test]
    fn test_reputation_increments_correctly() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);
        client.issue_kindness(&alice, &bob, &s(&env, "Spark kindness act here"), &BadgeType::Spark, &cat(&env)).unwrap();
        client.issue_kindness(&alice, &bob, &s(&env, "Flame kindness act here!"), &BadgeType::Flame, &cat(&env)).unwrap();
        assert_eq!(client.get_reputation(&bob), 20);
    }

    #[test]
    fn test_try_issue_self_kindness_fails() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let result = client.try_issue_kindness(&alice, &alice, &s(&env, "Patting myself on the back"), &BadgeType::Spark, &cat(&env));
        assert_eq!(result, Err(Ok(ContractError::SelfKindnessNotAllowed)));
    }

    #[test]
    fn test_try_issue_message_too_short_fails() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);
        let result = client.try_issue_kindness(&alice, &bob, &s(&env, "Hi"), &BadgeType::Spark, &cat(&env));
        assert_eq!(result, Err(Ok(ContractError::MessageTooShort)));
    }

    #[test]
    fn test_try_get_nonexistent_record_fails() {
        let (env, client) = setup();
        let result = client.try_get_record(&9999u64);
        assert_eq!(result, Err(Ok(ContractError::RecordNotFound)));
    }

    #[test]
    fn test_issued_and_received_history() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);
        let carol = Address::generate(&env);
        client.issue_kindness(&alice, &bob,   &s(&env, "Kindness for Bob here!"),   &BadgeType::Spark, &cat(&env)).unwrap();
        client.issue_kindness(&alice, &carol, &s(&env, "Kindness for Carol here!"), &BadgeType::Flame, &cat(&env)).unwrap();
        assert_eq!(client.get_issued_by(&alice).len(),   2);
        assert_eq!(client.get_received_by(&bob).len(),   1);
        assert_eq!(client.get_received_by(&carol).len(), 1);
    }

    #[test]
    fn test_profile_aggregates_correctly() {
        let (env, client) = setup();
        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);
        client.issue_kindness(&alice, &bob, &s(&env, "Bob is an absolute legend!"), &BadgeType::Legend, &cat(&env)).unwrap();
        let profile = client.get_profile(&bob);
        assert_eq!(profile.reputation_score, 100);
        assert_eq!(profile.total_received, 1);
        assert_eq!(profile.total_issued, 0);
    }

    #[test]
    fn test_total_records_counter() {
        let (env, client) = setup();
        assert_eq!(client.total_records(), 0u64);
        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);
        let carol = Address::generate(&env);
        client.issue_kindness(&alice, &bob,   &s(&env, "First kindness record!"),  &BadgeType::Spark,  &cat(&env)).unwrap();
        client.issue_kindness(&alice, &carol, &s(&env, "Second kindness record!"), &BadgeType::Beacon, &cat(&env)).unwrap();
        assert_eq!(client.total_records(), 2u64);
    }
}
