import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("UGCBountyModule", (m) => {
    const paymentToken = m.getParameter("paymentToken", "0xFee95Ee1E03bE4832E6F318d94243ee5cbFDc2B4");

    const bountyEscrow = m.contract("UGCBountyEscrow", [paymentToken]);

    return { bountyEscrow };
});
