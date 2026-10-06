// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC1155Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import {ERC1155SupplyUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {ERC1155URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {HuellaAccess} from "./access/HuellaAccess.sol";
import {Kind, CoffeeIds} from "./libraries/CoffeeTypes.sol";

/// @title CoffeeToken
/// @notice ERC-1155 con dos clases de token (PLAN §3.1):
///         - LOT: lote de café; amount = gramos en custodia de cada dirección.
///         - DDS_CERT: certificado DDS de una finca; amount = 1, intransferible.
/// @dev Solo los contratos con CONTROLLER_ROLE (TraceabilityController, OriginRegistry)
///      acuñan, queman o mueven saldos, así el token y el registro nunca se desincronizan.
contract CoffeeToken is ERC1155SupplyUpgradeable, ERC1155URIStorageUpgradeable, HuellaAccess {
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    mapping(Kind => uint256) public lastSeq;

    error TransferOnlyViaController();
    error CertificateIsSoulbound();
    error InvalidKind();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) external initializer {
        __ERC1155_init("");
        __ERC1155Supply_init();
        __ERC1155URIStorage_init();
        __HuellaAccess_init(admin);
        _setBaseURI("ipfs://");
    }

    function kindOf(uint256 id) public pure returns (Kind) {
        return CoffeeIds.kindOf(id);
    }

    /// @notice Acuña un id nuevo de la clase `kind` y fija su URI (CID de metadatos).
    function mintNew(Kind kind, address to, uint256 amount, string calldata cid)
        external
        onlyRole(CONTROLLER_ROLE)
        returns (uint256 id)
    {
        id = _nextId(kind);
        _mint(to, id, amount, "");
        _setURI(id, cid);
    }

    /// @notice Acuña varios ids nuevos de una vez (split). Todos comparten el mismo CID inicial.
    function mintNewBatch(Kind kind, address to, uint256[] calldata amounts, string calldata cid)
        external
        onlyRole(CONTROLLER_ROLE)
        returns (uint256[] memory ids)
    {
        ids = new uint256[](amounts.length);
        for (uint256 i; i < amounts.length; ++i) {
            ids[i] = _nextId(kind);
            _setURI(ids[i], cid);
        }
        _mintBatch(to, ids, amounts, "");
    }

    function burn(address from, uint256 id, uint256 amount) external onlyRole(CONTROLLER_ROLE) {
        _burn(from, id, amount);
    }

    function burnBatch(address from, uint256[] calldata ids, uint256[] calldata amounts)
        external
        onlyRole(CONTROLLER_ROLE)
    {
        _burnBatch(from, ids, amounts);
    }

    /// @notice Transferencia de custodia ordenada por el controlador.
    function move(address from, address to, uint256 id, uint256 amount) external onlyRole(CONTROLLER_ROLE) {
        _safeTransferFrom(from, to, id, amount, "");
    }

    function setTokenURI(uint256 id, string calldata cid) external onlyRole(CONTROLLER_ROLE) {
        _setURI(id, cid);
    }

    function _nextId(Kind kind) private returns (uint256) {
        if (kind == Kind.NONE) revert InvalidKind();
        return CoffeeIds.make(kind, ++lastSeq[kind]);
    }

    /// @dev Bloquea transferencias directas entre cuentas (PLAN §3.3).
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override(ERC1155Upgradeable, ERC1155SupplyUpgradeable)
    {
        if (from != address(0) && to != address(0)) {
            if (!hasRole(CONTROLLER_ROLE, _msgSender())) revert TransferOnlyViaController();
            for (uint256 i; i < ids.length; ++i) {
                if (CoffeeIds.kindOf(ids[i]) == Kind.DDS_CERT) revert CertificateIsSoulbound();
            }
        }
        super._update(from, to, ids, values);
    }

    function uri(uint256 id)
        public
        view
        override(ERC1155Upgradeable, ERC1155URIStorageUpgradeable)
        returns (string memory)
    {
        return super.uri(id);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
