// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {KuruAdapter} from "../src/adapters/KuruAdapter.sol";
import {PerplAdapter} from "../src/adapters/PerplAdapter.sol";
import {EulerAdapter} from "../src/adapters/EulerAdapter.sol";

interface VmAdapters {
    function envUint(string calldata) external returns (uint256);
    function envAddress(string calldata) external returns (address);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// @notice Minimal adapter deployment script. Market/vault tracking should be passed in a
///         dedicated environment-specific deployment once the chosen venues are verified.
contract DeployAdapters {
    VmAdapters internal constant vm = VmAdapters(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run()
        external
        returns (KuruAdapter kuruAdapter, PerplAdapter perplAdapter, EulerAdapter eulerAdapter)
    {
        uint256 key = vm.envUint("PRIVATE_KEY");
        address kuruMargin = vm.envAddress("KURU_MARGIN_ACCOUNT");
        address perplExchange = vm.envAddress("PERPL_EXCHANGE");
        address perplCollateral = vm.envAddress("PERPL_COLLATERAL");
        address eulerEvc = vm.envAddress("EULER_EVC");

        address[] memory noTokens = new address[](0);
        uint256[] memory noPerps = new uint256[](0);
        address[] memory noVaults = new address[](0);

        vm.startBroadcast(key);
        kuruAdapter = new KuruAdapter(kuruMargin, noTokens);
        perplAdapter = new PerplAdapter(perplExchange, perplCollateral, noPerps);
        eulerAdapter = new EulerAdapter(eulerEvc, noVaults);
        vm.stopBroadcast();
    }
}
