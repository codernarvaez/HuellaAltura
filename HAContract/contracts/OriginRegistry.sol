// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {HuellaAccess} from "./access/HuellaAccess.sol";
import {CoffeeToken} from "./CoffeeToken.sol";
import {Kind} from "./libraries/CoffeeTypes.sol";

/// @title OriginRegistry
/// @notice Raíz de la trazabilidad EUDR (PLAN §1.2 y §3.7): fincas versionadas,
///         auditorías de deforestación ancladas y certificados DDS como tokens.
/// @dev Nada personal on-chain: la finca se identifica por keccak256(uuid) y su
///      polígono por keccak256(GeoJSON canónico). Los CIDs solo viajan en eventos.
contract OriginRegistry is HuellaAccess {
    struct Finca {
        bytes32 tenantId;
        bytes32 geoHash;
        uint32 areaHa100; // hectáreas × 100
        uint32 version;
        uint64 updatedAt;
        uint256 activeCertId;
    }

    struct Audit {
        bytes32 auditHash;
        uint64 fechaCorte;
        uint64 anchoredAt;
        uint32 fincaVersion;
        bool approved;
    }

    struct Certificate {
        bytes32 fincaId;
        address holder;
        uint64 issuedAt;
        uint64 expiresAt;
        uint32 fincaVersion;
        bool revoked;
    }

    CoffeeToken public token;

    mapping(bytes32 fincaId => Finca) private _fincas;
    mapping(bytes32 fincaId => mapping(uint32 version => bytes32 geoHash)) public geoHashAt;
    mapping(bytes32 fincaId => Audit) private _lastAudit;
    mapping(uint256 certId => Certificate) private _certs;

    event FincaRegistered(bytes32 indexed fincaId, bytes32 indexed tenantId, bytes32 geoHash, uint32 areaHa100, string cid);
    event FincaUpdated(bytes32 indexed fincaId, uint32 indexed version, bytes32 geoHash, uint32 areaHa100, string cid);
    event DeforestationAuditAnchored(
        bytes32 indexed fincaId, uint32 indexed fincaVersion, bytes32 auditHash, bool approved, uint64 fechaCorte
    );
    event DDSIssued(uint256 indexed certId, bytes32 indexed fincaId, address indexed holder, uint64 expiresAt, string cid);
    event DDSRevoked(uint256 indexed certId, bytes32 indexed fincaId, string reason);

    error FincaExists(bytes32 fincaId);
    error FincaNotFound(bytes32 fincaId);
    error InvalidGeoHash();
    error InvalidArea();
    error AuditNotApproved(bytes32 fincaId);
    error InvalidExpiry();
    error CertificateNotFound(uint256 certId);
    error CertificateAlreadyRevoked(uint256 certId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin, CoffeeToken token_) external initializer {
        if (address(token_) == address(0)) revert ZeroAddress();
        __HuellaAccess_init(admin);
        token = token_;
    }

    // ------------------------------------------------------------------ fincas

    function registerFinca(bytes32 fincaId, bytes32 tenantId, bytes32 geoHash, uint32 areaHa100, string calldata cid)
        external
        onlyRole(RELAYER_ROLE)
        whenNotPaused
    {
        if (_fincas[fincaId].version != 0) revert FincaExists(fincaId);
        _checkGeo(geoHash, areaHa100);
        _fincas[fincaId] = Finca({
            tenantId: tenantId,
            geoHash: geoHash,
            areaHa100: areaHa100,
            version: 1,
            updatedAt: uint64(block.timestamp),
            activeCertId: 0
        });
        geoHashAt[fincaId][1] = geoHash;
        emit FincaRegistered(fincaId, tenantId, geoHash, areaHa100, cid);
    }

    /// @notice Nueva medición de la finca: crea otra versión. Los lotes antiguos conservan la suya.
    ///         La auditoría y el DDS vigentes dejan de valer hasta auditar la nueva versión.
    function updateFinca(bytes32 fincaId, bytes32 geoHash, uint32 areaHa100, string calldata cid)
        external
        onlyRole(RELAYER_ROLE)
        whenNotPaused
    {
        Finca storage f = _requireFinca(fincaId);
        _checkGeo(geoHash, areaHa100);
        uint32 version = ++f.version;
        f.geoHash = geoHash;
        f.areaHa100 = areaHa100;
        f.updatedAt = uint64(block.timestamp);
        geoHashAt[fincaId][version] = geoHash;
        emit FincaUpdated(fincaId, version, geoHash, areaHa100, cid);
    }

    // -------------------------------------------------------------- auditorías

    function anchorAudit(bytes32 fincaId, bytes32 auditHash, bool approved, uint64 fechaCorte)
        external
        onlyRole(AUDITOR_ROLE)
        whenNotPaused
    {
        Finca storage f = _requireFinca(fincaId);
        _lastAudit[fincaId] = Audit({
            auditHash: auditHash,
            fechaCorte: fechaCorte,
            anchoredAt: uint64(block.timestamp),
            fincaVersion: f.version,
            approved: approved
        });
        emit DeforestationAuditAnchored(fincaId, f.version, auditHash, approved, fechaCorte);
    }

    // ---------------------------------------------------------- certificados DDS

    /// @notice Emite el DDS como token DDS_CERT (supply 1, intransferible) para la versión
    ///         actual de la finca. Exige una auditoría aprobada de esa misma versión.
    function issueDDS(bytes32 fincaId, address holder, uint64 expiresAt, string calldata cid)
        external
        onlyRole(AUDITOR_ROLE)
        whenNotPaused
        returns (uint256 certId)
    {
        if (holder == address(0)) revert ZeroAddress();
        Finca storage f = _requireFinca(fincaId);
        Audit storage a = _lastAudit[fincaId];
        if (!a.approved || a.fincaVersion != f.version) revert AuditNotApproved(fincaId);
        if (expiresAt <= block.timestamp) revert InvalidExpiry();

        certId = token.mintNew(Kind.DDS_CERT, holder, 1, cid);
        _certs[certId] = Certificate({
            fincaId: fincaId,
            holder: holder,
            issuedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            fincaVersion: f.version,
            revoked: false
        });
        f.activeCertId = certId;
        emit DDSIssued(certId, fincaId, holder, expiresAt, cid);
    }

    function revokeDDS(uint256 certId, string calldata reason) external onlyRole(AUDITOR_ROLE) whenNotPaused {
        Certificate storage c = _certs[certId];
        if (c.issuedAt == 0) revert CertificateNotFound(certId);
        if (c.revoked) revert CertificateAlreadyRevoked(certId);
        c.revoked = true;
        token.burn(c.holder, certId, 1);
        emit DDSRevoked(certId, c.fincaId, reason);
    }

    // ------------------------------------------------------------------ lectura

    /// @notice La finca puede cosechar: DDS activo, no revocado, no vencido y emitido para su versión actual.
    function isCompliant(bytes32 fincaId) public view returns (bool) {
        Finca storage f = _fincas[fincaId];
        if (f.activeCertId == 0) return false;
        Certificate storage c = _certs[f.activeCertId];
        return !c.revoked && c.expiresAt > block.timestamp && c.fincaVersion == f.version;
    }

    function getFinca(bytes32 fincaId) external view returns (Finca memory) {
        return _fincas[fincaId];
    }

    function getLastAudit(bytes32 fincaId) external view returns (Audit memory) {
        return _lastAudit[fincaId];
    }

    function getCertificate(uint256 certId) external view returns (Certificate memory) {
        return _certs[certId];
    }

    // ---------------------------------------------------------------- internos

    function _requireFinca(bytes32 fincaId) private view returns (Finca storage f) {
        f = _fincas[fincaId];
        if (f.version == 0) revert FincaNotFound(fincaId);
    }

    function _checkGeo(bytes32 geoHash, uint32 areaHa100) private pure {
        if (geoHash == bytes32(0)) revert InvalidGeoHash();
        if (areaHa100 == 0) revert InvalidArea();
    }
}
