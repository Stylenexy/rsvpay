//! Amplop Balas: a wedding-gift NFT that holds its own money, remembers who
//! gave, and helps the family give back when the giver hosts their own event.
//!
//! One NFT per celebration ("hajatan"). Guests `give` into it; every gift is an
//! entry (giver, amount, message, time). The host picks a reply seed of 0-10%
//! when opening: that share of each gift stays locked in the NFT in the
//! giver's name and can only ever leave as a reply to that same giver. When the
//! giver later opens their own hajatan, the current holder of the old NFT can
//! `reciprocate`: the seed plus any top-up lands in the giver's NFT as a new
//! entry linked to the old one. Everything else is free to `withdraw`.
//!
//! Engine reused from Kado: escrow per token id, only the CURRENT holder may
//! move money, transfer lock while nft_transfer_call settles, payout refunded
//! into the token if it fails. No admin, no owner-only method.

use near_contract_standards::non_fungible_token::core::{
    NonFungibleTokenCore, NonFungibleTokenResolver,
};
use near_contract_standards::non_fungible_token::enumeration::NonFungibleTokenEnumeration;
use near_contract_standards::non_fungible_token::events::NftMint;
use near_contract_standards::non_fungible_token::metadata::{
    NFTContractMetadata, NonFungibleTokenMetadataProvider, TokenMetadata, NFT_METADATA_SPEC,
};
use near_contract_standards::non_fungible_token::{NonFungibleToken, Token, TokenId};
use near_sdk::collections::LookupMap;
use near_sdk::json_types::{U128, U64};
use near_sdk::{
    env, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise,
    PromiseOrValue,
};
use std::collections::HashMap;

pub const MAX_MESSAGE_CHARS: usize = 280;
pub const MAX_TITLE_CHARS: usize = 80;
pub const MAX_DATE_CHARS: usize = 32;
/// Reply seed is capped at 10% (1000 basis points).
pub const MAX_SEED_BPS: u16 = 1000;
/// A transfer lock older than this many blocks is treated as stale.
pub const LOCK_MAX_BLOCKS: u64 = 300;
const GAS_FOR_PAYOUT_CALLBACK: Gas = Gas::from_tgas(10);

#[derive(BorshStorageKey)]
#[near(serializers = [borsh])]
enum StorageKey {
    Tokens,
    TokenMetadata,
    Enumeration,
    Hajatans,
    Entries,
    Locks,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct EntryRef {
    pub token_id: TokenId,
    pub entry: u32,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Entry {
    pub giver: AccountId,
    /// yoctoNEAR credited to the NFT by this gift (after its storage cost).
    pub amount: U128,
    /// Part of `amount` still locked for a reply to `giver` (0 once replied).
    pub seed: U128,
    pub message: String,
    /// Block timestamp, nanoseconds.
    pub at: U64,
    /// Set when this gift is itself a reply to an older gift.
    pub reply_to: Option<EntryRef>,
    /// Set once the holder replied to this gift.
    pub replied: Option<EntryRef>,
}

#[near(serializers = [borsh])]
pub struct Hajatan {
    title: String,
    date: String,
    seed_bps: u16,
    open: bool,
    /// Total yoctoNEAR held for this NFT = free + seed_locked.
    balance: u128,
    seed_locked: u128,
    entries: u32,
}

#[near(serializers = [json])]
pub struct HajatanView {
    pub token_id: TokenId,
    pub owner_id: AccountId,
    pub title: String,
    pub date: String,
    pub seed_bps: u16,
    pub open: bool,
    pub balance: U128,
    pub seed_locked: U128,
    pub free: U128,
    pub entries: u32,
}

#[near(serializers = [json])]
pub struct EntryView {
    pub index: u32,
    #[serde(flatten)]
    pub entry: Entry,
}

#[near(serializers = [json])]
pub struct PendingReply {
    pub entry: u32,
    pub giver: AccountId,
    pub amount: U128,
    pub seed: U128,
    /// The giver's newest open hajatan, where the reply would land.
    pub to_token_id: TokenId,
}

#[derive(PanicOnDefault)]
#[near(contract_state)]
pub struct Contract {
    tokens: NonFungibleToken,
    metadata: NFTContractMetadata,
    hajatans: LookupMap<TokenId, Hajatan>,
    /// key "<token_id>:<index>"
    entries: LookupMap<String, Entry>,
    locks: LookupMap<TokenId, (u32, u64)>,
    next_id: u64,
}

fn entry_key(token_id: &TokenId, index: u32) -> String {
    format!("{token_id}:{index}")
}

#[near]
impl Contract {
    #[init]
    pub fn new() -> Self {
        require!(!env::state_exists(), "Already initialized");
        Self {
            tokens: NonFungibleToken::new(
                StorageKey::Tokens,
                env::current_account_id(),
                Some(StorageKey::TokenMetadata),
                Some(StorageKey::Enumeration),
                None::<StorageKey>,
            ),
            metadata: NFTContractMetadata {
                spec: NFT_METADATA_SPEC.to_string(),
                name: "Amplop Balas".to_string(),
                symbol: "AMPLOP".to_string(),
                icon: None,
                base_uri: None,
                reference: None,
                reference_hash: None,
            },
            hajatans: LookupMap::new(StorageKey::Hajatans),
            entries: LookupMap::new(StorageKey::Entries),
            locks: LookupMap::new(StorageKey::Locks),
            next_id: 1,
        }
    }

    /// Open a celebration: mints the Amplop NFT to the caller. The deposit pays
    /// for storage; anything above that becomes free balance of the amplop.
    #[payable]
    pub fn open_hajatan(&mut self, title: String, date: String, seed_bps: u16) -> Token {
        require!(seed_bps <= MAX_SEED_BPS, "seed_bps must be 0..=1000 (max 10%)");
        require!(!title.trim().is_empty(), "title required");
        require!(title.chars().count() <= MAX_TITLE_CHARS, "title too long");
        require!(date.chars().count() <= MAX_DATE_CHARS, "date too long");
        let host = env::predecessor_account_id();
        let deposit = env::attached_deposit().as_yoctonear();

        let token_id: TokenId = self.next_id.to_string();
        self.next_id += 1;

        let storage_before = env::storage_usage();
        self.hajatans.insert(
            &token_id,
            &Hajatan {
                title: title.clone(),
                date: date.clone(),
                seed_bps,
                open: true,
                balance: 0,
                seed_locked: 0,
                entries: 0,
            },
        );
        let metadata = TokenMetadata {
            title: Some(format!("Amplop: {title}")),
            description: Some(date),
            media: None,
            media_hash: None,
            copies: Some(1),
            issued_at: Some(env::block_timestamp().to_string()),
            expires_at: None,
            starts_at: None,
            updated_at: None,
            extra: Some(format!("{{\"seed_bps\":{seed_bps}}}")),
            reference: None,
            reference_hash: None,
        };
        let token =
            self.tokens.internal_mint_with_refund(token_id.clone(), host.clone(), Some(metadata), None);
        let cost = self.storage_cost_since(storage_before);
        require!(deposit >= cost, "deposit must cover storage of the amplop");
        let excess = deposit - cost;
        if excess > 0 {
            let mut h = self.hajatan_or_panic(&token_id);
            h.balance = excess;
            self.hajatans.insert(&token_id, &h);
        }

        NftMint { owner_id: &host, token_ids: &[&token_id], memo: Some("amplop") }.emit();
        env::log_str(&format!("amplop:open token={token_id} host={host} seed_bps={seed_bps}"));
        token
    }

    /// Give into an open amplop. Deposit minus this entry's storage is the gift;
    /// `seed_bps` of it stays locked in the giver's name for a future reply.
    #[payable]
    pub fn give(&mut self, token_id: TokenId, message: String) -> u32 {
        require!(message.chars().count() <= MAX_MESSAGE_CHARS, "message too long");
        let h = self.hajatan_or_panic(&token_id);
        require!(h.open, "this hajatan is not accepting gifts");
        let giver = env::predecessor_account_id();
        let deposit = env::attached_deposit().as_yoctonear();

        let storage_before = env::storage_usage();
        let index = self.push_entry(&token_id, giver.clone(), message, None);
        let cost = self.storage_cost_since(storage_before);
        require!(deposit > cost, "deposit must cover storage and leave a gift");
        let (amount, seed) = self.credit(&token_id, index, deposit - cost);
        env::log_str(&format!(
            "amplop:give token={token_id} entry={index} giver={giver} yocto={amount} seed={seed}"
        ));
        index
    }

    /// Reply to gift `entry` of `token_id` by giving into `to_token_id`, the
    /// original giver's own open hajatan. Releases that entry's seed and adds
    /// the attached deposit. Only the current holder of `token_id` may do this.
    #[payable]
    pub fn reciprocate(
        &mut self,
        token_id: TokenId,
        entry: u32,
        to_token_id: TokenId,
        message: String,
    ) -> u32 {
        let caller = env::predecessor_account_id();
        self.require_holder(&token_id, &caller);
        require!(!self.lock_active(&token_id), "amplop is mid-transfer, try after it settles");
        require!(message.chars().count() <= MAX_MESSAGE_CHARS, "message too long");
        require!(to_token_id != token_id, "cannot reply into the same amplop");

        let key = entry_key(&token_id, entry);
        let mut old = self.entries.get(&key).unwrap_or_else(|| env::panic_str("no such entry"));
        require!(old.replied.is_none(), "this gift was already replied to");
        let target = self.hajatan_or_panic(&to_token_id);
        require!(target.open, "the giver's hajatan is not accepting gifts");
        let target_owner = self.owner_of(&to_token_id);
        require!(target_owner == old.giver, "reply must go to a hajatan held by the original giver");

        let seed = old.seed.0;
        let deposit = env::attached_deposit().as_yoctonear();
        let total = seed
            .checked_add(deposit)
            .unwrap_or_else(|| env::panic_str("amount overflow"));
        require!(total > 0, "nothing to send: no seed and no deposit");

        // release the seed from the old amplop
        let mut h = self.hajatan_or_panic(&token_id);
        h.balance = h.balance.checked_sub(seed).unwrap_or_else(|| env::panic_str("balance underflow"));
        h.seed_locked =
            h.seed_locked.checked_sub(seed).unwrap_or_else(|| env::panic_str("seed underflow"));
        self.hajatans.insert(&token_id, &h);

        let storage_before = env::storage_usage();
        let reply_ref = EntryRef { token_id: token_id.clone(), entry };
        let new_index = self.push_entry(&to_token_id, caller.clone(), message, Some(reply_ref));
        old.seed = U128(0);
        old.replied = Some(EntryRef { token_id: to_token_id.clone(), entry: new_index });
        self.entries.insert(&key, &old);
        let cost = self.storage_cost_since(storage_before);
        require!(total > cost, "seed plus deposit must cover storage of the reply");
        let (amount, _) = self.credit(&to_token_id, new_index, total - cost);
        env::log_str(&format!(
            "amplop:reply from={token_id} entry={entry} to={to_token_id} to_entry={new_index} yocto={amount}"
        ));
        new_index
    }

    /// Pay all FREE money (balance minus locked seeds) to the current holder.
    pub fn withdraw(&mut self, token_id: TokenId) -> Promise {
        let caller = env::predecessor_account_id();
        self.require_holder(&token_id, &caller);
        require!(!self.lock_active(&token_id), "amplop is mid-transfer, try after it settles");
        let mut h = self.hajatan_or_panic(&token_id);
        let free = h.balance - h.seed_locked;
        require!(free > 0, "nothing to withdraw");

        h.balance = h.seed_locked;
        self.hajatans.insert(&token_id, &h);
        env::log_str(&format!("amplop:withdraw token={token_id} holder={caller} yocto={free}"));

        Promise::new(caller).transfer(NearToken::from_yoctonear(free)).then(
            Self::ext(env::current_account_id())
                .with_static_gas(GAS_FOR_PAYOUT_CALLBACK)
                .on_withdraw_done(token_id, U128(free)),
        )
    }

    /// Callback: if the payout failed, the money goes back INTO THE AMPLOP.
    #[private]
    pub fn on_withdraw_done(&mut self, token_id: TokenId, amount: U128) {
        let paid = env::promise_result_checked(0, 0).is_ok();
        self.apply_withdraw_result(&token_id, amount.0, paid);
    }

    /// Open or close the hajatan for new gifts. Holder only.
    pub fn set_open(&mut self, token_id: TokenId, open: bool) {
        let caller = env::predecessor_account_id();
        self.require_holder(&token_id, &caller);
        let mut h = self.hajatan_or_panic(&token_id);
        h.open = open;
        self.hajatans.insert(&token_id, &h);
    }

    // ---------- views ----------

    pub fn hajatan(&self, token_id: TokenId) -> Option<HajatanView> {
        self.hajatans.get(&token_id).map(|h| self.view_of(token_id, h))
    }

    pub fn hajatan_of(&self, account_id: AccountId) -> Vec<HajatanView> {
        self.tokens
            .nft_tokens_for_owner(account_id, None, Some(100))
            .into_iter()
            .filter_map(|t| self.hajatan(t.token_id))
            .collect()
    }

    pub fn entries(&self, token_id: TokenId, from: Option<u32>, limit: Option<u32>) -> Vec<EntryView> {
        let count = self.hajatans.get(&token_id).map(|h| h.entries).unwrap_or(0);
        let from = from.unwrap_or(0);
        let end = count.min(from.saturating_add(limit.unwrap_or(50)));
        (from..end)
            .filter_map(|i| {
                self.entries.get(&entry_key(&token_id, i)).map(|entry| EntryView { index: i, entry })
            })
            .collect()
    }

    /// Gifts in `token_id` not yet replied to whose giver now holds an open
    /// hajatan: the "amplop berbunyi" list for the host's screen.
    pub fn pending_replies(&self, token_id: TokenId, from: Option<u32>, limit: Option<u32>) -> Vec<PendingReply> {
        self.entries(token_id.clone(), from, limit)
            .into_iter()
            .filter(|v| v.entry.replied.is_none())
            .filter_map(|v| {
                let to = self.newest_open_hajatan_of(&v.entry.giver, &token_id)?;
                Some(PendingReply {
                    entry: v.index,
                    giver: v.entry.giver,
                    amount: v.entry.amount,
                    seed: v.entry.seed,
                    to_token_id: to,
                })
            })
            .collect()
    }

    /// True while a nft_transfer_call is settling and money movements are refused.
    pub fn is_locked(&self, token_id: TokenId) -> bool {
        self.lock_active(&token_id)
    }
}

impl Contract {
    fn storage_cost_since(&self, before: u64) -> u128 {
        let used = env::storage_usage().saturating_sub(before);
        env::storage_byte_cost()
            .as_yoctonear()
            .checked_mul(used as u128)
            .unwrap_or_else(|| env::panic_str("storage cost overflow"))
    }

    fn hajatan_or_panic(&self, token_id: &TokenId) -> Hajatan {
        self.hajatans.get(token_id).unwrap_or_else(|| env::panic_str("no such amplop"))
    }

    fn owner_of(&self, token_id: &TokenId) -> AccountId {
        self.tokens.owner_by_id.get(token_id).unwrap_or_else(|| env::panic_str("no such amplop"))
    }

    fn require_holder(&self, token_id: &TokenId, caller: &AccountId) {
        require!(
            &self.owner_of(token_id) == caller,
            "only the current holder of the amplop can do this"
        );
    }

    /// Append an entry with zero amounts (u128 is fixed width, so the storage
    /// measured now is the final size) and bump the entry count.
    fn push_entry(
        &mut self,
        token_id: &TokenId,
        giver: AccountId,
        message: String,
        reply_to: Option<EntryRef>,
    ) -> u32 {
        let mut h = self.hajatan_or_panic(token_id);
        let index = h.entries;
        h.entries += 1;
        self.hajatans.insert(token_id, &h);
        self.entries.insert(
            &entry_key(token_id, index),
            &Entry {
                giver,
                amount: U128(0),
                seed: U128(0),
                message,
                at: U64(env::block_timestamp()),
                reply_to,
                replied: None,
            },
        );
        index
    }

    /// Put `amount` into entry `index` of `token_id`, locking the seed share.
    fn credit(&mut self, token_id: &TokenId, index: u32, amount: u128) -> (u128, u128) {
        let mut h = self.hajatan_or_panic(token_id);
        let seed = amount
            .checked_mul(h.seed_bps as u128)
            .unwrap_or_else(|| env::panic_str("seed overflow"))
            / 10_000;
        h.balance = h.balance.checked_add(amount).unwrap_or_else(|| env::panic_str("balance overflow"));
        h.seed_locked =
            h.seed_locked.checked_add(seed).unwrap_or_else(|| env::panic_str("seed overflow"));
        self.hajatans.insert(token_id, &h);
        let key = entry_key(token_id, index);
        let mut e = self.entries.get(&key).unwrap_or_else(|| env::panic_str("no such entry"));
        e.amount = U128(amount);
        e.seed = U128(seed);
        self.entries.insert(&key, &e);
        (amount, seed)
    }

    fn view_of(&self, token_id: TokenId, h: Hajatan) -> HajatanView {
        HajatanView {
            owner_id: self.owner_of(&token_id),
            token_id,
            title: h.title,
            date: h.date,
            seed_bps: h.seed_bps,
            open: h.open,
            balance: U128(h.balance),
            seed_locked: U128(h.seed_locked),
            free: U128(h.balance - h.seed_locked),
            entries: h.entries,
        }
    }

    fn newest_open_hajatan_of(&self, account: &AccountId, except: &TokenId) -> Option<TokenId> {
        self.tokens
            .nft_tokens_for_owner(account.clone(), None, Some(100))
            .into_iter()
            .map(|t| t.token_id)
            .filter(|id| id != except)
            .filter(|id| self.hajatans.get(id).map(|h| h.open).unwrap_or(false))
            .max_by_key(|id| id.parse::<u64>().unwrap_or(0))
    }

    fn lock_active(&self, token_id: &TokenId) -> bool {
        match self.locks.get(token_id) {
            Some((n, at)) if n > 0 => env::block_height() <= at.saturating_add(LOCK_MAX_BLOCKS),
            _ => false,
        }
    }

    fn apply_withdraw_result(&mut self, token_id: &TokenId, amount: u128, paid: bool) {
        if paid {
            env::log_str(&format!("amplop:paid token={token_id} yocto={amount}"));
        } else {
            let mut h = self.hajatan_or_panic(token_id);
            h.balance = h.balance.checked_add(amount).unwrap_or_else(|| env::panic_str("balance overflow"));
            self.hajatans.insert(token_id, &h);
            env::log_str(&format!("amplop:payout_failed_refunded token={token_id} yocto={amount}"));
        }
    }
}

#[near]
impl NonFungibleTokenCore for Contract {
    #[payable]
    fn nft_transfer(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
    ) {
        self.tokens.nft_transfer(receiver_id, token_id, approval_id, memo)
    }

    #[payable]
    fn nft_transfer_call(
        &mut self,
        receiver_id: AccountId,
        token_id: TokenId,
        approval_id: Option<u64>,
        memo: Option<String>,
        msg: String,
    ) -> PromiseOrValue<bool> {
        // lock BEFORE the transfer so the receiver cannot move money inside nft_on_transfer
        let in_flight = if self.lock_active(&token_id) {
            self.locks.get(&token_id).map(|(n, _)| n).unwrap_or(0)
        } else {
            0
        };
        self.locks.insert(&token_id, &(in_flight + 1, env::block_height()));
        self.tokens.nft_transfer_call(receiver_id, token_id, approval_id, memo, msg)
    }

    fn nft_token(&self, token_id: TokenId) -> Option<Token> {
        self.tokens.nft_token(token_id)
    }
}

#[near]
impl NonFungibleTokenResolver for Contract {
    #[private]
    fn nft_resolve_transfer(
        &mut self,
        previous_owner_id: AccountId,
        receiver_id: AccountId,
        token_id: TokenId,
        approved_account_ids: Option<HashMap<AccountId, u64>>,
    ) -> bool {
        if let Some((n, at)) = self.locks.get(&token_id) {
            self.locks.insert(&token_id, &(n.saturating_sub(1), at));
        }
        self.tokens.nft_resolve_transfer(previous_owner_id, receiver_id, token_id, approved_account_ids)
    }
}

#[near]
impl NonFungibleTokenEnumeration for Contract {
    fn nft_total_supply(&self) -> U128 {
        self.tokens.nft_total_supply()
    }

    fn nft_tokens(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        self.tokens.nft_tokens(from_index, limit)
    }

    fn nft_supply_for_owner(&self, account_id: AccountId) -> U128 {
        self.tokens.nft_supply_for_owner(account_id)
    }

    fn nft_tokens_for_owner(
        &self,
        account_id: AccountId,
        from_index: Option<U128>,
        limit: Option<u64>,
    ) -> Vec<Token> {
        self.tokens.nft_tokens_for_owner(account_id, from_index, limit)
    }
}

#[near]
impl NonFungibleTokenMetadataProvider for Contract {
    fn nft_metadata(&self) -> NFTContractMetadata {
        self.metadata.clone()
    }
}

#[cfg(test)]
mod tests;
