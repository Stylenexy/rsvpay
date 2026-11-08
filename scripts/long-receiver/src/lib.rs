//! Test-only receiver for issue #12. It answers `nft_on_transfer` late on purpose:
//! it parks the answer in a yield, and every time the yield times out (200 blocks)
//! it parks it again, until the target block height is reached or the gas runs out.
//! The RSVPay resolver waits on that answer, so the amplop stays mid-transfer the whole time.
//!
//! msg = "<blocks>:back" (answer true, the amplop goes back to the sender)
//!     | "<blocks>:keep" (answer false, the receiver keeps it)

use near_sdk::{env, near, AccountId, Gas, GasWeight};

#[near(contract_state)]
#[derive(Default)]
pub struct Receiver {}

fn park(until: u64, back: bool, links: u32) {
    let args = format!("{{\"until\":{until},\"back\":{back},\"links\":{links}}}");
    // no static gas: all gas left after this call goes to the next link
    let idx = env::promise_yield_create("hold", args.as_bytes(), Gas::from_gas(0), GasWeight(1), 0);
    env::promise_return(idx);
}

#[near]
impl Receiver {
    pub fn nft_on_transfer(
        &self,
        sender_id: AccountId,
        previous_owner_id: AccountId,
        token_id: String,
        msg: String,
    ) {
        let (n, mode) = msg.split_once(':').unwrap_or((msg.as_str(), "back"));
        let blocks: u64 = n.parse().unwrap_or_else(|_| env::panic_str("msg must be <blocks>:back or <blocks>:keep"));
        let back = mode != "keep";
        let start = env::block_height();
        env::log_str(&format!(
            "hold:start token={token_id} from={previous_owner_id} by={sender_id} at={start} until={} back={back} gas_left={}",
            start + blocks,
            env::prepaid_gas().as_gas() - env::used_gas().as_gas()
        ));
        park(start + blocks, back, 1);
    }

    /// Runs when a parked yield times out. Parks again until `until`, then answers.
    #[private]
    pub fn hold(&self, until: u64, back: bool, links: u32) {
        let at = env::block_height();
        let gas_left = env::prepaid_gas().as_gas() - env::used_gas().as_gas();
        if at < until {
            env::log_str(&format!("hold:link {links} at={at} gas_left={gas_left}"));
            park(until, back, links + 1);
        } else {
            env::log_str(&format!("hold:answer {back} links={links} at={at} gas_left={gas_left}"));
            env::value_return(if back { "true" } else { "false" }.as_bytes());
        }
    }
}
