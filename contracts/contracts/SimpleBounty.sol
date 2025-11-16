// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleBounty {
    address public owner;
    address public paymentToken;

    constructor(address _paymentToken) {
        owner = msg.sender;
        paymentToken = _paymentToken;
    }

    function getOwner() external view returns (address) {
        return owner;
    }
}
