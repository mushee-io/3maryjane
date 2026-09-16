// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IAdapterRegistry} from "./interfaces/IAdapterRegistry.sol";

contract AdapterRegistry is IAdapterRegistry {
    address public owner;
    mapping(address adapter => bool active) private _active;
    mapping(address adapter => mapping(address target => bool allowed)) private _targets;
    mapping(address adapter => uint64 version) private _version;

    error Unauthorized();
    error ZeroAddress();
    error LengthMismatch();

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AdapterStatusChanged(address indexed adapter, bool active, uint64 version);
    event AdapterTargetChanged(address indexed adapter, address indexed target, bool allowed, uint64 version);

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setAdapterActive(address adapter, bool active) external onlyOwner {
        if (adapter == address(0)) revert ZeroAddress();
        if (_active[adapter] != active) {
            _active[adapter] = active;
            _version[adapter] += 1;
        }
        emit AdapterStatusChanged(adapter, active, _version[adapter]);
    }

    function setTargetAllowed(address adapter, address target, bool allowed) external onlyOwner {
        _setTarget(adapter, target, allowed);
    }

    function setTargetsAllowed(address adapter, address[] calldata targets, bool allowed) external onlyOwner {
        if (adapter == address(0)) revert ZeroAddress();
        for (uint256 i; i < targets.length; ++i) {
            _setTarget(adapter, targets[i], allowed);
        }
    }

    function setTargetsAllowed(address adapter, address[] calldata targets, bool[] calldata allowed) external onlyOwner {
        if (targets.length != allowed.length) revert LengthMismatch();
        if (adapter == address(0)) revert ZeroAddress();
        for (uint256 i; i < targets.length; ++i) {
            _setTarget(adapter, targets[i], allowed[i]);
        }
    }

    function _setTarget(address adapter, address target, bool allowed) internal {
        if (adapter == address(0) || target == address(0)) revert ZeroAddress();
        if (_targets[adapter][target] != allowed) {
            _targets[adapter][target] = allowed;
            _version[adapter] += 1;
        }
        emit AdapterTargetChanged(adapter, target, allowed, _version[adapter]);
    }

    function isAdapterActive(address adapter) external view returns (bool) {
        return _active[adapter];
    }

    function isTargetAllowed(address adapter, address target) external view returns (bool) {
        return _targets[adapter][target];
    }

    function adapterVersion(address adapter) external view returns (uint64) {
        return _version[adapter];
    }
}
