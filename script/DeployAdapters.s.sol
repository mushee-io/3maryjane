// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {KuruAdapter} from "../src/adapters/KuruAdapter.sol";
import {PerplAdapter} from "../src/adapters/PerplAdapter.sol";
import {EulerAdapter} from "../src/adapters/EulerAdapter.sol";

interface VmAdapters {
    function envUint(string calldata) external returns (uint256);
    function envUint(string calldata, string calldata) external returns (uint256[] memory);
    function envAddress(string calldata) external returns (address);
    function envAddress(string calldata, string calldata) external returns (address[] memory);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// @notice Deploys production-capable Kuru, Perpl and Euler adapters with explicit tracked state.
/// @dev CSV environment lists are required so a deployed adapter never silently ships with an
///      empty risk/read universe. Re-verify every address against primary protocol sources before
///      broadcasting on Monad mainnet.
contract DeployAdapters {
    VmAdapters internal constant vm = VmAdapters(address(uint160(uint256(keccak256("hevm cheat code")))));

    error EmptyTrackedSet(string name);

    event AdaptersDeployed(address indexed kuru, address indexed perpl, address indexed euler);

    function run()
        external
        returns (KuruAdapter kuruAdapter, PerplAdapter perplAdapter, EulerAdapter eulerAdapter)
    {
        uint256 key = vm.envUint("PRIVATE_KEY");
        address kuruMargin = vm.envAddress("KURU_MARGIN_ACCOUNT");
        address perplExchange = vm.envAddress("PERPL_EXCHANGE");
        address perplCollateral = vm.envAddress("PERPL_COLLATERAL");
        address eulerEvc = vm.envAddress("EULER_EVC");

        address[] memory trackedTokens = vm.envAddress("KURU_TRACKED_TOKENS", ",");
        uint256[] memory trackedPerps = vm.envUint("PERPL_TRACKED_PERP_IDS", ",");
        address[] memory trackedVaults = vm.envAddress("EULER_TRACKED_VAULTS", ",");

        if (trackedTokens.length == 0) revert EmptyTrackedSet("KURU_TRACKED_TOKENS");
        if (trackedPerps.length == 0) revert EmptyTrackedSet("PERPL_TRACKED_PERP_IDS");
        if (trackedVaults.length == 0) revert EmptyTrackedSet("EULER_TRACKED_VAULTS");

        vm.startBroadcast(key);
        kuruAdapter = new KuruAdapter(kuruMargin, trackedTokens);
        perplAdapter = new PerplAdapter(perplExchange, perplCollateral, trackedPerps);
        eulerAdapter = new EulerAdapter(eulerEvc, trackedVaults);
        emit AdaptersDeployed(address(kuruAdapter), address(perplAdapter), address(eulerAdapter));
        vm.stopBroadcast();
    }
}
