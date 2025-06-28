/// A 2-in-1 module that combines managed_fungible_asset and coin_example into one module that when deployed, the
/// deployer will be creating a new managed fungible asset with the hardcoded supply config, name, symbol, and decimals.
/// The address of the asset can be obtained via get_metadata(). As a simple version, it only deals with primary stores.
module cabal_addr::cabalcoin {
    use aptos_framework::fungible_asset::{Self, MintRef, TransferRef, BurnRef, Metadata};
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use std::error;
    use std::vector;
    use std::signer;
    use std::string::utf8;
    use std::option;

    /// Only fungible asset metadata owner can make changes.
    const ENOT_OWNER: u64 = 1;
    const ENOT_ON_ALLOWLIST: u64 = 2;
    const EALREADY_CLAIMED: u64 = 3;
    const EOUTSIDE_CLAIM_PERIOD: u64 = 4;

    const ASSET_SYMBOL: vector<u8> = b"CBL";

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    /// Hold refs to control the minting, transfer and burning of fungible assets.
    struct ManagedFungibleAsset has key {
        mint_ref: MintRef,
        transfer_ref: TransferRef,
        burn_ref: BurnRef,
    }

    struct AllowedAddresses has key, store {
        table: Table<address, bool>,
    }

    struct AllowlistConfig has key {
        allow_list: AllowedAddresses,
        claim_start: u64,
        claim_end: u64,
    }
     
    fun init_module(admin: &signer) {
        let constructor_ref = &object::create_named_object(admin, ASSET_SYMBOL);
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            utf8(b"Cabal Coin"), /* name */
            utf8(ASSET_SYMBOL), /* symbol */
            8, /* decimals */
            utf8(b"http://akasha.live/favicon.ico"), /* icon */
            utf8(b"http://akasha.live"), /* project */
        );

        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(constructor_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(constructor_ref);
        let metadata_object_signer = object::generate_signer(constructor_ref);
        let table = table::new<address, bool>();
        let allow_list = AllowedAddresses { table };
        move_to(
            &metadata_object_signer,
            ManagedFungibleAsset { mint_ref, transfer_ref, burn_ref }
        );
        let config = AllowlistConfig {
            allow_list,
            claim_start: 0,
            claim_end: 0,
        };
        move_to(
            admin,
            config
        );
    }

    public entry fun add_to_allowlist(
        admin: &signer,
        addresses: vector<address>,
        claim_start: u64,
        claim_end: u64
    ) acquires AllowlistConfig {
        let config = borrow_global_mut<AllowlistConfig>(signer::address_of(admin));
        let table_ref = &mut config.allow_list.table;
        let len = vector::length(&addresses);
        let i = 0;
        while (i < len) {
            let addr = *vector::borrow(&addresses, i);
            table::add(table_ref, addr, false);
            i = i + 1;
        };

        config.claim_start = claim_start;
        config.claim_end = claim_end;
    }

    #[view]
    public fun get_metadata(): Object<Metadata> {
        let asset_address = object::create_object_address(&@cabal_addr, ASSET_SYMBOL);
        object::address_to_object<Metadata>(asset_address)
    }

    public entry fun claim(claimant: &signer) acquires ManagedFungibleAsset, AllowlistConfig {
        let address = signer::address_of(claimant);
        let config = borrow_global_mut<AllowlistConfig>(@cabal_addr);
        let now = timestamp::now_seconds();
        assert!(
            now >= config.claim_start && now <= config.claim_end,
            error::invalid_state(EOUTSIDE_CLAIM_PERIOD)
        );

        let table_ref = &mut config.allow_list.table;
        let is_allowed = table::contains(table_ref, address);
        assert!(is_allowed, error::permission_denied(ENOT_ON_ALLOWLIST));

        let already_claimed = *table::borrow(table_ref, address);
        assert!(!already_claimed, error::invalid_state(EALREADY_CLAIMED));

        let claimed_ref = table::borrow_mut(table_ref, address);
        *claimed_ref = true;

        let asset = get_metadata();
        let managed_fungible_asset = borrow_global<ManagedFungibleAsset>(object::object_address(&asset));
        let to_wallet = primary_fungible_store::ensure_primary_store_exists(address, asset);
        let fa = fungible_asset::mint(&managed_fungible_asset.mint_ref, 10_000_000_000);
        fungible_asset::deposit_with_ref(&managed_fungible_asset.transfer_ref, to_wallet, fa);
    }

    // Test-only function that bypasses time checks
    #[test_only]
    public fun claim_test_only(claimant: &signer) acquires ManagedFungibleAsset, AllowlistConfig {
        let address = signer::address_of(claimant);
        let config = borrow_global_mut<AllowlistConfig>(@cabal_addr);

        let table_ref = &mut config.allow_list.table;
        let is_allowed = table::contains(table_ref, address);
        assert!(is_allowed, error::permission_denied(ENOT_ON_ALLOWLIST));

        let already_claimed = *table::borrow(table_ref, address);
        assert!(!already_claimed, error::invalid_state(EALREADY_CLAIMED));

        let claimed_ref = table::borrow_mut(table_ref, address);
        *claimed_ref = true;

        let asset = get_metadata();
        let managed_fungible_asset = borrow_global<ManagedFungibleAsset>(object::object_address(&asset));
        let to_wallet = primary_fungible_store::ensure_primary_store_exists(address, asset);
        let fa = fungible_asset::mint(&managed_fungible_asset.mint_ref, 10_000_000_000);
        fungible_asset::deposit_with_ref(&managed_fungible_asset.transfer_ref, to_wallet, fa);
    }

    #[test(creator = @cabal_addr)]
    fun test_basic_flow(
        creator: &signer,
    ) acquires ManagedFungibleAsset, AllowlistConfig {
        init_module(creator);
        let allowed_addresses = vector[];
        let creator_address = signer::address_of(creator);
        vector::push_back(&mut allowed_addresses, creator_address);
        let claim_start = 0;
        let claim_end = 999999999; // Far in the future
        add_to_allowlist(creator, allowed_addresses, claim_start, claim_end);
        
        // Test claiming using test-only function
        claim_test_only(creator);
        let asset = get_metadata();
        assert!(primary_fungible_store::balance(creator_address, asset) == 10_000_000_000, 4);
    }

    #[test(creator = @cabal_addr, aaron = @0xface)]
    #[expected_failure(abort_code = 0x50002, location = Self)]
    fun test_permission_denied(
        creator: &signer,
        aaron: &signer
    ) acquires ManagedFungibleAsset, AllowlistConfig {
        init_module(creator);
        // Don't add aaron to allowlist
        claim_test_only(aaron);
    }
}
