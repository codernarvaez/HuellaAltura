// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {TraceabilityController} from "../TraceabilityController.sol";

/// @dev Solo para pruebas de upgrade: añade una función sin tocar el layout de storage.
/// @custom:oz-upgrades-from TraceabilityController
/// @custom:oz-upgrades-unsafe-allow missing-initializer
contract TraceabilityControllerV2Mock is TraceabilityController {
    function version() external pure returns (string memory) {
        return "v2";
    }
}
