// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {CLAccount} from "../src/CLAccount.sol";
import {AdapterRegistry} from "../src/AdapterRegistry.sol";
import {HashedCreditVault} from "../src/hashed/HashedCreditVault.sol";
import {RiskPolicyManager} from "../src/risk/RiskPolicyManager.sol";
import {RiskTypes} from "../src/types/RiskTypes.sol";

interface VmDemoHashedClearing {
    function envUint(string calldata) external returns (uint256);
    function envAddress(string calldata) external returns (address);
    function addr(uint256 privateKey) external returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

interface IERC20Demo {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @notice Opens and fully unwinds a small Hashed position through the real 3maryjane account.
/// @dev Leaves wallet/account Hashed balances, collateral and debt at their pre-run values.
///      Intended only as Monad testnet integration evidence.
contract DemoHashedClearingTestnet {
    VmDemoHashedClearing internal constant vm =
        VmDemoHashedClearing(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 internal constant COLLATERAL_AMOUNT = 1e18; // 1 hNVDA
    uint256 internal constant BORROW_AMOUNT = 25e6; // 25 hUSD

    error WrongChain(uint256 chainId);
    error WrongOwner(address expected, address actual);
    error AdapterNotReady();
    error AdapterNotCovered();
    error InsufficientDemoCollateral(uint256 balance);
    error TokenTransferFailed();
    error RiskCheckFailed(bytes32 reason);
    error StateNotRestored();

    event DemoStep(string step, bytes32 txLabel);
    event DemoComplete(
        address indexed account,
        address indexed adapter,
        address indexed collateral,
        uint256 collateralAmount,
        uint256 borrowAmount
    );

    function run() external {
        if (block.chainid != 10143) revert WrongChain(block.chainid);

        uint256 key = vm.envUint("PRIVATE_KEY");
        address signer = vm.addr(key);

        CLAccount account = CLAccount(payable(vm.envAddress("CL_ACCOUNT")));
        AdapterRegistry registry = AdapterRegistry(vm.envAddress("CL_ADAPTER_REGISTRY"));
        RiskPolicyManager policyManager = RiskPolicyManager(vm.envAddress("CL_RISK_POLICY_MANAGER"));
        HashedCreditVault vault = HashedCreditVault(vm.envAddress("HASHED_VAULT"));
        address adapter = vm.envAddress("HASHED_ADAPTER");
        address hNVDA = vm.envAddress("HASHED_NVDA");
        address hUSD = vm.envAddress("HASHED_USD");

        if (account.owner() != signer) revert WrongOwner(account.owner(), signer);
        if (!registry.isAdapterActive(adapter) || !account.authorizedAdapter(adapter)) revert AdapterNotReady();
        if (!policyManager.isAdapterCovered(address(account), adapter)) revert AdapterNotCovered();

        uint256 walletCollateralBefore = IERC20Demo(hNVDA).balanceOf(signer);
        uint256 accountLooseBefore = IERC20Demo(hNVDA).balanceOf(address(account));
        uint256 lockedBefore = vault.collateralOf(address(account), hNVDA);
        uint256 debtBefore = vault.debtOf(address(account));

        if (walletCollateralBefore < COLLATERAL_AMOUNT) {
            revert InsufficientDemoCollateral(walletCollateralBefore);
        }

        vm.startBroadcast(key);

        // Fund the user-owned clearing account.
        if (!IERC20Demo(hNVDA).transfer(address(account), COLLATERAL_AMOUNT)) revert TokenTransferFailed();

        // Execute every credit transition through the registered Hashed adapter.
        account.execute(adapter, abi.encode(uint8(0), hNVDA, COLLATERAL_AMOUNT)); // DEPOSIT
        account.execute(adapter, abi.encode(uint8(2), hUSD, BORROW_AMOUNT)); // BORROW

        (bool okAfterBorrow, bytes32 reasonAfterBorrow,,) = policyManager.check(address(account));
        if (!okAfterBorrow) revert RiskCheckFailed(reasonAfterBorrow);

        account.execute(adapter, abi.encode(uint8(3), hUSD, BORROW_AMOUNT)); // REPAY
        account.execute(adapter, abi.encode(uint8(1), hNVDA, COLLATERAL_AMOUNT)); // WITHDRAW

        // Return the now-unlocked asset from CLAccount to the owner wallet.
        account.withdraw(hNVDA, signer, COLLATERAL_AMOUNT);

        vm.stopBroadcast();

        (bool okFinal, bytes32 finalReason,,) = policyManager.check(address(account));
        if (!okFinal) revert RiskCheckFailed(finalReason);

        if (
            IERC20Demo(hNVDA).balanceOf(signer) != walletCollateralBefore
                || IERC20Demo(hNVDA).balanceOf(address(account)) != accountLooseBefore
                || vault.collateralOf(address(account), hNVDA) != lockedBefore
                || vault.debtOf(address(account)) != debtBefore
        ) revert StateNotRestored();

        emit DemoComplete(address(account), adapter, hNVDA, COLLATERAL_AMOUNT, BORROW_AMOUNT);
    }
}
