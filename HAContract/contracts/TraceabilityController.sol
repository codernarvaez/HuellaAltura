// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {HuellaAccess} from "./access/HuellaAccess.sol";
import {CoffeeToken} from "./CoffeeToken.sol";
import {OriginRegistry} from "./OriginRegistry.sol";
import {
    Kind, Form, LotState, Ripeness, ProcessType, DryingMethod, Lot, CoffeeIds
} from "./libraries/CoffeeTypes.sol";

/// @title TraceabilityController
/// @notice Ciclo de vida de los lotes de café (PLAN §2.2):
///         HARVESTED → PROCESSED → DRIED → HULLED → GRADED → PACKAGED → EXPORTED.
///         - Un id ERC-1155 = una forma física; secado y trilla queman el id y acuñan otro (transformación).
///         - El amount es la masa en gramos; split/merge/transformaciones registran entrada y salida.
///         - Cada id guarda sus padres: desde un saco exportado se llega a la finca y su DDS.
///         - Los datos de cada fase se emiten como keccak256(JSON canónico) + CID, no en storage.
contract TraceabilityController is HuellaAccess {
    /// @dev Humedad máxima segura: 12,5 % × 10 (ERS HU-04).
    uint16 public constant MAX_SAFE_MOISTURE = 125;

    CoffeeToken public token;
    OriginRegistry public origin;

    mapping(uint256 lotId => Lot) private _lots;
    mapping(uint256 lotId => uint256[]) private _parents;

    event HarvestRegistered(
        uint256 indexed lotId,
        bytes32 indexed fincaId,
        address indexed holder,
        uint256 grams,
        bytes32 variety,
        Ripeness ripeness,
        uint256 ddsCertId,
        string cid
    );
    event LotStateChanged(uint256 indexed lotId, LotState from, LotState to, address indexed actor);
    event LotProcessed(
        uint256 indexed lotId, ProcessType processType, uint16 fermentationHours, uint8 phX10, bytes32 dataHash, string cid
    );
    event LotTransformed(
        uint256 indexed fromLotId,
        uint256 indexed toLotId,
        address indexed holder,
        Form form,
        uint256 gramsIn,
        uint256 gramsOut,
        bytes32 dataHash,
        string cid
    );
    event LotDried(uint256 indexed lotId, uint16 moistureX10, DryingMethod method);
    event HighMoistureWarning(uint256 indexed lotId, uint16 moistureX10);
    event LotGraded(uint256 indexed lotId, address indexed grader, uint8 scaScore, uint8 defects, bytes32 dataHash, string cid);
    event CustodyTransferred(
        uint256 indexed lotId, address indexed from, address indexed to, uint256 grams, bytes32 dataHash, string cid
    );
    event LotSplit(uint256 indexed lotId, address indexed holder, uint256[] childIds, uint256[] grams, string cid);
    event LotMerged(uint256 indexed lotId, address indexed holder, uint256[] parentIds, uint256 grams, string cid);
    event LotExported(uint256 indexed lotId, bytes32 indexed refDDS, bytes32 dataHash, string cid);

    error FincaNotCompliant(bytes32 fincaId);
    error LotNotFound(uint256 lotId);
    error InvalidState(uint256 lotId, LotState current);
    error InvalidMass(uint256 available, uint256 requested);
    error InvalidHarvestDate();
    error InvalidPh();
    error InvalidMoisture();
    error InvalidScore();
    error NotCustodian(address caller, address from);
    error MergeNeedsTwoLots();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin, CoffeeToken token_, OriginRegistry origin_) external initializer {
        if (address(token_) == address(0) || address(origin_) == address(0)) revert ZeroAddress();
        __HuellaAccess_init(admin);
        token = token_;
        origin = origin_;
    }

    // ----------------------------------------------------------------- cosecha

    /// @notice Acuña el lote de cereza. Solo si la finca tiene un DDS vigente (puerta EUDR).
    /// @param holder custodio inicial: la wallet del productor o su dirección custodial.
    function registerHarvest(
        bytes32 fincaId,
        address holder,
        uint256 grams,
        bytes32 variety,
        Ripeness ripeness,
        uint64 harvestDate,
        string calldata cid
    ) external onlyRole(FARMER_ROLE) whenNotPaused returns (uint256 lotId) {
        if (holder == address(0)) revert ZeroAddress();
        if (!origin.isCompliant(fincaId)) revert FincaNotCompliant(fincaId);
        if (grams == 0) revert InvalidMass(0, 0);
        if (harvestDate > block.timestamp) revert InvalidHarvestDate();

        OriginRegistry.Finca memory f = origin.getFinca(fincaId);
        lotId = token.mintNew(Kind.LOT, holder, grams, cid);
        _lots[lotId] = Lot({
            fincaId: fincaId,
            tenantId: f.tenantId,
            variety: variety,
            ddsCertId: f.activeCertId,
            harvestDate: harvestDate == 0 ? uint64(block.timestamp) : harvestDate,
            fincaVersion: f.version,
            form: Form.CHERRY,
            state: LotState.HARVESTED
        });
        emit HarvestRegistered(lotId, fincaId, holder, grams, variety, ripeness, f.activeCertId, cid);
    }

    // ---------------------------------------------------------- beneficio húmedo

    function logProcessing(
        uint256 lotId,
        ProcessType processType,
        uint16 fermentationHours,
        uint8 phX10,
        bytes32 dataHash,
        string calldata cid
    ) external onlyRole(PROCESSOR_ROLE) whenNotPaused {
        if (phX10 == 0 || phX10 > 140) revert InvalidPh();
        _advance(lotId, LotState.HARVESTED, LotState.PROCESSED, cid);
        emit LotProcessed(lotId, processType, fermentationHours, phX10, dataHash, cid);
    }

    // ------------------------------------------------- transformaciones de forma

    /// @notice Secado: el saldo de `holder` en cereza procesada pasa a un id nuevo de pergamino seco.
    function logDrying(
        uint256 lotId,
        address holder,
        uint256 gramsOut,
        uint16 moistureX10,
        DryingMethod method,
        bytes32 dataHash,
        string calldata cid
    ) external onlyRole(PROCESSOR_ROLE) whenNotPaused returns (uint256 newId) {
        if (moistureX10 == 0 || moistureX10 > 1000) revert InvalidMoisture();
        newId = _transform(lotId, holder, LotState.PROCESSED, Form.PARCHMENT, LotState.DRIED, gramsOut, dataHash, cid);
        // No bloquea el proceso: deja constancia del riesgo.
        if (moistureX10 > MAX_SAFE_MOISTURE) emit HighMoistureWarning(newId, moistureX10);
        emit LotDried(newId, moistureX10, method);
    }

    /// @notice Trilla: pergamino seco → café verde. gramsOut/gramsIn es el factor de rendimiento.
    function logHulling(uint256 lotId, address holder, uint256 gramsOut, bytes32 dataHash, string calldata cid)
        external
        onlyRole(PROCESSOR_ROLE)
        whenNotPaused
        returns (uint256 newId)
    {
        newId = _transform(lotId, holder, LotState.DRIED, Form.GREEN, LotState.HULLED, gramsOut, dataHash, cid);
    }

    // -------------------------------------------------------------------- cata

    function addCupping(uint256 lotId, uint8 scaScore, uint8 defects, bytes32 dataHash, string calldata cid)
        external
        onlyRole(GRADER_ROLE)
        whenNotPaused
    {
        if (scaScore > 100) revert InvalidScore();
        _advance(lotId, LotState.HULLED, LotState.GRADED, cid);
        emit LotGraded(lotId, msg.sender, scaScore, defects, dataHash, cid);
    }

    // ----------------------------------------------------------------- custodia

    /// @notice Mueve gramos de un lote entre custodios (guía de remisión). Lo firma el custodio
    ///         actual o el relayer en su nombre.
    function transferCustody(
        uint256 lotId,
        address from,
        address to,
        uint256 grams,
        bytes32 dataHash,
        string calldata cid
    ) external whenNotPaused {
        if (msg.sender != from && !hasRole(RELAYER_ROLE, msg.sender)) revert NotCustodian(msg.sender, from);
        if (to == address(0)) revert ZeroAddress();
        Lot storage lot = _requireLot(lotId);
        if (lot.state == LotState.EXPORTED) revert InvalidState(lotId, lot.state);
        uint256 available = token.balanceOf(from, lotId);
        if (grams == 0 || grams > available) revert InvalidMass(available, grams);
        token.move(from, to, lotId, grams);
        emit CustodyTransferred(lotId, from, to, grams, dataHash, cid);
    }

    // ------------------------------------------------------- empaque y exportación

    /// @notice Reparte gramos de un lote en sacos (ids hijos). La suma sale exactamente del saldo de `holder`.
    function split(uint256 lotId, address holder, uint256[] calldata amounts, string calldata cid)
        external
        onlyRole(EXPORTER_ROLE)
        whenNotPaused
        returns (uint256[] memory childIds)
    {
        Lot memory src = _requireLot(lotId);
        if (src.state != LotState.GRADED && src.state != LotState.PACKAGED) revert InvalidState(lotId, src.state);

        uint256 total;
        for (uint256 i; i < amounts.length; ++i) {
            if (amounts[i] == 0) revert InvalidMass(0, 0);
            total += amounts[i];
        }
        uint256 available = token.balanceOf(holder, lotId);
        if (total == 0 || total > available) revert InvalidMass(available, total);

        token.burn(holder, lotId, total);
        childIds = token.mintNewBatch(Kind.LOT, holder, amounts, cid);

        src.state = LotState.PACKAGED;
        for (uint256 i; i < childIds.length; ++i) {
            _lots[childIds[i]] = src;
            _parents[childIds[i]].push(lotId);
        }
        emit LotSplit(lotId, holder, childIds, amounts, cid);
    }

    /// @notice Une el saldo completo de `holder` en varios sacos en un lote de exportación.
    function merge(uint256[] calldata lotIds, address holder, string calldata cid)
        external
        onlyRole(EXPORTER_ROLE)
        whenNotPaused
        returns (uint256 lotId)
    {
        if (lotIds.length < 2) revert MergeNeedsTwoLots();

        Lot memory merged = _requireLot(lotIds[0]);
        uint256[] memory amounts = new uint256[](lotIds.length);
        uint256 total;
        for (uint256 i; i < lotIds.length; ++i) {
            Lot storage part = _requireLot(lotIds[i]);
            if (part.state != LotState.PACKAGED) revert InvalidState(lotIds[i], part.state);
            amounts[i] = token.balanceOf(holder, lotIds[i]);
            // Un id repetido llega aquí con saldo ya contabilizado; se rechaza más abajo al quemar.
            if (amounts[i] == 0) revert InvalidMass(0, 0);
            total += amounts[i];
            // Si mezcla orígenes distintos, el origen se resuelve por linaje.
            if (part.fincaId != merged.fincaId) {
                merged.fincaId = bytes32(0);
                merged.fincaVersion = 0;
                merged.ddsCertId = 0;
            }
            if (part.variety != merged.variety) merged.variety = bytes32(0);
            if (part.harvestDate < merged.harvestDate) merged.harvestDate = part.harvestDate;
        }

        token.burnBatch(holder, lotIds, amounts);
        lotId = token.mintNew(Kind.LOT, holder, total, cid);
        _lots[lotId] = merged;
        _parents[lotId] = lotIds;
        emit LotMerged(lotId, holder, lotIds, total, cid);
    }

    /// @param refDDS referencia de la declaración DDS / TRACES (hash).
    function markExported(uint256 lotId, bytes32 refDDS, bytes32 dataHash, string calldata cid)
        external
        onlyRole(EXPORTER_ROLE)
        whenNotPaused
    {
        _advance(lotId, LotState.PACKAGED, LotState.EXPORTED, cid);
        emit LotExported(lotId, refDDS, dataHash, cid);
    }

    // ------------------------------------------------------------------ lectura

    function getLot(uint256 lotId) external view returns (Lot memory) {
        return _requireLot(lotId);
    }

    function lineage(uint256 lotId) external view returns (uint256[] memory) {
        _requireLot(lotId);
        return _parents[lotId];
    }

    // ---------------------------------------------------------------- internos

    function _requireLot(uint256 lotId) private view returns (Lot storage lot) {
        lot = _lots[lotId];
        if (CoffeeIds.kindOf(lotId) != Kind.LOT || lot.harvestDate == 0) revert LotNotFound(lotId);
    }

    function _advance(uint256 lotId, LotState from, LotState to, string calldata cid) private {
        Lot storage lot = _requireLot(lotId);
        if (lot.state != from) revert InvalidState(lotId, lot.state);
        lot.state = to;
        token.setTokenURI(lotId, cid);
        emit LotStateChanged(lotId, from, to, msg.sender);
    }

    function _transform(
        uint256 lotId,
        address holder,
        LotState requiredState,
        Form newForm,
        LotState newState,
        uint256 gramsOut,
        bytes32 dataHash,
        string calldata cid
    ) private returns (uint256 newId) {
        Lot memory src = _requireLot(lotId);
        if (src.state != requiredState) revert InvalidState(lotId, src.state);
        uint256 gramsIn = token.balanceOf(holder, lotId);
        if (gramsOut == 0 || gramsOut > gramsIn) revert InvalidMass(gramsIn, gramsOut);

        token.burn(holder, lotId, gramsIn);
        newId = token.mintNew(Kind.LOT, holder, gramsOut, cid);
        src.form = newForm;
        src.state = newState;
        _lots[newId] = src;
        _parents[newId].push(lotId);

        emit LotTransformed(lotId, newId, holder, newForm, gramsIn, gramsOut, dataHash, cid);
    }
}
