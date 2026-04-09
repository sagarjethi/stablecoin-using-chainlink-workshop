// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IStableCoinBridgeable {
    function bridgeMint(address to, uint256 amount) external;
    function bridgeBurn(address from, uint256 amount) external;
}

/// @title CCIPBridge — burn-and-mint cross-chain sender/receiver
/// @notice Burns local stablecoin, instructs the destination chain to mint.
///         Destination-side validates source chain + source sender whitelist.
contract CCIPBridge is CCIPReceiver, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IStableCoinBridgeable public immutable stable;
    IERC20 public immutable stableAsERC20;
    IERC20 public immutable linkToken;

    /// @dev chainSelector => sender contract address on that chain => allowed
    mapping(uint64 => mapping(address => bool)) public allowlistedSenders;
    /// @dev chainSelector => receiver bridge on that chain (for outbound sends)
    mapping(uint64 => address) public destinationBridge;

    event OutboundSent(
        bytes32 indexed messageId,
        uint64 indexed destChainSelector,
        address indexed recipient,
        uint256 amount,
        uint256 fee
    );
    event InboundMinted(
        bytes32 indexed messageId,
        uint64 indexed sourceChainSelector,
        address indexed recipient,
        uint256 amount
    );
    event SenderAllowlisted(uint64 indexed chainSelector, address indexed sender, bool allowed);
    event DestinationBridgeSet(uint64 indexed chainSelector, address indexed bridge);

    error ZeroAmount();
    error UnknownDestination(uint64 chainSelector);
    error SourceNotAllowlisted(uint64 chainSelector, address sender);
    error InsufficientLinkFee(uint256 required, uint256 balance);

    constructor(
        address router,
        address admin,
        IStableCoinBridgeable _stable,
        IERC20 _linkToken
    ) CCIPReceiver(router) {
        stable = _stable;
        stableAsERC20 = IERC20(address(_stable));
        linkToken = _linkToken;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    // ---------------------------------------------------------------------
    // Admin config
    // ---------------------------------------------------------------------
    function setAllowlistedSender(uint64 chainSelector, address sender, bool allowed)
        external
        onlyRole(ADMIN_ROLE)
    {
        allowlistedSenders[chainSelector][sender] = allowed;
        emit SenderAllowlisted(chainSelector, sender, allowed);
    }

    function setDestinationBridge(uint64 chainSelector, address bridge) external onlyRole(ADMIN_ROLE) {
        destinationBridge[chainSelector] = bridge;
        emit DestinationBridgeSet(chainSelector, bridge);
    }

    // ---------------------------------------------------------------------
    // Outbound: burn locally, send CCIP message to peer bridge
    // ---------------------------------------------------------------------

    /// @notice Burns `amount` from caller (via bridgeBurn) and sends a mint
    ///         instruction to `destChainSelector`. Fees paid in LINK (pre-funded
    ///         into this contract; caller supplies none — or the admin tops it up).
    function sendCrossChain(uint64 destChainSelector, address recipient, uint256 amount)
        external
        nonReentrant
        returns (bytes32 messageId)
    {
        // ---------- Checks ----------
        if (amount == 0) revert ZeroAmount();
        address peer = destinationBridge[destChainSelector];
        if (peer == address(0)) revert UnknownDestination(destChainSelector);

        // ---------- Effects ----------
        // Pull tokens from user into this bridge, then burn them.
        stableAsERC20.safeTransferFrom(msg.sender, address(this), amount);
        stable.bridgeBurn(address(this), amount);

        // ---------- Interactions ----------
        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(peer),
            data: abi.encode(recipient, amount),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            feeToken: address(linkToken),
            extraArgs: Client._argsToBytes(
                Client.EVMExtraArgsV2({gasLimit: 200_000, allowOutOfOrderExecution: true})
            )
        });

        IRouterClient router = IRouterClient(this.getRouter());
        uint256 fee = router.getFee(destChainSelector, message);
        uint256 bal = linkToken.balanceOf(address(this));
        if (fee > bal) revert InsufficientLinkFee(fee, bal);

        linkToken.approve(address(router), fee);
        messageId = router.ccipSend(destChainSelector, message);

        emit OutboundSent(messageId, destChainSelector, recipient, amount, fee);
    }

    // ---------------------------------------------------------------------
    // Inbound: validated by CCIPReceiver (onlyRouter), we add allowlist check
    // ---------------------------------------------------------------------
    function _ccipReceive(Client.Any2EVMMessage memory message) internal override nonReentrant {
        uint64 srcSelector = message.sourceChainSelector;
        address srcSender = abi.decode(message.sender, (address));
        if (!allowlistedSenders[srcSelector][srcSender]) {
            revert SourceNotAllowlisted(srcSelector, srcSender);
        }

        (address recipient, uint256 amount) = abi.decode(message.data, (address, uint256));
        stable.bridgeMint(recipient, amount);

        emit InboundMinted(message.messageId, srcSelector, recipient, amount);
    }

    /// @dev Recover stray LINK (admin only).
    function withdrawLink(address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        linkToken.safeTransfer(to, amount);
    }

    /// @dev AccessControl + CCIPReceiver both expose supportsInterface; disambiguate.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(CCIPReceiver, AccessControl)
        returns (bool)
    {
        return CCIPReceiver.supportsInterface(interfaceId) || AccessControl.supportsInterface(interfaceId);
    }
}
