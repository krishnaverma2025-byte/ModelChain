// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ModelChain {
    uint256 private nextModelId = 1;
    address public immutable platform = msg.sender;
    mapping(address => uint256) public pendingWithdrawals;
    event ModelStatusChanged(uint256 indexed modelId, bool active);
    event RevenueWithdrawn(address indexed recipient, uint256 amount);

    struct Model {
        uint256 id;
        address owner;
        string name;
        string cid;
        string modelHash;
        uint256 price;
        uint256 royalty;
        bool active;
    }

    mapping(uint256 => Model) private models;

    mapping(uint256 => mapping(address => bool)) private licensed;

    event ModelRegistered(
        uint256 indexed modelId,
        address indexed owner,
        string name,
        string cid,
        uint256 price
    );

    event LicensePurchased(
        uint256 indexed modelId,
        address indexed buyer,
        uint256 price
    );

    event RoyaltyPaid(
        uint256 indexed modelId,
        address indexed owner,
        uint256 amount
    );

    function registerModel(
        string calldata name,
        string calldata cid,
        string calldata modelHash,
        uint256 price,
        uint256 royalty
    ) external returns (uint256) {

        require(bytes(name).length > 0, "Name required");
        require(bytes(cid).length > 0, "CID required");
        require(bytes(modelHash).length > 0, "Hash required");
        require(price > 0, "Price required");
        require(royalty <= 100, "Invalid royalty");

        uint256 modelId = nextModelId++;

        Model storage model = models[modelId];

        model.id = modelId;
        model.owner = msg.sender;
        model.name = name;
        model.cid = cid;
        model.modelHash = modelHash;
        model.price = price;
        model.royalty = royalty;
        model.active = true;

        emit ModelRegistered(
            modelId,
            msg.sender,
            name,
            cid,
            price
        );

        return modelId;
    }

    function getModel(uint256 modelId)
        external
        view
        returns (Model memory)
    {
        require(
            modelId > 0 && modelId < nextModelId,
            "Model does not exist"
        );

        return models[modelId];
    }

    function getModelCount()
        external
        view
        returns (uint256)
    {
        return nextModelId - 1;
    }

    function purchaseLicense(uint256 modelId)
        external
        payable
    {
        require(
            modelId > 0 && modelId < nextModelId,
            "Model does not exist"
        );

        Model storage model = models[modelId];

        require(model.active, "Model inactive");
        require(msg.sender != model.owner, "Owner cannot buy");
        require(msg.value == model.price, "Incorrect payment");
        require(
            !licensed[modelId][msg.sender],
            "Already licensed"
        );

        uint256 royaltyAmount =
            (msg.value * model.royalty) / 100;

        licensed[modelId][msg.sender] = true;

        // Preserve royalty as the creator share, in whole percent. Account for
        // the entire payment; recipients withdraw independently of purchases.
        pendingWithdrawals[model.owner] += royaltyAmount;
        pendingWithdrawals[platform] += msg.value - royaltyAmount;

        emit RoyaltyPaid(
            modelId,
            model.owner,
            royaltyAmount
        );

        emit LicensePurchased(
            modelId,
            msg.sender,
            msg.value
        );
    }

    function hasLicense(
        uint256 modelId,
        address buyer
    )
        external
        view
        returns (bool)
    {
        return licensed[modelId][buyer];
    }

    function setModelActive(uint256 modelId, bool active) external {
        require(modelId > 0 && modelId < nextModelId, "Model does not exist");
        require(msg.sender == models[modelId].owner, "Only creator");
        models[modelId].active = active;
        emit ModelStatusChanged(modelId, active);
    }

    function withdrawRevenue() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        (bool success,) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        emit RevenueWithdrawn(msg.sender, amount);
    }

    function verifyModel(
        uint256 modelId,
        string calldata submittedHash
    )
        external
        view
        returns (bool)
    {
        require(
            modelId > 0 && modelId < nextModelId,
            "Model does not exist"
        );

        return
            keccak256(
                bytes(models[modelId].modelHash)
            ) ==
            keccak256(
                bytes(submittedHash)
            );
    }
}
