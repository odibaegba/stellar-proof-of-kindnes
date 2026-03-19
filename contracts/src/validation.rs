use soroban_sdk::{Address, Env, String};

use crate::errors::ContractError;

/// Returns an error if the message is shorter than 5 or longer than 280 bytes.
pub fn validate_message(env: &Env, message: &String) -> Result<(), ContractError> {
    let _ = env; // env retained for future locale/encoding hooks
    let len = message.len();
    if len < 5 {
        return Err(ContractError::MessageTooShort);
    }
    if len > 280 {
        return Err(ContractError::MessageTooLong);
    }
    Ok(())
}

/// Returns an error if the issuer and recipient are the same address.
pub fn validate_parties(issuer: &Address, recipient: &Address) -> Result<(), ContractError> {
    if issuer == recipient {
        return Err(ContractError::SelfKindnessNotAllowed);
    }
    Ok(())
}
