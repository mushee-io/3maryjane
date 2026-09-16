// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {CLAccount} from "../src/CLAccount.sol";
import {AdapterRegistry} from "../src/AdapterRegistry.sol";
import {RiskPolicyManager} from "../src/risk/RiskPolicyManager.sol";

interface VmVerifyDemo {
    function envAddress(string calldata) external returns (address);
    function envAddress(string calldata, string calldata) external returns (address[] memory);
}

/// @title VerifyDemoDeployment
/// @notice Read-only fail-closed verifier for the final CL mainnet account configuration.
/// @dev Run with `forge script` without `--broadcast`. It makes no state changes.
contract VerifyDemoDeployment {
    VmVerifyDemo internal constant vm =
        VmVerifyDemo(address(uint160(uint256(keccak256("hevm cheat code")))));

    error OwnerMismatch(address actual, address expected);
    error RiskGuardMismatch(address actual, address expected);
    error RiskGuardDisabled();
    error AdapterInactive(address adapter);
    error AdapterUnauthorized(address adapter);
    error AdapterAuthorizationStale(address adapter, uint64 accountVersion, uint64 registryVersion);
    error AdapterNotRiskCovered(address adapter);
    error DefensiveOperatorMissing(address operator);
    error AssetNotAllowed(address asset);

    event DeploymentVerified(address indexed account, address indexed owner, uint256 executableAdapters, uint256 riskSources);

    function run() external {
        address accountAddress = vm.envAddress("CL_ACCOUNT");
        address expectedOwner = vm.envAddress("CL_ACCOUNT_OWNER");
        address policyManagerAddress = vm.envAddress("CL_RISK_POLICY_MANAGER");
        address defensiveExecutor = vm.envAddress("CL_DEFENSIVE_EXECUTOR");

        address kuruAdapter = vm.envAddress("KURU_ADAPTER");
        address perplAdapter = vm.envAddress("PERPL_ADAPTER");
        address eulerAdapter = vm.envAddress("EULER_ADAPTER");
        address walletBalanceAdapter = vm.envAddress("WALLET_BALANCE_ADAPTER");
        address[] memory allowedAssets = vm.envAddress("CL_ALLOWED_ASSETS", ",");

        CLAccount account = CLAccount(payable(accountAddress));
        AdapterRegistry registry = AdapterRegistry(address(account.registry()));
        RiskPolicyManager policyManager = RiskPolicyManager(policyManagerAddress);

        if (account.owner() != expectedOwner) revert OwnerMismatch(account.owner(), expectedOwner);
        if (!account.riskGuardEnabled()) revert RiskGuardDisabled();
        if (address(account.riskGuard()) != policyManagerAddress) {
            revert RiskGuardMismatch(address(account.riskGuard()), policyManagerAddress);
        }
        if (!account.defensiveOperator(defensiveExecutor)) revert DefensiveOperatorMissing(defensiveExecutor);

        address[] memory executableAdapters = new address[](3);
        executableAdapters[0] = kuruAdapter;
        executableAdapters[1] = perplAdapter;
        executableAdapters[2] = eulerAdapter;

        for (uint256 i = 0; i < executableAdapters.length; ++i) {
            address adapter = executableAdapters[i];
            if (!registry.isAdapterActive(adapter)) revert AdapterInactive(adapter);
            if (!account.authorizedAdapter(adapter)) revert AdapterUnauthorized(adapter);
            uint64 accountVersion = account.authorizedAdapterVersion(adapter);
            uint64 registryVersion = registry.adapterVersion(adapter);
            if (accountVersion != registryVersion) {
                revert AdapterAuthorizationStale(adapter, accountVersion, registryVersion);
            }
            if (!policyManager.isAdapterCovered(accountAddress, adapter)) revert AdapterNotRiskCovered(adapter);
        }

        // WalletBalanceAdapter is intentionally read-only, so it is risk-covered without execution authorization.
        if (!policyManager.isAdapterCovered(accountAddress, walletBalanceAdapter)) {
            revert AdapterNotRiskCovered(walletBalanceAdapter);
        }

        for (uint256 i = 0; i < allowedAssets.length; ++i) {
            if (!account.allowedAsset(allowedAssets[i])) revert AssetNotAllowed(allowedAssets[i]);
        }

        emit DeploymentVerified(accountAddress, expectedOwner, executableAdapters.length, 4);
    }
}
