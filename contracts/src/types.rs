use soroban_sdk::{contracttype, Address, String, Symbol};

/// Represents the tier of a kindness act.
#[contracttype]
#[derive(Clone, Copy, Debug)]
pub enum BadgeType {
    Spark,
    Flame,
    Beacon,
    Legend,
}

impl BadgeType {
    /// Returns the reputation points awarded for each badge tier.
    pub fn reputation_points(&self) -> u64 {
        match self {
            BadgeType::Spark  => 5,
            BadgeType::Flame  => 15,
            BadgeType::Beacon => 50,
            BadgeType::Legend => 100,
        }
    }
}

/// A single act of kindness recorded on-chain.
#[contracttype]
#[derive(Clone, Debug)]
pub struct KindnessRecord {
    pub id:               u64,
    pub issuer:           Address,
    pub recipient:        Address,
    pub message:          String,
    pub badge:            BadgeType,
    pub category:         Symbol,
    pub timestamp:        u64,
    pub verified:         bool,
}

/// Aggregated reputation profile for a user.
#[contracttype]
#[derive(Clone, Debug)]
pub struct UserProfile {
    pub address:          Address,
    pub reputation_score: u64,
    pub total_received:   u64,
    pub total_issued:     u64,
}
