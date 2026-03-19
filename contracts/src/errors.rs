use soroban_sdk::contracterror;

/// All contract-level errors with deterministic u32 codes.
#[contracterror]
#[derive(Clone, Copy, Debug, PartialEq)]
#[repr(u32)]
pub enum ContractError {
    // Validation errors (1xx)
    MessageTooShort        = 101,
    MessageTooLong         = 102,
    SelfKindnessNotAllowed = 103,
    InvalidCategory        = 104,

    // Storage errors (2xx)
    RecordNotFound         = 201,
    ProfileNotFound        = 202,
    StorageWriteFailed     = 203,

    // Authorization errors (3xx)
    UnauthorizedCaller     = 301,
    IssuerMismatch         = 302,

    // Arithmetic errors (4xx)
    ReputationOverflow     = 401,

    // Generic (5xx)
    InternalError          = 500,
}
