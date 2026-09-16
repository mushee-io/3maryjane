// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {CLAccount} from "../src/CLAccount.sol";
import {CLAccountFactory} from "../src/CLAccountFactory.sol";
import {RiskPolicyManager} from "../src/risk/RiskPolicyManager.sol";
import {RiskTypes} from "../src/types/RiskTypes.sol";

interface VmDemoAccount {
    function envUint(string calldata) external returns (uint256);
    function envBytes32(string calldata) external returns (bytes32);
    function envAddress(string calldata) external returns (address);
    function envAddress(string calldata, string calldata) external returns (address[] memory);
    function addr(uint256 privateKey) external returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// @title InitializeDemoAccount
/// @notice Creates and configures the owner-controlled CL Account used by the live Metropolis flow.
/// @dev This script intentionally assumes the full mainnet profile: Kuru + Perpl + Euler +
///      WalletBalanceAdapter. It does not fund the account and never moves user assets.
contract InitializeDemoAccount {
    VmDemoAccount internal constant vm =
        VmDemoAccount(address(uint160(uint256(keccak256("hevm cheat code")))));

    error InvalidBps(string name, uint256 value);
    error EmptyAllowedAssets();

    event DemoAccountInitialized(
        address indexed owner,
        address indexed account,
        bytes32 indexed salt,
        address riskPolicyManager,
        address defensiveExecutor
    );

    function run() external returns (address accountAddress) {
        uint256 key = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(key);
        bytes32 salt = vm.envBytes32("CL_ACCOUNT_SALT");

        CLAccountFactory factory = CLAccountFactory(vm.envAddress("CL_ACCOUNT_FACTORY"));
        RiskPolicyManager policyManager = RiskPolicyManager(vm.envAddress("CL_RISK_POLICY_MANAGER"));

        address kuruAdapter = vm.envAddress("KURU_ADAPTER");
        address perplAdapter = vm.envAddress("PERPL_ADAPTER");
        address eulerAdapter = vm.envAddress("EULER_ADAPTER");
        address walletBalanceAdapter = vm.envAddress("WALLET_BALANCE_ADAPTER");
        address defensiveExecutor = vm.envAddress("CL_DEFENSIVE_EXECUTOR");
        address[] memory allowedAssets = vm.envAddress("CL_ALLOWED_ASSETS", ",");
        if (allowedAssets.length == 0) revert EmptyAllowedAssets();

        RiskTypes.Policy memory policy = RiskTypes.Policy({
            enabled: true,
            allowRiskReducingWhenBreached: true,
            maxGrossExposureUsd: vm.envUint("CL_POLICY_MAX_GROSS_USD_E18"),
            maxDebtUsd: vm.envUint("CL_POLICY_MAX_DEBT_USD_E18"),
            maxLeverageE18: vm.envUint("CL_POLICY_MAX_LEVERAGE_E18"),
            maxMarginUtilizationE18: vm.envUint("CL_POLICY_MAX_MARGIN_UTILIZATION_E18"),
            minHealthE18: vm.envUint("CL_POLICY_MIN_HEALTH_E18"),
            minCriticalMoveBps: _bps("CL_POLICY_MIN_CRITICAL_MOVE_BPS")
        });

        address[] memory riskAdapters = new address[](4);
        riskAdapters[0] = kuruAdapter;
        riskAdapters[1] = perplAdapter;
        riskAdapters[2] = eulerAdapter;
        riskAdapters[3] = walletBalanceAdapter;

        vm.startBroadcast(key);

        accountAddress = factory.createAccount(salt);
        CLAccount account = CLAccount(payable(accountAddress));

        for (uint256 i = 0; i < allowedAssets.length; ++i) {
            account.setAssetAllowed(allowedAssets[i], true);
        }

        // WalletBalanceAdapter is read-only and therefore is covered by risk but not authorized
        // for execution. Only executable venue adapters are authorized below.
        account.authorizeAdapter(kuruAdapter, true);
        account.authorizeAdapter(perplAdapter, true);
        account.authorizeAdapter(eulerAdapter, true);

        policyManager.configure(accountAddress, policy, riskAdapters);
        account.setRiskGuard(address(policyManager), true);
        account.setDefensiveOperator(defensiveExecutor, true);

        emit DemoAccountInitialized(
            deployer,
            accountAddress,
            salt,
            address(policyManager),
            defensiveExecutor
        );

        vm.stopBroadcast();
    }

    function _bps(string memory name) internal returns (uint16 result) {
        uint256 value = vm.envUint(name);
        if (value > type(uint16).max) revert InvalidBps(name, value);
        result = uint16(value);
    }
}
