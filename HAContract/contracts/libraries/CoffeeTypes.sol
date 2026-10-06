// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title CoffeeTypes
/// @notice Tipos compartidos por el módulo de trazabilidad (PLAN §2 y §3).

/// @dev Clase de token, codificada en el byte alto del id ERC-1155: id = (kind << 248) | secuencial.
enum Kind {
    NONE,
    LOT, // 0x01: lote de café, amount = gramos
    DDS_CERT // 0x02: certificado DDS, amount = 1, intransferible
}

/// @dev Forma física del café. Un id ERC-1155 = una forma homogénea; cambiarla crea un id nuevo.
enum Form {
    CHERRY, // cereza
    PARCHMENT, // pergamino seco
    GREEN // oro / verde
}

/// @dev Fases del lote (PLAN §2.2). HULLED es la trilla, que no está en el ERS.
enum LotState {
    HARVESTED,
    PROCESSED,
    DRIED,
    HULLED,
    GRADED,
    PACKAGED,
    EXPORTED
}

enum Ripeness {
    RIPE,
    OVERRIPE,
    UNDERRIPE
}

enum ProcessType {
    WASHED,
    NATURAL,
    HONEY
}

enum DryingMethod {
    PATIO,
    AFRICAN_BED,
    MECHANICAL
}

/// @dev Datos de un lote que el contrato necesita para aplicar reglas. El resto
///      (datos de fase, fotos, catas) va en eventos como keccak256 + CID.
struct Lot {
    bytes32 fincaId; // 0 si el lote mezcla varias fincas (ver linaje)
    bytes32 tenantId;
    bytes32 variety;
    uint256 ddsCertId; // certificado vigente con el que nació el lote de origen
    uint64 harvestDate;
    uint32 fincaVersion;
    Form form;
    LotState state;
}

library CoffeeIds {
    uint256 internal constant SEQ_MASK = (uint256(1) << 248) - 1;

    function make(Kind kind, uint256 seq) internal pure returns (uint256) {
        return (uint256(kind) << 248) | (seq & SEQ_MASK);
    }

    function kindOf(uint256 id) internal pure returns (Kind) {
        uint256 k = id >> 248;
        return k > uint256(Kind.DDS_CERT) ? Kind.NONE : Kind(k);
    }
}
