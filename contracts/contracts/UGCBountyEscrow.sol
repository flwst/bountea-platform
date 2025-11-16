// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IAssetPrecompile.sol";

/**
 * @title UGCBountyEscrow - User Generated Content Bounty Platform
 * @notice Sistema de escrow para pagar a creadores de contenido por vistas
 *
 * Flujo:
 * 1. Empresa crea bounty con presupuesto total y rate por cada 1K vistas
 * 2. Creadores submitean su video URL
 * 3. Cuando alcanzan vistas, piden redeem desde frontend
 * 4. Master verifica vistas off-chain y aprueba pago
 * 5. Creator reclama su pago
 */
contract UGCBountyEscrow is ReentrancyGuard, Ownable {

    // ============ Estructuras ============

    struct Bounty {
        uint256 bountyId;
        address creator;           // Empresa que crea el bounty
        string description;        // Descripción del bounty
        uint256 totalBudget;       // Presupuesto total
        uint256 remainingBudget;   // Presupuesto restante
        uint256 ratePerThousandViews; // Cuánto paga por cada 1000 vistas (ej: 1 USDC)
        uint256 targetViews;       // Meta de vistas total (ej: 1 millón)
        uint256 deadline;          // Fecha límite
        bool active;               // Si está activo
        uint256 totalViewsReached; // Total de vistas alcanzadas
        uint256 totalPaid;         // Total pagado
    }

    struct VideoSubmission {
        uint256 submissionId;
        uint256 bountyId;
        address creator;           // Creador del video
        string videoUrl;           // URL del video (YouTube, TikTok, etc)
        string platform;           // "youtube", "tiktok", "instagram"
        uint256 submittedAt;       // Timestamp de submission
        uint256 currentViews;      // Vistas actuales verificadas
        uint256 lastVerifiedViews; // Últimas vistas verificadas
        uint256 totalEarned;       // Total ganado por este video
        bool active;               // Si está activo
    }

    struct PaymentApproval {
        uint256 approvalId;        // ID de la aprobación
        uint256 submissionId;
        uint256 viewCount;         // Vistas verificadas
        uint256 paymentAmount;     // Cantidad a pagar
        bool approved;             // Si fue aprobado por master
        bool claimed;              // Si fue reclamado
        uint256 approvedAt;        // Timestamp de aprobación
    }

    // ============ Estado ============

    IAssetPrecompile public paymentToken; // Token de pago (USDC precompile)

    uint256 public bountyCounter;
    uint256 public submissionCounter;
    uint256 public approvalCounter;

    mapping(uint256 => Bounty) public bounties;
    mapping(uint256 => VideoSubmission) public submissions;
    mapping(uint256 => PaymentApproval) public approvals;

    // Mappings auxiliares
    mapping(uint256 => uint256[]) public bountySubmissions; // bountyId -> submissionIds[]
    mapping(address => uint256[]) public creatorSubmissions; // creator -> submissionIds[]
    mapping(uint256 => uint256[]) public submissionApprovals; // submissionId -> approvalIds[]

    // ============ Eventos ============

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed creator,
        uint256 totalBudget,
        uint256 ratePerThousandViews,
        uint256 targetViews
    );

    event VideoSubmitted(
        uint256 indexed submissionId,
        uint256 indexed bountyId,
        address indexed creator,
        string videoUrl,
        string platform
    );

    event PaymentApproved(
        uint256 indexed approvalId,
        uint256 indexed submissionId,
        uint256 viewCount,
        uint256 paymentAmount
    );

    event PaymentClaimed(
        uint256 indexed approvalId,
        address indexed creator,
        uint256 amount
    );

    event BountyClosed(uint256 indexed bountyId, uint256 refundedAmount);

    // ============ Errores ============

    error BountyNotFound();
    error BountyNotActive();
    error BountyExpired();
    error InsufficientBudget();
    error VideoAlreadySubmitted();
    error SubmissionNotFound();
    error NotSubmissionCreator();
    error ApprovalNotFound();
    error PaymentNotApproved();
    error PaymentAlreadyClaimed();
    error InvalidParameters();
    error TransferFailed();

    // ============ Constructor ============

    constructor(address _paymentTokenPrecompile) Ownable(msg.sender) {
        require(_paymentTokenPrecompile != address(0), "Invalid token address");
        paymentToken = IAssetPrecompile(_paymentTokenPrecompile);
    }

    // ============ Funciones Principales ============

    /**
     * @notice Crear un nuevo bounty
     * @param description Descripción del bounty
     * @param totalBudget Presupuesto total a depositar
     * @param ratePerThousandViews Pago por cada 1000 vistas
     * @param targetViews Meta de vistas total
     * @param durationInDays Duración en días
     */
    function createBounty(
        string memory description,
        uint256 totalBudget,
        uint256 ratePerThousandViews,
        uint256 targetViews,
        uint256 durationInDays
    ) external nonReentrant returns (uint256) {
        require(totalBudget > 0, "Budget must be > 0");
        require(ratePerThousandViews > 0, "Rate must be > 0");
        require(targetViews > 0, "Target views must be > 0");
        require(durationInDays > 0 && durationInDays <= 365, "Invalid duration");

        // Transferir fondos del creador al contrato
        bool success = paymentToken.transferFrom(msg.sender, address(this), totalBudget);
        if (!success) revert TransferFailed();

        uint256 bountyId = bountyCounter++;
        uint256 deadline = block.timestamp + (durationInDays * 1 days);

        bounties[bountyId] = Bounty({
            bountyId: bountyId,
            creator: msg.sender,
            description: description,
            totalBudget: totalBudget,
            remainingBudget: totalBudget,
            ratePerThousandViews: ratePerThousandViews,
            targetViews: targetViews,
            deadline: deadline,
            active: true,
            totalViewsReached: 0,
            totalPaid: 0
        });

        emit BountyCreated(bountyId, msg.sender, totalBudget, ratePerThousandViews, targetViews);

        return bountyId;
    }

    /**
     * @notice Submitear un video a un bounty
     * @param bountyId ID del bounty
     * @param videoUrl URL del video
     * @param platform Plataforma (youtube, tiktok, etc)
     */
    function submitVideo(
        uint256 bountyId,
        string memory videoUrl,
        string memory platform
    ) external nonReentrant returns (uint256) {
        Bounty storage bounty = bounties[bountyId];

        if (bounty.bountyId != bountyId) revert BountyNotFound();
        if (!bounty.active) revert BountyNotActive();
        if (block.timestamp > bounty.deadline) revert BountyExpired();

        require(bytes(videoUrl).length > 0, "Empty URL");
        require(bytes(platform).length > 0, "Empty platform");

        uint256 submissionId = submissionCounter++;

        submissions[submissionId] = VideoSubmission({
            submissionId: submissionId,
            bountyId: bountyId,
            creator: msg.sender,
            videoUrl: videoUrl,
            platform: platform,
            submittedAt: block.timestamp,
            currentViews: 0,
            lastVerifiedViews: 0,
            totalEarned: 0,
            active: true
        });

        bountySubmissions[bountyId].push(submissionId);
        creatorSubmissions[msg.sender].push(submissionId);

        emit VideoSubmitted(submissionId, bountyId, msg.sender, videoUrl, platform);

        return submissionId;
    }

    /**
     * @notice Master aprueba pago basado en vistas verificadas
     * @param submissionId ID de la submission
     * @param verifiedViews Vistas verificadas off-chain
     */
    function approvePayment(
        uint256 submissionId,
        uint256 verifiedViews
    ) external onlyOwner nonReentrant returns (uint256) {
        VideoSubmission storage submission = submissions[submissionId];

        if (submission.submissionId != submissionId) revert SubmissionNotFound();
        if (!submission.active) revert SubmissionNotFound();

        Bounty storage bounty = bounties[submission.bountyId];
        if (!bounty.active) revert BountyNotActive();

        // Calcular cuántas vistas nuevas hay
        uint256 newViews = verifiedViews > submission.lastVerifiedViews
            ? verifiedViews - submission.lastVerifiedViews
            : 0;

        if (newViews == 0) revert InvalidParameters();

        // Calcular pago (por cada 1000 vistas)
        uint256 thousandsOfViews = newViews / 1000;
        uint256 paymentAmount = thousandsOfViews * bounty.ratePerThousandViews;

        if (paymentAmount == 0) revert InvalidParameters();
        if (paymentAmount > bounty.remainingBudget) revert InsufficientBudget();

        // Crear aprobación
        uint256 approvalId = approvalCounter++;

        approvals[approvalId] = PaymentApproval({
            approvalId: approvalId,
            submissionId: submissionId,
            viewCount: verifiedViews,
            paymentAmount: paymentAmount,
            approved: true,
            claimed: false,
            approvedAt: block.timestamp
        });

        // Actualizar estado
        submission.currentViews = verifiedViews;
        submission.lastVerifiedViews = verifiedViews;

        bounty.remainingBudget -= paymentAmount;
        bounty.totalViewsReached += newViews;

        submissionApprovals[submissionId].push(approvalId);

        emit PaymentApproved(approvalId, submissionId, verifiedViews, paymentAmount);

        return approvalId;
    }

    /**
     * @notice Creador reclama su pago aprobado
     * @param approvalId ID de la aprobación
     */
    function claimPayment(uint256 approvalId) external nonReentrant {
        PaymentApproval storage approval = approvals[approvalId];

        if (approval.approvalId == 0 && approvalId != 0) revert ApprovalNotFound();
        if (!approval.approved) revert PaymentNotApproved();
        if (approval.claimed) revert PaymentAlreadyClaimed();

        VideoSubmission storage submission = submissions[approval.submissionId];
        if (submission.creator != msg.sender) revert NotSubmissionCreator();

        // Marcar como reclamado
        approval.claimed = true;

        // Actualizar totales
        submission.totalEarned += approval.paymentAmount;
        bounties[submission.bountyId].totalPaid += approval.paymentAmount;

        // Transferir pago
        bool success = paymentToken.transfer(msg.sender, approval.paymentAmount);
        if (!success) revert TransferFailed();

        emit PaymentClaimed(approvalId, msg.sender, approval.paymentAmount);
    }

    /**
     * @notice Cerrar bounty y retirar fondos restantes (solo creador del bounty)
     * @param bountyId ID del bounty
     */
    function closeBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = bounties[bountyId];

        if (bounty.bountyId != bountyId) revert BountyNotFound();
        require(msg.sender == bounty.creator || msg.sender == owner(), "Not authorized");
        require(bounty.active, "Already closed");

        bounty.active = false;

        uint256 refundAmount = bounty.remainingBudget;
        if (refundAmount > 0) {
            bounty.remainingBudget = 0;

            bool success = paymentToken.transfer(bounty.creator, refundAmount);
            if (!success) revert TransferFailed();
        }

        emit BountyClosed(bountyId, refundAmount);
    }

    // ============ View Functions ============

    function getBounty(uint256 bountyId) external view returns (Bounty memory) {
        return bounties[bountyId];
    }

    function getSubmission(uint256 submissionId) external view returns (VideoSubmission memory) {
        return submissions[submissionId];
    }

    function getApproval(uint256 approvalId) external view returns (PaymentApproval memory) {
        return approvals[approvalId];
    }

    function getBountySubmissions(uint256 bountyId) external view returns (uint256[] memory) {
        return bountySubmissions[bountyId];
    }

    function getCreatorSubmissions(address creator) external view returns (uint256[] memory) {
        return creatorSubmissions[creator];
    }

    function getSubmissionApprovals(uint256 submissionId) external view returns (uint256[] memory) {
        return submissionApprovals[submissionId];
    }

    /**
     * @notice Obtener información completa de una submission con sus approvals
     */
    function getSubmissionDetails(uint256 submissionId) external view returns (
        VideoSubmission memory submission,
        PaymentApproval[] memory allApprovals,
        uint256 pendingAmount
    ) {
        submission = submissions[submissionId];
        uint256[] memory approvalIds = submissionApprovals[submissionId];

        allApprovals = new PaymentApproval[](approvalIds.length);
        pendingAmount = 0;

        for (uint256 i = 0; i < approvalIds.length; i++) {
            allApprovals[i] = approvals[approvalIds[i]];
            if (allApprovals[i].approved && !allApprovals[i].claimed) {
                pendingAmount += allApprovals[i].paymentAmount;
            }
        }
    }

    // ============ Admin Functions ============

    /**
     * @notice Actualizar dirección del token (solo owner)
     */
    function updatePaymentToken(address newTokenAddress) external onlyOwner {
        require(newTokenAddress != address(0), "Invalid address");
        paymentToken = IAssetPrecompile(newTokenAddress);
    }

    /**
     * @notice Emergencia: retirar tokens bloqueados (solo owner)
     */
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        bool success = paymentToken.transfer(to, amount);
        if (!success) revert TransferFailed();
    }
}
