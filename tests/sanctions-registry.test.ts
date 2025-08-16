import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

/*
  The Sanctions Registry contract allows authorized parties to manage
  a decentralized sanctions and watchlist system with automatic expiration.
*/

describe("Sanctions Registry Contract", () => {
  describe("Contract Initialization", () => {
    it("should initialize with deployer as first authority", () => {
      const stats = simnet.callReadOnlyFn(
        "sanctions-registry",
        "get-contract-stats",
        [],
        deployer
      );
      
      expect(stats.result).toEqual(
        Cl.tuple({
          "total-sanctions": Cl.uint(0),
          "total-authorities": Cl.uint(1),
          "current-block": Cl.uint(simnet.blockHeight),
          "contract-owner": Cl.principal(deployer)
        })
      );
    });

    it("should set deployer as active authority", () => {
      const isAuthority = simnet.callReadOnlyFn(
        "sanctions-registry",
        "is-active-authority",
        [Cl.principal(deployer)],
        deployer
      );
      
      expect(isAuthority.result).toBeBool(true);
    });
  });

  describe("Authority Management", () => {
    it("should allow authority to add new authority", () => {
      const result = simnet.callPublicFn(
        "sanctions-registry",
        "add-authority",
        [Cl.principal(wallet1)],
        deployer
      );
      
      expect(result.result).toBeOk(Cl.bool(true));
      
      // Verify wallet1 is now an authority
      const isAuthority = simnet.callReadOnlyFn(
        "sanctions-registry",
        "is-active-authority",
        [Cl.principal(wallet1)],
        deployer
      );
      
      expect(isAuthority.result).toBeBool(true);
    });

    it("should prevent non-authority from adding authority", () => {
      const result = simnet.callPublicFn(
        "sanctions-registry",
        "add-authority",
        [Cl.principal(wallet2)],
        wallet1 // wallet1 is not an authority
      );
      
      expect(result.result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });

    it("should prevent adding duplicate authority", () => {
      // First addition should succeed
      simnet.callPublicFn(
        "sanctions-registry",
        "add-authority",
        [Cl.principal(wallet1)],
        deployer
      );
      
      // Second addition should fail
      const result = simnet.callPublicFn(
        "sanctions-registry",
        "add-authority",
        [Cl.principal(wallet1)],
        deployer
      );
      
      expect(result.result).toBeErr(Cl.uint(104)); // ERR_ALREADY_AUTHORITY
    });

    it("should allow authority to remove themselves", () => {
      // Add wallet1 as authority
      simnet.callPublicFn(
        "sanctions-registry",
        "add-authority",
        [Cl.principal(wallet1)],
        deployer
      );
      
      // wallet1 removes themselves
      const result = simnet.callPublicFn(
        "sanctions-registry",
        "remove-authority",
        [Cl.principal(wallet1)],
        wallet1
      );
      
      expect(result.result).toBeOk(Cl.bool(true));
      
      // Verify wallet1 is no longer an authority
      const isAuthority = simnet.callReadOnlyFn(
        "sanctions-registry",
        "is-active-authority",
        [Cl.principal(wallet1)],
        deployer
      );
      
      expect(isAuthority.result).toBeBool(false);
    });

    it("should prevent removing contract owner", () => {
      const result = simnet.callPublicFn(
        "sanctions-registry",
        "remove-authority",
        [Cl.principal(deployer)],
        deployer
      );
      
      expect(result.result).toBeErr(Cl.uint(106)); // ERR_CANNOT_REMOVE_OWNER
    });
  });

  describe("Sanction Management", () => {
    beforeEach(() => {
      // Add wallet1 as authority for testing
      simnet.callPublicFn(
        "sanctions-registry",
        "add-authority",
        [Cl.principal(wallet1)],
        deployer
      );
    });

    it("should allow authority to add sanction", () => {
      const futureBlock = simnet.blockHeight + 100;
      const result = simnet.callPublicFn(
        "sanctions-registry",
        "add-sanction",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Money laundering"),
          Cl.uint(futureBlock)
        ],
        wallet1
      );
      
      expect(result.result).toBeOk(Cl.bool(true));
      
      // Verify sanction was added
      const isSanctioned = simnet.callReadOnlyFn(
        "sanctions-registry",
        "is-sanctioned",
        [Cl.principal(wallet3)],
        deployer
      );
      
      expect(isSanctioned.result).toBeBool(true);
    });

    it("should prevent non-authority from adding sanction", () => {
      const futureBlock = simnet.blockHeight + 100;
      const result = simnet.callPublicFn(
        "sanctions-registry",
        "add-sanction",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Money laundering"),
          Cl.uint(futureBlock)
        ],
        wallet2 // not an authority
      );
      
      expect(result.result).toBeErr(Cl.uint(100)); // ERR_NOT_AUTHORIZED
    });

    it("should prevent adding sanction with past expiration", () => {
      const pastBlock = 1; // Use a valid past block instead of negative
      const result = simnet.callPublicFn(
        "sanctions-registry",
        "add-sanction",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Money laundering"),
          Cl.uint(pastBlock)
        ],
        wallet1
      );
      
      expect(result.result).toBeErr(Cl.uint(103)); // ERR_INVALID_EXPIRATION
    });

    it("should prevent adding sanction with empty reason", () => {
      const futureBlock = simnet.blockHeight + 100;
      const result = simnet.callPublicFn(
        "sanctions-registry",
        "add-sanction",
        [
          Cl.principal(wallet3),
          Cl.stringAscii(""),
          Cl.uint(futureBlock)
        ],
        wallet1
      );
      
      expect(result.result).toBeErr(Cl.uint(107)); // ERR_INVALID_REASON
    });

    it("should prevent duplicate sanctions", () => {
      const futureBlock = simnet.blockHeight + 100;
      
      // Add first sanction
      simnet.callPublicFn(
        "sanctions-registry",
        "add-sanction",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Money laundering"),
          Cl.uint(futureBlock)
        ],
        wallet1
      );
      
      // Try to add duplicate
      const result = simnet.callPublicFn(
        "sanctions-registry",
        "add-sanction",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Fraud"),
          Cl.uint(futureBlock)
        ],
        wallet1
      );
      
      expect(result.result).toBeErr(Cl.uint(101)); // ERR_ALREADY_SANCTIONED
    });

    it("should allow issuing authority to remove sanction", () => {
      const futureBlock = simnet.blockHeight + 100;
      
      // Add sanction
      simnet.callPublicFn(
        "sanctions-registry",
        "add-sanction",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Money laundering"),
          Cl.uint(futureBlock)
        ],
        wallet1
      );
      
      // Remove sanction
      const result = simnet.callPublicFn(
        "sanctions-registry",
        "remove-sanction",
        [Cl.principal(wallet3)],
        wallet1
      );
      
      expect(result.result).toBeOk(Cl.bool(true));
      
      // Verify sanction was removed
      const isSanctioned = simnet.callReadOnlyFn(
        "sanctions-registry",
        "is-sanctioned",
        [Cl.principal(wallet3)],
        deployer
      );
      
      expect(isSanctioned.result).toBeBool(false);
    });

    it("should allow contract owner to remove any sanction", () => {
      const futureBlock = simnet.blockHeight + 100;
      
      // Add sanction by wallet1
      simnet.callPublicFn(
        "sanctions-registry",
        "add-sanction",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Money laundering"),
          Cl.uint(futureBlock)
        ],
        wallet1
      );
      
      // Remove sanction by deployer (contract owner)
      const result = simnet.callPublicFn(
        "sanctions-registry",
        "remove-sanction",
        [Cl.principal(wallet3)],
        deployer
      );
      
      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should update sanction details", () => {
      const futureBlock = simnet.blockHeight + 100;
      
      // Add sanction
      simnet.callPublicFn(
        "sanctions-registry",
        "add-sanction",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Money laundering"),
          Cl.uint(futureBlock)
        ],
        wallet1
      );
      
      // Update sanction
      const newFutureBlock = simnet.blockHeight + 200;
      const result = simnet.callPublicFn(
        "sanctions-registry",
        "update-sanction",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Fraud and money laundering"),
          Cl.uint(newFutureBlock)
        ],
        wallet1
      );
      
      expect(result.result).toBeOk(Cl.bool(true));
      
      // Verify updated details
      const details = simnet.callReadOnlyFn(
        "sanctions-registry",
        "get-sanction-details",
        [Cl.principal(wallet3)],
        deployer
      );
      
      expect(details.result).toBeSome(
        Cl.tuple({
          reason: Cl.stringAscii("Fraud and money laundering"),
          "expiration-block": Cl.uint(newFutureBlock),
          "issuing-authority": Cl.principal(wallet1),
          "created-at": Cl.uint(simnet.blockHeight - 1)
        })
      );
    });
  });

  describe("Query Functions", () => {
    beforeEach(() => {
      // Add wallet1 as authority and create test sanction
      simnet.callPublicFn(
        "sanctions-registry",
        "add-authority",
        [Cl.principal(wallet1)],
        deployer
      );
      
      simnet.callPublicFn(
        "sanctions-registry",
        "add-sanction",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Money laundering"),
          Cl.uint(simnet.blockHeight + 100)
        ],
        wallet1
      );
    });

    it("should correctly identify sanctioned addresses", () => {
      const isSanctioned = simnet.callReadOnlyFn(
        "sanctions-registry",
        "is-sanctioned",
        [Cl.principal(wallet3)],
        deployer
      );
      
      expect(isSanctioned.result).toBeBool(true);
    });

    it("should correctly identify non-sanctioned addresses", () => {
      const isSanctioned = simnet.callReadOnlyFn(
        "sanctions-registry",
        "is-sanctioned",
        [Cl.principal(wallet2)],
        deployer
      );
      
      expect(isSanctioned.result).toBeBool(false);
    });

    it("should return sanction status with details", () => {
      const status = simnet.callReadOnlyFn(
        "sanctions-registry",
        "get-sanction-status",
        [Cl.principal(wallet3)],
        deployer
      );
      
      expect(status.result).toEqual(
        Cl.tuple({
          sanctioned: Cl.bool(true),
          details: Cl.some(
            Cl.tuple({
              reason: Cl.stringAscii("Money laundering"),
              "expiration-block": Cl.uint(simnet.blockHeight + 100),
              "issuing-authority": Cl.principal(wallet1),
              "created-at": Cl.uint(simnet.blockHeight - 1)
            })
          )
        })
      );
    });

    it("should batch check multiple addresses", () => {
      const addresses = [wallet1, wallet2, wallet3];
      const results = simnet.callReadOnlyFn(
        "sanctions-registry",
        "batch-check-sanctions",
        [Cl.list(addresses.map(addr => Cl.principal(addr)))],
        deployer
      );
      
      // Should return [false, false, true] since only wallet3 is sanctioned
      expect(results.result).toEqual(
        Cl.list([
          Cl.bool(false), // wallet1
          Cl.bool(false), // wallet2  
          Cl.bool(true)   // wallet3
        ])
      );
    });
  });

  describe("Expiration Handling", () => {
    it("should treat expired sanctions as inactive", () => {
      // Add wallet1 as authority
      simnet.callPublicFn(
        "sanctions-registry",
        "add-authority",
        [Cl.principal(wallet1)],
        deployer
      );
      
      // Add sanction that expires soon
      const expirationBlock = simnet.blockHeight + 2;
      simnet.callPublicFn(
        "sanctions-registry",
        "add-sanction",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Money laundering"),
          Cl.uint(expirationBlock)
        ],
        wallet1
      );
      
      // Verify it's currently active
      let isSanctioned = simnet.callReadOnlyFn(
        "sanctions-registry",
        "is-sanctioned",
        [Cl.principal(wallet3)],
        deployer
      );
      expect(isSanctioned.result).toBeBool(true);
      
      // Mine blocks to pass expiration
      simnet.mineEmptyBlocks(5);
      
      // Verify it's now inactive due to expiration
      isSanctioned = simnet.callReadOnlyFn(
        "sanctions-registry",
        "is-sanctioned",
        [Cl.principal(wallet3)],
        deployer
      );
      expect(isSanctioned.result).toBeBool(false);
      
      // But the sanction data should still exist
      const details = simnet.callReadOnlyFn(
        "sanctions-registry",
        "get-sanction-details",
        [Cl.principal(wallet3)],
        deployer
      );
      expect(details.result).toBeSome(
        Cl.tuple({
          reason: Cl.stringAscii("Money laundering"),
          "expiration-block": Cl.uint(expirationBlock),
          "issuing-authority": Cl.principal(wallet1),
          "created-at": Cl.uint(expirationBlock - 2)
        })
      );
    });
  });

  describe("Contract Statistics", () => {
    it("should track statistics correctly", () => {
      // Initial state
      let stats = simnet.callReadOnlyFn(
        "sanctions-registry",
        "get-contract-stats",
        [],
        deployer
      );
      
      expect(stats.result).toEqual(
        Cl.tuple({
          "total-sanctions": Cl.uint(0),
          "total-authorities": Cl.uint(1),
          "current-block": Cl.uint(simnet.blockHeight),
          "contract-owner": Cl.principal(deployer)
        })
      );
      
      // Add authority and sanction
      simnet.callPublicFn(
        "sanctions-registry",
        "add-authority",
        [Cl.principal(wallet1)],
        deployer
      );
      
      simnet.callPublicFn(
        "sanctions-registry",
        "add-sanction",
        [
          Cl.principal(wallet3),
          Cl.stringAscii("Money laundering"),
          Cl.uint(simnet.blockHeight + 100)
        ],
        wallet1
      );
      
      // Check updated stats
      stats = simnet.callReadOnlyFn(
        "sanctions-registry",
        "get-contract-stats",
        [],
        deployer
      );
      
      expect(stats.result).toEqual(
        Cl.tuple({
          "total-sanctions": Cl.uint(1),
          "total-authorities": Cl.uint(2),
          "current-block": Cl.uint(simnet.blockHeight),
          "contract-owner": Cl.principal(deployer)
        })
      );
    });
  });
});
