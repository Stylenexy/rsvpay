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

/// Invariants 1 and 2 of docs/ARCHITECTURE.md (Invariants).
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
fn reply_with_only_the_storage_deposit_delivers_the_seed() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 1000);
    give(&mut c, &a, budi(), ONE_NEAR);
    let b = open(&mut c, budi(), 0);
    let seed = entry(&c, &a, 0).seed.0;
    testing_env!(ctx(siti(), 3 * MILLI_NEAR).build());
    let j = c.reciprocate(a.clone(), 0, b.clone(), String::new());
    let reply = entry(&c, &b, j);
    assert!(reply.amount.0 >= seed);
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
    testing_env!(ctx(buyer(), 3 * MILLI_NEAR).build());
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
    testing_env!(ctx(buyer(), 3 * MILLI_NEAR).build());
    let j = c.reciprocate(a.clone(), 0, b.clone(), "dari ahli waris".to_string());
    assert_eq!(entry(&c, &b, j).giver, buyer());
    assert!(entry(&c, &b, j).amount.0 >= seed);
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

#[test]
fn sale_during_a_payout_in_flight_keeps_every_coin_with_the_token() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    let before = c.hajatan(a.clone()).unwrap();
    testing_env!(ctx(siti(), 0).build());
    let _ = c.withdraw(a.clone());
    // the amplop is sold while the payout is still in flight, then the payout fails
    testing_env!(ctx(siti(), 1).build());
    c.nft_transfer(buyer(), a.clone(), None, None);
    testing_env!(ctx(accounts(0), 0).build());
    c.apply_withdraw_result(&a, before.free.0, false);
    let after = c.hajatan(a.clone()).unwrap();
    assert_eq!(after.owner_id, buyer());
    assert_eq!(after.balance.0, before.balance.0);
    assert_eq!(after.free.0, before.free.0);
    check_invariants(&c, &a);
    // the refund now belongs to the new holder, and only to them
    testing_env!(ctx(buyer(), 0).build());
    let _ = c.withdraw(a.clone());
    assert_eq!(c.hajatan(a.clone()).unwrap().free.0, 0);
    check_invariants(&c, &a);
}

// Reported in issue #1: a host could park a guest's seed in a decoy amplop that only looks like the guest's
// while a nft_transfer_call is in flight, then take the decoy back and withdraw the seed.
#[test]
#[should_panic(expected = "mid-transfer")]
fn audit_host_redirects_guest_seed_through_reverted_transfer_call() {
    let mut c = fresh();
    // Siti hosts with 10% kept; Budi gives 1 NEAR. Budi never hosts.
    let a = open(&mut c, siti(), 1000);
    give(&mut c, &a, budi(), ONE_NEAR);
    assert!(entry(&c, &a, 0).seed.0 > 0);

    // Siti opens a decoy with 0% kept and sends it to Budi with nft_transfer_call.
    let decoy = open(&mut c, siti(), 0);
    testing_env!(ctx(siti(), 1).build());
    let _ = c.nft_transfer_call(budi(), decoy.clone(), None, None, String::new());
    assert_eq!(c.hajatan(decoy.clone()).unwrap().owner_id, budi());

    // While the transfer is in flight, Siti tries to "reply" Budi's gift into the decoy.
    testing_env!(ctx(siti(), 0).build());
    c.reciprocate(a.clone(), 0, decoy.clone(), String::new());
}

// Once the decoy has really settled on the guest, the reply goes through as before.
#[test]
fn reply_into_a_settled_transfer_still_works() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 1000);
    give(&mut c, &a, budi(), ONE_NEAR);
    let gift = open(&mut c, siti(), 0);
    testing_env!(ctx(siti(), 1).build());
    let _ = c.nft_transfer_call(budi(), gift.clone(), None, None, String::new());
    testing_env!(
        ctx(accounts(0), 0).build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        vec![near_sdk::PromiseResult::Successful(b"false".to_vec())]
    );
    assert!(c.nft_resolve_transfer(siti(), budi(), gift.clone(), None));
    testing_env!(ctx(siti(), 3 * MILLI_NEAR).build());
    c.reciprocate(a.clone(), 0, gift.clone(), String::new());
    assert!(entry(&c, &a, 0).replied.is_some());
}

// Issue #7: a slow receiver gets no window. The lock holds for any delay a transaction's gas could buy.
#[test]
#[should_panic(expected = "mid-transfer")]
fn lock_holds_past_any_delay_until_the_resolver_runs() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    testing_env!(ctx(siti(), 1).build());
    let _ = c.nft_transfer_call(buyer(), a.clone(), None, None, String::new());
    let mut later = ctx(buyer(), 0);
    later.block_height(1000 + 100_000);
    testing_env!(later.build());
    assert!(c.is_locked(a.clone()));
    let _ = c.withdraw(a);
}

// If a resolver ever failed, the amplop must not freeze for good, because nobody can repair a keyless contract.
#[test]
fn a_lock_whose_resolver_never_ran_lets_go_after_the_long_bound() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    testing_env!(ctx(siti(), 1).build());
    let _ = c.nft_transfer_call(buyer(), a.clone(), None, None, String::new());
    let mut later = ctx(buyer(), 0);
    later.block_height(1000 + LOCK_MAX_BLOCKS + 1);
    testing_env!(later.build());
    assert!(!c.is_locked(a.clone()));
    let _ = c.withdraw(a);
}

// Issue #7: the first resolver must not clear the lock of a second transfer still in flight.
#[test]
#[should_panic(expected = "mid-transfer")]
fn audit_second_transfer_keeps_its_lock_after_the_first_resolver() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 0);
    give(&mut c, &a, budi(), ONE_NEAR);
    testing_env!(ctx(siti(), 1).build());
    let _ = c.nft_transfer_call(buyer(), a.clone(), None, None, String::new());
    let mut later = ctx(buyer(), 1);
    later.block_height(1301);
    testing_env!(later.build());
    let _ = c.nft_transfer_call(stranger(), a.clone(), None, None, String::new());
    let mut first = ctx(accounts(0), 0);
    first.block_height(1302);
    testing_env!(
        first.build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        vec![near_sdk::PromiseResult::Successful(b"true".to_vec())]
    );
    assert!(c.nft_resolve_transfer(siti(), buyer(), a.clone(), None));
    assert!(c.is_locked(a.clone()));
    let mut s = ctx(stranger(), 0);
    s.block_height(1303);
    testing_env!(s.build());
    let _ = c.withdraw(a);
}

// Issue #7: a former guest who holds the amplop on paper cannot release their own seed before the sale settles.
#[test]
#[should_panic(expected = "mid-transfer")]
fn audit_paper_owner_cannot_reciprocate_before_the_resolver() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 1000);
    give(&mut c, &a, buyer(), ONE_NEAR);
    let g = open(&mut c, buyer(), 0);
    testing_env!(ctx(siti(), 1).build());
    let _ = c.nft_transfer_call(buyer(), a.clone(), None, None, String::new());
    let mut later = ctx(buyer(), 0);
    later.block_height(1301);
    testing_env!(later.build());
    c.reciprocate(a, 0, g, String::new());
}

// Issue #8: the owner on paper cannot close the celebration and then hand it back closed.
#[test]
#[should_panic(expected = "mid-transfer")]
fn audit_paper_owner_cannot_close_hajatan_mid_transfer() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    testing_env!(ctx(siti(), 1).build());
    let _ = c.nft_transfer_call(buyer(), a.clone(), None, None, String::new());
    testing_env!(ctx(buyer(), 0).build());
    c.set_open(a, false);
}

// Issue #8: a long message is the caller's cost, never the guest's seed.
#[test]
#[should_panic(expected = "deposit must cover storage of the reply")]
fn audit_long_reply_message_cannot_eat_the_seed() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 1000);
    give(&mut c, &a, budi(), 200 * MILLI_NEAR);
    let b = open(&mut c, budi(), 0);
    testing_env!(ctx(siti(), 0).build());
    c.reciprocate(a, 0, b, "\u{1F600}".repeat(MAX_MESSAGE_CHARS));
}

#[test]
fn reply_delivers_the_whole_seed_when_the_caller_pays_the_storage() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 1000);
    give(&mut c, &a, budi(), 200 * MILLI_NEAR);
    let seed = entry(&c, &a, 0).seed.0;
    let b = open(&mut c, budi(), 0);
    let before = c.hajatan(b.clone()).unwrap().free.0;
    testing_env!(ctx(siti(), 30 * MILLI_NEAR).build());
    c.reciprocate(a, 0, b.clone(), "\u{1F600}".repeat(MAX_MESSAGE_CHARS));
    assert!(c.hajatan(b).unwrap().free.0 - before >= seed);
}

// Not a hole, written down for sellers: plain nft_transfer follows NEP-171 and the lock does not stop it.
#[test]
fn audit_plain_nft_transfer_is_not_gated_by_the_lock() {
    let mut c = fresh();
    let a = open(&mut c, siti(), 500);
    give(&mut c, &a, budi(), ONE_NEAR);
    testing_env!(ctx(siti(), 1).build());
    let _ = c.nft_transfer_call(buyer(), a.clone(), None, None, String::new());
    testing_env!(ctx(buyer(), 1).build());
    c.nft_transfer(stranger(), a.clone(), None, None);
    assert_eq!(c.hajatan(a.clone()).unwrap().owner_id, stranger());
    testing_env!(ctx(stranger(), 0).build());
    assert!(c.is_locked(a.clone()));
    testing_env!(
        ctx(accounts(0), 0).build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        vec![near_sdk::PromiseResult::Successful(b"true".to_vec())]
    );
    assert!(c.nft_resolve_transfer(siti(), buyer(), a.clone(), None));
    assert_eq!(c.hajatan(a.clone()).unwrap().owner_id, stranger());
    assert!(!c.is_locked(a));
}

// ---------- randomized sequences ----------
// Random give / reply / withdraw (paid or failed) / transfer / close / reopen / new amplop
// steps across five people. A shadow ledger kept outside the contract must match every
// amplop's balance to the yoctoNEAR after every step, invariants 1, 2, 4 and 5 of
// docs/ARCHITECTURE.md must hold for every amplop, and every yoctoNEAR that came in must be
// held, paid out, or kept for storage. 120 sequences of 120 steps with fixed seeds, so a
// failure prints its seed and step and reruns the same way.

struct Rng(u64);
impl Rng {
    fn next(&mut self) -> u64 {
        // xorshift64*
        self.0 ^= self.0 >> 12;
        self.0 ^= self.0 << 25;
        self.0 ^= self.0 >> 27;
        self.0.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }
    fn below(&mut self, n: u64) -> u64 {
        self.next() % n
    }
}

#[derive(Default)]
struct Ledger {
    tokens: Vec<TokenId>,
    owner: std::collections::HashMap<TokenId, AccountId>,
    open: std::collections::HashMap<TokenId, bool>,
    balance: std::collections::HashMap<TokenId, u128>,
    came_in: u128,
    paid_out: u128,
    kept: u128,
}

fn person(i: u64) -> AccountId {
    accounts(1 + (i % 5) as usize)
}

fn unreplied_seeds(c: &Contract, t: &TokenId) -> u128 {
    c.entries(t.clone(), None, Some(1000))
        .iter()
        .filter(|e| e.entry.replied.is_none())
        .map(|e| e.entry.seed.0)
        .sum()
}

fn ledger_matches(c: &Contract, l: &Ledger, at: &str) {
    let mut held = 0u128;
    for t in &l.tokens {
        check_invariants(c, t);
        let v = c.hajatan(t.clone()).unwrap();
        assert_eq!(v.balance.0, l.balance[t], "{at}: balance of #{t} differs from the shadow ledger");
        assert_eq!(&v.owner_id, &l.owner[t], "{at}: owner of #{t}");
        assert_eq!(v.open, l.open[t], "{at}: open flag of #{t}");
        for e in c.entries(t.clone(), None, Some(1000)) {
            match &e.entry.replied {
                None => assert_eq!(
                    e.entry.seed.0,
                    e.entry.amount.0 * v.seed_bps as u128 / 10_000,
                    "{at}: unreplied gift #{t}:{} keeps exactly seed_bps of itself",
                    e.index
                ),
                Some(r) => {
                    assert_eq!(e.entry.seed.0, 0, "{at}: replied gift #{t}:{} has no seed left", e.index);
                    let link = entry(c, &r.token_id, r.entry).reply_to.expect("the reply points back");
                    assert_eq!((link.token_id, link.entry), (t.clone(), e.index), "{at}: reply link");
                }
            }
        }
        held += v.balance.0;
    }
    assert_eq!(l.came_in, held + l.paid_out + l.kept, "{at}: a yoctoNEAR appeared or disappeared");
}

fn open_one(c: &mut Contract, l: &mut Ledger, host: AccountId, bps: u16) {
    let t = open(c, host.clone(), bps);
    let b = c.hajatan(t.clone()).unwrap().balance.0;
    l.came_in += 50 * MILLI_NEAR;
    l.kept += 50 * MILLI_NEAR - b;
    l.owner.insert(t.clone(), host);
    l.open.insert(t.clone(), true);
    l.balance.insert(t.clone(), b);
    l.tokens.push(t);
}

// One sequence on its own thread, so it starts from an empty mocked chain.
fn one_sequence(seed: u64) -> [u32; 5] {
    let (mut gives, mut replies, mut withdraws, mut refunds, mut transfers) = (0, 0, 0, 0, 0);
    {
        let mut r = Rng(seed.wrapping_mul(0x9E37_79B9_7F4A_7C15) | 1);
        let mut c = fresh();
        let mut l = Ledger::default();
        for i in 0..3 {
            open_one(&mut c, &mut l, person(i), (r.below(11) * 100) as u16);
        }
        for step in 0..120 {
            let at = format!("seed {seed} step {step}");
            let t = l.tokens[r.below(l.tokens.len() as u64) as usize].clone();
            let holder = l.owner[&t].clone();
            match r.below(10) {
                // give, 10 milliNEAR to 3 NEAR
                0..=3 if l.open[&t] => {
                    let deposit = 10 * MILLI_NEAR + r.below(3000) as u128 * MILLI_NEAR;
                    let idx = give(&mut c, &t, person(r.next()), deposit);
                    let amount = entry(&c, &t, idx).amount.0;
                    let storage = deposit - amount;
                    assert!(storage > 0 && storage < 5 * MILLI_NEAR, "{at}: storage {storage} for one gift");
                    l.came_in += deposit;
                    l.kept += storage;
                    *l.balance.get_mut(&t).unwrap() += amount;
                    gives += 1;
                }
                // the holder replies to an unreplied gift whose giver now holds an open amplop
                4..=5 => {
                    let pending: Vec<(u32, TokenId, u128)> = c
                        .entries(t.clone(), None, Some(1000))
                        .into_iter()
                        .filter(|e| e.entry.replied.is_none())
                        .filter_map(|e| {
                            l.tokens
                                .iter()
                                .find(|u| **u != t && l.open[*u] && l.owner[*u] == e.entry.giver)
                                .map(|u| (e.index, u.clone(), e.entry.seed.0))
                        })
                        .collect();
                    if pending.is_empty() {
                        continue;
                    }
                    let (idx, to, seed) = pending[r.below(pending.len() as u64) as usize].clone();
                    let deposit = 5 * MILLI_NEAR + r.below(500) as u128 * MILLI_NEAR;
                    testing_env!(ctx(holder.clone(), deposit).build());
                    let j = c.reciprocate(t.clone(), idx, to.clone(), String::new());
                    let reply = entry(&c, &to, j);
                    assert_eq!(reply.giver, holder, "{at}: the reply is from the holder");
                    assert_eq!(l.owner[&to], entry(&c, &t, idx).giver, "{at}: the reply lands with the giver");
                    assert!(reply.amount.0 >= seed, "{at}: the seed reaches the giver whole");
                    l.came_in += deposit;
                    l.kept += deposit + seed - reply.amount.0;
                    *l.balance.get_mut(&t).unwrap() -= seed;
                    *l.balance.get_mut(&to).unwrap() += reply.amount.0;
                    replies += 1;
                }
                // withdraw all free money; one payout in four fails and comes back into the amplop
                6 => {
                    let free = l.balance[&t] - unreplied_seeds(&c, &t);
                    if free == 0 {
                        continue;
                    }
                    testing_env!(ctx(holder.clone(), 0).build());
                    let _ = c.withdraw(t.clone());
                    assert_eq!(c.hajatan(t.clone()).unwrap().free.0, 0, "{at}: withdraw leaves no free money");
                    let paid = r.below(4) != 0;
                    testing_env!(ctx(accounts(0), 0).build());
                    c.apply_withdraw_result(&t, free, paid);
                    if paid {
                        l.paid_out += free;
                        *l.balance.get_mut(&t).unwrap() -= free;
                        withdraws += 1;
                    } else {
                        refunds += 1;
                    }
                }
                // sell or pass the amplop on: money, seeds and entries go with it
                7 => {
                    let to = person(r.next());
                    if to == holder {
                        continue;
                    }
                    testing_env!(ctx(holder.clone(), 1).build());
                    c.nft_transfer(to.clone(), t.clone(), None, None);
                    l.came_in += 1;
                    l.kept += 1;
                    l.owner.insert(t.clone(), to);
                    transfers += 1;
                }
                // close or reopen
                8 => {
                    let now = !l.open[&t];
                    testing_env!(ctx(holder.clone(), 0).build());
                    c.set_open(t.clone(), now);
                    l.open.insert(t.clone(), now);
                }
                // someone opens a new amplop, so old gifts start to ring
                9 if l.tokens.len() < 8 => {
                    open_one(&mut c, &mut l, person(r.next()), (r.below(11) * 100) as u16);
                }
                _ => continue,
            }
            ledger_matches(&c, &l, &at);
        }
    }
    [gives, replies, withdraws, refunds, transfers]
}

#[test]
fn random_sequences_never_lose_or_make_a_yoctonear() {
    let mut n = [0u32; 5];
    for seed in 1..=120u64 {
        let got = std::thread::spawn(move || one_sequence(seed))
            .join()
            .unwrap_or_else(|e| std::panic::resume_unwind(e));
        for k in 0..5 {
            n[k] += got[k];
        }
    }
    let [gives, replies, withdraws, refunds, transfers] = n;
    eprintln!("random sequences: gives {gives} replies {replies} withdraws {withdraws} refunds {refunds} transfers {transfers}");
    // the sequences really walk every path
    assert!(
        gives > 3_000 && replies > 1_000 && withdraws > 500 && refunds > 150 && transfers > 800,
        "gives {gives} replies {replies} withdraws {withdraws} refunds {refunds} transfers {transfers}"
    );
}
