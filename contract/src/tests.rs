use super::*;
use near_sdk::test_utils::{accounts, VMContextBuilder};
use near_sdk::testing_env;

const ONE_NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MILLI_NEAR: u128 = ONE_NEAR / 1000;

// contract = accounts(0); siti (host) = accounts(1); budi (guest) = accounts(2);
// stranger = accounts(3); buyer = accounts(4)
fn siti() -> AccountId {
    accounts(1)
}
fn budi() -> AccountId {
    accounts(2)
}
fn stranger() -> AccountId {
    accounts(3)
}
fn buyer() -> AccountId {
    accounts(4)
}

fn ctx(predecessor: AccountId, deposit: u128) -> VMContextBuilder {
    let mut b = VMContextBuilder::new();
    b.current_account_id(accounts(0))
        .signer_account_id(predecessor.clone())
        .predecessor_account_id(predecessor)
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .block_height(1000);
    b
}

fn fresh() -> Contract {
    testing_env!(ctx(accounts(0), 0).build());
    Contract::new()
}

fn open(c: &mut Contract, host: AccountId, seed_bps: u16) -> TokenId {
    testing_env!(ctx(host, 50 * MILLI_NEAR).build());
    c.open_hajatan("Nikahan".to_string(), "2026-11-21".to_string(), seed_bps).token_id
}

fn give(c: &mut Contract, token: &TokenId, giver: AccountId, deposit: u128) -> u32 {
    testing_env!(ctx(giver, deposit).build());
    c.give(token.clone(), "selamat ya!".to_string())
}

fn entry(c: &Contract, token: &TokenId, index: u32) -> Entry {
    c.entries(token.clone(), Some(index), Some(1)).pop().unwrap().entry
}

/// Invariants 1 and 2 of SPEC §4.
fn check_invariants(c: &Contract, token: &TokenId) {
    let v = c.hajatan(token.clone()).unwrap();
    assert_eq!(v.balance.0, v.free.0 + v.seed_locked.0, "balance = free + seed_locked");
    let open_seeds: u128 = c
        .entries(token.clone(), None, Some(1000))
        .iter()
        .filter(|e| e.entry.replied.is_none())
        .map(|e| e.entry.seed.0)
        .sum();
    assert_eq!(open_seeds, v.seed_locked.0, "sum of unreplied seeds = seed_locked");
}

#[test]
fn open_mints_to_host_and_excess_deposit_is_free_balance() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    let v = c.hajatan(a.clone()).unwrap();
    assert_eq!(v.owner_id, siti());
    assert_eq!(v.seed_bps, 500);
    assert!(v.open);
    assert_eq!(v.entries, 0);
    assert_eq!(v.seed_locked.0, 0);
    assert!(v.free.0 > 0 && v.free.0 < 50 * MILLI_NEAR);
    assert_eq!(c.nft_token(a.clone()).unwrap().owner_id, siti());
    check_invariants(&c, &a);
}

#[test]
#[should_panic(expected = "seed_bps must be 0..=1000")]
fn seed_above_ten_percent_rejected() {
    let mut c = fresh();
    open(&mut c, siti(), 1001);
}

#[test]
#[should_panic(expected = "deposit must cover storage of the amplop")]
fn open_requires_storage_deposit() {
    let mut c = fresh();
    testing_env!(ctx(siti(), 1).build());
    c.open_hajatan("Nikahan".to_string(), "2026-11-21".to_string(), 0);
}

#[test]
fn give_records_entry_and_locks_seed_share() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    let before = c.hajatan(a.clone()).unwrap();
    let i = give(&mut c, &a, budi(), ONE_NEAR);
    assert_eq!(i, 0);
    let e = entry(&c, &a, 0);
    assert_eq!(e.giver, budi());
    assert!(e.amount.0 > 0 && e.amount.0 < ONE_NEAR);
    let cost = ONE_NEAR - e.amount.0;
    assert_eq!(cost % env::storage_byte_cost().as_yoctonear(), 0, "storage cost is whole bytes");
    assert_eq!(e.seed.0, e.amount.0 * 500 / 10_000);
    assert!(e.reply_to.is_none() && e.replied.is_none());
    let v = c.hajatan(a.clone()).unwrap();
    assert_eq!(v.entries, 1);
    assert_eq!(v.seed_locked.0, e.seed.0);
    assert_eq!(v.balance.0, before.balance.0 + e.amount.0);
    check_invariants(&c, &a);
}

#[test]
fn zero_seed_hajatan_locks_nothing() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 0);
    give(&mut c, &a, budi(), ONE_NEAR);
    assert_eq!(entry(&c, &a, 0).seed.0, 0);
    assert_eq!(c.hajatan(a.clone()).unwrap().seed_locked.0, 0);
    check_invariants(&c, &a);
}

#[test]
#[should_panic(expected = "not accepting gifts")]
fn closed_hajatan_refuses_gifts() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    testing_env!(ctx(siti(), 0).build());
    c.set_open(a.clone(), false);
    give(&mut c, &a, budi(), ONE_NEAR);
}

#[test]
#[should_panic(expected = "only the current holder")]
fn stranger_cannot_close_hajatan() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    testing_env!(ctx(stranger(), 0).build());
    c.set_open(a, false);
}

#[test]
#[should_panic(expected = "deposit must cover storage and leave a gift")]
fn tiny_gift_rejected() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), 1);
}

#[test]
#[should_panic(expected = "message too long")]
fn long_message_rejected() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    testing_env!(ctx(budi(), ONE_NEAR).build());
    c.give(a, "a".repeat(MAX_MESSAGE_CHARS + 1));
}

#[test]
#[should_panic(expected = "no such amplop")]
fn give_to_unknown_amplop_panics() {
    let mut c = fresh();
    give(&mut c, &"99".to_string(), budi(), ONE_NEAR);
}

#[test]
fn withdraw_pays_only_free_money_and_never_touches_seeds() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 1000);
    give(&mut c, &a, budi(), ONE_NEAR);
    give(&mut c, &a, stranger(), 2 * ONE_NEAR);
    give(&mut c, &a, buyer(), 3 * ONE_NEAR);
    let seeds = c.hajatan(a.clone()).unwrap().seed_locked.0;
    assert!(seeds > 0);
    testing_env!(ctx(siti(), 0).build());
    let _ = c.withdraw(a.clone());
    let v = c.hajatan(a.clone()).unwrap();
    assert_eq!(v.free.0, 0);
    assert_eq!(v.balance.0, seeds, "only seeds remain after withdraw");
    check_invariants(&c, &a);
}

#[test]
#[should_panic(expected = "nothing to withdraw")]
fn no_double_withdraw() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    testing_env!(ctx(siti(), 0).build());
    let _ = c.withdraw(a.clone());
    let _ = c.withdraw(a);
}

#[test]
#[should_panic(expected = "only the current holder")]
fn stranger_cannot_withdraw() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    testing_env!(ctx(stranger(), 0).build());
    let _ = c.withdraw(a);
}

#[test]
#[should_panic(expected = "only the current holder")]
fn old_owner_cannot_withdraw_after_transfer() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    testing_env!(ctx(siti(), 1).build());
    c.nft_transfer(buyer(), a.clone(), None, None);
    testing_env!(ctx(siti(), 0).build());
    let _ = c.withdraw(a);
}

#[test]
fn transfer_moves_money_seeds_and_entries_with_the_token() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let before = c.hajatan(a.clone()).unwrap();
    testing_env!(ctx(siti(), 1).build());
    c.nft_transfer(buyer(), a.clone(), None, None);
    let after = c.hajatan(a.clone()).unwrap();
    assert_eq!(after.owner_id, buyer());
    assert_eq!(after.balance.0, before.balance.0);
    assert_eq!(after.seed_locked.0, before.seed_locked.0);
    assert_eq!(after.entries, 1);
    testing_env!(ctx(buyer(), 0).build());
    let _ = c.withdraw(a.clone());
    assert_eq!(c.hajatan(a.clone()).unwrap().free.0, 0);
    check_invariants(&c, &a);
}

#[test]
fn full_cycle_budi_hosts_later_and_siti_replies_with_seed_plus_top_up() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let old = entry(&c, &a, 0);
    assert!(c.pending_replies(a.clone(), None, None).is_empty(), "budi has no hajatan yet");

    // "Nov 2028": budi opens his own hajatan
    let b = open(&mut c, budi(), 500);
    let pending = c.pending_replies(a.clone(), None, None);
    assert_eq!(pending.len(), 1);
    assert_eq!(pending[0].entry, 0);
    assert_eq!(pending[0].giver, budi());
    assert_eq!(pending[0].seed.0, old.seed.0);
    assert_eq!(pending[0].to_token_id, b);

    let b_before = c.hajatan(b.clone()).unwrap();
    testing_env!(ctx(siti(), ONE_NEAR).build());
    let j = c.reciprocate(a.clone(), 0, b.clone(), "gantian ya, selamat!".to_string());

    // reply landed in budi's amplop, linked both ways
    let reply = entry(&c, &b, j);
    assert_eq!(reply.giver, siti());
    assert_eq!(reply.reply_to, Some(EntryRef { token_id: a.clone(), entry: 0 }));
    let cost = old.seed.0 + ONE_NEAR - reply.amount.0;
    assert_eq!(cost % env::storage_byte_cost().as_yoctonear(), 0);
    assert!(cost < 10 * MILLI_NEAR, "storage of a reply is small");
    assert_eq!(c.hajatan(b.clone()).unwrap().balance.0, b_before.balance.0 + reply.amount.0);
    let replied = entry(&c, &a, 0);
    assert_eq!(replied.replied, Some(EntryRef { token_id: b.clone(), entry: j }));
    assert_eq!(replied.seed.0, 0);

    // the old amplop released exactly the seed
    let va = c.hajatan(a.clone()).unwrap();
    assert_eq!(va.seed_locked.0, 0);
    assert!(c.pending_replies(a.clone(), None, None).is_empty());
    check_invariants(&c, &a);
    check_invariants(&c, &b);
}

#[test]
fn reply_with_seed_only_needs_no_deposit() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 1000);
    give(&mut c, &a, budi(), ONE_NEAR);
    let b = open(&mut c, budi(), 0);
    let seed = entry(&c, &a, 0).seed.0;
    testing_env!(ctx(siti(), 0).build());
    let j = c.reciprocate(a.clone(), 0, b.clone(), String::new());
    let reply = entry(&c, &b, j);
    assert!(reply.amount.0 > 0 && reply.amount.0 < seed);
    check_invariants(&c, &a);
    check_invariants(&c, &b);
}

#[test]
#[should_panic(expected = "already replied")]
fn a_gift_can_be_replied_only_once() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let b = open(&mut c, budi(), 500);
    testing_env!(ctx(siti(), ONE_NEAR).build());
    c.reciprocate(a.clone(), 0, b.clone(), String::new());
    testing_env!(ctx(siti(), ONE_NEAR).build());
    c.reciprocate(a, 0, b, String::new());
}

#[test]
#[should_panic(expected = "held by the original giver")]
fn reply_cannot_be_redirected_to_someone_else() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let other = open(&mut c, stranger(), 500);
    testing_env!(ctx(siti(), ONE_NEAR).build());
    c.reciprocate(a, 0, other, String::new());
}

#[test]
#[should_panic(expected = "only the current holder")]
fn only_holder_can_reciprocate() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let b = open(&mut c, budi(), 500);
    // budi tries to release his own seed from siti's amplop
    testing_env!(ctx(budi(), 0).build());
    c.reciprocate(a, 0, b, String::new());
}

#[test]
#[should_panic(expected = "only the current holder")]
fn old_owner_cannot_reciprocate_after_transfer() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let b = open(&mut c, budi(), 500);
    testing_env!(ctx(siti(), 1).build());
    c.nft_transfer(buyer(), a.clone(), None, None);
    testing_env!(ctx(siti(), ONE_NEAR).build());
    c.reciprocate(a, 0, b, String::new());
}

#[test]
fn new_holder_inherits_the_duty_and_the_seed() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let b = open(&mut c, budi(), 500);
    testing_env!(ctx(siti(), 1).build());
    c.nft_transfer(buyer(), a.clone(), None, None);
    testing_env!(ctx(buyer(), 0).build());
    let j = c.reciprocate(a.clone(), 0, b.clone(), String::new());
    assert_eq!(entry(&c, &b, j).giver, buyer());
    check_invariants(&c, &a);
}

#[test]
#[should_panic(expected = "not accepting gifts")]
fn reply_to_closed_hajatan_rejected() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let b = open(&mut c, budi(), 500);
    testing_env!(ctx(budi(), 0).build());
    c.set_open(b.clone(), false);
    testing_env!(ctx(siti(), ONE_NEAR).build());
    c.reciprocate(a, 0, b, String::new());
}

#[test]
#[should_panic(expected = "nothing to send")]
fn reply_without_seed_or_deposit_rejected() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 0);
    give(&mut c, &a, budi(), ONE_NEAR);
    let b = open(&mut c, budi(), 0);
    testing_env!(ctx(siti(), 0).build());
    c.reciprocate(a, 0, b, String::new());
}

#[test]
#[should_panic(expected = "same amplop")]
fn reply_into_same_amplop_rejected() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, siti(), ONE_NEAR);
    testing_env!(ctx(siti(), ONE_NEAR).build());
    c.reciprocate(a.clone(), 0, a, String::new());
}

#[test]
fn pending_replies_skips_givers_without_open_hajatan() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    give(&mut c, &a, stranger(), ONE_NEAR);
    let b = open(&mut c, budi(), 500);
    let s = open(&mut c, stranger(), 500);
    testing_env!(ctx(stranger(), 0).build());
    c.set_open(s, false);
    let pending = c.pending_replies(a, None, None);
    assert_eq!(pending.len(), 1);
    assert_eq!(pending[0].giver, budi());
    assert_eq!(pending[0].to_token_id, b);
}

#[test]
fn pending_replies_points_at_the_givers_newest_open_hajatan() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let _old = open(&mut c, budi(), 500);
    let newer = open(&mut c, budi(), 500);
    let pending = c.pending_replies(a, None, None);
    assert_eq!(pending[0].to_token_id, newer);
}

#[test]
#[should_panic(expected = "mid-transfer")]
fn withdraw_blocked_while_sale_settles() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    testing_env!(ctx(siti(), 1).build());
    let _ = c.nft_transfer_call(buyer(), a.clone(), None, None, "sale".to_string());
    assert!(c.is_locked(a.clone()));
    // the buyer owns it right now but must not drain it inside nft_on_transfer
    testing_env!(ctx(buyer(), 0).build());
    let _ = c.withdraw(a);
}

#[test]
#[should_panic(expected = "mid-transfer")]
fn reciprocate_blocked_while_sale_settles() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let b = open(&mut c, budi(), 500);
    testing_env!(ctx(siti(), 1).build());
    let _ = c.nft_transfer_call(buyer(), a.clone(), None, None, "sale".to_string());
    testing_env!(ctx(buyer(), 0).build());
    c.reciprocate(a, 0, b, String::new());
}

#[test]
fn sale_reverted_by_receiver_returns_amplop_and_unlocks() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let before = c.hajatan(a.clone()).unwrap();
    testing_env!(ctx(siti(), 1).build());
    let _ = c.nft_transfer_call(buyer(), a.clone(), None, None, "sale".to_string());
    testing_env!(
        ctx(accounts(0), 0).build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        vec![near_sdk::PromiseResult::Successful(b"true".to_vec())]
    );
    let kept_by_receiver = c.nft_resolve_transfer(siti(), buyer(), a.clone(), None);
    assert!(!kept_by_receiver);
    assert!(!c.is_locked(a.clone()));
    let after = c.hajatan(a.clone()).unwrap();
    assert_eq!(after.owner_id, siti());
    assert_eq!(after.balance.0, before.balance.0);
}

#[test]
fn stale_lock_releases_after_lock_max_blocks() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    testing_env!(ctx(siti(), 1).build());
    let _ = c.nft_transfer_call(buyer(), a.clone(), None, None, "x".to_string());
    let mut later = ctx(buyer(), 0);
    later.block_height(1000 + LOCK_MAX_BLOCKS + 1);
    testing_env!(later.build());
    assert!(!c.is_locked(a.clone()));
    let _ = c.withdraw(a);
}

#[test]
fn failed_payout_refunds_into_the_amplop() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let before = c.hajatan(a.clone()).unwrap();
    testing_env!(ctx(siti(), 0).build());
    let _ = c.withdraw(a.clone());
    testing_env!(ctx(accounts(0), 0).build());
    c.apply_withdraw_result(&a, before.free.0, false);
    let after = c.hajatan(a.clone()).unwrap();
    assert_eq!(after.balance.0, before.balance.0);
    assert_eq!(after.free.0, before.free.0);
    check_invariants(&c, &a);
}

#[test]
fn successful_payout_keeps_free_at_zero() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let free = c.hajatan(a.clone()).unwrap().free.0;
    testing_env!(ctx(siti(), 0).build());
    let _ = c.withdraw(a.clone());
    testing_env!(ctx(accounts(0), 0).build());
    c.apply_withdraw_result(&a, free, true);
    assert_eq!(c.hajatan(a.clone()).unwrap().free.0, 0);
    check_invariants(&c, &a);
}

#[test]
fn reply_chain_continues_budi_can_reply_back_later() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let b = open(&mut c, budi(), 500);
    testing_env!(ctx(siti(), ONE_NEAR).build());
    let j = c.reciprocate(a.clone(), 0, b.clone(), String::new());
    // years later siti hosts again; budi's amplop now "rings" for siti's reply
    let a2 = open(&mut c, siti(), 500);
    let pending = c.pending_replies(b.clone(), None, None);
    assert_eq!(pending.len(), 1);
    assert_eq!(pending[0].entry, j);
    assert_eq!(pending[0].to_token_id, a2);
    testing_env!(ctx(budi(), ONE_NEAR).build());
    let k = c.reciprocate(b.clone(), j, a2.clone(), String::new());
    assert_eq!(entry(&c, &a2, k).reply_to, Some(EntryRef { token_id: b.clone(), entry: j }));
    check_invariants(&c, &a);
    check_invariants(&c, &b);
    check_invariants(&c, &a2);
}

#[test]
fn hajatan_of_lists_holder_amplops() {
    let mut c = fresh();
    open(&mut c, siti(), 500);
    open(&mut c, siti(), 0);
    open(&mut c, budi(), 0);
    assert_eq!(c.hajatan_of(siti()).len(), 2);
    assert_eq!(c.hajatan_of(budi()).len(), 1);
}

// ---------- failures that would cost someone money or a promise ----------

#[test]
#[should_panic(expected = "no such amplop")]
fn gift_to_a_missing_amplop_rejected() {
    let mut c = fresh();
    give(&mut c, &"404".to_string(), budi(), ONE_NEAR);
}

#[test]
#[should_panic(expected = "deposit must cover storage of the amplop")]
fn open_without_storage_deposit_rejected() {
    let mut c = fresh();
    testing_env!(ctx(siti(), 1).build());
    c.open_hajatan("Nikahan".to_string(), "2026-11-21".to_string(), 500);
}

#[test]
#[should_panic(expected = "no such entry")]
fn reply_to_a_missing_entry_rejected() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let b = open(&mut c, budi(), 500);
    testing_env!(ctx(siti(), ONE_NEAR).build());
    c.reciprocate(a, 7, b, String::new());
}

#[test]
fn ring_stops_when_the_giver_sold_their_hajatan() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let b = open(&mut c, budi(), 500);
    assert_eq!(c.pending_replies(a.clone(), None, None).len(), 1);
    testing_env!(ctx(budi(), 1).build());
    c.nft_transfer(buyer(), b, None, None);
    assert!(c.pending_replies(a, None, None).is_empty());
}

#[test]
#[should_panic(expected = "reply must go to a hajatan held by the original giver")]
fn reply_cannot_follow_the_giver_hajatan_to_its_buyer() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let b = open(&mut c, budi(), 500);
    testing_env!(ctx(budi(), 1).build());
    c.nft_transfer(buyer(), b.clone(), None, None);
    testing_env!(ctx(siti(), ONE_NEAR).build());
    c.reciprocate(a, 0, b, String::new());
}

#[test]
#[should_panic(expected = "only the current holder")]
fn old_owner_cannot_close_the_hajatan_after_transfer() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    testing_env!(ctx(siti(), 1).build());
    c.nft_transfer(buyer(), a.clone(), None, None);
    testing_env!(ctx(siti(), 0).build());
    c.set_open(a, false);
}

#[test]
fn new_holder_inherits_the_promise_and_can_reply() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let seed = entry(&c, &a, 0).seed.0;
    let b = open(&mut c, budi(), 500);
    testing_env!(ctx(siti(), 1).build());
    c.nft_transfer(buyer(), a.clone(), None, None);
    testing_env!(ctx(buyer(), 0).build());
    let j = c.reciprocate(a.clone(), 0, b.clone(), "dari ahli waris".to_string());
    assert_eq!(entry(&c, &b, j).giver, buyer());
    assert!(entry(&c, &b, j).amount.0 < seed);
    check_invariants(&c, &a);
    check_invariants(&c, &b);
}

#[test]
fn failed_payout_with_a_gift_in_between_loses_nothing() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let first = c.hajatan(a.clone()).unwrap();
    testing_env!(ctx(siti(), 0).build());
    let _ = c.withdraw(a.clone());
    // a new gift lands while the payout is in flight
    give(&mut c, &a, stranger(), ONE_NEAR);
    let second_gift = entry(&c, &a, 1).amount.0;
    testing_env!(ctx(accounts(0), 0).build());
    c.apply_withdraw_result(&a, first.free.0, false);
    let after = c.hajatan(a.clone()).unwrap();
    assert_eq!(after.balance.0, first.balance.0 + second_gift);
    check_invariants(&c, &a);
}

#[test]
fn seed_rounding_on_tiny_gifts_never_breaks_the_books() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 1);
    // gifts barely above storage: 0.01% of them rounds down, sometimes to zero
    for i in 0..5u128 {
        give(&mut c, &a, budi(), 5 * MILLI_NEAR + i);
        check_invariants(&c, &a);
    }
    testing_env!(ctx(siti(), 0).build());
    let _ = c.withdraw(a.clone());
    check_invariants(&c, &a);
}
